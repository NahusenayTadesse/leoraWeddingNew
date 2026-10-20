import { fail } from '@sveltejs/kit';
import { message, superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { auth } from '$lib/server/auth';
import { LIMITS, takeToken } from '$lib/server/rateLimit';
import { resendVerificationSchema } from '$lib/schemas/auth';
import { m } from '$lib/paraglide/messages.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const email = url.searchParams.get('email') ?? '';
	const form = await superValidate({ email }, zod4(resendVerificationSchema), { errors: false });
	return { form, email };
};

export const actions: Actions = {
	default: async (event) => {
		const form = await superValidate(event.request, zod4(resendVerificationSchema));
		if (!form.valid) return fail(400, { form });

		const email = form.data.email.toLowerCase();
		if (
			!takeToken(`verify:ip:${event.getClientAddress()}`, LIMITS.passwordReset) ||
			!takeToken(`verify:email:${email}`, LIMITS.passwordReset)
		) {
			return message(form, { type: 'error', text: m.auth_too_many() }, { status: 429 });
		}

		try {
			await auth.api.sendVerificationEmail({
				body: { email, callbackURL: '/auth/verified' },
				headers: event.request.headers
			});
		} catch (err) {
			// Unknown or already-verified addresses land here; the answer stays the same.
			console.info('Resend verification skipped:', (err as Error).message);
		}
		return message(form, { type: 'success', text: m.auth_check_resent() });
	}
};
