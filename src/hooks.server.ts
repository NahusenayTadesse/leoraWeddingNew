import type { Handle } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import { building } from '$app/environment';
import { auth } from '$lib/server/auth';
import { requireAdmin } from '$lib/server/admin';
import { svelteKitHandler } from 'better-auth/svelte-kit';

const handleBetterAuth: Handle = async ({ event, resolve }) => {
	const session = await auth.api.getSession({ headers: event.request.headers });

	// better-auth only stores `banned`; nothing enforces it without its admin
	// plugin, so a banned account would otherwise keep a working session.
	const banned =
		session?.user.banned && (!session.user.banExpires || new Date(session.user.banExpires) > new Date());

	if (session && !banned) {
		event.locals.session = session.session;
		event.locals.user = session.user;
	}

	return svelteKitHandler({ event, resolve, auth, building });
};

/**
 * Layout `load`s do not run for form actions, so the /admin layout's own
 * `requireAdmin` never protected `?/updateStatus` and friends — any signed-in
 * user could POST to them. Gating here covers loads, actions and endpoints
 * under /admin alike.
 */
const guardAdmin: Handle = async ({ event, resolve }) => {
	const path = event.url.pathname;
	if (path === '/admin' || path.startsWith('/admin/')) {
		await requireAdmin(event.locals, path + event.url.search);
	}
	return resolve(event);
};

export const handle: Handle = sequence(handleBetterAuth, guardAdmin);
