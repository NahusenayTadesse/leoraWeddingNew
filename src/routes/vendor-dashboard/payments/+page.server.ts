import { desc, eq, and, isNull, inArray, sql } from 'drizzle-orm';
import { z } from 'zod/v4';
import { db } from '$lib/server/db';
import {
	bookingPayments,
	weddingPlans,
	couples,
	vendorWallets,
	vendorPayouts,
	roles,
	user
} from '$lib/server/db/schema';
import { requireVendor } from '$lib/server/vendor';
import { parse, ok, bad } from '@nahu/admin-kit/server/actionResults';
import { audit } from '$lib/server/auditLog';
import { notify } from '$lib/server/notify';
import { formatETB, fromMoney, toMoney } from '$lib/money';
import type { Actions, PageServerLoad } from './$types';

/** Money already asked for and not yet paid out or rejected. */
async function openPayoutTotal(vendorId: number) {
	const [row] = await db
		.select({ total: sql<string>`coalesce(sum(${vendorPayouts.amount}), 0)` })
		.from(vendorPayouts)
		.where(
			and(
				eq(vendorPayouts.vendorId, vendorId),
				inArray(vendorPayouts.status, ['requested', 'processing'])
			)
		);
	return toMoney(row?.total);
}

/**
 * Couples pay through Leora (Chapa, or a transfer staff confirm), so this page only shows what
 * arrived and what the wallet holds (on hold until the service is delivered, then withdrawable); vendors no longer confirm payments themselves. From here
 * they ask for a payout, which an admin completes on /admin/payouts.
 */
export const load: PageServerLoad = async ({ locals }) => {
	const vendor = await requireVendor(locals, '/vendor-dashboard/payments');

	const [rows, [wallet], payouts, open] = await Promise.all([
		db
			.select({
				id: bookingPayments.id,
				amount: bookingPayments.amount,
				method: bookingPayments.paymentMethod,
				type: bookingPayments.paymentType,
				status: bookingPayments.status,
				releasedAt: bookingPayments.releasedAt,
				createdAt: bookingPayments.createdAt,
				bride: couples.brideName,
				groom: couples.groomName
			})
			.from(bookingPayments)
			.leftJoin(weddingPlans, eq(weddingPlans.id, bookingPayments.weddingPlanId))
			.leftJoin(couples, eq(couples.id, weddingPlans.coupleId))
			.where(
				and(
					eq(bookingPayments.payeeVendorId, vendor.id),
					isNull(bookingPayments.deletedAt),
					// Unfinished or abandoned online checkouts are not payments yet.
					sql`NOT (${bookingPayments.paymentMethod} = 'chapa' AND ${bookingPayments.status} IN ('pending', 'failed'))`
				)
			)
			.orderBy(desc(bookingPayments.createdAt)),
		db
			.select({ balance: vendorWallets.balance, held: vendorWallets.heldBalance })
			.from(vendorWallets)
			.where(eq(vendorWallets.vendorId, vendor.id)),
		db
			.select()
			.from(vendorPayouts)
			.where(eq(vendorPayouts.vendorId, vendor.id))
			.orderBy(desc(vendorPayouts.createdAt))
			.limit(50),
		openPayoutTotal(vendor.id)
	]);

	const balance = toMoney(wallet?.balance);
	return {
		balance,
		held: toMoney(wallet?.held),
		available: Math.max(0, Math.round((balance - open) * 100) / 100),
		rows: rows.map(({ releasedAt, ...r }) => ({
			...r,
			// A confirmed payment is either still held until delivery or released to the wallet.
			status: r.status === 'confirmed' ? (releasedAt ? 'released' : 'held') : r.status,
			amount: toMoney(r.amount),
			couple: [r.bride, r.groom].filter(Boolean).join(' & ') || 'Couple'
		})),
		payouts: payouts.map((p) => ({ ...p, amount: toMoney(p.amount) }))
	};
};

const payoutSchema = z.object({
	amount: z.coerce.number().positive('Enter an amount'),
	payoutMethod: z.enum(['bank_transfer', 'mobile_money']),
	destination: z.string().trim().min(5, 'Say where to send it').max(255)
});

export const actions = {
	requestPayout: async (event) => {
		const vendor = await requireVendor(event.locals);
		const p = await parse(event.request, payoutSchema);
		if ('error' in p) return p.error;

		const created = await db.transaction(async (tx) => {
			// Lock the wallet so two requests can't both pass the balance check.
			const [wallet] = await tx
				.select({ balance: vendorWallets.balance })
				.from(vendorWallets)
				.where(eq(vendorWallets.vendorId, vendor.id))
				.for('update');
			const [open] = await tx
				.select({ total: sql<string>`coalesce(sum(${vendorPayouts.amount}), 0)` })
				.from(vendorPayouts)
				.where(
					and(
						eq(vendorPayouts.vendorId, vendor.id),
						inArray(vendorPayouts.status, ['requested', 'processing'])
					)
				);
			const available = toMoney(wallet?.balance) - toMoney(open?.total);
			if (p.data.amount > available + 0.005) return null;

			const [row] = await tx
				.insert(vendorPayouts)
				.values({
					vendorId: vendor.id,
					amount: fromMoney(p.data.amount),
					payoutMethod: p.data.payoutMethod,
					destination: p.data.destination,
					status: 'requested'
				})
				.$returningId();
			return row.id;
		});

		if (!created) return bad('That is more than your available balance.');
		await audit(event, 'payout.request', 'vendor_payout', created, { amount: p.data.amount });

		const admins = await db
			.select({ id: user.id })
			.from(user)
			.innerJoin(roles, eq(user.roleId, roles.id))
			.where(eq(roles.name, 'Admin'));
		await Promise.all(
			admins.map((a) =>
				notify(a.id, {
					type: 'payout_requested',
					title: 'Payout requested',
					body: `${vendor.businessName ?? 'A vendor'} asked for ${formatETB(p.data.amount)}.`,
					link: '/admin/payouts',
					email: false
				})
			)
		);
		return ok("Payout requested. We'll let you know when it's sent.");
	}
} satisfies Actions;
