import { error, redirect } from '@sveltejs/kit';
import { superValidate, message } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { reviewSchema, favoriteSchema } from '$lib/schemas/reviews';
import {
	getVendor,
	getVendorServices,
	getVendorReviews,
	getUserReview,
	getFavoriteVendorIds,
	toggleFavorite,
	upsertVendorReview,
	canReviewVendor
} from '$lib/server/vendorDirectory';
import { notify } from '$lib/server/notify';
import type { Actions, PageServerLoad } from './$types';
import { m } from '$lib/paraglide/messages.js';

export const load: PageServerLoad = async ({ params, locals }) => {
	const vendorId = Number(params.id);
	if (!Number.isInteger(vendorId) || vendorId <= 0) throw error(404, 'Vendor not found');

	const vendor = await getVendor(vendorId);
	if (!vendor) throw error(404, 'Vendor not found');

	const [services, reviewData, existingReview, favoriteIds, canReview] = await Promise.all([
		getVendorServices(vendorId),
		getVendorReviews(vendorId),
		locals.user ? getUserReview(vendorId, locals.user.id) : Promise.resolve(null),
		locals.user ? getFavoriteVendorIds(locals.user.id) : Promise.resolve([]),
		locals.user ? canReviewVendor(locals.user.id, vendorId) : Promise.resolve(false)
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

	// The owner's account id is for notifications only; it doesn't belong in page data.
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const { userId: _ownerId, ...publicVendor } = vendor;

	return {
		vendor: publicVendor,
		services,
		reviews: reviewData.reviews,
		buckets: reviewData.buckets,
		hasReviewed: !!existingReview,
		canReview,
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
		if (!form.valid)
			return message(form, { type: 'error', text: m.srv_check_form() }, { status: 400 });

		const vendor = await getVendor(vendorId);
		if (!vendor) throw error(404, 'Vendor not found');

		const result = await upsertVendorReview(locals.user.id, vendorId, {
			rating: form.data.rating,
			comment: form.data.comment || null
		});

		if (!result.ok) {
			return message(
				form,
				{
					type: 'error',
					text:
						result.reason === 'no-couple'
							? 'Create your wedding profile before reviewing a vendor.'
							: 'You can review a vendor after your booking with them is confirmed and has taken place (or you have paid them).'
				},
				{ status: 403 }
			);
		}
		if (!result.updated && vendor.userId) {
			await notify(vendor.userId, {
				type: 'review_new',
				title: 'New review',
				body: `A couple gave you ${form.data.rating} star${form.data.rating === 1 ? '' : 's'}.`,
				link: `/vendors/${vendorId}`
			});
		}

		return message(form, {
			type: 'success',
			text: result.updated ? m.srv_review_updated() : m.srv_review_thanks()
		});
	},

	favorite: async ({ request, locals, url }) => {
		if (!locals.user) throw redirect(302, `/login?redirectTo=${encodeURIComponent(url.pathname)}`);

		const form = await superValidate(request, zod4(favoriteSchema), { id: 'favorite' });
		if (!form.valid)
			return message(form, { type: 'error', text: m.srv_check_form() }, { status: 400 });

		await toggleFavorite(locals.user.id, form.data.vendorId);

		return { form };
	}
};
