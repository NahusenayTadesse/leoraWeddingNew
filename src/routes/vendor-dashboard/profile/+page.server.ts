import { eq } from 'drizzle-orm';
import { message, superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { db } from '$lib/server/db';
import { requireVendor } from '$lib/server/vendor';
import { vendorCategories, vendors } from '$lib/server/db/schema';
import { vendorProfileSchema } from '$lib/schemas/vendor-profile';
import { fromMoney } from '$lib/money';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const vendor = await requireVendor(locals, '/vendor-dashboard/profile');

	const [row, categories] = await Promise.all([
		db
			.select({
				businessName: vendors.businessName,
				categoryId: vendors.categoryId,
				description: vendors.description,
				city: vendors.city,
				address: vendors.address,
				phone: vendors.phone,
				email: vendors.email,
				website: vendors.website,
				priceMin: vendors.priceMin,
				priceMax: vendors.priceMax
			})
			.from(vendors)
			.where(eq(vendors.id, vendor.id))
			.limit(1)
			.then((r) => r[0]),
		db
			.select({ value: vendorCategories.id, name: vendorCategories.name })
			.from(vendorCategories)
			.where(eq(vendorCategories.listable, true))
	]);

	const form = await superValidate(
		{
			...row,
			description: row?.description ?? undefined,
			city: row?.city ?? undefined,
			address: row?.address ?? undefined,
			phone: row?.phone ?? undefined,
			email: row?.email ?? undefined,
			website: row?.website ?? undefined,
			priceMin: row?.priceMin ? Number(row.priceMin) : undefined,
			priceMax: row?.priceMax ? Number(row.priceMax) : undefined
		},
		zod4(vendorProfileSchema)
	);

	return { form, categories, vendor };
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const vendor = await requireVendor(locals, '/vendor-dashboard/profile');
		const form = await superValidate(request, zod4(vendorProfileSchema));
		if (!form.valid) {
			return message(form, { type: 'error', text: 'Please check the form for errors.' }, { status: 400 });
		}

		const { priceMin, priceMax, email, website, ...rest } = form.data;

		await db
			.update(vendors)
			.set({
				...rest,
				email: email || null,
				website: website || null,
				priceMin: priceMin !== undefined ? fromMoney(priceMin) : null,
				priceMax: priceMax !== undefined ? fromMoney(priceMax) : null,
				updatedBy: locals.user!.id
			})
			.where(eq(vendors.id, vendor.id));

		return message(form, { type: 'success', text: 'Profile updated.' });
	}
};
