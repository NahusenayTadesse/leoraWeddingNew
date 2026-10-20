import { count, desc, eq, like, or } from 'drizzle-orm';
import type { MySqlSelect } from 'drizzle-orm/mysql-core';
import {
	buildWhere,
	currentQuery,
	facetCounts,
	orderBy,
	pagination,
	parseTableQuery,
	type WhereSpec
} from '@nahu/admin-kit/server/queryFilters';
import { db } from '$lib/server/db';
import { activityLogs, user } from '$lib/server/db/schema';
import type { PageServerLoad } from './$types';

const FILTERS = ['entityType'] as const;
type Filter = (typeof FILTERS)[number];

const SORTS = { createdAt: activityLogs.createdAt, action: activityLogs.action, who: user.name };

const spec: WhereSpec<Filter> = {
	search: (term) =>
		or(
			like(activityLogs.action, `%${term}%`),
			like(user.name, `%${term}%`),
			like(user.email, `%${term}%`)
		),
	dateColumn: activityLogs.createdAt,
	filters: { entityType: (value) => eq(activityLogs.entityType, value) }
};

function joined<T extends MySqlSelect>(query: T) {
	return query.leftJoin(user, eq(user.id, activityLogs.userId));
}

export const load: PageServerLoad = async ({ url }) => {
	const query = parseTableQuery(url, FILTERS, 50, Object.keys(SORTS));
	const where = buildWhere(query, spec);

	const [rows, [{ total }], facets] = await Promise.all([
		joined(
			db
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
				.$dynamic()
		)
			.where(where)
			.orderBy(...(orderBy(query, SORTS) ?? [desc(activityLogs.createdAt)]))
			.limit(query.limit)
			.offset(query.offset),
		joined(db.select({ total: count() }).from(activityLogs).$dynamic()).where(where),
		facetCounts({
			entityType: () =>
				joined(
					db
						.select({ value: activityLogs.entityType, count: count() })
						.from(activityLogs)
						.$dynamic()
				)
					.where(buildWhere(query, spec, { except: 'entityType' }))
					.groupBy(activityLogs.entityType)
		})
	]);

	return {
		rows: rows.map((r) => ({ ...r, meta: r.meta ? JSON.stringify(r.meta) : '' })),
		server: { pagination: pagination(query, total), facets, filters: currentQuery(query) }
	};
};
