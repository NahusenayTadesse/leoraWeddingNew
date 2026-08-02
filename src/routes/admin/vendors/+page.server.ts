import { desc, eq } from 'drizzle-orm';
import { message, superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { db } from '$lib/server/db';
import { vendors, vendorCategories } from '$lib/server/db/schema';
import { vendorStatusSchema } from '$lib/schemas/admin';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const [rows, statusForm] = await Promise.all([
		db
			.select({
				id: vendors.id,
				businessName: vendors.businessName,
				category: vendorCategories.name,
				city: vendors.city,
				email: vendors.email,
				phone: vendors.phone,
				status: vendors.status,
				isVerified: vendors.isVerified,
				createdAt: vendors.createdAt
			})
			.from(vendors)
			.leftJoin(vendorCategories, eq(vendorCategories.id, vendors.categoryId))
			.orderBy(desc(vendors.createdAt)),
		superValidate(zod4(vendorStatusSchema))
	]);

	return { rows, statusForm };
};

export const actions = {
	updateStatus: async ({ request }) => {
		const form = await superValidate(request, zod4(vendorStatusSchema));
		if (!form.valid) {
			return message(form, { type: 'error', text: 'Invalid request' }, { status: 400 });
		}

		try {
			await db
				.update(vendors)
				.set({ status: form.data.status })
				.where(eq(vendors.id, form.data.id));
			return message(form, { type: 'success', text: `Vendor marked ${form.data.status}` });
		} catch (err) {
			console.error('Failed to update vendor status:', err);
			return message(form, { type: 'error', text: 'Could not update vendor status' }, { status: 500 });
		}
	}
} satisfies Actions;
