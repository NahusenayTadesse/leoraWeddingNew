import { superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { edit, editGallery, addPrice, editPrice } from './schema';
import { error } from '@sveltejs/kit';

import { db } from '$lib/server/db';
import {
	serviceCategories as productCategories,
	vendorServices as products,
	user,
	orderItems,
	vendorOrders as orders,
	prices,
	serviceImages as productImages,
	subCategories,
	categoryServices,
	subSubCategories
} from '$lib/server/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ params, parent }) => {
	const { id } = params;
	const { vendorId } = await parent();

	const priceEdit = await superValidate(zod4(editPrice));
	const addPriceForm = await superValidate(zod4(addPrice));

	const allCategories = await db
		.select({
			value: productCategories.id,
			name: productCategories.name,
			description: productCategories.description
		})
		.from(productCategories)
		.where(eq(productCategories.isActive, true));

	const result = await db
		.select({
			url: productImages.imageUrl
		})
		.from(productImages)
		.where(eq(productImages.productId, Number(id)));

	const images = result.map((img) => img.url);

	const galleryEdit = await superValidate({ existing: images }, zod4(editGallery));

	const product = await db
		.select({
			id: products.id,
			name: products.title,
			description: products.description,
			category: productCategories.name,
			categoryId: productCategories.id,
			image: products.featuredImage,
			saleCount: sql<number>`SUM(${orderItems.quantity})`,
			createdBy: user.name,
			createdAt: sql<string>`DATE_FORMAT(${products.createdAt}, '%Y-%m-%d')`
		})
		.from(products)
		.leftJoin(productCategories, eq(productCategories.id, products.categoryId))
		.leftJoin(orderItems, eq(products.id, orderItems.productId))
		.leftJoin(orders, and(eq(orderItems.vendorOrderId, orders.id), eq(orders.status, 'delivered')))
		.leftJoin(user, eq(products.createdBy, user.id))
		.where(and(eq(products.id, Number(id)), eq(products.vendorId, Number(vendorId))))
		.groupBy(
			products.id,
			products.title,
			products.description,
			productCategories.name,
			productCategories.id,
			products.featuredImage,
			user.id, // Better to group by ID than Name
			user.name, // Keep this if you're selecting it
			products.createdAt
		)
		.then((rows) => rows[0]);

	if (!product) {
		error(404, 'Product not found');
	}

	const categories = await db
		.select({
			value: productCategories.id,
			name: productCategories.name,
			description: productCategories.description
		})
		.from(productCategories);

	const priceList = await db
		.select({
			amount: prices.amount,
			price: sql<number>`CAST(${prices.price} AS DOUBLE)`
		})
		.from(prices)
		.where(eq(prices.serviceId, Number(id)));

	const subs = await db
		.select({
			value: subCategories.id,
			name: subCategories.name,
			description: subCategories.description,
			parentId: subCategories.parentId
		})
		.from(subCategories);

	const currentSubs = await db
		.selectDistinct({
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

	const subsubs = await db
		.select({
			value: subSubCategories.id,
			name: subSubCategories.name,
			description: subSubCategories.description,
			parentId: subSubCategories.parentId
		})
		.from(subSubCategories);
	const currentSubSubs = await db
		.selectDistinct({
			id: subSubCategories.id,
			name: subSubCategories.name,
			description: subSubCategories.description,
			parentId: subSubCategories.parentId
		})
		.from(subSubCategories)
		.innerJoin(
			categoryServices,
			eq(subSubCategories.id, categoryServices.subSubId) // This links the tables
		)
		.where(
			eq(categoryServices.serviceId, Number(id)) // This filters for your specific service
		);

	const editProductForm = {
		productName: product.name,
		category: product.categoryId,
		subCategory: currentSubs.map((sub) => sub.id),
		subSubCategory: currentSubSubs.map((sub) => sub.id),
		description: product.description
	};

	const form = await superValidate(editProductForm, zod4(edit));

	return {
		product,
		form,
		categories,
		currentSubs,
		subs,
		subsubs,
		currentSubSubs,
		galleryEdit,
		addPriceForm,

		priceEdit,

		allCategories,
		images,
		priceList
	};
};
