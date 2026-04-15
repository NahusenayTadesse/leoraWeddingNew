import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { couples as customers, user, orders, weddings } from '$lib/server/db/schema';
import { eq, and, count, sql, ne } from 'drizzle-orm';
import { setFlash } from 'sveltekit-flash-message/server';
import { fail, setError, superValidate } from 'sveltekit-superforms';
import { addCustomer } from '$lib/ZodSchema';
import { zod4 } from 'sveltekit-superforms/adapters';

export const load: PageServerLoad = async ({ locals }) => {
	const form = await superValidate(zod4(addCustomer));
	const customersList = await db
		.select({
			id: customers.id,
			groomName: customers.groomName,
			brideName: customers.brideName,
			phone: customers.phone,
			phone2: customers.phone2,
			email: customers.email,
			daysSinceJoined: sql<number>`DATEDIFF(CURRENT_DATE, ${customers.createdAt})`,
			weddingDate: sql<string>`DATE_FORMAT(${weddings.weddingDate}, '%d %M %Y')`,
			weddingStyle: weddings.weddingStyle,
			totalBudget: weddings.totalBudget,
			expectedGuests: weddings.expectedGuests,
			pendingOrders: count(orders.id)
		})
		.from(customers)
		.leftJoin(orders, and(eq(orders.customerId, customers.id), eq(orders.status, 'pending')))
		.leftJoin(weddings, eq(weddings.coupleId, customers.id))
		.groupBy(
			customers.id,
			customers.groomName,
			customers.brideName,
			customers.phone,
			customers.phone2,
			customers.email,
			customers.createdAt,
			orders.id,
			weddings.weddingDate,
			weddings.weddingStyle,
			weddings.totalBudget,
			weddings.expectedGuests
		);

	return {
		customersList
	};
};

export const actions: Actions = {
	addCustomer: async ({ request, locals, cookies }) => {
		const form = await superValidate(request, zod4(addCustomer));

		if (!form.valid) {
			// Stay on the same page and set a flash message
			setFlash({ type: 'error', message: 'Please check your form.' }, cookies);
			return fail(400, { form });
		}
		const { firstName, lastName, gender, phone } = form.data;

		try {
			await db.insert(customers).values({
				name,
				phone,
				createdBy: locals?.user?.id
			});

			// Stay on the same page and set a flash message
			setFlash({ type: 'success', message: 'Customer Successfully Added' }, cookies);
			return {
				form
			};
		} catch (err) {
			console.error('Error' + err);
			setFlash(
				{
					type: 'error',
					message:
						err.code === 'ER_DUP_ENTRY'
							? 'Phone number is already taken. Please choose another one.'
							: err.message
				},
				cookies
			);

			if (err.code === 'ER_DUP_ENTRY')
				return setError(form, 'phone', 'Phone Number already exists.');

			return fail(400, {
				form
			});
		}
	}
};
