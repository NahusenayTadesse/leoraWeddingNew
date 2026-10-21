import { and, desc, eq, sql } from 'drizzle-orm';
import { z } from 'zod/v4';
import { db } from '$lib/server/db';
import { couples, giftPayouts, weddingGifts } from '$lib/server/db/schema';
import { parse, ok, bad } from '@nahu/admin-kit/server/actionResults';
import { audit } from '$lib/server/auditLog';
import { notify } from '$lib/server/notify';
import { formatETB, toMoney } from '$lib/money';
import type { Actions, PageServerLoad } from './$types';

/** Couples asking for their gift money, and the gift totals behind it. */
export const load: PageServerLoad = async () => {
	const [requests, [totals]] = await Promise.all([
		db
			.select({
				id: giftPayouts.id,
				amount: giftPayouts.amount,
				destination: giftPayouts.destination,
				status: giftPayouts.status,
				reference: giftPayouts.reference,
				createdAt: giftPayouts.createdAt,
				couple: sql<string>`concat_ws(' & ', ${couples.brideName}, ${couples.groomName})`
			})
			.from(giftPayouts)
			.innerJoin(couples, eq(couples.id, giftPayouts.coupleId))
			.orderBy(sql`${giftPayouts.status} = 'requested' DESC`, desc(giftPayouts.createdAt))
			.limit(200),
		db
			.select({
				paid: sql<string>`COALESCE(SUM(${weddingGifts.amount}), 0)`,
				count: sql<number>`COUNT(*)`
			})
			.from(weddingGifts)
			.where(eq(weddingGifts.status, 'paid'))
	]);
	return {
		requests: requests.map((r) => ({ ...r, amount: toMoney(r.amount) })),
		totals: { paid: toMoney(totals?.paid), count: Number(totals?.count ?? 0) }
	};
};

const settleSchema = z.object({
	id: z.coerce.number().int().positive(),
	outcome: z.enum(['completed', 'rejected']),
	reference: z.string().trim().max(150).optional()
});

export const actions = {
	settle: async (event) => {
		const p = await parse(event.request, settleSchema);
		if ('error' in p) return p.error;
		const [res] = await db
			.update(giftPayouts)
			.set({ status: p.data.outcome, reference: p.data.reference || null })
			.where(and(eq(giftPayouts.id, p.data.id), eq(giftPayouts.status, 'requested')));
		if (!res.affectedRows) return bad('This request is already settled');

		const [row] = await db
			.select({
				amount: giftPayouts.amount,
				partner1: couples.partner1UserId,
				partner2: couples.partner2UserId
			})
			.from(giftPayouts)
			.innerJoin(couples, eq(couples.id, giftPayouts.coupleId))
			.where(eq(giftPayouts.id, p.data.id));
		const sent = p.data.outcome === 'completed';
		const notice = {
			type: 'gift_payout',
			title: sent ? 'Your gifts are on their way' : 'Gift transfer declined',
			body: sent
				? `We sent ${formatETB(toMoney(row?.amount))}${p.data.reference ? ` (ref ${p.data.reference})` : ''}.`
				: 'We could not send this transfer. The amount is available again; check the details and ask again.',
			link: '/wedding/gifts'
		};
		await notify(row?.partner1, notice);
		if (row?.partner2) await notify(row.partner2, notice);
		await audit(event, `gift_payout.${p.data.outcome}`, 'gift_payout', p.data.id);
		return ok(sent ? 'Marked sent' : 'Declined');
	}
} satisfies Actions;
