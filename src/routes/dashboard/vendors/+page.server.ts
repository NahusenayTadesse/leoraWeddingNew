import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import {
	vendors as customers,
	user,
	vendorCategories,
	subcity,
	address,
	vendorServices
} from '$lib/server/db/schema';
import { eq, and, count, sql, ne } from 'drizzle-orm';
import { setFlash } from 'sveltekit-flash-message/server';
import { fail, setError, superValidate } from 'sveltekit-superforms';
import { addCustomer } from '$lib/ZodSchema';
import { zod4 } from 'sveltekit-superforms/adapters';

export const load: PageServerLoad = async () => {
	// const form = await superValidate(zod4(addCustomer));
	const customersList = await db
		.select({
			id: customers.id,
			name: customers.businessName,
			phone: customers.phone,
			email: user.email,
			vendorCategory: vendorCategories.name,
			numberOfServices: count(vendorServices.id),
			address: {
				subcity: subcity.name,
				street: address.street,
				kebele: address.kebele,
				buildingNumber: address.buildingNumber,
				floor: address.floor,
				houseNumber: address.houseNumber,
				googleMapsUrl: address.googleMapsUrl
			},
			subcity: subcity.name,

			daysSinceJoined: sql<number>`DATEDIFF(CURRENT_DATE, ${customers.createdAt})`,
			createdAt: sql<string>`DATE_FORMAT(${customers.createdAt}, '%d %M %Y')`
		})
		.from(customers)
		.leftJoin(user, eq(customers.userId, user.id))
		.leftJoin(vendorCategories, eq(customers.vendorCategory, vendorCategories.id))
		.leftJoin(vendorServices, eq(customers.id, vendorServices.vendorId))
		.leftJoin(address, eq(customers.id, address.id))
		.leftJoin(subcity, eq(address.subcityId, subcity.id))
		.groupBy(
			customers.id,
			user.name,
			customers.createdAt,
			customers.businessName,
			address.street,
			address.kebele,
			address.buildingNumber,
			address.floor,
			address.houseNumber,
			address.googleMapsUrl
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
