/**
 * Planner features on top of the couple's workspace: the celebration's events (engagement,
 * melse, reception…), the seating plan, and the saved-vendor shortlist. Every function takes the
 * couple id and only touches that couple's rows.
 */
import { and, asc, eq, inArray, isNull, sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import {
	guestLists,
	savedVendors,
	seatingPlans,
	seatingTables,
	vendorCategories,
	vendors,
	weddingEvents
} from '$lib/server/db/schema';

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

export const EVENT_TYPES = [
	'engagement',
	'shimgelegna',
	'gebez_enshoshela',
	'ceremony',
	'melse',
	'kilikil',
	'reception',
	'other'
] as const;

export type EventInput = {
	eventType: (typeof EVENT_TYPES)[number];
	eventName: string;
	eventDate: Date | null;
	venueName: string | null;
	venueAddress: string | null;
	city: string | null;
	notes: string | null;
};

export function listEvents(coupleId: number) {
	return db
		.select()
		.from(weddingEvents)
		.where(and(eq(weddingEvents.coupleId, coupleId), isNull(weddingEvents.deletedAt)))
		.orderBy(asc(weddingEvents.eventDate), asc(weddingEvents.sortOrder), asc(weddingEvents.id));
}

export async function addEvent(coupleId: number, input: EventInput, userId: string) {
	await db
		.insert(weddingEvents)
		.values({ coupleId, ...input, createdBy: userId, updatedBy: userId });
}

export async function updateEvent(coupleId: number, id: number, input: EventInput, userId: string) {
	const [res] = await db
		.update(weddingEvents)
		.set({ ...input, updatedBy: userId })
		.where(
			and(
				eq(weddingEvents.id, id),
				eq(weddingEvents.coupleId, coupleId),
				isNull(weddingEvents.deletedAt)
			)
		);
	return res.affectedRows > 0;
}

export async function removeEvent(coupleId: number, id: number, userId: string) {
	const [res] = await db
		.update(weddingEvents)
		.set({ deletedAt: new Date(), deletedBy: userId })
		.where(
			and(
				eq(weddingEvents.id, id),
				eq(weddingEvents.coupleId, coupleId),
				isNull(weddingEvents.deletedAt)
			)
		);
	return res.affectedRows > 0;
}

/**
 * The traditional wedding week, as days and times (Addis Ababa) relative to the wedding day.
 * `key` names the `tpl_<key>` / `tpl_<key>_note` messages; Telosh has no event type of its own.
 */
export const WEDDING_WEEK = [
	{ key: 'shimgelegna', type: 'shimgelegna', days: -90, time: '10:00' },
	{ key: 'engagement', type: 'engagement', days: -30, time: '15:00' },
	{ key: 'telosh', type: 'other', days: -1, time: '18:00' },
	{ key: 'ceremony', type: 'ceremony', days: 0, time: '14:00' },
	{ key: 'melse', type: 'melse', days: 1, time: '15:00' },
	{ key: 'kilikil', type: 'kilikil', days: 7, time: '13:00' }
] as const;

export type WeddingWeekKey = (typeof WEDDING_WEEK)[number]['key'];

/**
 * Adds the wedding-week events the couple doesn't have yet (by type, and by name for Telosh).
 * `label` gives each event its name and note in the couple's language. Returns how many it added.
 */
export async function addWeddingWeek(
	coupleId: number,
	weddingDate: string,
	userId: string,
	label: (key: WeddingWeekKey) => { name: string; note: string }
) {
	const existing = await listEvents(coupleId);
	const day = (offset: number) =>
		new Date(Date.parse(`${weddingDate}T00:00:00Z`) + offset * 86_400_000)
			.toISOString()
			.slice(0, 10);

	const rows = WEDDING_WEEK.filter(({ key, type }) => {
		const { name } = label(key);
		return type === 'other'
			? !existing.some((e) => e.eventName === name)
			: !existing.some((e) => e.eventType === type);
	}).map(({ key, type, days, time }, i) => {
		const { name, note } = label(key);
		return {
			coupleId,
			eventType: type,
			eventName: name,
			eventDate: new Date(`${day(days)}T${time}:00+03:00`),
			notes: note,
			sortOrder: i,
			createdBy: userId,
			updatedBy: userId
		};
	});
	if (rows.length) await db.insert(weddingEvents).values(rows);
	return rows.length;
}

// ---------------------------------------------------------------------------
// Seating
// ---------------------------------------------------------------------------

/** The couple's seating plan, created on first use (one per couple). */
export async function ensureSeatingPlan(coupleId: number) {
	const [existing] = await db
		.select({ id: seatingPlans.id, name: seatingPlans.name })
		.from(seatingPlans)
		.where(and(eq(seatingPlans.coupleId, coupleId), isNull(seatingPlans.deletedAt)))
		.limit(1);
	if (existing) return existing;
	const [row] = await db.insert(seatingPlans).values({ coupleId }).$returningId();
	return { id: row.id, name: 'Reception Seating' };
}

/** Tables with their guests, plus everyone not seated yet. Seats count a guest and their plus-ones. */
export async function seatingOverview(coupleId: number) {
	const plan = await ensureSeatingPlan(coupleId);
	const [tables, guests] = await Promise.all([
		db
			.select({
				id: seatingTables.id,
				name: seatingTables.tableName,
				capacity: seatingTables.capacity
			})
			.from(seatingTables)
			.where(and(eq(seatingTables.seatingPlanId, plan.id), isNull(seatingTables.deletedAt)))
			.orderBy(asc(seatingTables.id)),
		db
			.select({
				id: guestLists.id,
				fullName: guestLists.fullName,
				side: guestLists.side,
				groupName: guestLists.groupName,
				rsvpStatus: guestLists.rsvpStatus,
				plusOnes: guestLists.plusOnes,
				tableId: guestLists.seatingTableId
			})
			.from(guestLists)
			.where(and(eq(guestLists.coupleId, coupleId), isNull(guestLists.deletedAt)))
			.orderBy(asc(guestLists.fullName))
	]);

	const tableIds = new Set(tables.map((t) => t.id));
	const seats = (g: { plusOnes: number }) => 1 + g.plusOnes;
	return {
		plan,
		tables: tables.map((t) => {
			const seated = guests.filter((g) => g.tableId === t.id);
			return { ...t, guests: seated, used: seated.reduce((n, g) => n + seats(g), 0) };
		}),
		// Declined guests don't need a seat.
		unseated: guests.filter(
			(g) => (!g.tableId || !tableIds.has(g.tableId)) && g.rsvpStatus !== 'declined'
		)
	};
}

async function ownTable(coupleId: number, tableId: number) {
	const [row] = await db
		.select({ id: seatingTables.id })
		.from(seatingTables)
		.innerJoin(seatingPlans, eq(seatingPlans.id, seatingTables.seatingPlanId))
		.where(
			and(
				eq(seatingTables.id, tableId),
				eq(seatingPlans.coupleId, coupleId),
				isNull(seatingTables.deletedAt)
			)
		)
		.limit(1);
	return !!row;
}

export async function addTables(coupleId: number, count: number, capacity: number, prefix: string) {
	const plan = await ensureSeatingPlan(coupleId);
	const [{ n }] = await db
		.select({ n: sql<number>`count(*)` })
		.from(seatingTables)
		.where(and(eq(seatingTables.seatingPlanId, plan.id), isNull(seatingTables.deletedAt)));
	const start = Number(n) + 1;
	await db.insert(seatingTables).values(
		Array.from({ length: count }, (_, i) => ({
			seatingPlanId: plan.id,
			tableName: `${prefix} ${start + i}`.slice(0, 50),
			capacity
		}))
	);
}

export async function updateTable(
	coupleId: number,
	tableId: number,
	name: string,
	capacity: number
) {
	if (!(await ownTable(coupleId, tableId))) return false;
	await db
		.update(seatingTables)
		.set({ tableName: name, capacity })
		.where(eq(seatingTables.id, tableId));
	return true;
}

/** Removes a table; its guests go back to unseated. */
export async function removeTable(coupleId: number, tableId: number) {
	if (!(await ownTable(coupleId, tableId))) return false;
	await db.transaction(async (tx) => {
		await tx
			.update(guestLists)
			.set({ seatingTableId: null })
			.where(eq(guestLists.seatingTableId, tableId));
		await tx
			.update(seatingTables)
			.set({ deletedAt: new Date() })
			.where(eq(seatingTables.id, tableId));
	});
	return true;
}

/** Seats a guest at a table (or unseats with `tableId = null`). */
export async function seatGuest(coupleId: number, guestId: number, tableId: number | null) {
	if (tableId !== null && !(await ownTable(coupleId, tableId))) return false;
	const [res] = await db
		.update(guestLists)
		.set({ seatingTableId: tableId })
		.where(and(eq(guestLists.id, guestId), eq(guestLists.coupleId, coupleId)));
	return res.affectedRows > 0;
}

// ---------------------------------------------------------------------------
// Saved vendors
// ---------------------------------------------------------------------------

/** The shortlist with what a comparison needs. Only vendors still publicly listed. */
export function listSavedVendors(coupleId: number) {
	return db
		.select({
			id: vendors.id,
			businessName: vendors.businessName,
			category: vendorCategories.name,
			city: vendors.city,
			priceMin: vendors.priceMin,
			priceMax: vendors.priceMax,
			ratingAvg: vendors.ratingAvg,
			reviewCount: vendors.reviewCount,
			isVerified: vendors.isVerified,
			phone: vendors.phone
		})
		.from(savedVendors)
		.innerJoin(vendors, eq(vendors.id, savedVendors.vendorId))
		.leftJoin(vendorCategories, eq(vendorCategories.id, vendors.categoryId))
		.where(
			and(
				eq(savedVendors.coupleId, coupleId),
				isNull(vendors.deletedAt),
				eq(vendors.isActive, true),
				eq(vendors.status, 'approved')
			)
		)
		.orderBy(asc(vendorCategories.name), asc(vendors.businessName));
}

export async function unsaveVendors(coupleId: number, vendorIds: number[]) {
	if (!vendorIds.length) return;
	await db
		.delete(savedVendors)
		.where(and(eq(savedVendors.coupleId, coupleId), inArray(savedVendors.vendorId, vendorIds)));
}
