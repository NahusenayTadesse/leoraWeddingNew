/**
 * Background work for one Node process, started from `init` in hooks.server.ts:
 *
 *   every 10 min  reconcile-payments  re-verify Chapa attempts nobody came back for
 *   daily         expire-plans        end couple and vendor subscriptions past their date
 *   daily         plan-reminders      tell vendors their plan ends in 3 days
 *   daily         release-funds       complete past bookings and release vendors' held money
 *   daily         balance-reminders   tell couples a booking balance is due in 3 days, and on the day
 *
 * With several app processes, run jobs in one only (RUN_JOBS=false on the others).
 */
import { and, eq, isNull, lt, sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import {
	subscriptions,
	vendorSubscriptions,
	vendors,
	subscriptionPlans,
	vendorBookings,
	weddingPlans,
	couples
} from '$lib/server/db/schema';
import { formatETB, toMoney } from '$lib/money';
import { reconcileStale } from '$lib/server/payments';
import { releaseHeldFunds } from '$lib/server/bookingPayments';
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
		.select({
			userId: vendors.userId,
			plan: subscriptionPlans.name,
			endsAt: vendorSubscriptions.endsAt
		})
		.from(vendorSubscriptions)
		.innerJoin(vendors, eq(vendors.id, vendorSubscriptions.vendorId))
		.innerJoin(subscriptionPlans, eq(subscriptionPlans.id, vendorSubscriptions.planId))
		.where(
			and(
				eq(vendorSubscriptions.status, 'active'),
				sql`${vendorSubscriptions.endsAt} = ${inThreeDays}`
			)
		);
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

/**
 * Couples whose booking balance falls due (event date minus the vendor's `balance_due_days`) in
 * three days or today, and who still owe something on it.
 */
export async function remindBalancesDue() {
	const today = isoDay(new Date());
	const inThreeDays = isoDay(new Date(Date.now() + 3 * 24 * 3600_000));
	const dueOn = sql<string>`DATE_SUB(${vendorBookings.eventDate}, INTERVAL ${vendors.balanceDueDays} DAY)`;
	const owed = sql<string>`${vendorBookings.agreedPrice} - (SELECT COALESCE(SUM(bp.amount), 0) FROM booking_payments bp WHERE bp.booking_id = ${vendorBookings.id} AND bp.status = 'confirmed' AND bp.deleted_at IS NULL)`;
	const rows = await db
		.select({
			vendor: vendors.businessName,
			partner1: couples.partner1UserId,
			partner2: couples.partner2UserId,
			dueOn,
			owed
		})
		.from(vendorBookings)
		.innerJoin(vendors, eq(vendors.id, vendorBookings.vendorId))
		.innerJoin(weddingPlans, eq(weddingPlans.id, vendorBookings.weddingPlanId))
		.innerJoin(couples, eq(couples.id, weddingPlans.coupleId))
		.where(
			and(
				eq(vendorBookings.status, 'confirmed'),
				isNull(vendorBookings.deletedAt),
				sql`${dueOn} IN (${today}, ${inThreeDays})`,
				sql`${owed} > 0`
			)
		);
	for (const r of rows) {
		const when =
			String(r.dueOn).slice(0, 10) === today ? 'today' : `on ${String(r.dueOn).slice(0, 10)}`;
		const notice = {
			type: 'balance_due',
			title: 'Booking balance due',
			body: `${formatETB(toMoney(r.owed))} for ${r.vendor} is due ${when}. Pay from your bookings page.`,
			link: '/wedding/bookings'
		};
		await notify(r.partner1, notice);
		if (r.partner2) await notify(r.partner2, notice);
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
		await releaseHeldFunds().catch((err) => console.error('[jobs] release-funds:', err));
		await remindBalancesDue().catch((err) => console.error('[jobs] balance-reminders:', err));
	}
}
