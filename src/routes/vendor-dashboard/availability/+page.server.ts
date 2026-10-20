import { z } from 'zod/v4';
import { requireVendor } from '$lib/server/vendor';
import { busyDays, toggleBlocked } from '$lib/server/availability';
import { monthRange } from '$lib/server/monthRange';
import { parse, ok, bad } from '$lib/server/adminAction';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const vendor = await requireVendor(locals, '/vendor-dashboard/availability');
	const { month, from, to } = monthRange(url.searchParams.get('month'));
	return { month, ...(await busyDays(vendor.id, from, to)) };
};

export const actions = {
	toggle: async ({ request, locals }) => {
		const vendor = await requireVendor(locals);
		const p = await parse(request, z.object({ day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }));
		if ('error' in p) return p.error;
		const today = new Date().toISOString().slice(0, 10);
		if (p.data.day < today) return bad('That day has passed.');
		const state = await toggleBlocked(vendor.id, p.data.day);
		return ok(state === 'blocked' ? 'Marked unavailable' : 'Marked available');
	}
} satisfies Actions;
