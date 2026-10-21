/**
 * Inspiration boards: pictures a couple saves from vendors' work (or uploads), grouped into named
 * boards both partners share. A board can be sent to a vendor as a read-only link.
 */
import { randomBytes } from 'node:crypto';
import { and, asc, desc, eq, inArray } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { boardItems, inspirationBoards, vendors } from '$lib/server/db/schema';

export const MAX_BOARDS = 20;
export const MAX_ITEMS = 200;

export async function listBoards(coupleId: number) {
	const boards = await db
		.select()
		.from(inspirationBoards)
		.where(eq(inspirationBoards.coupleId, coupleId))
		.orderBy(asc(inspirationBoards.createdAt));
	if (!boards.length) return [];
	const items = await db
		.select({
			id: boardItems.id,
			boardId: boardItems.boardId,
			image: boardItems.image,
			note: boardItems.note,
			vendorId: boardItems.vendorId,
			vendorName: vendors.businessName
		})
		.from(boardItems)
		.leftJoin(vendors, eq(vendors.id, boardItems.vendorId))
		.where(
			inArray(
				boardItems.boardId,
				boards.map((b) => b.id)
			)
		)
		.orderBy(desc(boardItems.createdAt));
	return boards.map((b) => ({ ...b, items: items.filter((i) => i.boardId === b.id) }));
}

export async function createBoard(coupleId: number, name: string) {
	const existing = await db
		.select({ id: inspirationBoards.id })
		.from(inspirationBoards)
		.where(eq(inspirationBoards.coupleId, coupleId));
	if (existing.length >= MAX_BOARDS) return null;
	const [row] = await db
		.insert(inspirationBoards)
		.values({ coupleId, name: name.slice(0, 80) })
		.$returningId();
	return row.id;
}

/** The board, if it belongs to the couple. */
async function ownBoard(coupleId: number, boardId: number) {
	const [board] = await db
		.select()
		.from(inspirationBoards)
		.where(and(eq(inspirationBoards.id, boardId), eq(inspirationBoards.coupleId, coupleId)));
	return board ?? null;
}

export async function deleteBoard(coupleId: number, boardId: number) {
	await db
		.delete(inspirationBoards)
		.where(and(eq(inspirationBoards.id, boardId), eq(inspirationBoards.coupleId, coupleId)));
}

/**
 * Saves a picture to a board. With no board given, it goes to the couple's first board, made
 * (named `fallbackName`) if they have none. Saving the same picture twice is a no-op.
 */
export async function saveItem(
	coupleId: number,
	item: {
		boardId?: number | null;
		image: string;
		vendorId?: number | null;
		serviceId?: number | null;
		note?: string | null;
	},
	fallbackName: string
) {
	let boardId = item.boardId ?? null;
	if (boardId) {
		if (!(await ownBoard(coupleId, boardId))) return false;
	} else {
		const [first] = await db
			.select({ id: inspirationBoards.id })
			.from(inspirationBoards)
			.where(eq(inspirationBoards.coupleId, coupleId))
			.orderBy(asc(inspirationBoards.createdAt))
			.limit(1);
		boardId = first?.id ?? (await createBoard(coupleId, fallbackName));
		if (!boardId) return false;
	}
	const count = await db
		.select({ id: boardItems.id })
		.from(boardItems)
		.where(eq(boardItems.boardId, boardId));
	if (count.length >= MAX_ITEMS) return false;
	await db
		.insert(boardItems)
		.values({
			boardId,
			image: item.image,
			vendorId: item.vendorId ?? null,
			serviceId: item.serviceId ?? null,
			note: item.note?.slice(0, 255) || null
		})
		.onDuplicateKeyUpdate({ set: { boardId } });
	return true;
}

export async function removeItem(coupleId: number, itemId: number) {
	const [row] = await db
		.select({ id: boardItems.id })
		.from(boardItems)
		.innerJoin(inspirationBoards, eq(inspirationBoards.id, boardItems.boardId))
		.where(and(eq(boardItems.id, itemId), eq(inspirationBoards.coupleId, coupleId)));
	if (row) await db.delete(boardItems).where(eq(boardItems.id, itemId));
	return !!row;
}

/** The board's read-only link token, made on first share. */
export async function shareBoard(coupleId: number, boardId: number) {
	const board = await ownBoard(coupleId, boardId);
	if (!board) return null;
	if (board.shareToken) return board.shareToken;
	const token = randomBytes(12).toString('base64url').slice(0, 16);
	await db
		.update(inspirationBoards)
		.set({ shareToken: token })
		.where(eq(inspirationBoards.id, boardId));
	return token;
}

export async function boardByToken(token: string) {
	if (!/^[A-Za-z0-9_-]{10,24}$/.test(token)) return null;
	const [board] = await db
		.select()
		.from(inspirationBoards)
		.where(eq(inspirationBoards.shareToken, token));
	if (!board) return null;
	const items = await db
		.select({ id: boardItems.id, image: boardItems.image, note: boardItems.note })
		.from(boardItems)
		.where(eq(boardItems.boardId, board.id))
		.orderBy(desc(boardItems.createdAt));
	return { name: board.name, items };
}
