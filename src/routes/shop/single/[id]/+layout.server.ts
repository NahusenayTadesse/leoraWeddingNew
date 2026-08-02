import { db } from '$lib/server/db';
import {
	serviceCategories,
	vendorServices,
	vendors,
	subCategories,
	discounts,
	prices,
	serviceImages,
	categoryServices
} from '$lib/server/db/schema';
import { and, eq, sql } from 'drizzle-orm';
import { isListable } from '$lib/server/services';
import type { LayoutServerLoad } from './$types';

import { error } from '@sveltejs/kit';

export const load: LayoutServerLoad = async ({ params }) => {
	const { id } = params;

	const result = await db
		.select({
			url: serviceImages.imageUrl
		})
		.from(serviceImages)
		.where(eq(serviceImages.productId, Number(id)));

	const images = result.map((img) => img.url);

	const service = await db
		.select({
			serviceId: vendorServices.id,
			serviceName: vendorServices.title,
			vendorId: vendors.id,
			vendor: vendors.businessName,
			vendorVerified: vendors.isVerified,
			price: sql<number>`MIN(${prices.price}) * (1 - COALESCE(${discounts.amount}, 0) / 100)`,
			description: vendorServices.description,
			category: serviceCategories.name,
			image: vendorServices.featuredImage,
			discountPercentage: discounts.amount,
			discountName: discounts.name,
			discountDescription: discounts.description
		})
		.from(vendorServices)
		.innerJoin(vendors, eq(vendors.id, vendorServices.vendorId))
		.leftJoin(serviceCategories, eq(serviceCategories.id, vendorServices.categoryId))
		.leftJoin(prices, eq(prices.serviceId, vendorServices.id))
		.leftJoin(discounts, eq(discounts.productId, vendorServices.id))
		.where(and(eq(vendorServices.id, Number(id)), isListable))
		.then((rows) => rows[0]);

	const currentSubs = await db
		.select({
			id: subCategories.id,
			name: subCategories.name,
			description: subCategories.description
		})
		.from(subCategories)
		.innerJoin(
			categoryServices,
			eq(subCategories.id, categoryServices.subCategoryId) // This links the tables
		)
		.where(
			eq(categoryServices.serviceId, Number(id)) // This filters for your specific service
		);

	// `price` is a bare MIN() with no GROUP BY, so a WHERE that matches zero
	// rows still comes back as one row of nulls (standard SQL aggregate
	// behaviour) rather than an empty result — check the id, not truthiness.
	if (!service?.serviceId) {
		error(404, 'Service not found');
	}

	const priceList = await db
		.select({
			amount: sql<number>`CAST(${prices.amount} AS SIGNED)`,
			price: sql<number>`${prices.price} * (1 - COALESCE(${discounts.amount}, 0) / 100)`
		})
		.from(prices)
		.leftJoin(discounts, eq(discounts.productId, prices.serviceId))
		.where(eq(prices.serviceId, Number(id)));

	return {
		service,
		priceList,
		images,
		result,
		subs: currentSubs
	};
};
