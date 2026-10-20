import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { env } from '$env/dynamic/private';
import { dev } from '$app/environment';
import { getRequestEvent } from '$app/server';
import { db } from '$lib/server/db';
import { layout, resetPasswordEmail, sendEmail, verifyEmailEmail } from '$lib/server/email';

/** The public origin for links in emails: ORIGIN, or the current request's in dev. */
export function appOrigin(): string {
	if (env.ORIGIN) return env.ORIGIN.replace(/\/$/, '');
	try {
		return getRequestEvent().url.origin;
	} catch {
		return 'http://localhost:5173';
	}
}

export const auth = betterAuth({
	// Production: ORIGIN (adapter-node needs it too). In dev with no ORIGIN, the origin comes from
	// each request's Host header, limited to localhost, so the app works on whatever port Vite picks.
	baseURL: env.ORIGIN
		? env.ORIGIN
		: dev
			? { allowedHosts: ['localhost:*', '127.0.0.1:*'], protocol: 'http' }
			: undefined,
	secret: env.BETTER_AUTH_SECRET,
	database: drizzleAdapter(db, { provider: 'mysql' }),
	emailAndPassword: {
		enabled: true,
		minPasswordLength: 8,
		// No session until the address is confirmed; sign-in resends the link (see below).
		requireEmailVerification: true,
		resetPasswordTokenExpiresIn: 60 * 60,
		// A reset means the old password may be known to someone else: sign out every device.
		revokeSessionsOnPasswordReset: true,
		sendResetPassword: async ({ user, url }) => {
			await sendEmail(resetPasswordEmail(user.email, url));
		},
		// Someone signed up with an address that already has an account. The form answers as if it
		// worked (so it can't be used to discover accounts); the owner gets a heads-up instead.
		onExistingUserSignUp: async ({ user }) => {
			await sendEmail({
				to: user.email,
				subject: 'You already have a Leora Events account',
				...layout({
					heading: 'You already have an account',
					paragraphs: [
						'Someone (hopefully you) tried to create a new Leora Events account with this email address, but one already exists.',
						'If you forgot your password, you can reset it below.'
					],
					action: { label: 'Reset password', url: `${appOrigin()}/forgot-password` },
					footnote: "If this wasn't you, no action is needed."
				})
			});
		}
	},
	emailVerification: {
		sendOnSignUp: true,
		sendOnSignIn: true,
		autoSignInAfterVerification: true,
		expiresIn: 24 * 60 * 60,
		sendVerificationEmail: async ({ user, url }) => {
			await sendEmail(verifyEmailEmail(user.email, url));
		}
	},
	// Covers direct calls to /api/auth/*. The app's own forms are limited in $lib/server/rateLimit.
	rateLimit: {
		enabled: !dev,
		window: 60,
		max: 100,
		customRules: {
			'/sign-in/email': { window: 60, max: 5 },
			'/sign-up/email': { window: 60, max: 3 },
			'/request-password-reset': { window: 60, max: 3 },
			'/send-verification-email': { window: 60, max: 3 }
		}
	},
	user: {
		// Columns that exist on `user` but aren't better-auth core fields; without
		// declaring them they never reach `session.user` (see hooks.server.ts).
		additionalFields: {
			banned: { type: 'boolean', required: false, input: false },
			banExpires: { type: 'date', required: false, input: false }
		}
	},
	plugins: [sveltekitCookies(getRequestEvent)] // make sure this is the last plugin in the array
});
