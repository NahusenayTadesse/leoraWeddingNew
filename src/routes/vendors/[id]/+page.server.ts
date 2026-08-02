import { error, fail, redirect } from '@sveltejs/kit';
import { superValidate, message } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { db } from '$lib/server/db';
import { reviewSchema, favoriteSchema } from '$lib/schemas/reviews';
import {
	getVendor,
	getVendorServices,
	getVendorReviews,
	getUserReview,
	getFavoriteVendorIds,
	toggleFavorite,
	upsertVendorReview
} from '$lib/server/vendorDirectory';
import { and, eq } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const vendorId = Number(params.id);
	if (!Number.isInteger(vendorId) || vendorId <= 0) throw error(404, 'Vendor not found');

	const vendor = await getVendor(vendorId);
	if (!vendor) throw error(404, 'Vendor not found');

	const [services, reviewData, existingReview, favoriteIds] = await Promise.all([
		getVendorServices(vendorId),
		getVendorReviews(vendorId),
		locals.user ? getUserReview(vendorId, locals.user.id) : Promise.resolve(null),
		locals.user ? getFavoriteVendorIds(locals.user.id) : Promise.resolve([])
	]);

	const [form, favoriteForm] = await Promise.all([
		superValidate(
			existingReview
				? { rating: existingReview.rating ?? 5, comment: existingReview.comment ?? '' }
				: {},
			zod4(reviewSchema),
			{ id: 'review' }
		),
		superValidate(zod4(favoriteSchema), { id: 'favorite' })
	]);

	return {
		vendor,
		services,
		reviews: reviewData.reviews,
		buckets: reviewData.buckets,
		hasReviewed: !!existingReview,
		isFavorite: favoriteIds.includes(vendorId),
		isLoggedIn: !!locals.user,
		form,
		favoriteForm
	};
};

export const actions: Actions = {
	review: async ({ request, params, locals, url }) => {
		if (!locals.user) throw redirect(302, `/login?redirectTo=${encodeURIComponent(url.pathname)}`);

		const vendorId = Number(params.id);
		const form = await superValidate(request, zod4(reviewSchema), { id: 'review' });
		if (!form.valid) return fail(400, { form });

		const vendor = await getVendor(vendorId);
		if (!vendor) throw error(404, 'Vendor not found');

		const result = await upsertVendorReview(locals.user.id, vendorId, {
			rating: form.data.rating,
			comment: form.data.comment || null
		});

		if (!result.ok) {
			return message(
				form,
				'Create your wedding profile before reviewing a vendor.',
				{ status: 403 }
			);
		}

		return message(form, result.updated ? 'Your review was updated.' : 'Thanks for your review!');
	},

	favorite: async ({ request, locals, url }) => {
		if (!locals.user) throw redirect(302, `/login?redirectTo=${encodeURIComponent(url.pathname)}`);

		const form = await superValidate(request, zod4(favoriteSchema), { id: 'favorite' });
		if (!form.valid) return fail(400, { form });

		await toggleFavorite(locals.user.id, form.data.vendorId);

		return { form };
	}
};