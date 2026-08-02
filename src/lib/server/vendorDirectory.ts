import { db } from '$lib/server/db';
import {
	vendors,
	vendorCategories,
	vendorServices,
	vendorPromotions,
	serviceImages,
	prices,
	vendorReviews,
	savedVendors,
	couples,
	user,
	address,
	subcity,
	city as cityTable,
	region
} from '$lib/server/db/schema';
import { and, asc, desc, eq, gte, inArray, isNull, like, lte, or, sql, count } from 'drizzle-orm';

export const PAGE_SIZE = 12;

export type VendorSort = 'recommended' | 'rating' | 'newest' | 'name';

/**
 * Public visibility. `status = 'approved'` is the gate; `isVerified` is only a
 * trust badge and must never be used to filter. See docs/schema-conventions.md.
 *
 * Ratings are no longer aggregated per query — `vendors.ratingAvg` and
 * `vendors.reviewCount` are maintained on review write, so listing pages read
 * them directly instead of joining a GROUP BY subquery on every request.
 */
const publicVendor = and(
	eq(vendors.status, 'approved'),
	eq(vendors.isActive, true),
	isNull(vendors.deletedAt)
);

/** Vendor ids with a live 'featured' promotion right now. */
export async function featuredVendorIds() {
	// startsAt/endsAt are DATE columns in string mode, so compare with a
	// yyyy-mm-dd string rather than a Date object.
	const today = new Date().toISOString().slice(0, 10);
	const rows = await db
		.select({ vendorId: vendorPromotions.vendorId })
		.from(vendorPromotions)
		.where(
			and(
				eq(vendorPromotions.type, 'featured'),
				lte(vendorPromotions.startsAt, today),
				gte(vendorPromotions.endsAt, today)
			)
		);

	return [...new Set(rows.map((r) => r.vendorId))];
}

type ListArgs = {
	q?: string;
	categoryIds?: number[];
	city?: string;
	minRating?: number;
	sort?: VendorSort;
	page?: number;
};

/** Shared WHERE builder so listVendors and listCategoryCounts stay in sync. */
function directoryFilters(args: { q?: string; city?: string; minRating?: number }) {
	const { q, city, minRating } = args;
	const filters = [publicVendor];

	if (q) {
		const needle = `%${q}%`;
		filters.push(
			or(like(vendors.businessName, needle), like(vendors.description, needle))!
		);
	}
	if (city) filters.push(eq(vendors.city, city));
	if (minRating) filters.push(gte(vendors.ratingAvg, minRating.toFixed(2)));

	return filters;
}

export async function listVendors(args: ListArgs) {
	const { q, categoryIds, city, minRating, sort = 'recommended', page = 1 } = args;
	const filters = directoryFilters({ q, city, minRating });

	if (categoryIds?.length) filters.push(inArray(vendors.categoryId, categoryIds));

	const where = and(...filters);

	const [{ total }] = await db
		.select({ total: count() })
		.from(vendors)
		.where(where);

	const featured = sort === 'recommended' ? await featuredVendorIds() : [];

	const orderBy = (() => {
		const featuredFirst =
			featured.length > 0
				? [sql`CASE WHEN ${vendors.id} IN (${sql.join(featured, sql`, `)}) THEN 0 ELSE 1 END`]
				: [];

		switch (sort) {
			case 'rating':
				return [desc(vendors.ratingAvg), desc(vendors.reviewCount)];
			case 'newest':
				return [desc(vendors.createdAt)];
			case 'name':
				return [asc(vendors.businessName)];
			default:
				return [
					...featuredFirst,
					desc(vendors.isVerified),
					desc(vendors.ratingAvg),
					asc(vendors.businessName)
				];
		}
	})();

	const rows = await db
		.select({
			id: vendors.id,
			businessName: vendors.businessName,
			description: vendors.description,
			city: vendors.city,
			priceMin: vendors.priceMin,
			priceMax: vendors.priceMax,
			isVerified: vendors.isVerified,
			categoryId: vendors.categoryId,
			categoryName: vendorCategories.name,
			categoryIcon: vendorCategories.icon,
			avgRating: vendors.ratingAvg,
			reviewCount: vendors.reviewCount
		})
		.from(vendors)
		.leftJoin(vendorCategories, eq(vendors.categoryId, vendorCategories.id))
		.where(where)
		.orderBy(...orderBy)
		.limit(PAGE_SIZE)
		.offset((page - 1) * PAGE_SIZE);

	const ids = rows.map((r) => r.id);
	const covers = ids.length ? await coverImages(ids) : new Map<number, string>();
	const featuredSet = new Set(featured);

	return {
		total,
		pages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
		vendors: rows.map((r) => ({
			...r,
			avgRating: r.avgRating ? Number(r.avgRating) : null,
			reviewCount: Number(r.reviewCount ?? 0),
			cover: covers.get(r.id) ?? null,
			isFeatured: featuredSet.has(r.id)
		}))
	};
}

/** One representative image per vendor, taken from their first service. */
async function coverImages(vendorIds: number[]) {
	const rows = await db
		.select({
			vendorId: vendorServices.vendorId,
			featuredImage: vendorServices.featuredImage,
			galleryImage: serviceImages.imageUrl
		})
		.from(vendorServices)
		.leftJoin(serviceImages, eq(serviceImages.productId, vendorServices.id))
		.where(
			and(
				inArray(vendorServices.vendorId, vendorIds),
				eq(vendorServices.isActive, true),
				isNull(vendorServices.deletedAt)
			)
		)
		.orderBy(asc(vendorServices.id));

	const map = new Map<number, string>();
	for (const r of rows) {
		if (map.has(r.vendorId)) continue;
		const url = r.featuredImage || r.galleryImage;
		if (url) map.set(r.vendorId, url);
	}
	return map;
}

export async function listDirectoryFilters() {
	const [categories, cities] = await Promise.all([
		db
			.select({ id: vendorCategories.id, name: vendorCategories.name, icon: vendorCategories.icon })
			.from(vendorCategories)
			.where(eq(vendorCategories.listable, true))
			.orderBy(asc(vendorCategories.name)),
		db
			.selectDistinct({ city: vendors.city })
			.from(vendors)
			.where(publicVendor)
			.orderBy(asc(vendors.city))
	]);

	return {
		categories,
		cities: cities.map((c) => c.city).filter((c): c is string => !!c)
	};
}

/**
 * Per-category vendor counts for the current search/city/rating filters
 * (everything except the category filter itself, so checking one category
 * doesn't hide the counts for the others).
 */
export async function listCategoryCounts(args: { q?: string; city?: string; minRating?: number }) {
	const filters = directoryFilters(args);

	const rows = await db
		.select({ categoryId: vendors.categoryId, total: count() })
		.from(vendors)
		.where(and(...filters))
		.groupBy(vendors.categoryId);

	return new Map(rows.map((r) => [r.categoryId, Number(r.total)]));
}

export async function getVendor(vendorId: number) {
	const [row] = await db
		.select({
			id: vendors.id,
			businessName: vendors.businessName,
			description: vendors.description,
			phone: vendors.phone,
			city: vendors.city,
			priceMin: vendors.priceMin,
			priceMax: vendors.priceMax,
			isVerified: vendors.isVerified,
			createdAt: vendors.createdAt,
			categoryName: vendorCategories.name,
			avgRating: vendors.ratingAvg,
			reviewCount: vendors.reviewCount,
			street: address.street,
			kebele: address.kebele,
			buildingNumber: address.buildingNumber,
			googleMapsUrl: address.googleMapsUrl,
			subcityName: subcity.name,
			cityName: cityTable.name,
			regionName: region.name
		})
		.from(vendors)
		.leftJoin(vendorCategories, eq(vendors.categoryId, vendorCategories.id))
		.leftJoin(address, eq(vendors.addressId, address.id))
		.leftJoin(subcity, eq(address.subcityId, subcity.id))
		.leftJoin(cityTable, eq(subcity.cityId, cityTable.id))
		.leftJoin(region, eq(cityTable.regionId, region.id))
		.where(and(eq(vendors.id, vendorId), publicVendor))
		.limit(1);

	if (!row) return null;

	return {
		...row,
		avgRating: row.avgRating ? Number(row.avgRating) : null,
		reviewCount: Number(row.reviewCount ?? 0)
	};
}

export async function getVendorServices(vendorId: number) {
	const rows = await db
		.select({
			id: vendorServices.id,
			title: vendorServices.title,
			description: vendorServices.description,
			featuredImage: vendorServices.featuredImage,
			currency: vendorServices.currency
		})
		.from(vendorServices)
		.where(
			and(
				eq(vendorServices.vendorId, vendorId),
				eq(vendorServices.isActive, true),
				isNull(vendorServices.deletedAt)
			)
		)
		.orderBy(asc(vendorServices.title));

	if (rows.length === 0) return [];

	const ids = rows.map((r) => r.id);

	const [priceRows, imageRows] = await Promise.all([
		db
			.select({
				serviceId: prices.serviceId,
				price: prices.price,
				amount: prices.amount
			})
			.from(prices)
			.where(inArray(prices.serviceId, ids)),
		db
			.select({ productId: serviceImages.productId, imageUrl: serviceImages.imageUrl })
			.from(serviceImages)
			.where(inArray(serviceImages.productId, ids))
	]);

	return rows.map((r) => ({
		...r,
		prices: priceRows
			.filter((p) => p.serviceId === r.id)
			.map((p) => ({ price: Number(p.price), amount: p.amount })),
		images: imageRows.filter((i) => i.productId === r.id).map((i) => i.imageUrl)
	}));
}

/**
 * Reviews are attributed to the *couple*, not one partner, so either partner
 * can post and edit the same review. The author name comes from the profile of
 * whichever partner holds the workspace.
 */
export async function getVendorReviews(vendorId: number, limit = 20) {
	const rows = await db
		.select({
			id: vendorReviews.id,
			rating: vendorReviews.rating,
			title: vendorReviews.title,
			comment: vendorReviews.comment,
			createdAt: vendorReviews.createdAt,
			authorName: user.name,
			authorImage: user.image,
			authorId: user.id
		})
		.from(vendorReviews)
		.innerJoin(couples, eq(vendorReviews.coupleId, couples.id))
		.leftJoin(user, eq(couples.partner1UserId, user.id))
		.where(
			and(
				eq(vendorReviews.vendorId, vendorId),
				eq(vendorReviews.isActive, true),
				isNull(vendorReviews.deletedAt)
			)
		)
		.orderBy(desc(vendorReviews.createdAt))
		.limit(limit);

	// Star distribution for the summary bars.
	const buckets = [5, 4, 3, 2, 1].map((star) => ({
		star,
		count: rows.filter((r) => r.rating === star).length
	}));

	return { reviews: rows, buckets };
}

/**
 * Resolves the couple workspace a user belongs to, from either side of the
 * marriage. Everything couple-scoped below goes through this so call sites can
 * keep passing a user id.
 */
async function coupleIdFor(userId: string): Promise<number | null> {
	const [row] = await db
		.select({ id: couples.id })
		.from(couples)
		.where(
			and(
				or(eq(couples.partner1UserId, userId), eq(couples.partner2UserId, userId)),
				isNull(couples.deletedAt)
			)
		)
		.limit(1);

	return row?.id ?? null;
}

export async function getUserReview(vendorId: number, userId: string) {
	const coupleId = await coupleIdFor(userId);
	if (!coupleId) return null;

	const [row] = await db
		.select({
			id: vendorReviews.id,
			rating: vendorReviews.rating,
			title: vendorReviews.title,
			comment: vendorReviews.comment
		})
		.from(vendorReviews)
		.where(
			and(
				eq(vendorReviews.vendorId, vendorId),
				eq(vendorReviews.coupleId, coupleId),
				isNull(vendorReviews.deletedAt)
			)
		)
		.limit(1);

	return row ?? null;
}

/** The couple's shortlist. Empty for a user with no workspace yet. */
export async function getFavoriteVendorIds(userId: string) {
	const coupleId = await coupleIdFor(userId);
	if (!coupleId) return [];

	const rows = await db
		.select({ vendorId: savedVendors.vendorId })
		.from(savedVendors)
		.where(eq(savedVendors.coupleId, coupleId));

	return rows.map((r) => r.vendorId);
}

/** Returns the new state: true if now saved, false if removed. */
export async function toggleFavorite(userId: string, vendorId: number) {
	const coupleId = await coupleIdFor(userId);
	if (!coupleId) return false;

	const [existing] = await db
		.select({ id: savedVendors.id })
		.from(savedVendors)
		.where(and(eq(savedVendors.coupleId, coupleId), eq(savedVendors.vendorId, vendorId)))
		.limit(1);

	if (existing) {
		await db.delete(savedVendors).where(eq(savedVendors.id, existing.id));
		return false;
	}

	await db.insert(savedVendors).values({ coupleId, vendorId });
	return true;
}

/**
 * Creates or updates the couple's review and refreshes the vendor's cached
 * rating in the same transaction.
 *
 * `vendors.ratingAvg` / `vendors.reviewCount` are denormalised — nothing in the
 * database keeps them in step with `vendor_reviews`, so every write path has to
 * recompute them or listing pages slowly drift out of sync.
 */
export async function upsertVendorReview(
	userId: string,
	vendorId: number,
	values: { rating: number; title?: string | null; comment?: string | null }
) {
	const coupleId = await coupleIdFor(userId);
	if (!coupleId) return { ok: false as const, reason: 'no-couple' as const };

	const existing = await db
		.select({ id: vendorReviews.id })
		.from(vendorReviews)
		.where(
			and(
				eq(vendorReviews.vendorId, vendorId),
				eq(vendorReviews.coupleId, coupleId),
				isNull(vendorReviews.deletedAt)
			)
		)
		.limit(1)
		.then((r) => r[0]);

	await db.transaction(async (tx) => {
		if (existing) {
			await tx
				.update(vendorReviews)
				.set({ ...values, updatedBy: userId })
				.where(eq(vendorReviews.id, existing.id));
		} else {
			await tx.insert(vendorReviews).values({
				...values,
				vendorId,
				coupleId,
				createdBy: userId,
				updatedBy: userId
			});
		}

		await tx
			.update(vendors)
			.set({
				ratingAvg: sql`(
					SELECT COALESCE(ROUND(AVG(${vendorReviews.rating}), 2), 0)
					FROM ${vendorReviews}
					WHERE ${vendorReviews.vendorId} = ${vendorId}
					  AND ${vendorReviews.deletedAt} IS NULL
				)`,
				reviewCount: sql`(
					SELECT COUNT(*) FROM ${vendorReviews}
					WHERE ${vendorReviews.vendorId} = ${vendorId}
					  AND ${vendorReviews.deletedAt} IS NULL
				)`
			})
			.where(eq(vendors.id, vendorId));
	});

	return { ok: true as const, updated: Boolean(existing) };
}

// formatPriceRange moved to $lib/price — components need it, and this module
// is server-only.
export { formatPriceRange } from '$lib/price';
