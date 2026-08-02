import { db } from '$lib/server/db';
import {
	vendorServices,
	serviceCategories,
	subCategories,
	categoryServices,
	vendors
} from '$lib/server/db/schema';
import { and, asc, desc, eq, exists, gte, inArray, like, lte, or, sql, type SQL } from 'drizzle-orm';
import { priceAgg, isListable, serviceCardQuery } from '$lib/server/services';
import type { PageServerLoad } from './$types';

const PER_PAGE = 12;

const SORTS = {
	newest: () => desc(vendorServices.createdAt),
	price_asc: () => asc(priceAgg.minPrice),
	price_desc: () => desc(priceAgg.minPrice),
	name: () => asc(vendorServices.title)
} as const;

type SortKey = keyof typeof SORTS;

/** `%` and `_` are wildcards in LIKE — escape them or a search for "50%" matches everything. */
const escapeLike = (s: string) => s.replace(/[\\%_]/g, (c) => `\\${c}`);

/**
 * Accepts both `?cat=3,7` (what the JS path writes, for tidy URLs) and
 * `?cat=3&cat=7` (what a native form GET writes when JS is off).
 */
const parseIds = (raw: string[]): number[] =>
	[...new Set(raw.flatMap((v) => v.split(',')).map((v) => Number(v.trim())))].filter(
		(n) => Number.isInteger(n) && n > 0
	);

const parseMoney = (raw: string | null): number | null => {
	if (raw === null || raw.trim() === '') return null;
	const n = Number(raw);
	return Number.isFinite(n) && n >= 0 ? n : null;
};

export const load: PageServerLoad = async ({ url, setHeaders }) => {
	const sp = url.searchParams;

	const q = (sp.get('q') ?? '').trim().slice(0, 120);
	const catIds = parseIds(sp.getAll('cat'));
	const subIds = parseIds(sp.getAll('sub'));
	const verifiedOnly = sp.get('verified') === '1';
	const sort: SortKey = sp.get('sort') && sp.get('sort')! in SORTS ? (sp.get('sort') as SortKey) : 'newest';
	const currentPage = Math.max(1, Number(sp.get('page')) || 1);

	let minPrice = parseMoney(sp.get('min'));
	let maxPrice = parseMoney(sp.get('max'));
	// Tolerate an inverted range rather than returning a confusing empty grid.
	if (minPrice !== null && maxPrice !== null && minPrice > maxPrice) {
		[minPrice, maxPrice] = [maxPrice, minPrice];
	}

	/**
	 * Facet counts should reflect every filter EXCEPT the one being counted —
	 * otherwise ticking "Photography" drops every other category's count to
	 * zero and the user can't tell what else is available.
	 */
	const conditions = (skip?: 'cat' | 'sub'): SQL | undefined => {
		const c: (SQL | undefined)[] = [isListable];

		if (q) {
			const term = `%${escapeLike(q)}%`;
			c.push(
				or(
					like(vendorServices.title, term),
					like(vendorServices.description, term),
					like(serviceCategories.name, term),
					like(vendors.businessName, term)
				)
			);
		}

		if (verifiedOnly) c.push(eq(vendors.isVerified, true));

		// Compare against the cheapest tier. Services with no `prices` rows have
		// a NULL min_price and drop out once a price filter is set — intended.
		if (minPrice !== null) c.push(gte(priceAgg.minPrice, minPrice.toFixed(2)));
		if (maxPrice !== null) c.push(lte(priceAgg.minPrice, maxPrice.toFixed(2)));

		if (skip !== 'cat' && catIds.length) c.push(inArray(vendorServices.categoryId, catIds));

		// EXISTS rather than a join, so a service in three subcategories still
		// counts once and doesn't need DISTINCT on the outer query.
		if (skip !== 'sub' && subIds.length) {
			c.push(
				exists(
					db
						.select({ one: sql`1` })
						.from(categoryServices)
						.where(
							and(
								eq(categoryServices.serviceId, vendorServices.id),
								inArray(categoryServices.subCategoryId, subIds)
							)
						)
				)
			);
		}

		return and(...c);
	};

	const where = conditions();

	const [rows, totalRow, categoryFacets, subFacets, bounds] = await Promise.all([
		serviceCardQuery()
			.where(where)
			.orderBy(SORTS[sort]())
			.limit(PER_PAGE)
			.offset((currentPage - 1) * PER_PAGE),

		db
			.select({ total: sql<number>`count(*)` })
			.from(vendorServices)
			.leftJoin(serviceCategories, eq(serviceCategories.id, vendorServices.categoryId))
			.leftJoin(vendors, eq(vendors.id, vendorServices.vendorId))
			.leftJoin(priceAgg, eq(priceAgg.serviceId, vendorServices.id))
			.where(where)
			.then((r) => r[0]),

		db
			.select({
				id: serviceCategories.id,
				name: serviceCategories.name,
				count: sql<number>`count(*)`
			})
			.from(vendorServices)
			.innerJoin(serviceCategories, eq(serviceCategories.id, vendorServices.categoryId))
			.leftJoin(vendors, eq(vendors.id, vendorServices.vendorId))
			.leftJoin(priceAgg, eq(priceAgg.serviceId, vendorServices.id))
			.where(conditions('cat'))
			.groupBy(serviceCategories.id, serviceCategories.name)
			.orderBy(serviceCategories.name),

		db
			.select({
				id: subCategories.id,
				name: subCategories.name,
				parentId: subCategories.parentId,
				count: sql<number>`count(distinct ${vendorServices.id})`
			})
			.from(subCategories)
			.innerJoin(categoryServices, eq(categoryServices.subCategoryId, subCategories.id))
			.innerJoin(vendorServices, eq(vendorServices.id, categoryServices.serviceId))
			.leftJoin(serviceCategories, eq(serviceCategories.id, vendorServices.categoryId))
			.leftJoin(vendors, eq(vendors.id, vendorServices.vendorId))
			.leftJoin(priceAgg, eq(priceAgg.serviceId, vendorServices.id))
			.where(conditions('sub'))
			.groupBy(subCategories.id, subCategories.name, subCategories.parentId)
			.orderBy(subCategories.name),

		// Unfiltered bounds, so the slider track doesn't move under the user's
		// cursor every time a filter changes.
		db
			.select({
				floor: sql<string | null>`min(${priceAgg.minPrice})`,
				ceiling: sql<string | null>`max(${priceAgg.maxPrice})`
			})
			.from(vendorServices)
			.leftJoin(vendors, eq(vendors.id, vendorServices.vendorId))
			.leftJoin(priceAgg, eq(priceAgg.serviceId, vendorServices.id))
			.where(isListable)
			.then((r) => r[0])
	]);

	const total = Number(totalRow?.total ?? 0);
	const pageCount = Math.max(1, Math.ceil(total / PER_PAGE));

	// Filters are identical for every visitor, so this is safe to share.
	setHeaders({ 'cache-control': 'public, max-age=0, s-maxage=60' });

	return {
		products: rows,
		facets: {
			categories: categoryFacets.map((c) => ({ ...c, count: Number(c.count) })),
			subCategories: subFacets.map((s) => ({ ...s, count: Number(s.count) }))
		},
		bounds: {
			floor: Math.floor(Number(bounds?.floor ?? 0)),
			ceiling: Math.ceil(Number(bounds?.ceiling ?? 0))
		},
		pagination: {
			page: currentPage,
			perPage: PER_PAGE,
			total,
			pageCount
		},
		filters: { q, catIds, subIds, minPrice, maxPrice, verifiedOnly, sort }
	};
};
