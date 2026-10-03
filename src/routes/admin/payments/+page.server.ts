import { and, desc, eq, isNull } from 'drizzle-orm';
import { z } from 'zod/v4';
import { db } from '$lib/server/db';
import { payments, bookingPayments, refunds, couples, vendors, paymentCommissions } from '$lib/server/db/schema';
import { parse, ok, bad } from '$lib/server/adminAction';
import { audit } from '$lib/server/auditLog';
import { toMoney } from '$lib/money';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const [plan, vendor, refundRows] = await Promise.all([
		db
			.select({
				id: payments.id,
				amount: payments.amount,
				method: payments.paymentMethod,
				status: payments.status,
				ref: payments.transactionRef,
				paidAt: payments.paidAt,
				createdAt: payments.createdAt,
				bride: couples.brideName,
				groom: couples.groomName
			})
			.from(payments)
			.leftJoin(couples, eq(couples.id, payments.coupleId))
			.orderBy(desc(payments.createdAt))
			.limit(500),
		db
			.select({
				id: bookingPayments.id,
				amount: bookingPayments.amount,
				method: bookingPayments.paymentMethod,
				type: bookingPayments.paymentType,
				status: bookingPayments.status,
				ref: bookingPayments.transactionReference,
				paidAt: bookingPayments.paidAt,
				createdAt: bookingPayments.createdAt,
				vendor: vendors.businessName,
				commission: paymentCommissions.commissionAmount
			})
			.from(bookingPayments)
			.leftJoin(vendors, eq(vendors.id, bookingPayments.payeeVendorId))
			.leftJoin(paymentCommissions, eq(paymentCommissions.bookingPaymentId, bookingPayments.id))
			.orderBy(desc(bookingPayments.createdAt))
			.limit(500),
		db
			.select({
				id: refunds.id,
				paymentId: refunds.bookingPaymentId,
				amount: refunds.amount,
				reason: refunds.reason,
				status: refunds.status,
				createdAt: refunds.createdAt
			})
			.from(refunds)
			.where(isNull(refunds.deletedAt))
			.orderBy(desc(refunds.createdAt))
			.limit(200)
	]);

	return {
		plan: plan.map((p) => ({
			...p,
			amount: toMoney(p.amount),
			couple: [p.bride, p.groom].filter(Boolean).join(' & ') || '—'
		})),
		vendor: vendor.map((p) => ({ ...p, amount: toMoney(p.amount), commission: p.commission === null ? null : toMoney(p.commission) })),
		refunds: refundRows.map((r) => ({ ...r, amount: toMoney(r.amount) }))
	};
};

const idOnly = z.object({ id: z.coerce.number().int().positive() });

export const actions = {
	approveRefund: async (event) => {
		const p = await parse(event.request, idOnly);
		if ('error' in p) return p.error;
		const result = await db.transaction(async (tx) => {
			// Conditional update = the lock: a double-click can't approve twice.
			const res = await tx
				.update(refunds)
				.set({ status: 'approved' })
				.where(and(eq(refunds.id, p.data.id), eq(refunds.status, 'pending')));
			if (!res[0].affectedRows) return false;
			const [r] = await tx.select({ pid: refunds.bookingPaymentId }).from(refunds).where(eq(refunds.id, p.data.id));
			await tx.update(bookingPayments).set({ status: 'refunded' }).where(eq(bookingPayments.id, r.pid));
			return true;
		});
		if (!result) return bad('Refund is no longer pending');
		await audit(event, 'refund.approve', 'refund', p.data.id);
		return ok('Refund approved — remember to send the money back through the gateway.');
	},
	rejectRefund: async (event) => {
		const p = await parse(event.request, idOnly);
		if ('error' in p) return p.error;
		const res = await db
			.update(refunds)
			.set({ status: 'rejected' })
			.where(and(eq(refunds.id, p.data.id), eq(refunds.status, 'pending')));
		if (!res[0].affectedRows) return bad('Refund is no longer pending');
		await audit(event, 'refund.reject', 'refund', p.data.id);
		return ok('Refund rejected');
	}
} satisfies Actions;
