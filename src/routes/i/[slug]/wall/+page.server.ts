import { error } from '@sveltejs/kit';
import { cardBySlug, guestByToken } from '$lib/server/cards';
import { getCoupleByUserId } from '$lib/server/couples';
import { listPosts, wallKeyMatches } from '$lib/server/guestPosts';
import { postAction } from '$lib/server/guestActions';
import { m } from '$lib/paraglide/messages.js';
import type { Actions, PageServerLoad } from './$types';

/**
 * The photo wall. Open to the couple, to anyone with the table link (`?k=` wall key) and to
 * guests on their personal link (`?t=` invite token); the bare invitation can't reach it.
 */
async function access(event: { params: { slug: string }; url: URL; locals: App.Locals }) {
	const viewer = event.locals.user ? await getCoupleByUserId(event.locals.user.id) : null;
	const page = await cardBySlug(event.params.slug, viewer?.id);
	if (!page) error(404, m.inv_not_published());

	const key = event.url.searchParams.get('k');
	const token = event.url.searchParams.get('t');
	const guest = token ? await guestByToken(page.couple.id, token) : null;
	const allowed =
		viewer?.id === page.couple.id || !!guest || (await wallKeyMatches(page.couple.id, key));
	if (!allowed) error(404, m.inv_invalid_link());
	return { page, guest };
}

export const load: PageServerLoad = async (event) => {
	const { page, guest } = await access(event);
	const [photos, blessings] = await Promise.all([
		listPosts(page.couple.id, { kind: 'photo', limit: 200 }),
		listPosts(page.couple.id, { kind: 'blessing', limit: 50 })
	]);
	return {
		names: [page.couple.brideName, page.couple.groomName].filter(Boolean).join(' & '),
		theme: page.card.theme,
		guestName: guest?.fullName ?? '',
		photos,
		blessings,
		show: event.url.searchParams.get('show') === '1'
	};
};

export const actions: Actions = {
	post: async (event) => {
		const { page, guest } = await access(event);
		return postAction(event, page.couple.id, guest?.id ?? null);
	}
};
