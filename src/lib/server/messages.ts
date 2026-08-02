import { db } from '$lib/server/db';
import { messages, vendors, vendorCategories } from '$lib/server/db/schema';
import { and, asc, eq, inArray, isNull } from 'drizzle-orm';

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
		.select({ id: vendors.id, businessName: vendors.businessName, categoryName: vendorCategories.name })
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

export async function sendMessage(args: {
	senderId: string;
	receiverId: string;
	coupleId: number;
	vendorId: number;
	body: string;
}) {
	await db.insert(messages).values(args);
}
