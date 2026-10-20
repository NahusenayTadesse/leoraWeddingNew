import { redirect } from 'sveltekit-flash-message/server';
import { destinationFor, roleNameFor } from '$lib/server/authForms';
import { m } from '$lib/paraglide/messages.js';
import type { PageServerLoad } from './$types';

/**
 * Where a confirmation link ends up. better-auth has verified the address and (with
 * `autoSignInAfterVerification`) signed the user in, so this only routes them to their home —
 * the onboarding wizard for a new vendor, the planner for a couple. A bad or expired link comes
 * back with `?error=…` and no session.
 */
export const load: PageServerLoad = async (event) => {
	const { locals, url } = event;
	if (url.searchParams.has('error') || !locals.user) {
		redirect('/login', { type: 'error', message: m.auth_verify_failed() }, event);
	}
	const roleName = await roleNameFor(locals.user.id);
	redirect(
		await destinationFor(locals.user.id, roleName),
		{ type: 'success', message: m.auth_verified_welcome() },
		event
	);
};
