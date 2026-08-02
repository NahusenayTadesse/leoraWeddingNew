import { and, asc, eq, isNull } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { subscriptionPlans, subscriptions } from '$lib/server/db/schema';
import { findCouple } from '$lib/server/db/queries/wedding';
import type { PageServerLoad } from './$types';

/**
 * Plans come from `subscription_plans`, not a hard-coded array — the PHP
 * pricing page listed plan slugs (`growth`, `featured`) that did not exist in
 * its own plan table, and checkout silently fell back to Golden at the wrong
 * price. Reading the catalog means a link can only ever point at a real plan.
 */
export const load: PageServerLoad = async ({ locals }) => {
	const plans = await db
		.select({
			id: subscriptionPlans.id,
			slug: subscriptionPlans.slug,
			name: subscriptionPlans.name,
			price: subscriptionPlans.price,
			billingCycle: subscriptionPlans.billingCycle,
			features: subscriptionPlans.features
		})
		.from(subscriptionPlans)
		.where(
			and(
				// Couple-facing tiers only. Vendor tiers live in the same table at
				// overlapping prices, so without this filter they render in the
				// same grid as the couple plans.
				eq(subscriptionPlans.audience, 'couple'),
				eq(subscriptionPlans.isActive, true),
				isNull(subscriptionPlans.deletedAt)
			)
		)
		.orderBy(asc(subscriptionPlans.price));

	const couple = await findCouple(locals);

	const currentPlanSlug = couple
		? await db
				.select({ slug: subscriptionPlans.slug })
				.from(subscriptions)
				.innerJoin(subscriptionPlans, eq(subscriptionPlans.id, subscriptions.subscriptionPlanId))
				.where(and(eq(subscriptions.coupleId, couple.id), eq(subscriptions.status, 'active')))
				.limit(1)
				.then((r) => r[0]?.slug ?? 'free')
		: null;

	return { plans, currentPlanSlug };
};
