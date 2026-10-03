import { desc, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { activityLogs, user } from '$lib/server/db/schema';
import {
	overview,
	revenueSeries,
	signupSeries,
	bookingSeries,
	breakdowns,
	lastMonths
} from '$lib/server/adminStats';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const range = lastMonths(12);
	const [stats, revenue, signups, bookings, mix, recent] = await Promise.all([
		overview(),
		revenueSeries(range),
		signupSeries(range),
		bookingSeries(range),
		breakdowns(),
		db
			.select({
				id: activityLogs.id,
				action: activityLogs.action,
				entityType: activityLogs.entityType,
				entityId: activityLogs.entityId,
				createdAt: activityLogs.createdAt,
				who: user.name
			})
			.from(activityLogs)
			.leftJoin(user, eq(user.id, activityLogs.userId))
			.orderBy(desc(activityLogs.createdAt))
			.limit(8)
	]);
	return { stats, revenue, signups, bookings, mix, recent };
};
