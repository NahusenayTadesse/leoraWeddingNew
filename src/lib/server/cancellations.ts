/**
 * Cancelling a booking under the vendor's cancellation policy. In one transaction the booking is
 * cancelled, the refund share is worked out (`$lib/policy`; always 100% when the vendor cancels)
 * and a pending refund is raised on every confirmed payment for staff to send back. What the policy
 * lets the vendor keep stays on hold until those refunds are settled, then `releaseHeldFunds`
 * releases it.
 */
import { and, eq, inArray, isNull, sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { bookingPayments, refunds, vendorBookings, vendors } from '$lib/server/db/schema';
import { notifyAdmins } from '$lib/server/notify';
import { isoDay } from '$lib/server/availability';
import { formatETB, fromMoney, toMoney } from '$lib/money';
import { refundPercentFor, type CancellationPolicy } from '$lib/policy';

export type CancelOutcome =
	| { ok: true; refundPercent: number; refundTotal: number }
	| { ok: false; reason: 'not_found' | 'already_cancelled' | 'completed' };

export async function cancelBooking(input: {
	bookingId: number;
	by: 'couple' | 'vendor';
	userId: string;
	reason?: string | null;
	/** Restricts the call to the caller's own booking. */
	weddingPlanId?: number;
	vendorId?: number;
}): Promise<CancelOutcome> {
	const outcome = await db.transaction(async (tx) => {
		const conditions = [eq(vendorBookings.id, input.bookingId), isNull(vendorBookings.deletedAt)];
		if (input.weddingPlanId !== undefined)
			conditions.push(eq(vendorBookings.weddingPlanId, input.weddingPlanId));
		if (input.vendorId !== undefined) conditions.push(eq(vendorBookings.vendorId, input.vendorId));

		const [b] = await tx
			.select({
				id: vendorBookings.id,
				status: vendorBookings.status,
				eventDate: vendorBookings.eventDate,
				policy: vendors.cancellationPolicy
			})
			.from(vendorBookings)
			.innerJoin(vendors, eq(vendors.id, vendorBookings.vendorId))
			.where(and(...conditions))
			.for('update');
		if (!b) return { ok: false, reason: 'not_found' } as const;
		if (b.status === 'cancelled') return { ok: false, reason: 'already_cancelled' } as const;
		if (b.status === 'completed') return { ok: false, reason: 'completed' } as const;

		const policy = b.policy as CancellationPolicy;
		const percent =
			input.by === 'vendor'
				? 100
				: refundPercentFor(
						policy,
						b.eventDate ? String(b.eventDate).slice(0, 10) : null,
						isoDay(new Date())
					);

		await tx
			.update(vendorBookings)
			.set({
				status: 'cancelled',
				cancelledBy: input.by,
				cancelledAt: new Date(),
				cancellationReason: input.reason ?? null,
				refundPercent: percent,
				updatedBy: input.userId
			})
			.where(eq(vendorBookings.id, b.id));

		const paid = await tx
			.select({
				id: bookingPayments.id,
				amount: bookingPayments.amount,
				// Already claimed back, so a refund the couple asked for earlier is not paid twice.
				claimed: sql<string>`(SELECT COALESCE(SUM(r.amount), 0) FROM refunds r WHERE r.booking_payment_id = ${bookingPayments.id} AND r.status IN ('pending', 'approved') AND r.deleted_at IS NULL)`
			})
			.from(bookingPayments)
			.where(
				and(
					eq(bookingPayments.bookingId, b.id),
					inArray(bookingPayments.status, ['confirmed']),
					isNull(bookingPayments.deletedAt)
				)
			)
			.for('update');

		const why =
			input.by === 'vendor'
				? 'Cancelled by the vendor: full refund'
				: `Cancelled by the couple: ${percent}% back under the ${policy} policy`;
		let refundTotal = 0;
		for (const p of paid) {
			const owed = Math.round(toMoney(p.amount) * percent) / 100 - toMoney(p.claimed);
			const amount = Math.round(owed * 100) / 100;
			if (amount <= 0) continue;
			await tx.insert(refunds).values({
				bookingPaymentId: p.id,
				amount: fromMoney(amount),
				reason: why,
				status: 'pending',
				createdBy: input.userId
			});
			refundTotal += amount;
		}
		return {
			ok: true,
			refundPercent: percent,
			refundTotal: Math.round(refundTotal * 100) / 100
		} as const;
	});

	if (outcome.ok && outcome.refundTotal > 0) {
		await notifyAdmins({
			type: 'refund_requested',
			title: 'Refund owed on a cancelled booking',
			body: `Booking #${input.bookingId} was cancelled by the ${input.by}; ${formatETB(outcome.refundTotal)} is owed back to the couple.`,
			link: '/admin/payments?tab=refunds'
		});
	}
	return outcome;
}
