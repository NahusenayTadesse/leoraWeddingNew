/**
 * Money gifts (ስጦታ) from the Leora Card. A guest pays through Chapa into Leora's account; once
 * Chapa confirms it (`verify` in payments, which calls `settleGift`), the couple is told and the
 * money counts towards what they can ask to be sent to them. Staff send it and mark the payout
 * done on /admin/gifts.
 *
 * GIFT_FEE_PERCENT (default 0) is Leora's share of each gift, taken from what the couple can
 * withdraw, never from what the guest sees.
 */
import { randomBytes } from 'node:crypto';
import { and, desc, eq, inArray, isNull, sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { couples, giftPayouts, weddingCards, weddingGifts } from '$lib/server/db/schema';
import { initializeTransaction } from '@nahu/admin-kit/server/chapa';
import { notify, notifyAdmins } from '$lib/server/notify';
import { formatETB, fromMoney, toMoney } from '$lib/money';

export const GIFT_MIN = 50;
export const GIFT_MAX = 500_000;

const feePercent = () => {
	const n = Number(process.env.GIFT_FEE_PERCENT ?? 0);
	return Number.isFinite(n) && n >= 0 && n < 100 ? n : 0;
};

export class GiftRefused extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'GiftRefused';
	}
}

/** Starts a Chapa checkout for a gift and returns its URL. */
export async function startGift(
	input: {
		coupleId: number;
		guestId?: number | null;
		fromName: string;
		message?: string | null;
		amount: number;
		email?: string | null;
		phone?: string | null;
	},
	origin: string
): Promise<string> {
	const [card] = await db
		.select({ enabled: weddingCards.giftsEnabled, published: weddingCards.published })
		.from(weddingCards)
		.where(eq(weddingCards.coupleId, input.coupleId));
	if (!card?.published || !card.enabled)
		throw new GiftRefused('Gifts are not open for this wedding.');
	if (!(input.amount >= GIFT_MIN && input.amount <= GIFT_MAX)) {
		throw new GiftRefused(`A gift is between ${formatETB(GIFT_MIN)} and ${formatETB(GIFT_MAX)}.`);
	}

	const [row] = await db
		.insert(weddingGifts)
		.values({
			coupleId: input.coupleId,
			guestId: input.guestId ?? null,
			fromName: input.fromName,
			message: input.message || null,
			amount: fromMoney(input.amount),
			// Replaced just below once the id is known; unique meanwhile.
			txRef: `gf-new-${randomBytes(8).toString('hex')}`
		})
		.$returningId();
	// Same shape as the other payments (`gf-<id>-<random>`), so `kindOf` routes it here.
	const txRef = `gf-${row.id}-${randomBytes(5).toString('hex')}`;
	await db.update(weddingGifts).set({ txRef }).where(eq(weddingGifts.id, row.id));

	try {
		const checkoutUrl = await initializeTransaction({
			title: 'Leora Events',
			amount: input.amount,
			name: input.fromName,
			email: input.email || null,
			phone: input.phone || null,
			txRef,
			callbackUrl: `${origin}/api/payments/chapa/callback`,
			returnUrl: `${origin}/payments/return?tx_ref=${encodeURIComponent(txRef)}`,
			description: 'Wedding gift'
		});
		await db.update(weddingGifts).set({ checkoutUrl }).where(eq(weddingGifts.id, row.id));
		return checkoutUrl;
	} catch (err) {
		await db
			.update(weddingGifts)
			.set({ status: 'failed', verifyPayload: String((err as Error).message).slice(0, 2000) })
			.where(eq(weddingGifts.id, row.id));
		throw err;
	}
}

/** Chapa confirmed the gift: mark it paid (once) and tell the couple. */
export async function settleGift(id: number, payload: string) {
	const [res] = await db
		.update(weddingGifts)
		.set({ status: 'paid', paidAt: new Date(), verifyPayload: payload.slice(0, 2000) })
		.where(and(eq(weddingGifts.id, id), eq(weddingGifts.status, 'pending')));
	if (!res.affectedRows) return false;

	const [gift] = await db
		.select({
			fromName: weddingGifts.fromName,
			amount: weddingGifts.amount,
			partner1: couples.partner1UserId,
			partner2: couples.partner2UserId
		})
		.from(weddingGifts)
		.innerJoin(couples, eq(couples.id, weddingGifts.coupleId))
		.where(eq(weddingGifts.id, id));
	if (gift) {
		const notice = {
			type: 'gift_received',
			title: `A gift from ${gift.fromName}`,
			body: `${gift.fromName} sent you ${formatETB(toMoney(gift.amount))}.`,
			link: '/wedding/gifts'
		};
		await notify(gift.partner1, notice);
		if (gift.partner2) await notify(gift.partner2, notice);
	}
	return true;
}

/** Back to the invitation the gift was sent from, with a thank-you. */
export async function giftReturnPath(txRef: string) {
	const [row] = await db
		.select({ slug: couples.slug })
		.from(weddingGifts)
		.innerJoin(couples, eq(couples.id, weddingGifts.coupleId))
		.where(eq(weddingGifts.txRef, txRef));
	return row?.slug ? `/i/${row.slug}?gift=thanks` : '/';
}

/** Received, Leora's share, already asked for, and what is left to ask for. */
export async function giftBalance(coupleId: number) {
	const [[received], [requested]] = await Promise.all([
		db
			.select({ total: sql<string>`COALESCE(SUM(${weddingGifts.amount}), 0)` })
			.from(weddingGifts)
			.where(and(eq(weddingGifts.coupleId, coupleId), eq(weddingGifts.status, 'paid'))),
		db
			.select({ total: sql<string>`COALESCE(SUM(${giftPayouts.amount}), 0)` })
			.from(giftPayouts)
			.where(
				and(
					eq(giftPayouts.coupleId, coupleId),
					inArray(giftPayouts.status, ['requested', 'completed'])
				)
			)
	]);
	const gross = toMoney(received?.total);
	const fee = Math.round(gross * feePercent()) / 100;
	const asked = toMoney(requested?.total);
	return {
		received: gross,
		fee,
		requested: asked,
		available: Math.max(0, Math.round((gross - fee - asked) * 100) / 100)
	};
}

export function listGifts(coupleId: number) {
	return db
		.select({
			id: weddingGifts.id,
			fromName: weddingGifts.fromName,
			message: weddingGifts.message,
			amount: weddingGifts.amount,
			paidAt: weddingGifts.paidAt,
			thankedAt: weddingGifts.thankedAt
		})
		.from(weddingGifts)
		.where(and(eq(weddingGifts.coupleId, coupleId), eq(weddingGifts.status, 'paid')))
		.orderBy(desc(weddingGifts.paidAt));
}

export async function markThanked(coupleId: number, giftId: number, thanked: boolean) {
	await db
		.update(weddingGifts)
		.set({ thankedAt: thanked ? new Date() : null })
		.where(and(eq(weddingGifts.id, giftId), eq(weddingGifts.coupleId, coupleId)));
}

/** The couple asks for (part of) their gift money. Serialised per couple so it can't overdraw. */
export async function requestGiftPayout(
	coupleId: number,
	userId: string,
	amount: number,
	destination: string
) {
	const created = await db.transaction(async (tx) => {
		// Lock the couple row: two requests at once must not both pass the balance check.
		await tx
			.select({ id: couples.id })
			.from(couples)
			.where(and(eq(couples.id, coupleId), isNull(couples.deletedAt)))
			.for('update');
		const balance = await giftBalance(coupleId);
		if (!(amount > 0) || amount > balance.available + 0.005) return null;
		await tx.insert(giftPayouts).values({
			coupleId,
			amount: fromMoney(amount),
			destination,
			requestedBy: userId
		});
		return balance.available - amount;
	});
	if (created === null) throw new GiftRefused('That is more than you have available.');
	await notifyAdmins({
		type: 'gift_payout_requested',
		title: 'Gift payout requested',
		body: `A couple asked for ${formatETB(amount)} of their wedding gifts.`,
		link: '/admin/gifts'
	});
}

export function listGiftPayouts(coupleId: number) {
	return db
		.select()
		.from(giftPayouts)
		.where(eq(giftPayouts.coupleId, coupleId))
		.orderBy(desc(giftPayouts.createdAt));
}
