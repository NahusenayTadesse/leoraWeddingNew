/**
 * Background work for one Node process, started from `init` in hooks.server.ts:
 *
 *   every 10 min  reconcile-payments  re-verify Chapa attempts nobody came back for
 *   daily         expire-plans        end couple and vendor subscriptions past their date
 *   daily         plan-reminders      tell vendors their plan ends in 3 days
 *
 * With several app processes, run jobs in one only (RUN_JOBS=false on the others).
 */
import { and, eq, lt, sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { subscriptions, vendorSubscriptions, vendors, subscriptionPlans } from '$lib/server/db/schema';
import { reconcileStale } from '$lib/server/payments';
import { notify } from '$lib/server/notify';
import { isoDay } from '$lib/server/availability';

export async function expirePlans() {
	const today = isoDay(new Date());
	const [couples] = await db
		.update(subscriptions)
		.set({ status: 'expired' })
		.where(and(eq(subscriptions.status, 'active'), lt(subscriptions.expiresAt, new Date())));
	const [vendorPlans] = await db
		.update(vendorSubscriptions)
		.set({ status: 'expired' })
		.where(and(eq(vendorSubscriptions.status, 'active'), lt(vendorSubscriptions.endsAt, today)));
	return couples.affectedRows + vendorPlans.affectedRows;
}

export async function remindExpiringVendorPlans() {
	const inThreeDays = isoDay(new Date(Date.now() + 3 * 24 * 3600_000));
	const rows = await db
		.select({ userId: vendors.userId, plan: subscriptionPlans.name, endsAt: vendorSubscriptions.endsAt })
		.from(vendorSubscriptions)
		.innerJoin(vendors, eq(vendors.id, vendorSubscriptions.vendorId))
		.innerJoin(subscriptionPlans, eq(subscriptionPlans.id, vendorSubscriptions.planId))
		.where(and(eq(vendorSubscriptions.status, 'active'), sql`${vendorSubscriptions.endsAt} = ${inThreeDays}`));
	for (const r of rows) {
		await notify(r.userId, {
			type: 'plan_expiring',
			title: 'Your plan ends soon',
			body: `Your ${r.plan} plan ends on ${r.endsAt}. Renew from your dashboard to keep its benefits.`,
			link: '/vendor-dashboard/plan'
		});
	}
	return rows.length;
}

let lastDaily = '';

/** One tick: reconcile always, the daily jobs once per calendar day. */
export async function runJobs() {
	await reconcileStale().catch((err) => console.error('[jobs] reconcile-payments:', err));
	const today = isoDay(new Date());
	if (lastDaily !== today) {
		lastDaily = today;
		await expirePlans().catch((err) => console.error('[jobs] expire-plans:', err));
		await remindExpiringVendorPlans().catch((err) => console.error('[jobs] plan-reminders:', err));
	}
}
