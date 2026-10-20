import { count, desc, eq, isNull, like, or } from 'drizzle-orm';
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
import { vendors, vendorCategories } from '$lib/server/db/schema';
import { vendorStatusSchema } from '$lib/schemas/admin';
import { parse, ok, bad } from '$lib/server/adminAction';
import { statusLabel } from '$lib/status';
import type { Actions, PageServerLoad } from './$types';

const FILTERS = ['status', 'categoryId'] as const;
type Filter = (typeof FILTERS)[number];

const SORTS = { businessName: vendors.businessName, city: vendors.city, createdAt: vendors.createdAt };

const spec: WhereSpec<Filter> = {
	base: [isNull(vendors.deletedAt)],
	search: (term) =>
		or(
			like(vendors.businessName, `%${term}%`),
			like(vendors.email, `%${term}%`),
			like(vendors.phone, `%${term}%`),
			like(vendors.city, `%${term}%`)
		),
	dateColumn: vendors.createdAt,
	filters: {
		status: (v) => eq(vendors.status, v as typeof vendors.status._.data),
		categoryId: (v) => eq(vendors.categoryId, Number(v))
	}
};

function joined<T extends MySqlSelect>(query: T) {
	return query.leftJoin(vendorCategories, eq(vendorCategories.id, vendors.categoryId));
}

export const load: PageServerLoad = async ({ url }) => {
	const query = parseTableQuery(url, FILTERS, 20, Object.keys(SORTS));
	const where = buildWhere(query, spec);

	const [rows, [{ total }], facets] = await Promise.all([
		joined(
			db
				.select({
					id: vendors.id,
					businessName: vendors.businessName,
					category: vendorCategories.name,
					city: vendors.city,
					email: vendors.email,
					phone: vendors.phone,
					status: vendors.status,
					isVerified: vendors.isVerified,
					createdAt: vendors.createdAt
				})
				.from(vendors)
				.$dynamic()
		)
			.where(where)
			.orderBy(...(orderBy(query, SORTS) ?? [desc(vendors.createdAt)]))
			.limit(query.limit)
			.offset(query.offset),
		joined(db.select({ total: count() }).from(vendors).$dynamic()).where(where),
		facetCounts({
			status: () =>
				joined(db.select({ value: vendors.status, count: count() }).from(vendors).$dynamic())
					.where(buildWhere(query, spec, { except: 'status' }))
					.groupBy(vendors.status),
			categoryId: () =>
				joined(
					db
						.select({ value: vendorCategories.id, label: vendorCategories.name, count: count() })
						.from(vendors)
						.$dynamic()
				)
					.where(buildWhere(query, spec, { except: 'categoryId' }))
					.groupBy(vendorCategories.id, vendorCategories.name)
		})
	]);

	return { rows, server: { pagination: pagination(query, total), facets, filters: currentQuery(query) } };
};

export const actions = {
	updateStatus: async ({ request }) => {
		const p = await parse(request, vendorStatusSchema);
		if ('error' in p) return p.error;

		try {
			await db.update(vendors).set({ status: p.data.status }).where(eq(vendors.id, p.data.id));
			return ok(`Vendor marked ${statusLabel(p.data.status).toLowerCase()}`);
		} catch (err) {
			console.error('Failed to update vendor status:', err);
			return bad('Could not update vendor status', 500);
		}
	}
} satisfies Actions;
