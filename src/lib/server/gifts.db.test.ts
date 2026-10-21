import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { couples, weddingCards, weddingGifts } from '$lib/server/db/schema';
import { verify } from '$lib/server/payments';
import { giftBalance, GiftRefused, requestGiftPayout, startGift } from '$lib/server/gifts';
import {
	addPost,
	listPosts,
	setPostHidden,
	wallKeyFor,
	wallKeyMatches
} from '$lib/server/guestPosts';
import { makeCoupleWithWedding, resetDb, stubChapa } from '$lib/server/testing/db';

const ORIGIN = 'http://localhost:5173';

let chapa: ReturnType<typeof stubChapa>;
beforeEach(async () => {
	await resetDb();
	chapa = stubChapa();
});
afterEach(() => {
	chapa.restore();
	delete process.env.GIFT_FEE_PERCENT;
});

async function openForGifts() {
	const couple = await makeCoupleWithWedding();
	await db
		.insert(weddingCards)
		.values({ coupleId: couple.coupleId, published: true, giftsEnabled: true });
	return couple;
}

const lastGift = async () => (await db.select().from(weddingGifts)).at(-1)!;

describe('wedding gifts', () => {
	it('are refused until the couple turns them on', async () => {
		const couple = await makeCoupleWithWedding();
		await expect(
			startGift({ coupleId: couple.coupleId, fromName: 'Aster', amount: 1000 }, ORIGIN)
		).rejects.toThrow(GiftRefused);
	});

	it('go through Chapa, settle once, and return to the invitation', async () => {
		const couple = await openForGifts();
		const url = await startGift(
			{ coupleId: couple.coupleId, fromName: 'Aster', amount: 1000, message: 'Congratulations!' },
			ORIGIN
		);
		const gift = await lastGift();
		expect(url).toContain(gift.txRef);
		expect(gift.txRef).toMatch(/^gf-\d+-/);

		chapa.paid(gift.txRef, 1000);
		const [{ slug }] = await db
			.select({ slug: couples.slug })
			.from(couples)
			.where(eq(couples.id, couple.coupleId));
		expect(await verify(gift.txRef)).toEqual({
			status: 'paid',
			kind: 'gift',
			returnPath: `/i/${slug}?gift=thanks`
		});
		expect((await verify(gift.txRef)).status).toBe('paid');
		expect((await lastGift()).status).toBe('paid');
		expect(await giftBalance(couple.coupleId)).toEqual({
			received: 1000,
			fee: 0,
			requested: 0,
			available: 1000
		});
	});

	it('an underpaid gift is not settled', async () => {
		const couple = await openForGifts();
		await startGift({ coupleId: couple.coupleId, fromName: 'Aster', amount: 1000 }, ORIGIN);
		const gift = await lastGift();
		chapa.paid(gift.txRef, 10);
		expect((await verify(gift.txRef)).status).toBe('pending');
		expect((await lastGift()).status).toBe('pending');
	});

	it('payouts take the fee into account and cannot overdraw', async () => {
		process.env.GIFT_FEE_PERCENT = '5';
		const couple = await openForGifts();
		await startGift({ coupleId: couple.coupleId, fromName: 'Aster', amount: 2000 }, ORIGIN);
		const gift = await lastGift();
		chapa.paid(gift.txRef, 2000);
		await verify(gift.txRef);

		expect((await giftBalance(couple.coupleId)).available).toBe(1900);
		await expect(
			requestGiftPayout(couple.coupleId, couple.userId, 2000, 'CBE 1000123456789')
		).rejects.toThrow(GiftRefused);
		await requestGiftPayout(couple.coupleId, couple.userId, 1500, 'CBE 1000123456789');
		expect((await giftBalance(couple.coupleId)).available).toBe(400);
	});
});

describe('guest posts', () => {
	it('the wall key is stable until renewed, and only the current one opens the wall', async () => {
		const couple = await makeCoupleWithWedding();
		const key = await wallKeyFor(couple.coupleId);
		expect(await wallKeyFor(couple.coupleId)).toBe(key);
		expect(await wallKeyMatches(couple.coupleId, key)).toBe(true);
		const renewed = await wallKeyFor(couple.coupleId, true);
		expect(renewed).not.toBe(key);
		expect(await wallKeyMatches(couple.coupleId, key)).toBe(false);
		expect(await wallKeyMatches(couple.coupleId, null)).toBe(false);
	});

	it('hidden posts stay out of what guests see', async () => {
		const couple = await makeCoupleWithWedding();
		await addPost({ coupleId: couple.coupleId, kind: 'song', authorName: 'Abel', body: 'Tizita' });
		await addPost({
			coupleId: couple.coupleId,
			kind: 'blessing',
			authorName: 'Abel',
			body: 'Joy!'
		});
		const [song] = await listPosts(couple.coupleId, { kind: 'song' });
		await setPostHidden(couple.coupleId, song.id, true);

		expect(await listPosts(couple.coupleId, { kind: 'song' })).toHaveLength(0);
		expect(await listPosts(couple.coupleId, { includeHidden: true })).toHaveLength(2);
	});
});
