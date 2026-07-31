import { db } from '$lib/server/db';
import {
	prices,
	vendorServices,
	vendors,
	serviceCategories
} from '$lib/server/db/schema';
import { and, eq, isNull, sql } from 'drizzle-orm';

/**
 * Per-service price aggregate, as a joinable derived table.
 *
 * Replaces the old `select().from(prices)` + JS filter, which pulled every
 * price row in the database on every request.
 *
 * `unit` is the `amount` string belonging to the *cheapest* tier — group_concat
 * ordered by price, then take the first element. Note group_concat truncates at
 * `group_concat_max_len` (1024 bytes by default); fine for short unit labels
 * like "per person", but don't put prose in `prices.amount`.
 */
export const priceAgg = db
	.select({
		serviceId: prices.serviceId,
		minPrice: sql<string | null>`min(${prices.price})`.as('min_price'),
		maxPrice: sql<string | null>`max(${prices.price})`.as('max_price'),
		tiers: sql<number>`count(*)`.as('tier_count'),
		unit: sql<
			string | null
		>`substring_index(group_concat(${prices.amount} order by ${prices.price} asc), ',', 1)`.as(
			'price_unit'
		)
	})
	.from(prices)
	.groupBy(prices.serviceId)
	.as('price_agg');

/**
 * A service is publicly listable when it's active AND not soft-deleted.
 * `secureFields` gives you `deletedAt` but nothing enforces it — every public
 * query needs this, so it lives in one place.
 */
export const isListable = and(eq(vendorServices.isActive, true), isNull(vendorServices.deletedAt));

/** The column shape both the carousel and the shop grid render from. */
export const serviceCardColumns = {
	productId: vendorServices.id,
	productName: vendorServices.title,
	image: vendorServices.featuredImage,
	currency: vendorServices.currency,
	vendorId: vendorServices.vendorId,
	vendor: vendors.businessName,
	vendorVerified: vendors.isVerified,
	categoryId: serviceCategories.id,
	category: serviceCategories.name,
	price: priceAgg.minPrice,
	priceMax: priceAgg.maxPrice,
	tiers: priceAgg.tiers,
	amount: priceAgg.unit,
	createdAt: vendorServices.createdAt
};

/** Applies the three joins every card query needs, in a consistent order. */
export function serviceCardQuery() {
	return db
		.select(serviceCardColumns)
		.from(vendorServices)
		.leftJoin(serviceCategories, eq(serviceCategories.id, vendorServices.categoryId))
		.leftJoin(vendors, eq(vendors.id, vendorServices.vendorId))
		.leftJoin(priceAgg, eq(priceAgg.serviceId, vendorServices.id));
}

export type ServiceCard = Awaited<ReturnType<typeof serviceCardQuery>>[number];
