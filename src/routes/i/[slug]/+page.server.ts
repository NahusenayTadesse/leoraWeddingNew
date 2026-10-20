import { error } from '@sveltejs/kit';
import { cardBySlug } from '$lib/server/cards';
import { getCoupleByUserId } from '$lib/server/couples';
import { m } from '$lib/paraglide/messages.js';
import type { PageServerLoad } from './$types';

/** The couple's card, without a guest: what a shared link shows. Guests RSVP via /i/<slug>/<token>. */
export const load: PageServerLoad = async ({ params, locals }) => {
	const viewer = locals.user ? await getCoupleByUserId(locals.user.id) : null;
	const page = await cardBySlug(params.slug, viewer?.id);
	if (!page) error(404, m.inv_not_published());
	return { page: { ...page, couple: { ...page.couple, partner1: undefined } }, slug: params.slug };
};
