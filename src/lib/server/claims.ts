/**
 * Things a couple or vendor raises for staff to decide: refund requests (on a confirmed
 * payment) and disputes (on a booking). Both land on the admin Payments → Refunds and Disputes
 * pages; approving a refund is `approveRefund` in bookingPayments.ts.
 */
import { and, eq, inArray, isNull, sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import {
	bookingPayments,
	couples,
	disputes,
	refunds,
	vendorBookings,
	vendors,
	weddingPlans
} from '$lib/server/db/schema';
import { notify, notifyAdmins } from '$lib/server/notify';
import { formatETB, fromMoney, toMoney } from '$lib/money';
import { m } from '$lib/paraglide/messages.js';

export class ClaimRefused extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'ClaimRefused';
	}
}

/**
 * A couple asks for (part of) a confirmed payment back. The amount is capped at what is left
 * after earlier pending or approved refunds on the same payment.
 */
export async function requestRefund(input: {
	paymentId: number;
	weddingPlanId: number;
	userId: string;
	amount: number;
	reason: string;
}) {
	const [payment] = await db
		.select({
			id: bookingPayments.id,
			amount: bookingPayments.amount,
			status: bookingPayments.status,
			weddingPlanId: bookingPayments.weddingPlanId
		})
		.from(bookingPayments)
		.where(and(eq(bookingPayments.id, input.paymentId), isNull(bookingPayments.deletedAt)));

	if (!payment || payment.weddingPlanId !== input.weddingPlanId) {
		throw new ClaimRefused(m.srv_payment_not_yours());
	}
	if (payment.status !== 'confirmed') {
		throw new ClaimRefused(m.srv_refund_confirmed_only());
	}

	const [claimed] = await db
		.select({ total: sql<string>`coalesce(sum(${refunds.amount}), 0)` })
		.from(refunds)
		.where(
			and(
				eq(refunds.bookingPaymentId, payment.id),
				inArray(refunds.status, ['pending', 'approved']),
				isNull(refunds.deletedAt)
			)
		);
	const left = toMoney(payment.amount) - toMoney(claimed?.total);
	if (left <= 0) throw new ClaimRefused(m.srv_refund_twice());
	if (!(input.amount > 0) || input.amount > left + 0.005) {
		throw new ClaimRefused(m.srv_refund_up_to({ amount: formatETB(left) }));
	}

	await db.insert(refunds).values({
		bookingPaymentId: payment.id,
		amount: fromMoney(input.amount),
		reason: input.reason,
		status: 'pending',
		createdBy: input.userId
	});

	await notifyAdmins({
		type: 'refund_requested',
		title: 'Refund requested',
		body: `A couple asked for ${formatETB(input.amount)} back on payment #${payment.id}.`,
		link: '/admin/payments?tab=refunds'
	});
}

/** The couple and vendor user ids on a booking, for telling both sides about a dispute. */
async function partiesOf(bookingId: number) {
	const [row] = await db
		.select({
			vendorUserId: vendors.userId,
			vendorName: vendors.businessName,
			partner1: couples.partner1UserId,
			partner2: couples.partner2UserId
		})
		.from(vendorBookings)
		.innerJoin(vendors, eq(vendors.id, vendorBookings.vendorId))
		.innerJoin(weddingPlans, eq(weddingPlans.id, vendorBookings.weddingPlanId))
		.innerJoin(couples, eq(couples.id, weddingPlans.coupleId))
		.where(eq(vendorBookings.id, bookingId));
	return row ?? null;
}

/** Either side of a booking reports a problem for staff to look into. One open dispute at a time. */
export async function openDispute(input: {
	bookingId: number;
	raisedBy: 'couple' | 'vendor';
	reason: string;
}) {
	const [open] = await db
		.select({ id: disputes.id })
		.from(disputes)
		.where(
			and(
				eq(disputes.bookingId, input.bookingId),
				inArray(disputes.status, ['open', 'under_review'])
			)
		)
		.limit(1);
	if (open) throw new ClaimRefused(m.srv_open_dispute());

	await db.insert(disputes).values({
		bookingId: input.bookingId,
		raisedBy: input.raisedBy,
		reason: input.reason,
		status: 'open'
	});

	const parties = await partiesOf(input.bookingId);
	await notifyAdmins({
		type: 'dispute_opened',
		title: 'New dispute',
		body: `A ${input.raisedBy} reported a problem with booking #${input.bookingId}.`,
		link: '/admin/disputes'
	});
	// The other side should hear it from us, not discover it later.
	if (parties) {
		if (input.raisedBy === 'couple') {
			await notify(parties.vendorUserId, {
				type: 'dispute_opened',
				title: 'A couple reported a problem',
				body: `A couple opened a dispute on booking #${input.bookingId}. Our team will be in touch.`,
				link: '/vendor-dashboard/bookings'
			});
		} else {
			await notify(parties.partner1, {
				type: 'dispute_opened',
				title: 'Your vendor reported a problem',
				body: `${parties.vendorName ?? 'Your vendor'} opened a dispute on a booking. Our team will be in touch.`,
				link: '/wedding/bookings'
			});
		}
	}
}

/** Tells both sides of a booking that staff changed its dispute. */
export async function announceDisputeUpdate(
	disputeId: number,
	status: string,
	notes: string | null
) {
	const [d] = await db
		.select({ bookingId: disputes.bookingId })
		.from(disputes)
		.where(eq(disputes.id, disputeId));
	if (!d) return;
	const parties = await partiesOf(d.bookingId);
	if (!parties) return;
	const body = `Dispute on booking #${d.bookingId} is now "${status.replace('_', ' ')}".${notes ? ` ${notes}` : ''}`;
	await Promise.all([
		notify(parties.partner1, {
			type: 'dispute_update',
			title: 'Dispute update',
			body,
			link: '/wedding/bookings'
		}),
		notify(parties.vendorUserId, {
			type: 'dispute_update',
			title: 'Dispute update',
			body,
			link: '/vendor-dashboard/bookings'
		})
	]);
}
