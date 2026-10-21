import { error } from '@sveltejs/kit';
import { cardBySlug } from '$lib/server/cards';
import { getCoupleByUserId } from '$lib/server/couples';
import { giftAction } from '$lib/server/guestActions';
import { m } from '$lib/paraglide/messages.js';
import type { Actions, PageServerLoad } from './$types';

async function pageFor(slug: string, locals: App.Locals) {
	const viewer = locals.user ? await getCoupleByUserId(locals.user.id) : null;
	const page = await cardBySlug(slug, viewer?.id);
	if (!page) error(404, m.inv_not_published());
	return page;
}

/** The couple's card, without a guest: what a shared link shows. Guests RSVP via /i/<slug>/<token>. */
export const load: PageServerLoad = async ({ params, locals, url }) => {
	const page = await pageFor(params.slug, locals);
	return {
		page: { ...page, couple: { ...page.couple, partner1: undefined } },
		slug: params.slug,
		giftThanks: url.searchParams.get('gift') === 'thanks'
	};
};

export const actions: Actions = {
	/** Anyone with the invitation may send a gift; nothing else is written from the open link. */
	gift: async (event) => {
		const page = await pageFor(event.params.slug, event.locals);
		return giftAction(event, page.couple.id);
	}
};
