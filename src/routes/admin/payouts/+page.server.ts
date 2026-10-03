import { and, desc, eq, sql } from 'drizzle-orm';
import { z } from 'zod/v4';
import { db } from '$lib/server/db';
import { vendorPayouts, vendors, vendorWallets, walletTransactions } from '$lib/server/db/schema';
import { parse, ok, bad } from '$lib/server/adminAction';
import { audit } from '$lib/server/auditLog';
import { toMoney, fromMoney } from '$lib/money';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const rows = await db
		.select({
			id: vendorPayouts.id,
			vendorId: vendorPayouts.vendorId,
			vendor: vendors.businessName,
			amount: vendorPayouts.amount,
			method: vendorPayouts.payoutMethod,
			status: vendorPayouts.status,
			reference: vendorPayouts.reference,
			createdAt: vendorPayouts.createdAt,
			balance: vendorWallets.balance
		})
		.from(vendorPayouts)
		.innerJoin(vendors, eq(vendors.id, vendorPayouts.vendorId))
		.leftJoin(vendorWallets, eq(vendorWallets.vendorId, vendorPayouts.vendorId))
		.orderBy(desc(vendorPayouts.createdAt))
		.limit(500);
	return { rows: rows.map((r) => ({ ...r, amount: toMoney(r.amount), balance: toMoney(r.balance) })) };
};

const idOnly = z.object({ id: z.coerce.number().int().positive() });

export const actions = {
	process: async (event) => {
		const p = await parse(event.request, idOnly);
		if ('error' in p) return p.error;
		const res = await db
			.update(vendorPayouts)
			.set({ status: 'processing' })
			.where(and(eq(vendorPayouts.id, p.data.id), eq(vendorPayouts.status, 'requested')));
		if (!res[0].affectedRows) return bad('Payout is no longer in "requested"');
		await audit(event, 'payout.process', 'vendor_payout', p.data.id);
		return ok('Marked as processing');
	},
	reject: async (event) => {
		const p = await parse(event.request, idOnly);
		if ('error' in p) return p.error;
		const res = await db
			.update(vendorPayouts)
			.set({ status: 'rejected' })
			.where(
				and(eq(vendorPayouts.id, p.data.id), sql`${vendorPayouts.status} in ('requested','processing')`)
			);
		if (!res[0].affectedRows) return bad('Payout already settled');
		await audit(event, 'payout.reject', 'vendor_payout', p.data.id);
		return ok('Payout rejected');
	},
	complete: async (event) => {
		const p = await parse(
			event.request,
			idOnly.extend({ reference: z.string().trim().max(150).optional() })
		);
		if ('error' in p) return p.error;
		const outcome = await db.transaction(async (tx) => {
			const [payout] = await tx
				.select()
				.from(vendorPayouts)
				.where(eq(vendorPayouts.id, p.data.id))
				.for('update');
			if (!payout || !['requested', 'processing'].includes(payout.status)) return 'settled' as const;

			const [wallet] = await tx
				.select({ balance: vendorWallets.balance })
				.from(vendorWallets)
				.where(eq(vendorWallets.vendorId, payout.vendorId))
				.for('update');
			const amount = toMoney(payout.amount);
			if (!wallet || toMoney(wallet.balance) < amount) return 'insufficient' as const;

			await tx
				.update(vendorWallets)
				.set({ balance: fromMoney(toMoney(wallet.balance) - amount) })
				.where(eq(vendorWallets.vendorId, payout.vendorId));
			await tx.insert(walletTransactions).values({
				vendorId: payout.vendorId,
				amount: fromMoney(amount),
				transactionType: 'payout',
				description: `Payout #${payout.id}`
			});
			await tx
				.update(vendorPayouts)
				.set({ status: 'completed', reference: p.data.reference || payout.reference })
				.where(eq(vendorPayouts.id, payout.id));
			return 'done' as const;
		});
		if (outcome === 'settled') return bad('Payout already settled');
		if (outcome === 'insufficient') return bad("Vendor's wallet balance is lower than this payout.");
		await audit(event, 'payout.complete', 'vendor_payout', p.data.id);
		return ok('Payout completed and wallet debited');
	}
} satisfies Actions;
