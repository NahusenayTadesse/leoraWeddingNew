import { and, count, desc, eq, isNull, like, or, sql } from 'drizzle-orm';
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
import { z } from 'zod/v4';
import { db } from '$lib/server/db';
import { vendorReviews, vendors } from '$lib/server/db/schema';
import { parse, ok, bad } from '@nahu/admin-kit/server/actionResults';
import { audit } from '$lib/server/auditLog';
import type { Actions, PageServerLoad } from './$types';

const FILTERS = ['rating'] as const;
type Filter = (typeof FILTERS)[number];

const SORTS = {
	vendor: vendors.businessName,
	rating: vendorReviews.rating,
	createdAt: vendorReviews.createdAt
};

const spec: WhereSpec<Filter> = {
	base: [isNull(vendorReviews.deletedAt)],
	search: (term) =>
		or(
			like(vendors.businessName, `%${term}%`),
			like(vendorReviews.title, `%${term}%`),
			like(vendorReviews.comment, `%${term}%`)
		),
	dateColumn: vendorReviews.createdAt,
	filters: { rating: (v) => eq(vendorReviews.rating, Number(v)) }
};

function joined<T extends MySqlSelect>(query: T) {
	return query.innerJoin(vendors, eq(vendors.id, vendorReviews.vendorId));
}

export const load: PageServerLoad = async ({ url }) => {
	const query = parseTableQuery(url, FILTERS, 20, Object.keys(SORTS));
	const where = buildWhere(query, spec);

	const [rows, [{ total }], facets] = await Promise.all([
		joined(
			db
				.select({
					id: vendorReviews.id,
					rating: vendorReviews.rating,
					title: vendorReviews.title,
					comment: vendorReviews.comment,
					createdAt: vendorReviews.createdAt,
					vendor: vendors.businessName
				})
				.from(vendorReviews)
				.$dynamic()
		)
			.where(where)
			.orderBy(...(orderBy(query, SORTS) ?? [desc(vendorReviews.createdAt)]))
			.limit(query.limit)
			.offset(query.offset),
		joined(db.select({ total: count() }).from(vendorReviews).$dynamic()).where(where),
		facetCounts({
			rating: () =>
				joined(
					db
						.select({
							value: vendorReviews.rating,
							label: sql<string>`concat(${vendorReviews.rating}, ' star', if(${vendorReviews.rating} = 1, '', 's'))`,
							count: count()
						})
						.from(vendorReviews)
						.$dynamic()
				)
					.where(buildWhere(query, spec, { except: 'rating' }))
					.groupBy(vendorReviews.rating)
		})
	]);

	return {
		rows,
		server: { pagination: pagination(query, total), facets, filters: currentQuery(query) }
	};
};

export const actions = {
	remove: async (event) => {
		const p = await parse(event.request, z.object({ id: z.coerce.number().int().positive() }));
		if ('error' in p) return p.error;

		const done = await db.transaction(async (tx) => {
			const [review] = await tx
				.select({ vendorId: vendorReviews.vendorId })
				.from(vendorReviews)
				.where(and(eq(vendorReviews.id, p.data.id), isNull(vendorReviews.deletedAt)));
			if (!review) return false;

			await tx
				.update(vendorReviews)
				.set({ deletedAt: new Date(), deletedBy: event.locals.user?.id ?? null })
				.where(eq(vendorReviews.id, p.data.id));

			// vendors.rating_avg / review_count are cached — see docs/schema-conventions.md
			const [agg] = await tx
				.select({
					avg: sql<string>`coalesce(avg(${vendorReviews.rating}), 0)`,
					n: sql<number>`count(*)`
				})
				.from(vendorReviews)
				.where(and(eq(vendorReviews.vendorId, review.vendorId), isNull(vendorReviews.deletedAt)));
			await tx
				.update(vendors)
				.set({ ratingAvg: Number(agg.avg).toFixed(2), reviewCount: Number(agg.n) })
				.where(eq(vendors.id, review.vendorId));
			return true;
		});
		if (!done) return bad('Review not found');
		await audit(event, 'review.remove', 'vendor_review', p.data.id);
		return ok('Review removed and vendor rating recalculated');
	}
} satisfies Actions;
