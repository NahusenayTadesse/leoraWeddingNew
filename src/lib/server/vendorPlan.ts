/**
 * Whether vendors must pay to be on Leora. Off for now: every approved vendor is listed and can take
 * any number of bookings, and plans only buy extras (featured placement). Set
 * REQUIRE_VENDOR_PLAN=true to switch on:
 *
 *   - listing: only vendors with an active plan appear in the directory, shop and sitemap
 *     (their own page still opens, so existing links and bookings keep working);
 *   - bookings: a vendor confirms at most `subscription_plans.max_bookings` of the bookings
 *     requested during their plan period (null = unlimited), and none without an active plan.
 */
import { and, count, desc, eq, gte, inArray, sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import {
	subscriptionPlans,
	vendorBookings,
	vendorSubscriptions,
	vendors
} from '$lib/server/db/schema';
import { isoDay } from '$lib/server/availability';

export const vendorPlanRequired = () => process.env.REQUIRE_VENDOR_PLAN === 'true';

/** Extra WHERE for public listings; undefined (no condition) while plans are optional. */
export function listingGate() {
	if (!vendorPlanRequired()) return undefined;
	return sql`EXISTS (SELECT 1 FROM vendor_subscriptions vs WHERE vs.vendor_id = ${vendors.id} AND vs.status = 'active' AND (vs.ends_at IS NULL OR vs.ends_at >= CURRENT_DATE))`;
}

export type Allowance =
	{ ok: true } | { ok: false; reason: 'no_plan' } | { ok: false; reason: 'limit'; limit: number };

/** Whether the vendor may confirm one more booking under their plan. */
export async function checkBookingAllowance(vendorId: number): Promise<Allowance> {
	if (!vendorPlanRequired()) return { ok: true };
	const today = isoDay(new Date());
	const [plan] = await db
		.select({
			startsAt: vendorSubscriptions.startsAt,
			maxBookings: subscriptionPlans.maxBookings
		})
		.from(vendorSubscriptions)
		.innerJoin(subscriptionPlans, eq(subscriptionPlans.id, vendorSubscriptions.planId))
		.where(
			and(
				eq(vendorSubscriptions.vendorId, vendorId),
				eq(vendorSubscriptions.status, 'active'),
				sql`(${vendorSubscriptions.endsAt} IS NULL OR ${vendorSubscriptions.endsAt} >= ${today})`
			)
		)
		.orderBy(desc(vendorSubscriptions.id))
		.limit(1);
	if (!plan) return { ok: false, reason: 'no_plan' };
	if (plan.maxBookings === null) return { ok: true };

	const [{ n }] = await db
		.select({ n: count() })
		.from(vendorBookings)
		.where(
			and(
				eq(vendorBookings.vendorId, vendorId),
				inArray(vendorBookings.status, ['confirmed', 'completed']),
				// Bookings requested during this plan period that the vendor confirmed.
				plan.startsAt
					? gte(vendorBookings.createdAt, new Date(`${plan.startsAt}T00:00:00`))
					: undefined
			)
		);
	return n < plan.maxBookings
		? { ok: true }
		: { ok: false, reason: 'limit', limit: plan.maxBookings };
}
