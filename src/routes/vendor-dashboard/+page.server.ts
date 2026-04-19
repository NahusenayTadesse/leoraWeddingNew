import { auth } from '$lib/server/auth';
import { redirect } from 'sveltekit-flash-message/server';

import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { vendorServices as products, orders, orderItems } from '$lib/server/db/schema';
import { lte, and, sql, eq } from 'drizzle-orm';
export const load: PageServerLoad = async () => {
	const dailyStats = await db
		.select({
			totalOrders: sql<number>`count(distinct ${orders.id})`,
			totalItemsSold: sql<number>`coalesce(sum(${orderItems.quantity}), 0)`,
			totalRevenue: sql<number>`coalesce(sum(${orderItems.price} * ${orderItems.quantity}), 0)`,
			averageOrderValue: sql<number>`
              coalesce(
                  sum(${orderItems.price} * ${orderItems.quantity})
                  / nullif(count(distinct ${orders.id}), 0),
                  0
              )
          `,
			// Replaced sum() with sql equivalent
			totalPaymentsCollected: sql<number>`coalesce(sum(${orderItems.price} * ${orderItems.quantity}), 0)`
		})
		.from(orders)
		.leftJoin(orderItems, eq(orders.id, orderItems.orderId))
		.where(
			and(
				eq(orders.status, 'delivered'),
				sql`${orders.createdAt} >= CURRENT_DATE()`,
				sql`${orders.createdAt} < CURRENT_DATE() + INTERVAL 1 DAY`
			)
		)
		.then((rows) => rows[0]);
	return {
		dailyStats
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
