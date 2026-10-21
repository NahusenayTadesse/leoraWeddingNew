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
import { getCoupleByUserId } from '$lib/server/couples';
import { getWeddingByCoupleId } from '$lib/server/weddings';
import { isoDay } from '$lib/server/availability';
import type { Actions, PageServerLoad } from './$types';

/** A signed-in couple's date and guest count, to fill the filters in one click. */
async function myWeddingDetails(userId: string) {
	const couple = await getCoupleByUserId(userId);
	const wedding = couple ? await getWeddingByCoupleId(couple.id) : null;
	if (!wedding?.weddingDate && !wedding?.guestCountEstimate) return null;
	const day = wedding.weddingDate;
	return {
		date: day ? (day instanceof Date ? isoDay(day) : String(day).slice(0, 10)) : '',
		guests: wedding.guestCountEstimate ?? null
	};
}

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
	const dateParam = url.searchParams.get('date') ?? '';
	const date = /^\d{4}-\d{2}-\d{2}$/.test(dateParam) ? dateParam : undefined;
	const positive = (key: string) => {
		const n = Number(url.searchParams.get(key));
		return Number.isFinite(n) && n > 0 ? Math.floor(n) : undefined;
	};
	const guests = positive('guests');
	const budget = positive('budget');
	const shared = { q, city, minRating, date, guests, budget };

	const [result, filters, categoryCounts, favoriteIds, favoriteForm, mine] = await Promise.all([
		listVendors({ ...shared, categoryIds, sort, page }),
		listDirectoryFilters(),
		listCategoryCounts(shared),
		locals.user ? getFavoriteVendorIds(locals.user.id) : Promise.resolve([]),
		superValidate(zod4(favoriteSchema), { id: 'favorite' }),
		locals.user ? myWeddingDetails(locals.user.id) : Promise.resolve(null)
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
		applied: {
			q: q ?? '',
			categoryIds,
			city: city ?? '',
			sort,
			minRating,
			date: date ?? '',
			guests: guests ?? null,
			budget: budget ?? null
		},
		mine,
		favoriteIds,
		isLoggedIn: !!locals.user,
		favoriteForm
	};
};

export const actions: Actions = {
	favorite: async ({ request, locals, url }) => {
		if (!locals.user)
			throw redirect(302, `/login?redirectTo=${encodeURIComponent(url.pathname + url.search)}`);

		const form = await superValidate(request, zod4(favoriteSchema), { id: 'favorite' });
		if (!form.valid) return fail(400, { form });

		await toggleFavorite(locals.user.id, form.data.vendorId);

		return { form };
	}
};
