import { fail } from '@sveltejs/kit';
import { message, superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { redirect } from 'sveltekit-flash-message/server';
import { APIError } from 'better-auth';
import { auth } from '$lib/server/auth';
import { resetPasswordSchema } from '$lib/schemas/auth';
import { m } from '$lib/paraglide/messages.js';
import type { Actions, PageServerLoad } from './$types';

/**
 * better-auth's emailed link checks the token and lands here with `?token=…`, or with
 * `?error=INVALID_TOKEN` when it has expired or was already used.
 */
export const load: PageServerLoad = async ({ url }) => {
	const token = url.searchParams.get('token') ?? '';
	const invalid = !token || url.searchParams.has('error');
	const form = await superValidate(
		{ token, newPassword: '', confirmPassword: '' },
		zod4(resetPasswordSchema),
		{ errors: false }
	);
	return { form, invalid };
};

export const actions: Actions = {
	default: async (event) => {
		const form = await superValidate(event.request, zod4(resetPasswordSchema));
		if (!form.valid) {
			form.data.newPassword = form.data.confirmPassword = '';
			return fail(400, { form });
		}

		try {
			await auth.api.resetPassword({
				body: { newPassword: form.data.newPassword, token: form.data.token },
				headers: event.request.headers
			});
		} catch (err) {
			form.data.newPassword = form.data.confirmPassword = '';
			const invalidToken = err instanceof APIError && err.body?.code === 'INVALID_TOKEN';
			return message(
				form,
				{ type: 'error', text: invalidToken ? m.auth_reset_invalid() : (err as Error).message },
				{ status: 400 }
			);
		}

		redirect('/login', { type: 'success', message: m.auth_reset_done() }, event);
	}
};
