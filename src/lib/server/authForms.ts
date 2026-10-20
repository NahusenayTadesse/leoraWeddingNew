import type { Actions, ServerLoadEvent } from '@sveltejs/kit';
import { message, setError, superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { redirect } from 'sveltekit-flash-message/server';
import { APIError } from 'better-auth';
import { and, eq, isNull } from 'drizzle-orm';

import { db } from '$lib/server/db';
import { auth } from '$lib/server/auth';
import { addUser, addVendor, loginSchema } from '$lib/ZodSchema';
import { couples, roles, user, vendors } from '$lib/server/db/schema';
import { LIMITS, takeToken } from '$lib/server/rateLimit';

/** Where better-auth sends a freshly verified user (signed in) — see /auth/verified. */
const VERIFIED_CALLBACK = '/auth/verified';

const TOO_MANY = 'Too many attempts. Please wait a minute and try again.';

/**
 * With email verification on, better-auth answers a sign-up for an address that already has an
 * account with a made-up user that was never stored (so the form can't reveal who is registered).
 * Only a real row gets a role and a couple workspace.
 */
async function userExists(id: string): Promise<boolean> {
	const rows = await db.select({ id: user.id }).from(user).where(eq(user.id, id)).limit(1);
	return rows.length > 0;
}

function checkEmailPath(email: string) {
	return `/check-email?email=${encodeURIComponent(email)}`;
}

/**
 * `/login` and `/signup` are one screen in the PHP app
 * (leora-events-login.html): the same card holds role tabs (Couple / Vendor /
 * Admin) and a Log In / Sign Up toggle, and switching between them never
 * navigates. Both SvelteKit routes therefore load the same three forms and
 * expose the same three actions — the only difference is which mode the card
 * opens in. Keeping the load and the actions here means the two routes can
 * never drift apart.
 */

/** Where each role lands after signing in, mirroring PHP's `dest` map. */
const HOME_FOR_ROLE: Record<string, string> = {
	Admin: '/admin',
	Vendor: '/vendor-dashboard'
};
const DEFAULT_HOME = '/dashboard';

/** Look up a role id by its seeded name. Returns null if the row is missing. */
async function roleIdByName(name: string): Promise<number | null> {
	const row = await db
		.select({ id: roles.id })
		.from(roles)
		.where(eq(roles.name, name))
		.limit(1)
		.then((r) => r[0]);
	return row?.id ?? null;
}

/**
 * The code the second partner types in to join an existing workspace.
 * Ambiguous characters (0/O, 1/I) are left out — this gets read aloud.
 */
function makeInviteCode(): string {
	const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
	const bytes = crypto.getRandomValues(new Uint8Array(8));
	return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('');
}

/** `abebe-and-tsehay-7fa2` — public-facing, so it must not collide. */
function makeSlug(brideName: string, groomName: string): string {
	const base = `${brideName}-and-${groomName}`
		.toLowerCase()
		.normalize('NFKD')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 200);
	const suffix = crypto.randomUUID().slice(0, 6);
	return `${base || 'couple'}-${suffix}`;
}

/**
 * superforms echoes the submitted data back so the user doesn't lose their
 * typing — but the password has no business travelling back over the wire and
 * sitting in the page source. Everything else is preserved.
 */
function scrubPassword<T extends { data: { password?: string } }>(form: T): T {
	form.data.password = '';
	return form;
}

/** The signed-in user's role name, via `user.role_id → roles.name`. */
export async function roleNameFor(userId: string): Promise<string> {
	const row = await db
		.select({ name: roles.name })
		.from(user)
		.leftJoin(roles, eq(user.roleId, roles.id))
		.where(eq(user.id, userId))
		.limit(1)
		.then((r) => r[0]);
	return row?.name ?? '';
}

/**
 * A Vendor-role user who hasn't finished the onboarding wizard has no row in
 * `vendors` yet, and `/vendor-dashboard` 403s anyone without one — so they
 * have to land on the wizard, not the dashboard, until it's done.
 */
export async function destinationFor(userId: string, roleName: string): Promise<string> {
	if (roleName === 'Vendor') {
		const hasVendorProfile = await db
			.select({ id: vendors.id })
			.from(vendors)
			.where(and(eq(vendors.userId, userId), isNull(vendors.deletedAt)))
			.limit(1)
			.then((r) => r.length > 0);
		return hasVendorProfile ? '/vendor-dashboard' : '/vendor-onboarding';
	}
	return HOME_FOR_ROLE[roleName] ?? DEFAULT_HOME;
}

/**
 * Only same-origin paths are honoured, so `?redirectTo=` can't be used to
 * bounce a freshly-authenticated user off to another site.
 */
function safeRedirect(redirectTo: string | null, fallback: string): string {
	if (!redirectTo) return fallback;
	if (!redirectTo.startsWith('/') || redirectTo.startsWith('//')) return fallback;
	return redirectTo;
}

export async function loadAuthForms(event: ServerLoadEvent) {
	if (event.locals.user) {
		const roleName = await roleNameFor(event.locals.user.id);
		redirect(302, await destinationFor(event.locals.user.id, roleName));
	}

	const [form, signupForm, vendorForm] = await Promise.all([
		superValidate(zod4(loginSchema)),
		superValidate(zod4(addUser)),
		superValidate(zod4(addVendor))
	]);

	return { form, signupForm, vendorForm };
}

export const authActions = {
	login: async (event) => {
		const form = await superValidate(event.request, zod4(loginSchema));
		if (!form.valid) {
			return message(
				scrubPassword(form),
				{ type: 'error', text: 'Please check the form.' },
				{ status: 400 }
			);
		}

		const { email, password, rememberMe } = form.data;

		if (
			!takeToken(`login:ip:${event.getClientAddress()}`, LIMITS.login) ||
			!takeToken(`login:email:${email.toLowerCase()}`, LIMITS.login)
		) {
			return message(scrubPassword(form), { type: 'error', text: TOO_MANY }, { status: 429 });
		}

		let userId: string;
		try {
			const result = await auth.api.signInEmail({
				body: { email, password, rememberMe: rememberMe ?? true, callbackURL: VERIFIED_CALLBACK },
				headers: event.request.headers
			});

			if (!result?.user) {
				setError(form, 'email', 'Invalid email or password');
				setError(form, 'password', 'Invalid email or password');
				return message(
					scrubPassword(form),
					{ type: 'error', text: 'Invalid email or password.' },
					{ status: 401 }
				);
			}
			userId = result.user.id;
		} catch (error) {
			// Right password, unconfirmed address: better-auth has just sent a fresh link.
			if (error instanceof APIError && error.body?.code === 'EMAIL_NOT_VERIFIED') {
				return message(
					scrubPassword(form),
					{
						type: 'error',
						text: 'Please confirm your email first. We just sent you a new confirmation link.'
					},
					{ status: 403 }
				);
			}
			// better-auth returns the same shape for "no such user" and "wrong
			// password", which is what we want — don't tell an attacker which.
			const text =
				error instanceof APIError ? error.message : 'Something went wrong. Please try again.';
			return message(scrubPassword(form), { type: 'error', text }, { status: 401 });
		}

		const roleName = await roleNameFor(userId);
		const dest = safeRedirect(
			event.url.searchParams.get('redirectTo'),
			await destinationFor(userId, roleName)
		);

		redirect(302, dest, { type: 'success', message: 'Welcome back.' }, event);
	},

	signup: async (event) => {
		const form = await superValidate(event.request, zod4(addUser));
		if (!form.valid) {
			return message(
				scrubPassword(form),
				{ type: 'error', text: 'Please check the form.' },
				{ status: 400 }
			);
		}

		const { brideName, groomName, email, password, phone, phone2 } = form.data;

		if (!takeToken(`signup:${event.getClientAddress()}`, LIMITS.signup)) {
			return message(scrubPassword(form), { type: 'error', text: TOO_MANY }, { status: 429 });
		}

		let createdUserId: string | null = null;
		try {
			const coupleRoleId = await roleIdByName('Couple');

			const newCustomer = await auth.api.signUpEmail({
				body: { email, password, name: brideName, callbackURL: VERIFIED_CALLBACK },
				headers: event.request.headers
			});

			if (await userExists(newCustomer.user.id)) {
				createdUserId = newCustomer.user.id;
				await db.transaction(async (tx) => {
					// better-auth owns the `user` row and only accepts the fields it
					// declares, so the role is stamped on straight after. Without this
					// every new account has role_id NULL and the role-based redirects
					// above have nothing to go on.
					await tx
						.update(user)
						.set({ roleId: coupleRoleId, role: 'couple' })
						.where(eq(user.id, newCustomer.user.id));

					// `couples` has no `user_id`. The workspace is joined through
					// partner1/partner2, and both `invite_code` (NOT NULL) and `slug`
					// have to be generated here — there is no DB default for either.
					await tx.insert(couples).values({
						partner1UserId: newCustomer.user.id,
						inviteCode: makeInviteCode(),
						slug: makeSlug(brideName, groomName),
						groomName,
						brideName,
						email,
						phone,
						phone2
					});
				});
			}
		} catch (error) {
			// signUpEmail commits on its own, outside the transaction above. If the workspace could
			// not be created, remove the half-made account so the couple can simply try again.
			if (createdUserId) {
				await db.delete(user).where(eq(user.id, createdUserId)).catch(() => {});
			}
			console.error('Couple signup failed:', error);
			const text =
				error instanceof APIError ? error.message : 'Registration failed. Please try again.';
			return message(scrubPassword(form), { type: 'error', text }, { status: 400 });
		}

		// No session until the email is confirmed; the link signs them in (see VERIFIED_CALLBACK).
		redirect(302, checkEmailPath(email));
	},

	/**
	 * Mirrors the PHP auth card exactly: picking Vendor + Sign Up only ever
	 * collects a business name, email and password before handing off —
	 * `handleSubmit()` in leora-events-login.html redirects straight to
	 * vendor-onboarding.html without posting anything. The onboarding wizard
	 * (`/vendor-onboarding`) collects the rest and creates the vendor profile;
	 * this action's only job is to open the account and get the vendor there
	 * signed in.
	 */
	vendorStart: async (event) => {
		const form = await superValidate(event.request, zod4(addVendor));
		if (!form.valid) {
			return message(
				scrubPassword(form),
				{ type: 'error', text: 'Please check the form.' },
				{ status: 400 }
			);
		}

		const { businessName, email, password } = form.data;

		if (!takeToken(`signup:${event.getClientAddress()}`, LIMITS.signup)) {
			return message(scrubPassword(form), { type: 'error', text: TOO_MANY }, { status: 429 });
		}

		try {
			const vendorRoleId = await roleIdByName('Vendor');
			const newVendor = await auth.api.signUpEmail({
				body: { email, password, name: businessName, callbackURL: VERIFIED_CALLBACK },
				headers: event.request.headers
			});

			if (await userExists(newVendor.user.id)) {
				await db
					.update(user)
					.set({ roleId: vendorRoleId, role: 'vendor' })
					.where(eq(user.id, newVendor.user.id));
			}
		} catch (error) {
			const text =
				error instanceof APIError ? error.message : 'Registration failed. Please try again.';
			return message(scrubPassword(form), { type: 'error', text }, { status: 400 });
		}

		// Confirming the email signs them in and lands them on /vendor-onboarding.
		redirect(302, checkEmailPath(email));
	}
} satisfies Actions;
