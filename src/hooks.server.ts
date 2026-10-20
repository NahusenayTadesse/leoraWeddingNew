import type { Handle, HandleServerError, ServerInit } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import { building, dev } from '$app/environment';
import { svelteKitHandler } from 'better-auth/svelte-kit';
import { configureKit } from '@nahu/admin-kit/server/db';
import { kitHandle } from '@nahu/admin-kit/server/hooks';
import { auth } from '$lib/server/auth';
import { db } from '$lib/server/db';
import { access } from '$lib/access';
import { loadGrant, NO_GRANT } from '$lib/server/permissions';
import { paraglideMiddleware } from '$lib/paraglide/server';

configureKit({ db, loginPath: '/login' });

/** Background jobs (payment reconcile, plan expiry, reminders) — see $lib/server/jobs. */
export const init: ServerInit = async () => {
	if (building || process.env.RUN_JOBS === 'false') return;
	const { runJobs } = await import('$lib/server/jobs');
	setInterval(runJobs, 10 * 60_000).unref();
	setTimeout(runJobs, 30_000).unref();
};

/** Unexpected errors: logged with a short id the user can quote; no internals in the response. */
export const handleError: HandleServerError = ({ error, event, status }) => {
	const id = crypto.randomUUID().slice(0, 8);
	if (status !== 404) {
		console.error(`[error ${id}] ${event.request.method} ${event.url.pathname}`, error);
	}
	return { message: status === 404 ? 'Not found' : `Something went wrong (ref ${id}).` };
};

/**
 * mode-watcher writes an inline `<script>` (it sets dark mode before paint) that the CSP would
 * block. SvelteKit's per-request nonce is only in the HTML, so it is copied onto that one tag.
 */
function withThemeScriptNonce(html: string): string {
	const nonce = html.match(/<script nonce="([^"]+)"/)?.[1];
	if (!nonce) return html;
	return html.replace('<script>(function setInitialMode', `<script nonce="${nonce}">(function setInitialMode`);
}

/** The visitor's language (cookie, else Accept-Language) for `m.*` and `<html lang>`. */
const handleParaglide: Handle = ({ event, resolve }) =>
	paraglideMiddleware(event.request, ({ request, locale }) => {
		event.request = request;
		return resolve(event, {
			transformPageChunk: ({ html }) => withThemeScriptNonce(html.replace('%paraglide.lang%', locale))
		});
	});

/**
 * Headers every response gets. The CSP itself is set by SvelteKit (`kit.csp` in svelte.config.js)
 * so it can hash its own inline scripts; these are the ones it doesn't cover.
 */
const handleSecurityHeaders: Handle = async ({ event, resolve }) => {
	const response = await resolve(event);
	const h = response.headers;
	h.set('X-Content-Type-Options', 'nosniff');
	h.set('Referrer-Policy', 'strict-origin-when-cross-origin');
	h.set('X-Frame-Options', 'DENY');
	h.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
	if (!dev) h.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
	return response;
};

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
 * Signed-in areas outside `/admin`. A layout's `load` never runs before a form action or a
 * `+server.ts`, so without this an anonymous POST reached their actions (and crashed on
 * `locals.user!`). Page views go to the login page; everything else gets a 401.
 */
const SIGNED_IN_AREAS = ['/wedding', '/dashboard', '/vendor-dashboard', '/vendor-onboarding', '/account'];

const handleSignedInAreas: Handle = ({ event, resolve }) => {
	const path = event.url.pathname;
	const guarded = SIGNED_IN_AREAS.some((root) => path === root || path.startsWith(`${root}/`));
	// Client-side navigation data runs the same loads, which redirect signed-out visitors.
	const isPageData = event.request.method === 'GET' && event.isDataRequest;
	if (guarded && !event.locals.user && !isPageData) {
		const isPageView = event.request.method === 'GET' && event.request.headers.get('accept')?.includes('text/html');
		if (isPageView) {
			const to = encodeURIComponent(path + event.url.search);
			return new Response(null, { status: 303, headers: { location: `/login?redirectTo=${to}` } });
		}
		return new Response(JSON.stringify({ message: 'Please sign in' }), {
			status: 401,
			headers: { 'content-type': 'application/json' }
		});
	}
	return resolve(event);
};

/**
 * Closes `/admin` to everyone without the page's permission — loads, form actions and endpoints
 * alike, since a layout's `load` never runs before an action. Signed out goes to the login page (a
 * page view) or gets a 401; signed in without the permission gets a 403.
 */
const handleKit = kitHandle({
	access,
	permissions: ({ locals, url }) =>
		locals.user && access.guards(url.pathname) ? loadGrant(locals.user.id) : NO_GRANT
});

/**
 * Staff must have two-step verification on before the admin console opens (production, or
 * REQUIRE_STAFF_2FA=true). Runs after the kit has worked out the viewer's permissions.
 */
const handleStaffTwoFactor: Handle = ({ event, resolve }) => {
	const enforce = process.env.REQUIRE_STAFF_2FA ? process.env.REQUIRE_STAFF_2FA === 'true' : !dev;
	const path = event.url.pathname;
	if (
		enforce &&
		(path === '/admin' || path.startsWith('/admin/')) &&
		event.locals.user &&
		(event.locals.isSuperAdmin || event.locals.permList?.length) &&
		!(event.locals.user as { twoFactorEnabled?: boolean }).twoFactorEnabled
	) {
		return new Response(null, { status: 303, headers: { location: '/account/security?required=1' } });
	}
	return resolve(event);
};

export const handle: Handle = sequence(
	handleSecurityHeaders,
	handleParaglide,
	handleBetterAuth,
	handleSignedInAreas,
	handleKit,
	handleStaffTwoFactor
);
