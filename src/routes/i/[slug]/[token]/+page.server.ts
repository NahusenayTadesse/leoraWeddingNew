import { error, fail } from '@sveltejs/kit';
import { z } from 'zod/v4';
import QRCode from 'qrcode';
import { CardRefused, cardBySlug, guestByToken, submitRsvp } from '$lib/server/cards';
import { getCoupleByUserId } from '$lib/server/couples';
import { LIMITS, takeToken } from '$lib/server/rateLimit';
import { m } from '$lib/paraglide/messages.js';
import { giftAction, postAction } from '$lib/server/guestActions';
import type { Actions, PageServerLoad } from './$types';

async function pageFor(slug: string, locals: App.Locals) {
	const viewer = locals.user ? await getCoupleByUserId(locals.user.id) : null;
	const page = await cardBySlug(slug, viewer?.id);
	if (!page) error(404, m.inv_not_published());
	return page;
}

/** A guest's personal invitation: their name, RSVP form and entry QR code. */
export const load: PageServerLoad = async ({ params, locals, url }) => {
	const page = await pageFor(params.slug, locals);
	const guest = await guestByToken(page.couple.id, params.token);
	if (!guest) error(404, m.inv_invalid_link());

	// The QR encodes this same link; the couple's check-in screen reads the token from it.
	const qr = await QRCode.toDataURL(`${url.origin}/i/${params.slug}/${params.token}`, {
		margin: 1,
		width: 240,
		errorCorrectionLevel: 'M'
	});

	const deadline = page.card.rsvpDeadline;
	const closed = !!deadline && new Date(`${deadline}T23:59:59+03:00`) < new Date();

	return {
		page: { ...page, couple: { ...page.couple, partner1: undefined } },
		slug: params.slug,
		guest: {
			fullName: guest.fullName,
			plusOnes: guest.plusOnes,
			rsvpStatus: guest.rsvpStatus,
			rsvpPartySize: guest.rsvpPartySize,
			rsvpNote: guest.rsvpNote,
			mealPreference: guest.mealPreference,
			replied: !!guest.rsvpAt,
			checkedIn: !!guest.checkedInAt
		},
		qr,
		closed,
		giftThanks: url.searchParams.get('gift') === 'thanks',
		wallUrl: `/i/${params.slug}/wall?t=${encodeURIComponent(params.token)}`
	};
};

const rsvpSchema = z.object({
	attending: z.enum(['yes', 'no']),
	partySize: z.coerce.number().int().min(0).max(50).default(1),
	mealPreference: z
		.string()
		.trim()
		.max(100)
		.transform((v) => v || null),
	note: z
		.string()
		.trim()
		.max(500)
		.transform((v) => v || null)
});

/** The guest behind a personal link, for the actions below. */
async function guestFor(slug: string, token: string, locals: App.Locals) {
	const page = await pageFor(slug, locals);
	const guest = await guestByToken(page.couple.id, token);
	if (!guest) error(404, m.inv_invalid_link());
	return { page, guest };
}

export const actions: Actions = {
	gift: async (event) => {
		const { page, guest } = await guestFor(event.params.slug, event.params.token, event.locals);
		return giftAction(event, page.couple.id, guest.id);
	},

	post: async (event) => {
		const { page, guest } = await guestFor(event.params.slug, event.params.token, event.locals);
		return postAction(event, page.couple.id, guest.id);
	},

	rsvp: async ({ params, locals, request, getClientAddress }) => {
		if (!takeToken(`rsvp:${getClientAddress()}`, LIMITS.signup)) {
			return fail(429, { message: { type: 'error', text: m.auth_too_many() } });
		}
		const parsed = rsvpSchema.safeParse(Object.fromEntries(await request.formData()));
		if (!parsed.success)
			return fail(400, { message: { type: 'error', text: m.auth_form_invalid() } });
		const page = await pageFor(params.slug, locals);
		const attending = parsed.data.attending === 'yes';
		try {
			await submitRsvp(page, params.token, {
				attending,
				partySize: parsed.data.partySize,
				mealPreference: parsed.data.mealPreference,
				note: parsed.data.note
			});
		} catch (err) {
			if (err instanceof CardRefused)
				return fail(409, { message: { type: 'error', text: err.message } });
			throw err;
		}
		return {
			message: { type: 'success', text: attending ? m.inv_thanks_yes() : m.inv_thanks_no() }
		};
	}
};
