// import { encodeBase32LowerCase } from '@oslojs/encoding';

import type { Actions, PageServerLoad } from './$types';
import { message, setError, superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { addUser, addVendor } from '$lib/ZodSchema';
import { redirect } from 'sveltekit-flash-message/server';
import { auth } from '$lib/server/auth';
import { eq, and, sql } from 'drizzle-orm';

import { db } from '$lib/server/db';
import { APIError } from 'better-auth';
import {
	couples,
	roles,
	user,
	city,
	subcity,
	vendorCategories,
	vendors,
	address
} from '$lib/server/db/schema';

export const load: PageServerLoad = async (event) => {
	if (event.locals.user) {
		const roleName = await db
			.select({ name: roles.name })
			.from(user)
			.leftJoin(roles, eq(user.roleId, roles.id))
			.where(eq(user.id, event.locals.user.id))
			.then((rows) => rows[0]);

		if (roleName.name === 'Admin') {
			return redirect(302, '/dashboard');
		} else return redirect(302, '/');
	}
	const form = await superValidate(zod4(addUser));
	const vendorForm = await superValidate(zod4(addVendor));

	const cityList = await db.select({ value: city.id, name: city.name }).from(city);
	const categoryList = await db
		.select({ value: vendorCategories.id, name: vendorCategories.name })
		.from(vendorCategories);
	const subCityList = await db
		.select({ value: subcity.id, name: subcity.name, cityId: subcity.cityId })
		.from(subcity);

	return { form, vendorForm, cityList, subCityList, categoryList };
};

export const actions: Actions = {
	signup: async (event) => {
		const form = await superValidate(event.request, zod4(addUser));
		if (!form.valid) {
			return message(
				form,
				{
					type: 'error',
					text: 'Please Check the form}'
				},
				{
					status: 500
				}
			);
		}

		const { brideName, groomName, email, password, phone, phone2 } = form.data;

		try {
			await db.transaction(async (tx) => {
				const newCustomer = await auth.api.signUpEmail({
					body: {
						email,
						password,
						role: 'couple',
						name: brideName,
						callbackURL: '/auth/verification-success'
					}
				});
				await tx.insert(couples).values({
					groomName,
					brideName,
					email,
					phone,
					userId: newCustomer?.user.id,
					phone2
				});
			});

			return message(form, {
				type: 'success',
				text: 'Sign Up Successful!'
			});
		} catch (error) {
			if (error instanceof APIError) {
				return message(
					form,
					{
						type: 'error',
						text: error?.message
					},
					{
						status: 500
					}
				);
			}
			return message(
				form,
				{
					type: 'error',
					text: 'Registration Failed'
				},
				{
					status: 500
				}
			);
		}
	},
	vendorSignup: async (event) => {
		const form = await superValidate(event.request, zod4(addVendor));
		if (!form.valid) {
			return message(
				form,
				{
					type: 'error',
					text: 'Please Check the form'
				},
				{
					status: 500
				}
			);
		}

		const {
			businessName,
			phone,
			email,
			description,
			city,
			subcity,
			vendorCategory,
			kebele,
			street,
			buildingNumber,
			houseNumber,
			floor,
			googleMapsUrl,
			password
		} = form.data;

		try {
			await db.transaction(async (tx) => {
				const newVendor = await auth.api.signUpEmail({
					body: {
						email,
						password,
						role: 'vendor',
						name: businessName,
						callbackURL: '/auth/verification-success'
					}
				});

				const [addressId] = await tx
					.insert(address)
					.values({
						subcityId: subcity,
						kebele,
						street,
						buildingNumber,
						houseNumber,
						floor,
						googleMapsUrl
					})
					.$returningId();

				await tx.insert(vendors).values({
					businessName,
					phone,
					email,
					description,

					vendorCategory,
					address: addressId.id,
					userId: newVendor?.user?.id
				});
			});

			return message(form, {
				type: 'success',
				text: 'Sign Up Successful!'
			});
		} catch (error) {
			console.error(error.message);
			if (error instanceof APIError) {
				return message(
					form,
					{
						type: 'error',
						text: error?.message
					},
					{
						status: 500
					}
				);
			}
			return message(
				form,
				{
					type: 'error',
					text: 'Registration Failed'
				},
				{
					status: 500
				}
			);
		}
	}
};
