import { db } from '$lib/server/db';
import { vendors, vendorCategories, testimonials } from '$lib/server/db/schema';
import { and, count, countDistinct, desc, eq, isNull } from 'drizzle-orm';
import { auth } from '$lib/server/auth';
import { coverImages } from '$lib/server/vendorDirectory';
import { redirect } from 'sveltekit-flash-message/server';
import type { Actions, PageServerLoad } from './$types';

/**
 * Homepage data.
 *
 * The PHP homepage hard-coded its numbers ("184 vendors", "1,200+ listed").
 * They are read from the database here instead, so an empty install honestly
 * shows zero rather than advertising vendors that do not exist — the same
 * "no mock data" rule the PHP schema documented.
 *
 * Public listings filter on all three lifecycle flags. `isVerified` is a trust
 * badge, never the gate — see docs/schema-conventions.md.
 */
const isPublicVendor = and(
	eq(vendors.status, 'approved'),
	eq(vendors.isActive, true),
	isNull(vendors.deletedAt)
);

export const load: PageServerLoad = async () => {
	const [categories, featuredVendors, [totals], regions, dynamicTestimonials] = await Promise.all([
		db
			.select({
				id: vendorCategories.id,
				name: vendorCategories.name,
				slug: vendorCategories.slug,
				icon: vendorCategories.icon,
				count: count(vendors.id)
			})
			.from(vendorCategories)
			.leftJoin(vendors, and(eq(vendors.categoryId, vendorCategories.id), isPublicVendor))
			.where(eq(vendorCategories.listable, true))
			.groupBy(
				vendorCategories.id,
				vendorCategories.name,
				vendorCategories.slug,
				vendorCategories.icon,
				vendorCategories.sortOrder
			)
			.orderBy(vendorCategories.sortOrder),

		db
			.select({
				id: vendors.id,
				businessName: vendors.businessName,
				description: vendors.description,
				city: vendors.city,
				priceMin: vendors.priceMin,
				priceMax: vendors.priceMax,
				ratingAvg: vendors.ratingAvg,
				reviewCount: vendors.reviewCount,
				isVerified: vendors.isVerified,
				categoryName: vendorCategories.name
			})
			.from(vendors)
			.innerJoin(vendorCategories, eq(vendorCategories.id, vendors.categoryId))
			.where(isPublicVendor)
			.orderBy(desc(vendors.isFeatured), desc(vendors.ratingAvg), desc(vendors.reviewCount))
			.limit(6),

		db.select({ total: count() }).from(vendors).where(isPublicVendor),

		db
			.select({ total: countDistinct(vendors.city) })
			.from(vendors)
			.where(isPublicVendor),

		db
			.select({
				id: testimonials.id,
				name: testimonials.name,
				position: testimonials.position,
				message: testimonials.message,
				avatar: testimonials.avatar
			})
			.from(testimonials)
			.orderBy(desc(testimonials.id))
			.limit(3)
	]);

	const covers = featuredVendors.length
		? await coverImages(featuredVendors.map((v) => v.id))
		: new Map<number, string>();

	return {
		categories,
		vendors: featuredVendors.map((v) => ({ ...v, cover: covers.get(v.id) ?? null })),
		testimonials: dynamicTestimonials,
		stats: {
			vendorCount: totals?.total ?? 0,
			regionCount: regions[0]?.total ?? 0
		}
	};
};

export const actions: Actions = {
	logout: async (event) => {
		await auth.api.signOut({
			headers: event.request.headers
		});
		redirect('/login', { type: 'success', message: 'Logout Successful' }, event.cookies);
	}
};
