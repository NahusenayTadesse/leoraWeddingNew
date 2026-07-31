import { fail, redirect } from '@sveltejs/kit';
import { superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { favoriteSchema } from '$lib/schemas/reviews';
import {
	listVendors,
	listDirectoryFilters,
	getFavoriteVendorIds,
	toggleFavorite,
	type VendorSort
} from '$lib/server/vendorDirectory';
import type { Actions, PageServerLoad } from './$types';

const SORTS: VendorSort[] = ['recommended', 'rating', 'newest', 'name'];

export const load: PageServerLoad = async ({ url, locals }) => {
	const q = url.searchParams.get('q')?.trim() || undefined;
	const categoryParam = Number(url.searchParams.get('category'));
	const categoryId = Number.isInteger(categoryParam) && categoryParam > 0 ? categoryParam : undefined;
	const city = url.searchParams.get('city')?.trim() || undefined;
	const sortParam = url.searchParams.get('sort') as VendorSort;
	const sort = SORTS.includes(sortParam) ? sortParam : 'recommended';
	const pageParam = Number(url.searchParams.get('page'));
	const page = Number.isInteger(pageParam) && pageParam > 0 ? pageParam : 1;

	const [result, filters, favoriteIds, favoriteForm] = await Promise.all([
		listVendors({ q, categoryId, city, sort, page }),
		listDirectoryFilters(),
		locals.user ? getFavoriteVendorIds(locals.user.id) : Promise.resolve([]),
		superValidate(zod4(favoriteSchema), { id: 'favorite' })
	]);

	return {
		...result,
		page,
		filters: {
			categoryItems: filters.categories.map((c) => ({ value: String(c.id), name: c.name })),
			cityItems: filters.cities.map((c) => ({ value: c, name: c }))
		},
		applied: { q: q ?? '', categoryId: categoryId ?? null, city: city ?? '', sort },
		favoriteIds,
		isLoggedIn: !!locals.user,
		favoriteForm
	};
};

export const actions: Actions = {
	favorite: async ({ request, locals, url }) => {
		if (!locals.user) throw redirect(302, `/login?redirectTo=${encodeURIComponent(url.pathname + url.search)}`);

		const form = await superValidate(request, zod4(favoriteSchema), { id: 'favorite' });
		if (!form.valid) return fail(400, { form });

		await toggleFavorite(locals.user.id, form.data.vendorId);

		return { form };
	}
};