import { fail } from '@sveltejs/kit';
import { redirect } from 'sveltekit-flash-message/server';
import { z } from 'zod/v4';
import { APIError } from 'better-auth';
import { auth } from '$lib/server/auth';
import { destinationFor, roleNameFor, safeRedirect } from '$lib/server/authForms';
import { LIMITS, takeToken } from '$lib/server/rateLimit';
import { m } from '$lib/paraglide/messages.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (locals.user) redirect(302, '/');
	return {};
};

const codeSchema = z.object({
	code: z.string().trim().min(6).max(32),
	method: z.enum(['totp', 'backup']).default('totp'),
	trustDevice: z.preprocess((v) => v === 'on' || v === 'true', z.boolean())
});

/**
 * The second step of signing in for accounts with two-step verification. better-auth's
 * signed cookie from the first step says who is signing in; the code completes it.
 */
export const actions: Actions = {
	default: async (event) => {
		const data = Object.fromEntries(await event.request.formData());
		const parsed = codeSchema.safeParse(data);
		if (!parsed.success) return fail(400, { message: { type: 'error', text: m.tfa_invalid() } });
		if (!takeToken(`2fa:${event.getClientAddress()}`, LIMITS.login)) {
			return fail(429, { message: { type: 'error', text: m.auth_too_many() } });
		}

		let userId: string;
		try {
			const result =
				parsed.data.method === 'backup'
					? await auth.api.verifyBackupCode({
							body: { code: parsed.data.code, trustDevice: parsed.data.trustDevice },
							headers: event.request.headers
						})
					: await auth.api.verifyTOTP({
							body: {
								code: parsed.data.code.replace(/\s/g, ''),
								trustDevice: parsed.data.trustDevice
							},
							headers: event.request.headers
						});
			userId = (result as { user: { id: string } }).user.id;
		} catch (err) {
			const expired = err instanceof APIError && /cookie|session|expired/i.test(err.message);
			return fail(400, {
				message: { type: 'error', text: expired ? m.tfa_expired() : m.tfa_invalid() }
			});
		}

		const dest = safeRedirect(
			event.url.searchParams.get('redirectTo'),
			await destinationFor(userId, await roleNameFor(userId))
		);
		redirect(302, dest, { type: 'success', message: 'Welcome back.' }, event);
	}
};
