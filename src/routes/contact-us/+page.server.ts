import { fail } from '@sveltejs/kit';
import { superValidate, message } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { contactSchema, normalizePhone } from './schema';
import { db } from '$lib/server/db';
import { contactMessages } from '$lib/server/db/schema';
import { LIMITS, takeToken } from '$lib/server/rateLimit';
import { m } from '$lib/paraglide/messages.js';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async () => ({
	form: await superValidate(zod4(contactSchema))
});

export const actions: Actions = {
	contact: async ({ request, getClientAddress }) => {
		const form = await superValidate(request, zod4(contactSchema));
		if (!form.valid) return fail(400, { form });

		if (!takeToken(`contact:${getClientAddress()}`, LIMITS.contact)) {
			return message(form, { type: 'error', text: m.auth_too_many() }, { status: 429 });
		}

		const { name, email, phone, subject, message: body } = form.data;
		try {
			await db.insert(contactMessages).values({
				name,
				email,
				phone: normalizePhone(phone),
				subject,
				message: body
			});
		} catch (err) {
			console.error('Contact message insert failed:', err);
			return message(form, { type: 'error', text: m.contact_failed() }, { status: 500 });
		}

		return message(form, { type: 'success', text: m.contact_sent() });
	}
};
