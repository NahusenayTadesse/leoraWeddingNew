/**
 * Guest posts: photos for the wall, blessings, and song requests for the DJ.
 *
 * Who may post: a guest on their personal invite link, or anyone holding the wall link printed on
 * the tables (`wedding_cards.wall_key`). The bare invitation (`/i/<slug>`) is shareable, so it
 * reads but never writes. Who may see: the same people, and the couple, who can hide any post.
 */
import { randomBytes } from 'node:crypto';
import { and, desc, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { guestPosts, weddingCards } from '$lib/server/db/schema';

export type PostKind = 'photo' | 'blessing' | 'song';

/** The wall key, made the first time the couple asks for the wall link. */
export async function wallKeyFor(coupleId: number, renew = false): Promise<string> {
	const [card] = await db
		.select({ key: weddingCards.wallKey })
		.from(weddingCards)
		.where(eq(weddingCards.coupleId, coupleId));
	if (card?.key && !renew) return card.key;
	const key = randomBytes(12).toString('base64url').slice(0, 16);
	await db
		.insert(weddingCards)
		.values({ coupleId, wallKey: key })
		.onDuplicateKeyUpdate({ set: { wallKey: key } });
	return key;
}

export async function wallKeyMatches(coupleId: number, key: string | null | undefined) {
	if (!key) return false;
	const [card] = await db
		.select({ key: weddingCards.wallKey })
		.from(weddingCards)
		.where(eq(weddingCards.coupleId, coupleId));
	return !!card?.key && card.key === key;
}

export async function addPost(input: {
	coupleId: number;
	guestId?: number | null;
	kind: PostKind;
	authorName: string;
	body?: string | null;
	photo?: string | null;
}) {
	await db.insert(guestPosts).values({
		coupleId: input.coupleId,
		guestId: input.guestId ?? null,
		kind: input.kind,
		authorName: input.authorName.slice(0, 120),
		body: input.body?.slice(0, 500) || null,
		photo: input.photo ?? null
	});
}

export function listPosts(
	coupleId: number,
	opts: { kind?: PostKind; includeHidden?: boolean; limit?: number } = {}
) {
	return db
		.select({
			id: guestPosts.id,
			kind: guestPosts.kind,
			authorName: guestPosts.authorName,
			body: guestPosts.body,
			photo: guestPosts.photo,
			hidden: guestPosts.hidden,
			createdAt: guestPosts.createdAt
		})
		.from(guestPosts)
		.where(
			and(
				eq(guestPosts.coupleId, coupleId),
				opts.kind ? eq(guestPosts.kind, opts.kind) : undefined,
				opts.includeHidden ? undefined : eq(guestPosts.hidden, false)
			)
		)
		.orderBy(desc(guestPosts.createdAt))
		.limit(opts.limit ?? 300);
}

export async function setPostHidden(coupleId: number, postId: number, hidden: boolean) {
	await db
		.update(guestPosts)
		.set({ hidden })
		.where(and(eq(guestPosts.id, postId), eq(guestPosts.coupleId, coupleId)));
}
