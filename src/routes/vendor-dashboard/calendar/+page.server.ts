import { superValidate, message } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { eq, and, sql, min } from 'drizzle-orm';

import { db } from '$lib/server/db';
import { vendorAvailability } from '$lib/server/db/schema';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ parent }) => {
	const { vendorId } = await parent();

	const available = await db
		.select()
		.from(vendorAvailability)
		.where(eq(vendorAvailability.vendorId, Number(vendorId)));

	return {
		available
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
