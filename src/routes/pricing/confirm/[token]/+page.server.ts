import { error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { payments, subscriptionPlans } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { chapa, decodeCheckoutToken } from '$lib/server/chapa';
import { activateSubscription } from '$lib/server/subscriptions';
import { toMoney } from '$lib/money';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const decoded = decodeCheckoutToken(params.token);
	if (!decoded) throw error(400, 'This confirmation link is invalid.');

	const [payment] = await db
		.select()
		.from(payments)
		.where(eq(payments.transactionRef, decoded.txRef))
		.limit(1);
	if (!payment) throw error(404, 'Payment not found.');

	const [plan] = await db
		.select({ id: subscriptionPlans.id, name: subscriptionPlans.name })
		.from(subscriptionPlans)
		.where(eq(subscriptionPlans.id, decoded.subjectId))
		.limit(1);
	if (!plan) throw error(404, 'Plan not found.');

	// Chapa is the only party that can say a payment succeeded — this page
	// just asks it and records the answer. Once the payment has settled one
	// way or the other, re-verifying on every reload of this link would be
	// pointless and just adds a network round trip.
	let status = payment.status;
	if (status === 'pending') {
		try {
			const verification = await chapa.verify({ tx_ref: decoded.txRef });
			const paid = verification?.data?.status === 'success';
			status = paid ? 'completed' : 'failed';

			await db.update(payments).set({ status, paidAt: paid ? new Date() : null }).where(eq(payments.id, payment.id));

			if (paid && payment.coupleId) {
				const activated = await activateSubscription(payment.coupleId, plan.id);
				if (activated) {
					await db
						.update(payments)
						.set({ subscriptionId: activated.subscriptionId })
						.where(eq(payments.id, payment.id));
				}
			}
		} catch (err) {
			console.error('Chapa verify error:', err);
			// Leave status as 'pending' — the customer can refresh, or the
			// payment can be reconciled later without losing anything.
		}
	}

	return {
		status,
		planName: plan.name,
		amount: toMoney(payment.amount)
	};
};
