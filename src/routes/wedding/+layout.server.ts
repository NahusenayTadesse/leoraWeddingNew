import { redirect } from '@sveltejs/kit';
import { getCoupleByUserId } from '$lib/server/couples';
import { getWeddingByCoupleId } from '$lib/server/weddings';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals, url }) => {
	if (!locals.user) throw redirect(302, `/login?redirectTo=${encodeURIComponent(url.pathname)}`);

	const couple = await getCoupleByUserId(locals.user.id);

	if (!couple && !url.pathname.startsWith('/wedding/profile')) {
		throw redirect(302, '/wedding/profile');
	}

	const wedding = couple ? await getWeddingByCoupleId(couple.id) : null;

	// Pages that can't function without a wedding record.
	const needsWedding = ['/wedding/budget', '/wedding/guests', '/wedding/tasks', '/wedding/bookings'];
	if (!wedding && needsWedding.some((p) => url.pathname.startsWith(p))) {
		throw redirect(302, '/wedding/wedding');
	}

	return {
		user: { id: locals.user.id, name: locals.user.name, image: locals.user.image },
		couple,
		wedding
	};
};