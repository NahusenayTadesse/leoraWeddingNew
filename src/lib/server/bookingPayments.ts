import { and, desc, eq, isNull, sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import {
	bookingPayments,
	paymentCommissions,
	walletTransactions,
	vendorWallets,
	vendorCommissions,
	commissionSettings
} from '$lib/server/db/schema';
import { toMoney, fromMoney } from '$lib/money';

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * The commission rule for one vendor: their own override in `vendor_commissions`
 * if they have one, otherwise the platform rate in `commission_settings`,
 * otherwise nothing. Returns the commission in birr for a gross amount.
 *
 * Integer cents throughout — 10% of 8,333.33 must not drift by a fraction.
 */
async function commissionFor(tx: Tx, vendorId: number, gross: number): Promise<number> {
	const [override] = await tx
		.select({ type: vendorCommissions.commissionType, value: vendorCommissions.value })
		.from(vendorCommissions)
		.where(eq(vendorCommissions.vendorId, vendorId))
		.orderBy(desc(vendorCommissions.id))
		.limit(1);

	const [platform] = override
		? []
		: await tx
				.select({ type: commissionSettings.commissionType, value: commissionSettings.value })
				.from(commissionSettings)
				.where(and(eq(commissionSettings.isActive, true), isNull(commissionSettings.deletedAt)))
				.orderBy(desc(commissionSettings.id))
				.limit(1);

	const rule = override ?? platform;
	if (!rule) return 0;

	const grossCents = Math.round(gross * 100);
	const value = toMoney(rule.value);
	const cents =
		rule.type === 'percentage' ? Math.round((grossCents * value) / 100) : Math.round(value * 100);
	// A commission can never exceed the payment it is taken from.
	return Math.min(cents, grossCents) / 100;
}

export type PaymentOutcome =
	| { ok: true; commission: number; net: number }
	| { ok: false; reason: 'not_found' | 'not_pending' | 'no_vendor' | 'forbidden' };

/**
 * Moves a pending vendor payment to `confirmed` and does everything that
 * depends on it, in ONE transaction: commission record, vendor wallet credit
 * and ledger rows. Before this existed nothing ever confirmed a payment, so
 * commissions, wallets and payouts stayed empty.
 *
 * Ledger convention (matches the payout action): `amount` is always positive
 * and `transaction_type` gives the direction —
 *   credit      gross payment received
 *   commission  platform cut taken from it
 *   payout      money sent out to the vendor
 * so wallet balance = credits − commissions − payouts.
 *
 * `onlyVendorId` restricts the call to payments addressed to that vendor, so a
 * vendor cannot confirm somebody else's payment by guessing an id.
 */
export async function confirmBookingPayment(
	paymentId: number,
	opts: { onlyVendorId?: number } = {}
): Promise<PaymentOutcome> {
	return db.transaction(async (tx) => {
		// Row lock: two simultaneous confirms serialise, and the loser sees
		// 'confirmed' and stops instead of crediting the wallet twice.
		const [p] = await tx
			.select()
			.from(bookingPayments)
			.where(and(eq(bookingPayments.id, paymentId), isNull(bookingPayments.deletedAt)))
			.for('update');

		if (!p) return { ok: false, reason: 'not_found' } as const;
		if (opts.onlyVendorId !== undefined && p.payeeVendorId !== opts.onlyVendorId) {
			return { ok: false, reason: 'forbidden' } as const;
		}
		if (p.status !== 'pending') return { ok: false, reason: 'not_pending' } as const;
		if (!p.payeeVendorId) return { ok: false, reason: 'no_vendor' } as const;

		const gross = toMoney(p.amount);
		const commission = await commissionFor(tx, p.payeeVendorId, gross);
		const net = Math.round((gross - commission) * 100) / 100;

		await tx
			.update(bookingPayments)
			.set({ status: 'confirmed', paidAt: new Date() })
			.where(eq(bookingPayments.id, p.id));

		await tx.insert(paymentCommissions).values({
			bookingPaymentId: p.id,
			vendorId: p.payeeVendorId,
			grossAmount: fromMoney(gross),
			commissionAmount: fromMoney(commission),
			netAmount: fromMoney(net)
		});

		// Atomic add: no read-modify-write window for a concurrent payout.
		await tx
			.insert(vendorWallets)
			.values({ vendorId: p.payeeVendorId, balance: fromMoney(net) })
			.onDuplicateKeyUpdate({ set: { balance: sql`${vendorWallets.balance} + ${fromMoney(net)}` } });

		await tx.insert(walletTransactions).values({
			vendorId: p.payeeVendorId,
			bookingPaymentId: p.id,
			amount: fromMoney(gross),
			transactionType: 'credit',
			description: `Payment #${p.id}`
		});
		if (commission > 0) {
			await tx.insert(walletTransactions).values({
				vendorId: p.payeeVendorId,
				bookingPaymentId: p.id,
				amount: fromMoney(commission),
				transactionType: 'commission',
				description: `Commission on payment #${p.id}`
			});
		}

		return { ok: true, commission, net } as const;
	});
}

/** "Not received" — a pending payment that never arrived. No money moves. */
export async function failBookingPayment(
	paymentId: number,
	opts: { onlyVendorId?: number } = {}
): Promise<PaymentOutcome> {
	const conditions = [
		eq(bookingPayments.id, paymentId),
		eq(bookingPayments.status, 'pending'),
		isNull(bookingPayments.deletedAt)
	];
	if (opts.onlyVendorId !== undefined) conditions.push(eq(bookingPayments.payeeVendorId, opts.onlyVendorId));

	const res = await db.update(bookingPayments).set({ status: 'failed' }).where(and(...conditions));
	return res[0].affectedRows ? { ok: true, commission: 0, net: 0 } : { ok: false, reason: 'not_pending' };
}

export const paymentFailureMessage: Record<Exclude<PaymentOutcome, { ok: true }>['reason'], string> = {
	not_found: 'Payment not found',
	not_pending: 'This payment is no longer pending',
	no_vendor: 'This payment has no vendor to credit',
	forbidden: 'This payment is not addressed to you'
};
