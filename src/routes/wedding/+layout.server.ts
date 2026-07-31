import { redirect } from '@sveltejs/kit';
import { getCoupleByUserId } from '$lib/server/couples';
import { getWeddingByCoupleId } from '$lib/server/weddings';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals, url }) => {
	if (!locals.user) throw redirect(302, `/login?redirectTo=${encodeURIComponent(url.pathname)}`);

	const couple = await getCoupleByUserId(locals.user.id);

	if (!couple && !url.pathname.startsWith('/dashboard/profile')) {
		throw redirect(302, '/dashboard/profile');
	}

	const wedding = couple ? await getWeddingByCoupleId(couple.id) : null;

	// Pages that can't function without a wedding record.
	const needsWedding = ['/dashboard/budget', '/dashboard/guests', '/dashboard/tasks', '/dashboard/bookings'];
	if (!wedding && needsWedding.some((p) => url.pathname.startsWith(p))) {
		throw redirect(302, '/dashboard/wedding');
	}

	return {
		user: { id: locals.user.id, name: locals.user.name, image: locals.user.image },
		couple,
		wedding
	};
};