import { desc, eq, like } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { activityLogs, user } from '$lib/server/db/schema';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const action = url.searchParams.get('action')?.trim() ?? '';
	const rows = await db
		.select({
			id: activityLogs.id,
			action: activityLogs.action,
			entityType: activityLogs.entityType,
			entityId: activityLogs.entityId,
			ip: activityLogs.ipAddress,
			meta: activityLogs.meta,
			createdAt: activityLogs.createdAt,
			who: user.name,
			email: user.email
		})
		.from(activityLogs)
		.leftJoin(user, eq(user.id, activityLogs.userId))
		.where(action ? like(activityLogs.action, `${action.replace(/[%_]/g, '')}%`) : undefined)
		.orderBy(desc(activityLogs.createdAt))
		.limit(300);
	return { rows, action };
};
