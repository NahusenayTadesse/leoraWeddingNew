import { fail } from '@sveltejs/kit';
import { message, superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { auth } from '$lib/server/auth';
import { LIMITS, takeToken } from '$lib/server/rateLimit';
import { forgotPasswordSchema } from '$lib/schemas/auth';
import { m } from '$lib/paraglide/messages.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const form = await superValidate({ email: url.searchParams.get('email') ?? '' }, zod4(forgotPasswordSchema), {
		errors: false
	});
	return { form };
};

export const actions: Actions = {
	default: async (event) => {
		const form = await superValidate(event.request, zod4(forgotPasswordSchema));
		if (!form.valid) return fail(400, { form });

		const email = form.data.email.toLowerCase();
		if (
			!takeToken(`reset:ip:${event.getClientAddress()}`, LIMITS.passwordReset) ||
			!takeToken(`reset:email:${email}`, LIMITS.passwordReset)
		) {
			return message(form, { type: 'error', text: m.auth_too_many() }, { status: 429 });
		}

		try {
			// better-auth answers the same whether or not the account exists.
			await auth.api.requestPasswordReset({
				body: { email, redirectTo: '/reset-password' },
				headers: event.request.headers
			});
		} catch (err) {
			console.error('Password reset request failed:', err);
		}

		// Same answer either way, so this form can't be used to find out who has an account.
		return message(form, { type: 'success', text: m.auth_forgot_sent() });
	}
};
