import { db } from '$lib/server/db';
import {
	vendorBookings,
	vendorQuotes,
	vendorServices,
	weddingPlans,
	couples,
	messages
} from '$lib/server/db/schema';
import { and, asc, desc, eq, gte, inArray, isNull, like, lt, ne, or, sql } from 'drizzle-orm';
import type { BookingFilters } from '$lib/schemas/vendor-bookings';

export const PAGE_SIZE = 12;

const todayISO = () => new Date().toISOString().slice(0, 10);

function tabCondition(tab: BookingFilters['tab']) {
	const today = todayISO();
	switch (tab) {
		case 'pending':
			return eq(vendorBookings.status, 'pending');
		case 'confirmed':
			return eq(vendorBookings.status, 'confirmed');
		case 'cancelled':
			return eq(vendorBookings.status, 'cancelled');
		case 'upcoming':
			return and(eq(vendorBookings.status, 'confirmed'), gte(vendorBookings.eventDate, today));
		case 'past':
			return and(eq(vendorBookings.status, 'confirmed'), lt(vendorBookings.eventDate, today));
		default:
			return undefined;
	}
}

/** Bookings for the vendor dashboard: filtered, paged, with the latest quote merged in. */
export async function listVendorBookings(vendorId: number, filters: BookingFilters) {
	const conditions = [
		eq(vendorBookings.vendorId, vendorId),
		isNull(vendorBookings.deletedAt),
		tabCondition(filters.tab)
	];

	if (filters.q) {
		const term = `%${filters.q}%`;
		conditions.push(
			or(
				like(couples.groomName, term),
				like(couples.brideName, term),
				like(vendorServices.title, term)
			)
		);
	}
	if (filters.from) conditions.push(gte(vendorBookings.eventDate, filters.from));
	if (filters.to) conditions.push(lt(vendorBookings.eventDate, filters.to));
	if (filters.serviceId) conditions.push(eq(vendorBookings.serviceId, filters.serviceId));

	const where = and(...conditions.filter(Boolean));

	const orderBy =
		filters.sort === 'date_desc'
			? [desc(vendorBookings.eventDate)]
			: filters.sort === 'created_desc'
				? [desc(vendorBookings.createdAt)]
				: filters.sort === 'price_desc'
					? [desc(vendorBookings.agreedPrice)]
					: [asc(vendorBookings.eventDate)];

	const [rows, [{ total }]] = await Promise.all([
		db
			.select({
				id: vendorBookings.id,
				weddingPlanId: vendorBookings.weddingPlanId,
				coupleId: weddingPlans.coupleId,
				groomName: couples.groomName,
				brideName: couples.brideName,
				coupleEmail: couples.email,
				couplePhone: couples.phone,
				serviceId: vendorBookings.serviceId,
				serviceTitle: vendorServices.title,
				status: vendorBookings.status,
				agreedPrice: vendorBookings.agreedPrice,
				eventDate: vendorBookings.eventDate,
				cancellationReason: vendorBookings.cancellationReason,
				cancelledBy: vendorBookings.cancelledBy,
				createdAt: vendorBookings.createdAt
			})
			.from(vendorBookings)
			.innerJoin(weddingPlans, eq(weddingPlans.id, vendorBookings.weddingPlanId))
			.innerJoin(couples, eq(couples.id, weddingPlans.coupleId))
			.leftJoin(vendorServices, eq(vendorServices.id, vendorBookings.serviceId))
			.where(where)
			.orderBy(...orderBy)
			.limit(PAGE_SIZE)
			.offset((filters.page - 1) * PAGE_SIZE),
		db
			.select({ total: sql<number>`count(*)` })
			.from(vendorBookings)
			.innerJoin(weddingPlans, eq(weddingPlans.id, vendorBookings.weddingPlanId))
			.innerJoin(couples, eq(couples.id, weddingPlans.coupleId))
			.leftJoin(vendorServices, eq(vendorServices.id, vendorBookings.serviceId))
			.where(where)
	]);

	if (rows.length === 0) return { rows: [], total: Number(total) };

	const bookingIds = rows.map((r) => r.id);
	const quotes = await db
		.select({
			bookingId: vendorQuotes.bookingId,
			proposedPrice: vendorQuotes.proposedPrice,
			notes: vendorQuotes.notes,
			status: vendorQuotes.status,
			createdAt: vendorQuotes.createdAt
		})
		.from(vendorQuotes)
		.where(inArray(vendorQuotes.bookingId, bookingIds))
		.orderBy(desc(vendorQuotes.createdAt));

	const latestQuote = new Map<number, (typeof quotes)[number]>();
	for (const q of quotes) if (!latestQuote.has(q.bookingId)) latestQuote.set(q.bookingId, q);

	return {
		rows: rows.map((r) => ({
			...r,
			agreedPrice: r.agreedPrice ? Number(r.agreedPrice) : null,
			quote: latestQuote.get(r.id)
				? {
						...latestQuote.get(r.id)!,
						proposedPrice: Number(latestQuote.get(r.id)!.proposedPrice)
					}
				: null
		})),
		total: Number(total)
	};
}

/** Unread messages sent to this vendor, grouped by couple. */
export async function unreadCountsByCouple(vendorId: number, vendorUserId: string) {
	const rows = await db
		.select({ coupleId: messages.coupleId, c: sql<number>`count(*)` })
		.from(messages)
		.where(
			and(
				eq(messages.vendorId, vendorId),
				eq(messages.receiverId, vendorUserId),
				eq(messages.isRead, false)
			)
		)
		.groupBy(messages.coupleId);

	return new Map(rows.map((r) => [r.coupleId, Number(r.c)]));
}

/** A single booking, scoped to the vendor, with enough couple context to message and check ownership. */
export async function getVendorBooking(vendorId: number, id: number) {
	const [row] = await db
		.select({
			id: vendorBookings.id,
			vendorId: vendorBookings.vendorId,
			serviceId: vendorBookings.serviceId,
			status: vendorBookings.status,
			eventDate: vendorBookings.eventDate,
			agreedPrice: vendorBookings.agreedPrice,
			coupleId: weddingPlans.coupleId,
			partner1UserId: couples.partner1UserId,
			partner2UserId: couples.partner2UserId
		})
		.from(vendorBookings)
		.innerJoin(weddingPlans, eq(weddingPlans.id, vendorBookings.weddingPlanId))
		.innerJoin(couples, eq(couples.id, weddingPlans.coupleId))
		.where(
			and(eq(vendorBookings.id, id), eq(vendorBookings.vendorId, vendorId), isNull(vendorBookings.deletedAt))
		)
		.limit(1);

	return row ?? null;
}

/** Whether the vendor already has a confirmed booking on this date (excluding `excludeId`). */
export async function hasConfirmedConflict(vendorId: number, eventDate: string, excludeId?: number) {
	const conditions = [
		eq(vendorBookings.vendorId, vendorId),
		eq(vendorBookings.status, 'confirmed'),
		eq(vendorBookings.eventDate, eventDate),
		isNull(vendorBookings.deletedAt)
	];
	if (excludeId) conditions.push(ne(vendorBookings.id, excludeId));

	const [row] = await db
		.select({ id: vendorBookings.id })
		.from(vendorBookings)
		.where(and(...conditions))
		.limit(1);

	return !!row;
}

/** Wedding plans a vendor can attach a new booking to, labelled by couple name. */
export async function listCouplesForBooking() {
	const rows = await db
		.select({
			weddingPlanId: weddingPlans.id,
			groomName: couples.groomName,
			brideName: couples.brideName
		})
		.from(weddingPlans)
		.innerJoin(couples, eq(couples.id, weddingPlans.coupleId))
		.where(and(isNull(weddingPlans.deletedAt), isNull(couples.deletedAt)))
		.orderBy(asc(couples.groomName));

	return rows.map((r) => ({
		value: r.weddingPlanId,
		name: [r.groomName, r.brideName].filter(Boolean).join(' & ') || `Wedding #${r.weddingPlanId}`
	}));
}

/** The message thread between this vendor and one couple. */
export async function listConversation(vendorId: number, coupleId: number) {
	return db
		.select({
			id: messages.id,
			senderId: messages.senderId,
			receiverId: messages.receiverId,
			body: messages.body,
			isRead: messages.isRead,
			createdAt: messages.createdAt
		})
		.from(messages)
		.where(and(eq(messages.vendorId, vendorId), eq(messages.coupleId, coupleId)))
		.orderBy(asc(messages.createdAt));
}

/** Marks the couple's messages to this vendor as read, e.g. when the thread is opened. */
export async function markThreadRead(vendorId: number, vendorUserId: string, coupleId: number) {
	await db
		.update(messages)
		.set({ isRead: true })
		.where(
			and(
				eq(messages.vendorId, vendorId),
				eq(messages.coupleId, coupleId),
				eq(messages.receiverId, vendorUserId),
				eq(messages.isRead, false)
			)
		);
}

export function toDateInput(value: unknown): string {
	if (!value) return '';
	if (value instanceof Date) {
		const m = `${value.getMonth() + 1}`.padStart(2, '0');
		const d = `${value.getDate()}`.padStart(2, '0');
		return `${value.getFullYear()}-${m}-${d}`;
	}
	return String(value).slice(0, 10);
}
