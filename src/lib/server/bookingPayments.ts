import { and, desc, eq, inArray, isNotNull, isNull, lte, or, sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import {
	bookingPayments,
	paymentCommissions,
	walletTransactions,
	vendorWallets,
	vendorCommissions,
	commissionSettings,
	refunds,
	vendorBookings,
	disputes,
	vendors,
	weddingPlans,
	couples
} from '$lib/server/db/schema';
import { notify } from '$lib/server/notify';
import { isoDay } from '$lib/server/availability';
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
 * and ledger rows. The vendor's share goes to `held_balance`, not the
 * withdrawable `balance`; `releasePayment` moves it once the service is delivered. Before this existed nothing ever confirmed a payment, so
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
	opts: {
		onlyVendorId?: number;
		/** Extra columns to set with the confirmation (verify payload, reviewer…). */
		extra?: Partial<typeof bookingPayments.$inferInsert>;
	} = {}
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
			.set({ status: 'confirmed', paidAt: new Date(), verifiedAt: new Date(), ...opts.extra })
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
			.values({ vendorId: p.payeeVendorId, heldBalance: fromMoney(net) })
			.onDuplicateKeyUpdate({
				set: { heldBalance: sql`${vendorWallets.heldBalance} + ${fromMoney(net)}` }
			});

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
	if (opts.onlyVendorId !== undefined)
		conditions.push(eq(bookingPayments.payeeVendorId, opts.onlyVendorId));

	const res = await db
		.update(bookingPayments)
		.set({ status: 'failed' })
		.where(and(...conditions));
	return res[0].affectedRows
		? { ok: true, commission: 0, net: 0 }
		: { ok: false, reason: 'not_pending' };
}

export const paymentFailureMessage: Record<
	Exclude<PaymentOutcome, { ok: true }>['reason'],
	string
> = {
	not_found: 'Payment not found',
	not_pending: 'This payment is no longer pending',
	no_vendor: 'This payment has no vendor to credit',
	forbidden: 'This payment is not addressed to you'
};

/**
 * Approves a pending refund in one transaction: the refund becomes `approved`, the payment
 * `refunded`, and — if the payment had been confirmed — the vendor's wallet gives back its share
 * of the refunded amount (the platform gives back its commission share), with a `debit` ledger
 * row. Without the debit, a refunded payment stayed spendable in the vendor's wallet.
 *
 * The money itself goes back to the couple outside the app (Chapa dashboard or bank transfer).
 * A payment still on hold is debited from `held_balance`, so the vendor never had it. Once
 * released, the withdrawable balance may go negative if the vendor was already paid out; that is
 * what they owe.
 */
export async function approveRefund(
	refundId: number
): Promise<{ ok: true; debited: number } | { ok: false; reason: string }> {
	return db.transaction(async (tx) => {
		const [refund] = await tx.select().from(refunds).where(eq(refunds.id, refundId)).for('update');
		if (!refund || refund.status !== 'pending') {
			return { ok: false, reason: 'Refund is no longer pending' } as const;
		}
		const [payment] = await tx
			.select()
			.from(bookingPayments)
			.where(eq(bookingPayments.id, refund.bookingPaymentId))
			.for('update');
		if (!payment) return { ok: false, reason: 'Payment not found' } as const;

		await tx.update(refunds).set({ status: 'approved' }).where(eq(refunds.id, refund.id));

		// `refunded` means all of it came back; a partial refund leaves the payment confirmed and
		// balances subtract approved refunds (see bookingBalance / listBookings).
		const [approved] = await tx
			.select({ total: sql<string>`coalesce(sum(${refunds.amount}), 0)` })
			.from(refunds)
			.where(and(eq(refunds.bookingPaymentId, payment.id), eq(refunds.status, 'approved')));
		if (toMoney(approved?.total) + 0.005 >= toMoney(payment.amount)) {
			await tx
				.update(bookingPayments)
				.set({ status: 'refunded' })
				.where(eq(bookingPayments.id, payment.id));
		}

		let debited = 0;
		if (payment.status === 'confirmed' && payment.payeeVendorId) {
			const [commission] = await tx
				.select()
				.from(paymentCommissions)
				.where(eq(paymentCommissions.bookingPaymentId, payment.id))
				.limit(1);
			const gross = toMoney(payment.amount);
			const net = commission ? toMoney(commission.netAmount) : gross;
			const refundAmount = Math.min(toMoney(refund.amount), gross);
			debited = gross > 0 ? Math.round(((refundAmount * net) / gross) * 100) / 100 : 0;

			if (debited > 0) {
				// Still held: take it back from the hold. Released: from what the vendor can withdraw.
				const amount = fromMoney(debited);
				await tx
					.update(vendorWallets)
					.set(
						payment.releasedAt
							? { balance: sql`${vendorWallets.balance} - ${amount}` }
							: { heldBalance: sql`${vendorWallets.heldBalance} - ${amount}` }
					)
					.where(eq(vendorWallets.vendorId, payment.payeeVendorId));
				await tx.insert(walletTransactions).values({
					vendorId: payment.payeeVendorId,
					bookingPaymentId: payment.id,
					amount: fromMoney(debited),
					transactionType: 'debit',
					description: `Refund #${refund.id} on payment #${payment.id}`
				});
			}
		}
		return { ok: true, debited } as const;
	});
}

/** Days after the event date before held money is released without the couple's say-so. */
export const RELEASE_AFTER_DAYS = 3;

/** Disputes that freeze a booking's held money until staff settle them. */
const OPEN_DISPUTE = ['open', 'under_review'] as const;

async function hasOpenDispute(tx: Tx, bookingId: number) {
	const [row] = await tx
		.select({ id: disputes.id })
		.from(disputes)
		.where(and(eq(disputes.bookingId, bookingId), inArray(disputes.status, [...OPEN_DISPUTE])))
		.limit(1);
	return !!row;
}

/**
 * Moves one confirmed payment's held share into the vendor's withdrawable balance. The amount is
 * the net credited at confirmation minus any refunds already taken back from the hold. Idempotent:
 * a released or unconfirmed payment is left alone and 0 is returned.
 */
export async function releasePayment(tx: Tx, paymentId: number): Promise<number> {
	const [p] = await tx
		.select()
		.from(bookingPayments)
		.where(eq(bookingPayments.id, paymentId))
		.for('update');
	if (!p || p.status !== 'confirmed' || p.releasedAt || !p.payeeVendorId) return 0;

	const [commission] = await tx
		.select({ net: paymentCommissions.netAmount })
		.from(paymentCommissions)
		.where(eq(paymentCommissions.bookingPaymentId, p.id))
		.limit(1);
	const [refunded] = await tx
		.select({ total: sql<string>`coalesce(sum(${walletTransactions.amount}), 0)` })
		.from(walletTransactions)
		.where(
			and(
				eq(walletTransactions.bookingPaymentId, p.id),
				eq(walletTransactions.transactionType, 'debit')
			)
		);
	const net = commission ? toMoney(commission.net) : 0;
	const amount = Math.max(0, Math.round((net - toMoney(refunded?.total)) * 100) / 100);

	await tx
		.update(bookingPayments)
		.set({ releasedAt: new Date() })
		.where(eq(bookingPayments.id, p.id));
	if (amount > 0) {
		await tx
			.update(vendorWallets)
			.set({
				heldBalance: sql`${vendorWallets.heldBalance} - ${fromMoney(amount)}`,
				balance: sql`${vendorWallets.balance} + ${fromMoney(amount)}`
			})
			.where(eq(vendorWallets.vendorId, p.payeeVendorId));
		await tx.insert(walletTransactions).values({
			vendorId: p.payeeVendorId,
			bookingPaymentId: p.id,
			amount: fromMoney(amount),
			transactionType: 'release',
			description: `Released payment #${p.id}`
		});
	}
	return amount;
}

/**
 * Releases every held payment on a booking, unless a dispute is open or a refund is waiting.
 * Returns the total released (0 when blocked or nothing was held).
 */
async function releaseBooking(tx: Tx, bookingId: number): Promise<number> {
	if (await hasOpenDispute(tx, bookingId)) return 0;
	const held = await tx
		.select({ id: bookingPayments.id })
		.from(bookingPayments)
		.where(
			and(
				eq(bookingPayments.bookingId, bookingId),
				eq(bookingPayments.status, 'confirmed'),
				isNull(bookingPayments.releasedAt),
				isNull(bookingPayments.deletedAt),
				sql`NOT EXISTS (SELECT 1 FROM refunds r WHERE r.booking_payment_id = ${bookingPayments.id} AND r.status = 'pending')`
			)
		);
	let total = 0;
	for (const { id } of held) total += await releasePayment(tx, id);
	return Math.round(total * 100) / 100;
}

async function announceRelease(bookingId: number, amount: number) {
	if (amount <= 0) return;
	const [row] = await db
		.select({ userId: vendors.userId })
		.from(vendorBookings)
		.innerJoin(vendors, eq(vendors.id, vendorBookings.vendorId))
		.where(eq(vendorBookings.id, bookingId));
	await notify(row?.userId, {
		type: 'funds_released',
		title: 'Payment released',
		body: `ETB ${fromMoney(amount)} from booking #${bookingId} is now available to withdraw.`,
		link: '/vendor-dashboard/payments'
	});
}

/** Once a booking is completed, the couple is asked how it went. */
async function askForReview(bookingIds: number[]) {
	if (!bookingIds.length) return;
	const rows = await db
		.select({
			vendorId: vendors.id,
			vendor: vendors.businessName,
			partner1: couples.partner1UserId,
			partner2: couples.partner2UserId
		})
		.from(vendorBookings)
		.innerJoin(vendors, eq(vendors.id, vendorBookings.vendorId))
		.innerJoin(weddingPlans, eq(weddingPlans.id, vendorBookings.weddingPlanId))
		.innerJoin(couples, eq(couples.id, weddingPlans.coupleId))
		.where(inArray(vendorBookings.id, bookingIds));
	for (const r of rows) {
		const notice = {
			type: 'review_request',
			title: `How was ${r.vendor}?`,
			body: 'A short review helps other couples choose, and helps good vendors get found.',
			link: `/vendors/${r.vendorId}?tab=reviews`
		};
		await notify(r.partner1, notice);
		if (r.partner2) await notify(r.partner2, notice);
	}
}

export type CompleteOutcome =
	| { ok: true; released: number; heldByDispute: boolean }
	| { ok: false; reason: 'not_found' | 'not_confirmed' | 'too_early' };

/**
 * The couple confirms the service was delivered: the booking becomes `completed` and its held
 * money is released at once (unless a dispute is open; the release job retries once it is settled).
 * Allowed from the event date on, so a vendor can't be marked done before the day.
 */
export async function completeBooking(
	bookingId: number,
	weddingPlanId: number,
	userId: string
): Promise<CompleteOutcome> {
	const outcome = await db.transaction(async (tx) => {
		const [b] = await tx
			.select()
			.from(vendorBookings)
			.where(
				and(
					eq(vendorBookings.id, bookingId),
					eq(vendorBookings.weddingPlanId, weddingPlanId),
					isNull(vendorBookings.deletedAt)
				)
			)
			.for('update');
		if (!b) return { ok: false, reason: 'not_found' } as const;
		if (b.status !== 'confirmed') return { ok: false, reason: 'not_confirmed' } as const;
		if (!b.eventDate || String(b.eventDate).slice(0, 10) > isoDay(new Date())) {
			return { ok: false, reason: 'too_early' } as const;
		}
		await tx
			.update(vendorBookings)
			.set({ status: 'completed', completedAt: new Date(), updatedBy: userId })
			.where(eq(vendorBookings.id, b.id));
		const heldByDispute = await hasOpenDispute(tx, b.id);
		const released = heldByDispute ? 0 : await releaseBooking(tx, b.id);
		return { ok: true, released, heldByDispute } as const;
	});
	if (outcome.ok) {
		await announceRelease(bookingId, outcome.released);
		await askForReview([bookingId]);
	}
	return outcome;
}

/**
 * Daily job. Confirmed bookings whose event is `RELEASE_AFTER_DAYS` past with no open dispute
 * become `completed`; then every completed booking's held money is released once each payment is
 * itself `RELEASE_AFTER_DAYS` old, again skipping open disputes and pending refunds. A booking
 * cancelled under the policy (`cancelBooking`) releases what the vendor keeps the same way, once
 * its refunds are settled; one cancelled any other way waits for staff. Returns the number of bookings that had money released.
 */
export async function releaseHeldFunds(): Promise<number> {
	const cutoff = isoDay(new Date(Date.now() - RELEASE_AFTER_DAYS * 24 * 3600_000));
	const finished = and(
		eq(vendorBookings.status, 'confirmed'),
		lte(vendorBookings.eventDate, cutoff),
		isNull(vendorBookings.deletedAt),
		sql`NOT EXISTS (SELECT 1 FROM disputes d WHERE d.booking_id = ${vendorBookings.id} AND d.status IN ('open', 'under_review'))`
	);
	const toComplete = await db
		.select({ id: vendorBookings.id })
		.from(vendorBookings)
		.where(finished);
	if (toComplete.length) {
		const ids = toComplete.map((b) => b.id);
		await db
			.update(vendorBookings)
			.set({ status: 'completed', completedAt: new Date() })
			.where(and(inArray(vendorBookings.id, ids), finished));
		await askForReview(ids);
	}

	const due = await db
		.selectDistinct({ bookingId: vendorBookings.id })
		.from(bookingPayments)
		.innerJoin(vendorBookings, eq(vendorBookings.id, bookingPayments.bookingId))
		.where(
			and(
				or(
					eq(vendorBookings.status, 'completed'),
					// Cancelled under the policy: the vendor's kept share, once the refunds are settled.
					and(eq(vendorBookings.status, 'cancelled'), isNotNull(vendorBookings.refundPercent))
				),
				eq(bookingPayments.status, 'confirmed'),
				isNull(bookingPayments.releasedAt),
				isNull(bookingPayments.deletedAt),
				// A payment made after the event still gets the full window for a complaint.
				lte(bookingPayments.paidAt, new Date(Date.now() - RELEASE_AFTER_DAYS * 24 * 3600_000))
			)
		);
	let count = 0;
	for (const { bookingId } of due) {
		const released = await db.transaction((tx) => releaseBooking(tx, bookingId));
		if (released > 0) {
			count++;
			await announceRelease(bookingId, released);
		}
	}
	return count;
}

/**
 * Staff override: release a booking's held money now, whatever its status (for example a
 * cancelled booking whose deposit the vendor keeps). Still refuses while a dispute is open.
 */
export async function releaseBookingNow(
	bookingId: number
): Promise<{ ok: true; released: number } | { ok: false; reason: string }> {
	const result = await db.transaction(async (tx) => {
		if (await hasOpenDispute(tx, bookingId)) {
			return { ok: false, reason: 'Settle the open dispute first' } as const;
		}
		return { ok: true, released: await releaseBooking(tx, bookingId) } as const;
	});
	if (result.ok) await announceRelease(bookingId, result.released);
	return result;
}
