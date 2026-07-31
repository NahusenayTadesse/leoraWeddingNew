

import { db } from '$lib/server/db';
import {
    vendors,
    vendorCategories,
    prices,
    vendorServices,
    testimonials
} from '$lib/server/db/schema';
import { eq, sql, desc, min } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
    // 1. Fetch categories along with total count of verified vendors per category
    const categoriesQuery = await db
        .select({
            id: vendorCategories.id,
            name: vendorCategories.name,
            count: sql<number>`COUNT(DISTINCT ${vendors.id})`
        })
        .from(vendorCategories)
        .leftJoin(vendors, eq(vendors.vendorCategory, vendorCategories.id))
        .where(eq(vendorCategories.listable, true))
        .groupBy(vendorCategories.id, vendorCategories.name);

    // 2. Fetch featured/verified vendors with starting price and category name
    const featuredVendorsRaw = await db
        .select({
            id: vendors.id,
            businessName: vendors.businessName,
            description: vendors.description,
            city: vendors.city,
            priceRange: vendors.priceRange,
            categoryName: vendorCategories.name,
            minPrice: min(prices.price)
        })
        .from(vendors)
        .leftJoin(vendorCategories, eq(vendorCategories.id, vendors.vendorCategory))
        .leftJoin(vendorServices, eq(vendorServices.vendorId, vendors.id))
        .leftJoin(prices, eq(prices.serviceId, vendorServices.id))
        .where(eq(vendors.isVerified, true))
        .groupBy(
            vendors.id,
            vendors.businessName,
            vendors.description,
            vendors.city,
            vendors.priceRange,
            vendorCategories.name
        )
        .limit(6);

    // Formatted featured vendors structure for UI consumption
    const featuredVendors = featuredVendorsRaw.map((vendor) => ({
        id: vendor.id,
        name: vendor.businessName,
        category: vendor.categoryName ?? 'Wedding Service',
        city: vendor.city ?? 'Addis Ababa',
        priceRange: vendor.priceRange ?? (vendor.minPrice ? `${Number(vendor.minPrice).toLocaleString()} ETB` : 'Contact for Price'),
        description: vendor.description ?? ''
    }));

    // 3. Fetch public testimonials
    const dynamicTestimonials = await db
        .select({
            id: testimonials.id,
            name: testimonials.name,
            position: testimonials.position,
            message: testimonials.message,
            avatar: testimonials.avatar
        })
        .from(testimonials)
        .orderBy(desc(testimonials.id))
        .limit(3);

    return {
        categories: categoriesQuery.map((cat) => ({
            id: cat.id,
            name: cat.name,
            count: Number(cat.count ?? 0)
        })),
        vendors: featuredVendors,
        testimonials: dynamicTestimonials
    };
};


import { auth } from '$lib/server/auth';
import { redirect } from 'sveltekit-flash-message/server';

import type { Actions } from './$types';

export const actions: Actions = {
	logout: async (event) => {
		await auth.api.signOut({
			headers: event.request.headers
		});
		redirect('/login', { type: 'success', message: 'Logout Successful' }, event.cookies);
	}
};
