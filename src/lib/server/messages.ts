import { db } from '$lib/server/db';
import {
	messages,
	vendors,
	vendorCategories,
	vendorBookings,
	weddingPlans
} from '$lib/server/db/schema';
import { and, asc, eq, gte, inArray, isNull } from 'drizzle-orm';
import { maskContacts } from '@nahu/admin-kit/contactMask';

const contactableVendor = and(
	eq(vendors.status, 'approved'),
	eq(vendors.isActive, true),
	isNull(vendors.deletedAt)
);

export type Thread = {
	vendorId: number;
	businessName: string;
	categoryName: string | null;
	lastMessage: string;
	lastAt: Date;
	unread: number;
};

/** One thread per vendor the couple has exchanged messages with, newest first. */
export async function listThreadsForCouple(coupleId: number, userId: string): Promise<Thread[]> {
	const rows = await db
		.select({
			vendorId: messages.vendorId,
			senderId: messages.senderId,
			receiverId: messages.receiverId,
			body: messages.body,
			isRead: messages.isRead,
			createdAt: messages.createdAt
		})
		.from(messages)
		.where(eq(messages.coupleId, coupleId))
		.orderBy(asc(messages.createdAt));

	const byVendor = new Map<number, typeof rows>();
	for (const row of rows) {
		if (!row.vendorId) continue;
		const list = byVendor.get(row.vendorId) ?? [];
		list.push(row);
		byVendor.set(row.vendorId, list);
	}

	const vendorIds = [...byVendor.keys()];
	if (vendorIds.length === 0) return [];

	const vendorRows = await db
		.select({
			id: vendors.id,
			businessName: vendors.businessName,
			categoryName: vendorCategories.name
		})
		.from(vendors)
		.leftJoin(vendorCategories, eq(vendors.categoryId, vendorCategories.id))
		.where(inArray(vendors.id, vendorIds));
	const vendorMap = new Map(vendorRows.map((v) => [v.id, v]));

	return vendorIds
		.map((vendorId) => {
			const msgs = byVendor.get(vendorId)!;
			const last = msgs[msgs.length - 1];
			const vendor = vendorMap.get(vendorId);
			return {
				vendorId,
				businessName: vendor?.businessName ?? 'Vendor',
				categoryName: vendor?.categoryName ?? null,
				lastMessage: last.body,
				lastAt: last.createdAt,
				unread: msgs.filter((m) => m.receiverId === userId && !m.isRead).length
			};
		})
		.sort((a, b) => b.lastAt.getTime() - a.lastAt.getTime());
}

export async function getThreadMessages(coupleId: number, vendorId: number) {
	return db
		.select({
			id: messages.id,
			senderId: messages.senderId,
			receiverId: messages.receiverId,
			body: messages.body,
			createdAt: messages.createdAt
		})
		.from(messages)
		.where(and(eq(messages.coupleId, coupleId), eq(messages.vendorId, vendorId)))
		.orderBy(asc(messages.createdAt));
}

/** Marks the couple's unread messages from this vendor as read. */
export async function markThreadRead(coupleId: number, vendorId: number, userId: string) {
	await db
		.update(messages)
		.set({ isRead: true })
		.where(
			and(
				eq(messages.coupleId, coupleId),
				eq(messages.vendorId, vendorId),
				eq(messages.receiverId, userId),
				eq(messages.isRead, false)
			)
		);
}

/** Vendor's public contact details, for starting or continuing a thread. */
export async function getVendorContact(vendorId: number) {
	const [row] = await db
		.select({
			id: vendors.id,
			userId: vendors.userId,
			businessName: vendors.businessName,
			categoryName: vendorCategories.name
		})
		.from(vendors)
		.leftJoin(vendorCategories, eq(vendors.categoryId, vendorCategories.id))
		.where(and(eq(vendors.id, vendorId), contactableVendor))
		.limit(1);

	return row ?? null;
}

/** Whether the couple and vendor have a confirmed (or completed) booking together. */
export async function haveBooked(coupleId: number, vendorId: number) {
	const [row] = await db
		.select({ id: vendorBookings.id })
		.from(vendorBookings)
		.innerJoin(weddingPlans, eq(weddingPlans.id, vendorBookings.weddingPlanId))
		.where(
			and(
				eq(weddingPlans.coupleId, coupleId),
				eq(vendorBookings.vendorId, vendorId),
				inArray(vendorBookings.status, ['confirmed', 'completed']),
				isNull(vendorBookings.deletedAt)
			)
		)
		.limit(1);
	return !!row;
}

/** A vendor may only write to couples who wrote to them or asked to book them. */
export async function vendorKnowsCouple(vendorId: number, coupleId: number) {
	const [thread] = await db
		.select({ id: messages.id })
		.from(messages)
		.where(and(eq(messages.vendorId, vendorId), eq(messages.coupleId, coupleId)))
		.limit(1);
	if (thread) return true;
	const [booking] = await db
		.select({ id: vendorBookings.id })
		.from(vendorBookings)
		.innerJoin(weddingPlans, eq(weddingPlans.id, vendorBookings.weddingPlanId))
		.where(and(eq(vendorBookings.vendorId, vendorId), eq(weddingPlans.coupleId, coupleId)))
		.limit(1);
	return !!booking;
}

export type SendResult = { ok: true; masked: boolean } | { ok: false; reason: 'unknown_couple' };

/**
 * Every typed message between a couple and a vendor goes through here. Until they have a confirmed
 * booking, contact details are replaced (see `$lib/contactMask`), so the deal is made on Leora.
 */
export async function sendMessage(args: {
	senderId: string;
	receiverId: string;
	coupleId: number;
	vendorId: number;
	body: string;
	from: 'couple' | 'vendor';
}): Promise<SendResult> {
	if (args.from === 'vendor' && !(await vendorKnowsCouple(args.vendorId, args.coupleId))) {
		return { ok: false, reason: 'unknown_couple' };
	}
	const { text, masked } = (await haveBooked(args.coupleId, args.vendorId))
		? { text: args.body, masked: false }
		: maskContacts(args.body);
	await db.insert(messages).values({
		senderId: args.senderId,
		receiverId: args.receiverId,
		coupleId: args.coupleId,
		vendorId: args.vendorId,
		body: text
	});
	return { ok: true, masked };
}

/** Fewer conversations than this and the numbers say more about luck than the vendor. */
const MIN_THREADS_FOR_STATS = 3;

/**
 * How quickly a vendor answers new couples, over the last 90 days: for each conversation a couple
 * started, the time to the vendor's first reply. Null until there are enough conversations.
 */
export async function responseStats(vendorId: number, vendorUserId: string | null) {
	if (!vendorUserId) return null;
	const since = new Date(Date.now() - 90 * 24 * 3600_000);
	const rows = await db
		.select({
			coupleId: messages.coupleId,
			senderId: messages.senderId,
			createdAt: messages.createdAt
		})
		.from(messages)
		.where(and(eq(messages.vendorId, vendorId), gte(messages.createdAt, since)))
		.orderBy(asc(messages.coupleId), asc(messages.createdAt));

	const firstAsk = new Map<number, Date>();
	const firstReply = new Map<number, Date>();
	for (const r of rows) {
		if (r.coupleId === null) continue;
		const fromVendor = r.senderId === vendorUserId;
		if (!firstAsk.has(r.coupleId)) {
			// Only conversations the couple started count.
			if (fromVendor) firstAsk.set(r.coupleId, new Date(NaN));
			else firstAsk.set(r.coupleId, r.createdAt);
		} else if (fromVendor && !firstReply.has(r.coupleId)) {
			firstReply.set(r.coupleId, r.createdAt);
		}
	}

	const asks = [...firstAsk].filter(([, at]) => !Number.isNaN(at.getTime()));
	if (asks.length < MIN_THREADS_FOR_STATS) return null;
	const hours = asks
		.map(([couple, at]) => {
			const reply = firstReply.get(couple);
			return reply ? (reply.getTime() - at.getTime()) / 3600_000 : null;
		})
		.filter((h): h is number => h !== null)
		.sort((a, b) => a - b);

	return {
		/** Share of conversations the vendor answered at all, 0–100. */
		replyRate: Math.round((hours.length / asks.length) * 100),
		/** Median hours to the first reply, or null if they never replied. */
		medianHours: hours.length ? hours[Math.floor((hours.length - 1) / 2)] : null
	};
}
