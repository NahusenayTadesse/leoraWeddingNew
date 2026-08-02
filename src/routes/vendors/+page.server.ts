import { fail, redirect } from '@sveltejs/kit';
import { superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { favoriteSchema } from '$lib/schemas/reviews';
import {
	listVendors,
	listDirectoryFilters,
	listCategoryCounts,
	getFavoriteVendorIds,
	toggleFavorite,
	type VendorSort
} from '$lib/server/vendorDirectory';
import type { Actions, PageServerLoad } from './$types';

const SORTS: VendorSort[] = ['recommended', 'rating', 'newest', 'name'];

export const load: PageServerLoad = async ({ url, locals }) => {
	const q = url.searchParams.get('q')?.trim() || undefined;
	const categoryIds = (url.searchParams.get('category') ?? '')
		.split(',')
		.map(Number)
		.filter((n) => Number.isInteger(n) && n > 0);
	const city = url.searchParams.get('city')?.trim() || undefined;
	const minRatingParam = Number(url.searchParams.get('minRating'));
	const minRating = Number.isFinite(minRatingParam) && minRatingParam > 0 ? minRatingParam : 0;
	const sortParam = url.searchParams.get('sort') as VendorSort;
	const sort = SORTS.includes(sortParam) ? sortParam : 'recommended';
	const pageParam = Number(url.searchParams.get('page'));
	const page = Number.isInteger(pageParam) && pageParam > 0 ? pageParam : 1;

	const [result, filters, categoryCounts, favoriteIds, favoriteForm] = await Promise.all([
		listVendors({ q, categoryIds, city, minRating, sort, page }),
		listDirectoryFilters(),
		listCategoryCounts({ q, city, minRating }),
		locals.user ? getFavoriteVendorIds(locals.user.id) : Promise.resolve([]),
		superValidate(zod4(favoriteSchema), { id: 'favorite' })
	]);

	return {
		...result,
		page,
		filters: {
			categoryItems: filters.categories.map((c) => ({
				value: String(c.id),
				name: c.name,
				count: categoryCounts.get(c.id) ?? 0
			})),
			cityItems: filters.cities.map((c) => ({ value: c, name: c }))
		},
		applied: { q: q ?? '', categoryIds, city: city ?? '', sort, minRating },
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