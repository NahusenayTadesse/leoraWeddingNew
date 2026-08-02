import { and, asc, count, desc, eq, isNull, sql, sum } from 'drizzle-orm';
import { db } from '$lib/server/db';
import {
	budgetItems,
	guestLists,
	savedVendors,
	subscriptionPlans,
	subscriptions,
	tasks,
	vendorCategories,
	vendors,
	weddingEvents,
	weddingPlans
} from '$lib/server/db/schema';
import { findCouple } from '$lib/server/db/queries/wedding';
import type { PageServerLoad } from './$types';

/**
 * Port of dashboard.php.
 *
 * Logged-out visitors get a feature preview with no sample data — matching the
 * PHP page, which deliberately showed empty states rather than fake numbers.
 * Everything below is scoped to the signed-in user's own couple.
 */
export const load: PageServerLoad = async ({ locals }) => {
	const couple = await findCouple(locals);

	if (!couple) {
		return { loggedIn: Boolean(locals.user), couple: null };
	}

	const coupleId = couple.id;

	const [plan, budget, guests, taskStats, upcomingTasks, shortlist, events, planSlug] =
		await Promise.all([
			db
				.select()
				.from(weddingPlans)
				.where(and(eq(weddingPlans.coupleId, coupleId), isNull(weddingPlans.deletedAt)))
				.limit(1)
				.then((r) => r[0] ?? null),

			db
				.select({
					estimated: sum(budgetItems.estimatedCost),
					actual: sum(budgetItems.actualCost),
					items: count()
				})
				.from(budgetItems)
				.where(and(eq(budgetItems.coupleId, coupleId), isNull(budgetItems.deletedAt)))
				.then((r) => r[0]),

			db
				.select({
					total: count(),
					confirmed: sql<number>`SUM(${guestLists.rsvpStatus} = 'confirmed')`,
					declined: sql<number>`SUM(${guestLists.rsvpStatus} = 'declined')`,
					pending: sql<number>`SUM(${guestLists.rsvpStatus} = 'pending')`
				})
				.from(guestLists)
				.where(and(eq(guestLists.coupleId, coupleId), isNull(guestLists.deletedAt)))
				.then((r) => r[0]),

			db
				.select({
					total: count(),
					done: sql<number>`SUM(${tasks.status} = 'done')`
				})
				.from(tasks)
				.where(and(eq(tasks.coupleId, coupleId), isNull(tasks.deletedAt)))
				.then((r) => r[0]),

			db
				.select({
					id: tasks.id,
					title: tasks.title,
					dueDate: tasks.dueDate,
					priority: tasks.priority,
					status: tasks.status
				})
				.from(tasks)
				.where(
					and(
						eq(tasks.coupleId, coupleId),
						isNull(tasks.deletedAt),
						sql`${tasks.status} <> 'done'`
					)
				)
				// NULL due dates sort last rather than first.
				.orderBy(sql`${tasks.dueDate} IS NULL`, asc(tasks.dueDate))
				.limit(6),

			db
				.select({
					id: vendors.id,
					businessName: vendors.businessName,
					ratingAvg: vendors.ratingAvg,
					categoryName: vendorCategories.name
				})
				.from(savedVendors)
				.innerJoin(vendors, eq(vendors.id, savedVendors.vendorId))
				.leftJoin(vendorCategories, eq(vendorCategories.id, vendors.categoryId))
				.where(eq(savedVendors.coupleId, coupleId))
				.orderBy(desc(savedVendors.createdAt))
				.limit(6),

			db
				.select({
					id: weddingEvents.id,
					eventType: weddingEvents.eventType,
					eventName: weddingEvents.eventName,
					eventDate: weddingEvents.eventDate,
					venueName: weddingEvents.venueName
				})
				.from(weddingEvents)
				.where(and(eq(weddingEvents.coupleId, coupleId), isNull(weddingEvents.deletedAt)))
				.orderBy(asc(weddingEvents.sortOrder), asc(weddingEvents.eventDate)),

			db
				.select({ slug: subscriptionPlans.slug, name: subscriptionPlans.name })
				.from(subscriptions)
				.innerJoin(subscriptionPlans, eq(subscriptionPlans.id, subscriptions.subscriptionPlanId))
				.where(and(eq(subscriptions.coupleId, coupleId), eq(subscriptions.status, 'active')))
				.orderBy(desc(subscriptions.startedAt))
				.limit(1)
				.then((r) => r[0] ?? { slug: 'free', name: 'Free' })
		]);

	const totalTasks = Number(taskStats?.total ?? 0);
	const doneTasks = Number(taskStats?.done ?? 0);

	let daysUntilWedding: number | null = null;
	if (plan?.weddingDate) {
		const wedding = new Date(plan.weddingDate);
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		wedding.setHours(0, 0, 0, 0);
		daysUntilWedding = Math.round((wedding.getTime() - today.getTime()) / 86_400_000);
	}

	return {
		loggedIn: true,
		couple,
		plan,
		planSlug,
		daysUntilWedding,
		progressPct: totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0,
		budget: {
			estimated: budget?.estimated ?? '0',
			actual: budget?.actual ?? '0',
			items: Number(budget?.items ?? 0)
		},
		guests: {
			total: Number(guests?.total ?? 0),
			confirmed: Number(guests?.confirmed ?? 0),
			declined: Number(guests?.declined ?? 0),
			pending: Number(guests?.pending ?? 0)
		},
		tasks: { total: totalTasks, done: doneTasks, upcoming: upcomingTasks },
		shortlist,
		events
	};
};
