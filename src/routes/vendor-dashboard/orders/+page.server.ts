import { superValidate, message } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { eq, and, sql, min } from 'drizzle-orm';

import { edit } from './schema';
import { db } from '$lib/server/db';
import {
	vendorOrders,
	orders,
	orderItems,
	vendorServices as products,
	couples as customers,
	prices
} from '$lib/server/db/schema';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ parent }) => {
	const editForm = await superValidate(zod4(edit));

	const { vendorId } = await parent();

	const fetchedProducts = await db
		.select({
			value: products.id,
			name: products.title,

			price: min(prices.price)
		})
		.from(products)
		.leftJoin(prices, eq(products.id, prices.serviceId))
		.groupBy(products.id);

	const fetchedCustomers = await db
		.select({
			value: customers.id,
			name: sql<string>`TRIM(CONCAT(COALESCE(${customers.groomName}, ''), ' ', COALESCE(${customers.brideName}, '')))`
		})
		.from(customers);

	const allData = await db
		.select({
			id: vendorOrders.id,
			name: sql<string>`TRIM(CONCAT(COALESCE(${customers.groomName}, ''), ' ', COALESCE(${customers.brideName}, '')))`,
			customerId: customers.id,
			orderId: orders.id,
			status: vendorOrders.status
		})
		.from(vendorOrders)
		.innerJoin(orders, eq(vendorOrders.orderId, orders.id))
		.innerJoin(customers, eq(orders.coupleId, customers.id))
		.where(and(eq(vendorOrders.status, 'pending'), eq(vendorOrders.vendorId, Number(vendorId))));

	const allItems = await db
		.select({
			id: orderItems.id,
			product: products.title,
			quantity: orderItems.quantity,
			productId: orderItems.productId,
			price: orderItems.price,
			total: sql<number>`${orderItems.quantity} * ${orderItems.price}`.mapWith(Number)
		})
		.from(orderItems)
		.leftJoin(products, eq(orderItems.productId, products.id));

	return {
		editForm,
		allData,
		allItems,
		fetchedProducts,
		fetchedCustomers
	};
};

export const actions: Actions = {
	edit: async ({ request, locals }) => {
		const form = await superValidate(request, zod4(edit));
		if (!form.valid) {
			return message(form, { type: 'error', text: 'Please check the form for Errors' });
		}

		const { id, status } = form.data;

		try {
			await db.transaction(async (tx) => {
				const fetchedProducts = await tx // ← tx, not db
					.select({ value: products.id, price: products.price })
					.from(products);

				await tx
					.update(orders)
					.set({ customerId: customer, status })
					.where(eq(orders.id, Number(id)));

				if (selectedProducts.length) {
					await tx.delete(orderItems).where(eq(orderItems.orderId, Number(id)));
					await tx.insert(orderItems).values(
						selectedProducts.map((product) => ({
							orderId: Number(id),
							productId: Number(product.product),
							quantity: Number(product.quantity),
							price: getPrice(fetchedProducts, Number(product.product))
						}))
					);
				}
			});

			return message(form, { type: 'success', text: 'Order Successfully Updated' });
		} catch (err) {
			return message(form, {
				type: 'error',
				text: 'Error Updating Orders: ' + err?.message
			});
		}
	}
};

function getPrice(list: Array<{ value: number; price: string }>, value: number): number {
	const item = list.find((i) => i.value === value);
	return item ? Number(item.price) : 0;
}
