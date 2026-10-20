import { fail, redirect } from '@sveltejs/kit';
import { z } from 'zod/v4';
import QRCode from 'qrcode';
import { APIError } from 'better-auth';
import { auth } from '$lib/server/auth';
import { m } from '$lib/paraglide/messages.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	if (!locals.user) redirect(303, `/login?redirectTo=${encodeURIComponent(url.pathname)}`);
	return {
		twoFactorEnabled: !!(locals.user as { twoFactorEnabled?: boolean }).twoFactorEnabled,
		required: url.searchParams.has('required')
	};
};

const err = (text: string, status = 400) =>
	fail(status, { message: { type: 'error' as const, text } });
const ok = (text: string, extra: Record<string, unknown> = {}) => ({
	message: { type: 'success' as const, text },
	...extra
});

function wrongPassword(e: unknown) {
	return e instanceof APIError && /password/i.test(e.message);
}

export const actions: Actions = {
	/** Step 1: password → a new secret (QR) and backup codes; not on until confirmed with a code. */
	enable: async ({ request }) => {
		const password = String((await request.formData()).get('password') ?? '');
		try {
			const result = await auth.api.enableTwoFactor({
				body: { password },
				headers: request.headers
			});
			const qr = await QRCode.toDataURL(result.totpURI, { margin: 1, width: 220 });
			return { setup: { qr, uri: result.totpURI, backupCodes: result.backupCodes } };
		} catch (e) {
			return err(wrongPassword(e) ? m.sec_wrong_password() : (e as Error).message);
		}
	},

	/** Step 2: the first code from the app turns it on. */
	confirm: async ({ request }) => {
		const code = String((await request.formData()).get('code') ?? '').replace(/\s/g, '');
		try {
			await auth.api.verifyTOTP({ body: { code }, headers: request.headers });
		} catch {
			return err(m.tfa_invalid());
		}
		return ok(m.sec_enabled());
	},

	disable: async ({ request }) => {
		const password = String((await request.formData()).get('password') ?? '');
		try {
			await auth.api.disableTwoFactor({ body: { password }, headers: request.headers });
		} catch (e) {
			return err(wrongPassword(e) ? m.sec_wrong_password() : (e as Error).message);
		}
		return ok(m.sec_disabled());
	},

	changePassword: async ({ request }) => {
		const data = Object.fromEntries(await request.formData());
		const parsed = z
			.object({ currentPassword: z.string().min(1), newPassword: z.string().min(8).max(128) })
			.safeParse(data);
		if (!parsed.success) return err(m.auth_password_min());
		try {
			await auth.api.changePassword({
				body: { ...parsed.data, revokeOtherSessions: true },
				headers: request.headers
			});
		} catch (e) {
			return err(wrongPassword(e) ? m.sec_wrong_password() : (e as Error).message);
		}
		return ok(m.sec_password_changed());
	}
};
