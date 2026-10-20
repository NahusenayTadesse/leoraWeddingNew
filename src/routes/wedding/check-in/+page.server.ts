import { z } from 'zod/v4';
import { requireCoupleAndWedding } from '$lib/server/weddings';
import { CardRefused, checkIn, checkInList } from '$lib/server/cards';
import { getCoupleByUserId } from '$lib/server/couples';
import { parse, bad } from '$lib/server/adminAction';
import { m } from '$lib/paraglide/messages.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const couple = await getCoupleByUserId(locals.user!.id);
	return { guests: couple ? await checkInList(couple.id) : [] };
};

export const actions = {
	/** By token (scanned from the entry pass) or guest id (tapped in the list). */
	checkIn: async ({ request, locals }) => {
		const { couple } = await requireCoupleAndWedding(locals);
		const p = await parse(
			request,
			z.object({
				token: z
					.string()
					.regex(/^[A-Za-z0-9_-]{8,32}$/)
					.optional(),
				guestId: z.coerce.number().int().positive().optional()
			})
		);
		if ('error' in p) return p.error;
		if (!p.data.token && !p.data.guestId) return bad(m.chk_unknown());
		try {
			const r = await checkIn(couple.id, p.data, locals.user!.id);
			const time = r.alreadyAt
				? new Date(r.alreadyAt).toLocaleTimeString('en-GB', {
						hour: '2-digit',
						minute: '2-digit',
						timeZone: 'Africa/Addis_Ababa'
					})
				: '';
			const text = r.alreadyAt
				? m.chk_already({ name: r.name, time })
				: r.status === 'declined'
					? `${m.chk_welcome({ name: r.name })} ${m.chk_declined_warn({ name: r.name })}`
					: `${m.chk_welcome({ name: r.name })}${r.partySize && r.partySize > 1 ? ` (${m.chk_party({ n: r.partySize })})` : ''}`;
			return { message: { type: r.alreadyAt ? 'error' : 'success', text } };
		} catch (err) {
			if (err instanceof CardRefused) return bad(m.chk_unknown(), 404);
			throw err;
		}
	}
} satisfies Actions;
