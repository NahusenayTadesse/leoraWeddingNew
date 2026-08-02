import { and, asc, count, eq, isNull } from 'drizzle-orm';
import { db } from '$lib/server/db';
import {
	budgetCategories,
	budgetComparisons,
	subscriptionPlans,
	subscriptions,
	vendorCategories,
	vendors
} from '$lib/server/db/schema';
import { findCouple } from '$lib/server/db/queries/wedding';
import { compareLimitsFor } from '$lib/server/planLimits';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const couple = await findCouple(locals);

	const planSlug = couple
		? await db
				.select({ slug: subscriptionPlans.slug })
				.from(subscriptions)
				.innerJoin(subscriptionPlans, eq(subscriptionPlans.id, subscriptions.subscriptionPlanId))
				.where(and(eq(subscriptions.coupleId, couple.id), eq(subscriptions.status, 'active')))
				.limit(1)
				.then((r) => r[0]?.slug ?? 'free')
		: 'free';

	const [categories, marketVendors, comparisonsUsed] = await Promise.all([
		db
			.select({
				id: budgetCategories.id,
				name: budgetCategories.name,
				icon: budgetCategories.icon
			})
			.from(budgetCategories)
			.where(and(eq(budgetCategories.isSystem, true), isNull(budgetCategories.deletedAt)))
			.orderBy(asc(budgetCategories.sortOrder)),

		db
			.select({
				id: vendors.id,
				businessName: vendors.businessName,
				city: vendors.city,
				priceMin: vendors.priceMin,
				priceMax: vendors.priceMax,
				ratingAvg: vendors.ratingAvg,
				reviewCount: vendors.reviewCount,
				isVerified: vendors.isVerified,
				categoryName: vendorCategories.name,
				categorySlug: vendorCategories.slug
			})
			.from(vendors)
			.innerJoin(vendorCategories, eq(vendorCategories.id, vendors.categoryId))
			.where(
				and(eq(vendors.status, 'approved'), eq(vendors.isActive, true), isNull(vendors.deletedAt))
			)
			.orderBy(asc(vendorCategories.sortOrder), asc(vendors.businessName)),

		couple
			? db
					.select({ total: count() })
					.from(budgetComparisons)
					.where(eq(budgetComparisons.coupleId, couple.id))
					.then((r) => Number(r[0]?.total ?? 0))
			: Promise.resolve(0)
	]);

	return {
		loggedIn: Boolean(locals.user),
		hasCouple: Boolean(couple),
		planSlug,
		categories,
		vendors: marketVendors,
		limits: compareLimitsFor(planSlug, comparisonsUsed)
	};
};
