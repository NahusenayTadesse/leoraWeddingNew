import { desc, eq, and, isNull } from 'drizzle-orm';
import { z } from 'zod/v4';
import { db } from '$lib/server/db';
import { bookingPayments, weddingPlans, couples, vendorWallets } from '$lib/server/db/schema';
import { requireVendor } from '$lib/server/vendor';
import { parse, ok, bad } from '$lib/server/adminAction';
import { audit } from '$lib/server/auditLog';
import {
	confirmBookingPayment,
	failBookingPayment,
	paymentFailureMessage
} from '$lib/server/bookingPayments';
import { toMoney } from '$lib/money';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const vendor = await requireVendor(locals, '/vendor-dashboard/payments');

	const [rows, [wallet]] = await Promise.all([
		db
			.select({
				id: bookingPayments.id,
				amount: bookingPayments.amount,
				method: bookingPayments.paymentMethod,
				type: bookingPayments.paymentType,
				status: bookingPayments.status,
				reference: bookingPayments.transactionReference,
				createdAt: bookingPayments.createdAt,
				bride: couples.brideName,
				groom: couples.groomName
			})
			.from(bookingPayments)
			.leftJoin(weddingPlans, eq(weddingPlans.id, bookingPayments.weddingPlanId))
			.leftJoin(couples, eq(couples.id, weddingPlans.coupleId))
			.where(and(eq(bookingPayments.payeeVendorId, vendor.id), isNull(bookingPayments.deletedAt)))
			.orderBy(desc(bookingPayments.createdAt)),
		db
			.select({ balance: vendorWallets.balance })
			.from(vendorWallets)
			.where(eq(vendorWallets.vendorId, vendor.id))
	]);

	return {
		balance: toMoney(wallet?.balance),
		rows: rows.map((r) => ({
			...r,
			amount: toMoney(r.amount),
			couple: [r.bride, r.groom].filter(Boolean).join(' & ') || 'Couple'
		}))
	};
};

const idOnly = z.object({ id: z.coerce.number().int().positive() });

export const actions = {
	confirm: async (event) => {
		const vendor = await requireVendor(event.locals);
		const p = await parse(event.request, idOnly);
		if ('error' in p) return p.error;
		const r = await confirmBookingPayment(p.data.id, { onlyVendorId: vendor.id });
		if (!r.ok) return bad(paymentFailureMessage[r.reason]);
		await audit(event, 'payment.confirm', 'booking_payment', p.data.id, { by: 'vendor', commission: r.commission });
		return ok(`Payment confirmed. ${r.net.toFixed(2)} ETB added to your wallet after ${r.commission.toFixed(2)} ETB commission.`);
	},
	reject: async (event) => {
		const vendor = await requireVendor(event.locals);
		const p = await parse(event.request, idOnly);
		if ('error' in p) return p.error;
		const r = await failBookingPayment(p.data.id, { onlyVendorId: vendor.id });
		if (!r.ok) return bad(paymentFailureMessage[r.reason]);
		await audit(event, 'payment.fail', 'booking_payment', p.data.id, { by: 'vendor' });
		return ok('Marked as not received');
	}
} satisfies Actions;
