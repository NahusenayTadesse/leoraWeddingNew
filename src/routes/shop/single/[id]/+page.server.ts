import { error, fail, redirect } from '@sveltejs/kit';
import { superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { favoriteSchema } from '$lib/schemas/reviews';
import { getVendor, getFavoriteVendorIds, toggleFavorite } from '$lib/server/vendorDirectory';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent, locals }) => {
	const { service } = await parent();

	const [vendor, favoriteIds] = await Promise.all([
		getVendor(service.vendorId),
		locals.user ? getFavoriteVendorIds(locals.user.id) : Promise.resolve([])
	]);

	if (!vendor) error(404, 'Vendor not found');

	return {
		vendor,
		isFavorite: favoriteIds.includes(service.vendorId)
	};
};

export const actions: Actions = {
	favorite: async ({ request, locals, url }) => {
		if (!locals.user) throw redirect(302, `/login?redirectTo=${encodeURIComponent(url.pathname)}`);

		const form = await superValidate(request, zod4(favoriteSchema));
		if (!form.valid) return fail(400, { form });

		await toggleFavorite(locals.user.id, form.data.vendorId);

		return { form };
	}
};
