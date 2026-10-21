import { z } from 'zod/v4';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { weddingCards } from '$lib/server/db/schema';
import { getCoupleByUserId } from '$lib/server/couples';
import {
	GiftRefused,
	giftBalance,
	listGiftPayouts,
	listGifts,
	markThanked,
	requestGiftPayout
} from '$lib/server/gifts';
import { parse, ok, bad } from '@nahu/admin-kit/server/actionResults';
import { toMoney } from '$lib/money';
import { m } from '$lib/paraglide/messages.js';
import { redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

async function requireCouple(locals: App.Locals) {
	const couple = await getCoupleByUserId(locals.user!.id);
	if (!couple) redirect(302, '/wedding/profile');
	return couple;
}

export const load: PageServerLoad = async ({ locals }) => {
	const couple = await requireCouple(locals);
	const [gifts, balance, payouts, [card]] = await Promise.all([
		listGifts(couple.id),
		giftBalance(couple.id),
		listGiftPayouts(couple.id),
		db
			.select({ enabled: weddingCards.giftsEnabled })
			.from(weddingCards)
			.where(eq(weddingCards.coupleId, couple.id))
	]);
	return {
		enabled: card?.enabled ?? false,
		balance,
		gifts: gifts.map((g) => ({ ...g, amount: toMoney(g.amount) })),
		payouts: payouts.map((p) => ({ ...p, amount: toMoney(p.amount) }))
	};
};

export const actions = {
	toggle: async ({ request, locals }) => {
		const couple = await requireCouple(locals);
		const p = await parse(request, z.object({ enabled: z.enum(['yes', 'no']) }));
		if ('error' in p) return p.error;
		const enabled = p.data.enabled === 'yes';
		await db
			.insert(weddingCards)
			.values({ coupleId: couple.id, giftsEnabled: enabled })
			.onDuplicateKeyUpdate({ set: { giftsEnabled: enabled } });
		return ok(enabled ? m.srv_gifts_on() : m.srv_gifts_off());
	},

	thanked: async ({ request, locals }) => {
		const couple = await requireCouple(locals);
		const p = await parse(
			request,
			z.object({ id: z.coerce.number().int().positive(), thanked: z.enum(['yes', 'no']) })
		);
		if ('error' in p) return p.error;
		await markThanked(couple.id, p.data.id, p.data.thanked === 'yes');
		return ok(m.gifts_thanked());
	},

	payout: async ({ request, locals }) => {
		const couple = await requireCouple(locals);
		const p = await parse(
			request,
			z.object({
				amount: z.coerce.number().positive(),
				destination: z.string().trim().min(5).max(255)
			})
		);
		if ('error' in p) return p.error;
		try {
			await requestGiftPayout(couple.id, locals.user!.id, p.data.amount, p.data.destination);
		} catch (err) {
			if (err instanceof GiftRefused) return bad(err.message);
			throw err;
		}
		return ok(m.srv_payout_requested());
	}
} satisfies Actions;
