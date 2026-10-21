import { redirect } from '@sveltejs/kit';
import { z } from 'zod/v4';
import QRCode from 'qrcode';
import { getCoupleByUserId } from '$lib/server/couples';
import { listPosts, setPostHidden, wallKeyFor } from '$lib/server/guestPosts';
import { parse, ok } from '@nahu/admin-kit/server/actionResults';
import { m } from '$lib/paraglide/messages.js';
import type { Actions, PageServerLoad } from './$types';

async function requireCouple(locals: App.Locals) {
	const couple = await getCoupleByUserId(locals.user!.id);
	if (!couple) redirect(302, '/wedding/profile');
	return couple;
}

export const load: PageServerLoad = async ({ locals, url }) => {
	const couple = await requireCouple(locals);
	const [posts, key] = await Promise.all([
		listPosts(couple.id, { includeHidden: true, limit: 500 }),
		wallKeyFor(couple.id)
	]);
	const wallUrl = couple.slug ? `${url.origin}/i/${couple.slug}/wall?k=${key}` : null;
	return {
		posts,
		wallUrl,
		wallQr: wallUrl
			? await QRCode.toDataURL(wallUrl, { margin: 1, width: 240, errorCorrectionLevel: 'M' })
			: null
	};
};

export const actions = {
	hide: async ({ request, locals }) => {
		const couple = await requireCouple(locals);
		const p = await parse(
			request,
			z.object({ id: z.coerce.number().int().positive(), hidden: z.enum(['yes', 'no']) })
		);
		if ('error' in p) return p.error;
		await setPostHidden(couple.id, p.data.id, p.data.hidden === 'yes');
		return ok(p.data.hidden === 'yes' ? m.gb_hidden() : m.gb_show());
	},

	newWallLink: async ({ locals }) => {
		const couple = await requireCouple(locals);
		await wallKeyFor(couple.id, true);
		return ok(m.srv_partner_new_link());
	}
} satisfies Actions;
