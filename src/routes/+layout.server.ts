import { db } from '$lib/server/db';
import {
	vendorServices,
	serviceCategories,
	user,
	roles,
	prices,
	couples,
	vendors,
	subCategories,
	categoryServices,
	weddings
} from '$lib/server/db/schema';
import { eq, min } from 'drizzle-orm';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	const currentUser = locals?.user;
	let roleName = '';

	const isVendor = await db
		.select({ userId: vendors.userId })
		.from(vendors)
		.where(eq(vendors.userId, currentUser?.id));

	const isCouple = await db
		.select({ userId: couples.userId, id: couples.id })
		.from(couples)
		.where(eq(couples.userId, currentUser?.id))
		.then((rows) => rows[0]);

	let budget = null;
	if (isCouple) {
		budget = await db
			.select()
			.from(weddings)
			.where(eq(weddings.coupleId, isCouple.id))
			.then((rows) => rows[0]);
	}

	// 1. Fetch the role name if a user exists
	if (currentUser) {
		const roleData = await db
			.select({ name: roles.name })
			.from(user)
			.leftJoin(roles, eq(user.roleId, roles.id))
			.where(eq(user.id, currentUser.id))
			.then((rows) => rows[0]);

		roleName = roleData?.name ?? '';
	}

	// 2. Fetch the product list (this now always runs)
	const serviceList = await db
		.select({
			productId: vendorServices.id,
			productName: vendorServices.title,
			vendorId: vendorServices.vendorId,
			vendor: vendors.businessName,
			price: min(prices.price),
			amount: min(prices.amount),
			image: vendorServices.featuredImage,
			category: serviceCategories.name
		})
		.from(vendorServices)
		.leftJoin(serviceCategories, eq(serviceCategories.id, vendorServices.categoryId))
		.leftJoin(prices, eq(prices.serviceId, vendorServices.id))
		.leftJoin(vendors, eq(vendors.id, vendorServices.vendorId))
		.where(eq(vendorServices.isActive, true))
		.groupBy(vendorServices.id, serviceCategories.name);
	const allPrices = await db.select().from(prices);

	const subs = await db
		.select({
			id: subCategories.id,
			name: subCategories.name,
			description: subCategories.description,
			serviceId: categoryServices.serviceId
		})
		.from(subCategories)
		.innerJoin(
			categoryServices,
			eq(subCategories.id, categoryServices.subCategoryId) // This links the tables
		);

	const productList = serviceList.map((p) => ({
		...p,
		priceList: allPrices
			.filter((price) => price.serviceId === p.productId) // use productId here too
			.map((price) => ({
				amount: price.amount,
				price: price.price
			})),
		subs: subs.filter((sub) => sub.serviceId === p.productId)
	}));

	// 3. Return everything at once
	return {
		productList,
		priceList: allPrices,
		roleName,
		user: currentUser,
		isVendor: isVendor.length > 0,
		isCouple,
		budget
	};
};
