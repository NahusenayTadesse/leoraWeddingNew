import { z } from 'zod/v4';
import { getCoupleByUserId } from '$lib/server/couples';
import { listSavedVendors, unsaveVendors } from '$lib/server/planner';
import { parse, ok, bad } from '$lib/server/adminAction';
import type { Actions, PageServerLoad } from './$types';
import { m } from '$lib/paraglide/messages.js';

export const load: PageServerLoad = async ({ locals }) => {
	const couple = await getCoupleByUserId(locals.user!.id);
	const rows = couple ? await listSavedVendors(couple.id) : [];
	return {
		vendors: rows.map((v) => ({
			...v,
			ratingAvg: v.ratingAvg === null ? null : Number(v.ratingAvg)
		}))
	};
};

export const actions = {
	remove: async ({ request, locals }) => {
		const couple = await getCoupleByUserId(locals.user!.id);
		if (!couple) return bad(m.srv_no_profile(), 400);
		const p = await parse(request, z.object({ vendorId: z.coerce.number().int().positive() }));
		if ('error' in p) return p.error;
		await unsaveVendors(couple.id, [p.data.vendorId]);
		return ok(m.srv_unsaved());
	}
} satisfies Actions;
