import { error, redirect } from '@sveltejs/kit';
import { findCoupleByInvite, INVITE_COOKIE, joinCouple } from '$lib/server/partners';
import { takeToken } from '$lib/server/rateLimit';
import { bad } from '@nahu/admin-kit/server/actionResults';
import { m } from '$lib/paraglide/messages.js';
import type { Actions, PageServerLoad } from './$types';

/** Enough for a real person, too few to guess codes. */
const LIMIT = { capacity: 20, perMinute: 5 };

const COOKIE = { path: '/', maxAge: 7 * 24 * 3600, httpOnly: true, sameSite: 'lax' } as const;

export const load: PageServerLoad = async ({ params, locals, cookies, getClientAddress }) => {
	if (!takeToken(`join:${getClientAddress()}`, LIMIT)) error(429, 'Too many attempts');

	const couple = await findCoupleByInvite(params.code);
	if (!couple) {
		cookies.delete(INVITE_COOKIE, { path: '/' });
		return { valid: false as const };
	}
	// Remembered through signup and email verification; /wedding brings them back here.
	cookies.set(INVITE_COOKIE, params.code, COOKIE);

	const userId = locals.user?.id;
	return {
		valid: true as const,
		names: [couple.brideName, couple.groomName].filter(Boolean).join(' & ') || 'Your partner',
		loggedIn: !!userId,
		member: !!userId && (couple.partner1UserId === userId || couple.partner2UserId === userId),
		full: !!couple.partner2UserId
	};
};

export const actions = {
	join: async ({ params, locals, cookies, getClientAddress }) => {
		if (!locals.user)
			redirect(303, `/login?redirectTo=${encodeURIComponent(`/join/${params.code}`)}`);
		if (!takeToken(`join:${getClientAddress()}`, LIMIT)) return bad('Too many attempts', 429);

		const outcome = await joinCouple(locals.user.id, params.code);
		// Whatever happened, stop sending them back here.
		cookies.delete(INVITE_COOKIE, { path: '/' });
		if (outcome.ok || outcome.reason === 'already_member') redirect(303, '/wedding');
		const text = {
			invalid: m.join_invalid_title(),
			full: m.join_err_full(),
			has_workspace: m.join_err_has_workspace(),
			vendor_account: m.join_err_vendor()
		}[outcome.reason];
		return bad(text, 409);
	},

	notNow: async ({ cookies }) => {
		cookies.delete(INVITE_COOKIE, { path: '/' });
		redirect(303, '/wedding');
	}
} satisfies Actions;
