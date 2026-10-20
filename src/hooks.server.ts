import type { Handle } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import { building } from '$app/environment';
import { eq } from 'drizzle-orm';
import { svelteKitHandler } from 'better-auth/svelte-kit';
import { configureKit } from '@nahu/admin-kit/server/db';
import { kitHandle, type Grant } from '@nahu/admin-kit/server/hooks';
import { auth } from '$lib/server/auth';
import { db } from '$lib/server/db';
import { roles, user } from '$lib/server/db/schema';
import { access, ADMIN_PERMISSION } from '$lib/access';

configureKit({ db, loginPath: '/login' });

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

const NO_GRANT: Grant = { permList: [], isSuperAdmin: false };

/**
 * The 'Admin' role (database/seed.sql section 1) holds every admin permission. Looked up only for
 * requests under `/admin`, the one area the kit gates, so public pages cost no extra query.
 */
async function loadGrant(userId: string): Promise<Grant> {
	const [row] = await db
		.select({ roleName: roles.name })
		.from(user)
		.leftJoin(roles, eq(user.roleId, roles.id))
		.where(eq(user.id, userId))
		.limit(1);

	return row?.roleName === 'Admin' ? { permList: [ADMIN_PERMISSION], isSuperAdmin: true } : NO_GRANT;
}

/**
 * Closes `/admin` to everyone but admins — loads, form actions and endpoints alike, since a
 * layout's `load` never runs before an action. Signed out goes to the login page (a page view) or
 * gets a 401; signed in without the role gets a 403.
 */
const handleKit = kitHandle({
	access,
	permissions: ({ locals, url }) =>
		locals.user && access.guards(url.pathname) ? loadGrant(locals.user.id) : NO_GRANT
});

export const handle: Handle = sequence(handleBetterAuth, handleKit);
