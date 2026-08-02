import { error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { orders, orderItems, vendorOrders, vendorServices, vendors } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { chapa, decodeCheckoutToken } from '$lib/server/chapa';
import { toMoney } from '$lib/money';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const decoded = decodeCheckoutToken(params.token);
	if (!decoded) throw error(400, 'This confirmation link is invalid.');

	const [order] = await db.select().from(orders).where(eq(orders.id, decoded.subjectId)).limit(1);
	if (!order) throw error(404, 'Order not found.');

	// Chapa is the only party that can move an order out of 'pending' — this
	// page just asks it what happened and records the answer. Once the order
	// has settled one way or the other, re-verifying on every reload of this
	// link would be pointless and just adds a network round trip.
	let status = order.status;
	if (status === 'pending') {
		try {
			const verification = await chapa.verify({ tx_ref: decoded.txRef });
			const paid = verification?.data?.status === 'success';
			status = paid ? 'paid' : 'failed';
			await db.update(orders).set({ status }).where(eq(orders.id, order.id));
		} catch (err) {
			console.error('Chapa verify error:', err);
			// Leave status as 'pending' — the customer can refresh, or the
			// order can be reconciled later without losing anything.
		}
	}

	const items = await db
		.select({
			id: orderItems.id,
			serviceTitle: vendorServices.title,
			vendorName: vendors.businessName,
			amount: orderItems.amount,
			quantity: orderItems.quantity,
			price: orderItems.price
		})
		.from(orderItems)
		.innerJoin(vendorOrders, eq(orderItems.vendorOrderId, vendorOrders.id))
		.leftJoin(vendorServices, eq(orderItems.productId, vendorServices.id))
		.innerJoin(vendors, eq(vendorOrders.vendorId, vendors.id))
		.where(eq(vendorOrders.orderId, order.id));

	return {
		orderId: order.id,
		status,
		total: toMoney(order.totalAmount),
		items: items.map((i) => ({ ...i, price: toMoney(i.price) }))
	};
};
