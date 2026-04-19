import { db } from '$lib/server/db';
import {
	serviceCategories as productCategories,
	vendorServices as products,
	subCategories,
	discounts,
	prices,
	serviceImages as productImages,
	categoryServices
} from '$lib/server/db/schema';
import { eq, sql } from 'drizzle-orm';
import type { LayoutServerLoad } from './$types';

import { error } from '@sveltejs/kit';

export const load: LayoutServerLoad = async ({ params }) => {
	const { id } = params;

	const result = await db
		.select({
			url: productImages.imageUrl
		})
		.from(productImages)
		.where(eq(productImages.productId, Number(id)));

	const images = result.map((img) => img.url);

	const product = await db
		.select({
			productId: products.id,
			productName: products.title,
			price: sql<number>`MIN(${prices.price}) * (1 - COALESCE(${discounts.amount}, 0) / 100)`,
			description: products.description,
			category: productCategories.name,
			image: products.featuredImage,
			discountPercentage: discounts.amount,
			discountName: discounts.name,
			discountDescription: discounts.description
		})
		.from(products)
		.leftJoin(productCategories, eq(productCategories.id, products.categoryId))
		.leftJoin(prices, eq(prices.serviceId, products.id))
		.leftJoin(discounts, eq(discounts.productId, products.id))
		.where(eq(products.id, Number(id)))
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

	if (!product) {
		error(404, 'Product not found');
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
		product,
		priceList,
		images,
		result,
		subs: currentSubs
	};
};
