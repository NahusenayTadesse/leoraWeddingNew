import { db } from '$lib/server/db';
import {
	vendors,
	vendorCategories,
	vendorServices,
	vendorPromotions,
	serviceImages,
	prices,
	reviews,
	favorites,
	user,
	address,
	subcity,
	city as cityTable,
	region
} from '$lib/server/db/schema';
import { and, asc, desc, eq, gte, inArray, isNull, like, lte, or, sql, count } from 'drizzle-orm';

export const PAGE_SIZE = 12;

export type VendorSort = 'recommended' | 'rating' | 'newest' | 'name';

/** Aggregated review stats, reusable as a joinable subquery. */
function ratingSubquery() {
	return db
		.select({
			vendorId: reviews.vendorId,
			avgRating: sql<string>`AVG(${reviews.rating})`.as('avg_rating'),
			reviewCount: sql<number>`COUNT(*)`.as('review_count')
		})
		.from(reviews)
		.where(and(eq(reviews.isActive, true), isNull(reviews.deletedAt)))
		.groupBy(reviews.vendorId)
		.as('rating_agg');
}

/** Vendor ids with a live 'featured' promotion right now. */
export async function featuredVendorIds() {
	const now = new Date();
	const rows = await db
		.select({ vendorId: vendorPromotions.vendorId })
		.from(vendorPromotions)
		.where(
			and(
				eq(vendorPromotions.type, 'featured'),
				lte(vendorPromotions.startsAt, now),
				gte(vendorPromotions.endsAt, now)
			)
		);

	return [...new Set(rows.map((r) => r.vendorId))];
}

type ListArgs = {
	q?: string;
	categoryId?: number;
	city?: string;
	sort?: VendorSort;
	page?: number;
};

export async function listVendors(args: ListArgs) {
	const { q, categoryId, city, sort = 'recommended', page = 1 } = args;
	const rating = ratingSubquery();

	const filters = [eq(vendors.isActive, true), isNull(vendors.deletedAt)];

	if (q) {
		const needle = `%${q}%`;
		filters.push(
			or(like(vendors.businessName, needle), like(vendors.description, needle))!
		);
	}
	if (categoryId) filters.push(eq(vendors.vendorCategory, categoryId));
	if (city) filters.push(eq(vendors.city, city));

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
				return [desc(sql`COALESCE(${rating.avgRating}, 0)`), desc(rating.reviewCount)];
			case 'newest':
				return [desc(vendors.createdAt)];
			case 'name':
				return [asc(vendors.businessName)];
			default:
				return [
					...featuredFirst,
					desc(vendors.isVerified),
					desc(sql`COALESCE(${rating.avgRating}, 0)`),
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
			priceRange: vendors.priceRange,
			isVerified: vendors.isVerified,
			categoryId: vendors.vendorCategory,
			categoryName: vendorCategories.name,
			avgRating: rating.avgRating,
			reviewCount: rating.reviewCount
		})
		.from(vendors)
		.leftJoin(vendorCategories, eq(vendors.vendorCategory, vendorCategories.id))
		.leftJoin(rating, eq(rating.vendorId, vendors.id))
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
			.select({ id: vendorCategories.id, name: vendorCategories.name })
			.from(vendorCategories)
			.where(eq(vendorCategories.listable, true))
			.orderBy(asc(vendorCategories.name)),
		db
			.selectDistinct({ city: vendors.city })
			.from(vendors)
			.where(and(eq(vendors.isActive, true), isNull(vendors.deletedAt)))
			.orderBy(asc(vendors.city))
	]);

	return {
		categories,
		cities: cities.map((c) => c.city).filter((c): c is string => !!c)
	};
}

export async function getVendor(vendorId: number) {
	const rating = ratingSubquery();

	const [row] = await db
		.select({
			id: vendors.id,
			businessName: vendors.businessName,
			description: vendors.description,
			phone: vendors.phone,
			city: vendors.city,
			priceRange: vendors.priceRange,
			isVerified: vendors.isVerified,
			createdAt: vendors.createdAt,
			categoryName: vendorCategories.name,
			avgRating: rating.avgRating,
			reviewCount: rating.reviewCount,
			street: address.street,
			kebele: address.kebele,
			buildingNumber: address.buildingNumber,
			googleMapsUrl: address.googleMapsUrl,
			subcityName: subcity.name,
			cityName: cityTable.name,
			regionName: region.name
		})
		.from(vendors)
		.leftJoin(vendorCategories, eq(vendors.vendorCategory, vendorCategories.id))
		.leftJoin(rating, eq(rating.vendorId, vendors.id))
		.leftJoin(address, eq(vendors.address, address.id))
		.leftJoin(subcity, eq(address.subcityId, subcity.id))
		.leftJoin(cityTable, eq(subcity.cityId, cityTable.id))
		.leftJoin(region, eq(cityTable.regionId, region.id))
		.where(and(eq(vendors.id, vendorId), eq(vendors.isActive, true), isNull(vendors.deletedAt)))
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

export async function getVendorReviews(vendorId: number, limit = 20) {
	const rows = await db
		.select({
			id: reviews.id,
			rating: reviews.rating,
			comment: reviews.comment,
			createdAt: reviews.createdAt,
			authorName: user.name,
			authorImage: user.image,
			authorId: user.id
		})
		.from(reviews)
		.innerJoin(user, eq(reviews.userId, user.id))
		.where(
			and(eq(reviews.vendorId, vendorId), eq(reviews.isActive, true), isNull(reviews.deletedAt))
		)
		.orderBy(desc(reviews.createdAt))
		.limit(limit);

	// Star distribution for the summary bars.
	const buckets = [5, 4, 3, 2, 1].map((star) => ({
		star,
		count: rows.filter((r) => r.rating === star).length
	}));

	return { reviews: rows, buckets };
}

export async function getUserReview(vendorId: number, userId: string) {
	const [row] = await db
		.select({ id: reviews.id, rating: reviews.rating, comment: reviews.comment })
		.from(reviews)
		.where(
			and(
				eq(reviews.vendorId, vendorId),
				eq(reviews.userId, userId),
				isNull(reviews.deletedAt)
			)
		)
		.limit(1);

	return row ?? null;
}

export async function getFavoriteVendorIds(userId: string) {
	const rows = await db
		.select({ vendorId: favorites.vendorId })
		.from(favorites)
		.where(eq(favorites.userId, userId));

	return rows.map((r) => r.vendorId);
}

export async function toggleFavorite(userId: string, vendorId: number) {
	const [existing] = await db
		.select({ vendorId: favorites.vendorId })
		.from(favorites)
		.where(and(eq(favorites.userId, userId), eq(favorites.vendorId, vendorId)))
		.limit(1);

	if (existing) {
		await db
			.delete(favorites)
			.where(and(eq(favorites.userId, userId), eq(favorites.vendorId, vendorId)));
		return false;
	}

	await db.insert(favorites).values({ userId, vendorId });
	return true;
}