import { error, fail, redirect } from '@sveltejs/kit';
import { z } from 'zod/v4';
import { getCoupleByUserId } from '$lib/server/couples';
import { listBoards, saveItem } from '$lib/server/boards';
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
import { responseStats } from '$lib/server/messages';
import { recordProfileView } from '$lib/server/vendorStats';
import type { Actions, PageServerLoad } from './$types';
import { m } from '$lib/paraglide/messages.js';

/** Vendors this browser viewed in the last 12 hours, so a reload or a form action isn't a new view. */
const SEEN_COOKIE = 'lv_seen';

export const load: PageServerLoad = async ({ params, locals, request, cookies }) => {
	const vendorId = Number(params.id);
	if (!Number.isInteger(vendorId) || vendorId <= 0) throw error(404, 'Vendor not found');

	const vendor = await getVendor(vendorId);
	if (!vendor) throw error(404, 'Vendor not found');

	const seen = (cookies.get(SEEN_COOKIE) ?? '').split('.').filter(Boolean);
	if (!seen.includes(String(vendorId))) {
		cookies.set(SEEN_COOKIE, [...seen.slice(-49), vendorId].join('.'), {
			path: '/vendors',
			maxAge: 12 * 3600,
			httpOnly: true,
			sameSite: 'lax'
		});
		// Not awaited with the rest: the counter must not slow the page down.
		void recordProfileView(vendorId, {
			userId: locals.user?.id,
			ownerUserId: vendor.userId,
			userAgent: request.headers.get('user-agent')
		});
	}

	const [services, reviewData, existingReview, favoriteIds, canReview, response] =
		await Promise.all([
			getVendorServices(vendorId),
			getVendorReviews(vendorId),
			locals.user ? getUserReview(vendorId, locals.user.id) : Promise.resolve(null),
			locals.user ? getFavoriteVendorIds(locals.user.id) : Promise.resolve([]),
			locals.user ? canReviewVendor(locals.user.id, vendorId) : Promise.resolve(false),
			responseStats(vendorId, vendor.userId)
		]);
	const viewerCouple = locals.user ? await getCoupleByUserId(locals.user.id) : null;
	const boards = viewerCouple
		? (await listBoards(viewerCouple.id)).map((b) => ({ id: b.id, name: b.name }))
		: [];

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
		response,
		/** The viewing couple's boards, for "Save"; empty for anyone else. */
		boards,
		canSave: !!viewerCouple,
		isFavorite: favoriteIds.includes(vendorId),
		isLoggedIn: !!locals.user,
		form,
		favoriteForm
	};
};

export const actions: Actions = {
	/** Saves one of this vendor's service pictures to the couple's board. */
	saveToBoard: async ({ request, params, locals }) => {
		const couple = locals.user ? await getCoupleByUserId(locals.user.id) : null;
		if (!couple) return fail(403, { message: { type: 'error', text: m.srv_not_yours() } });
		const parsed = z
			.object({
				serviceId: z.coerce.number().int().positive(),
				image: z.string().min(1).max(500),
				boardId: z.coerce.number().int().positive().optional().catch(undefined)
			})
			.safeParse(Object.fromEntries(await request.formData()));
		if (!parsed.success) return fail(400, { message: { type: 'error', text: m.srv_check_form() } });
		const vendorId = Number(params.id);
		// Only pictures this vendor actually shows: never a URL typed into the form.
		const service = (await getVendorServices(vendorId)).find((s) => s.id === parsed.data.serviceId);
		const pictures = service ? [service.featuredImage, ...service.images].filter(Boolean) : [];
		if (!service || !pictures.includes(parsed.data.image))
			return fail(400, { message: { type: 'error', text: m.srv_check_form() } });
		const saved = await saveItem(
			couple.id,
			{ boardId: parsed.data.boardId, image: parsed.data.image, vendorId, serviceId: service.id },
			m.boards_default()
		);
		return saved
			? { message: { type: 'success', text: m.boards_saved() } }
			: fail(409, { message: { type: 'error', text: m.srv_board_full() } });
	},

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
