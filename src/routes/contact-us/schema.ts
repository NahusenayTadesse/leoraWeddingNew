import { z } from 'zod';
import { m } from '$lib/paraglide/messages.js';

const ethiopianPhoneRegex = /^(?:\+251|251|0)?([79]\d{8})$/;

export const CONTACT_SUBJECTS = ['couple', 'new_vendor', 'vendor', 'press', 'other'] as const;

export const contactSchema = z.object({
	name: z.string().trim().min(2).max(255),
	email: z.email().max(100),
	phone: z
		.string()
		.trim()
		.refine((v) => v === '' || ethiopianPhoneRegex.test(v), {
			error: () => m.contact_phone_invalid()
		})
		.default(''),
	subject: z.enum(CONTACT_SUBJECTS).default('couple'),
	message: z
		.string()
		.trim()
		.min(10, { error: () => m.contact_message_min() })
		.max(5000)
});

/** `+2519xxxxxxxx`, or null for an empty field. */
export function normalizePhone(phone: string): string | null {
	const match = phone.match(ethiopianPhoneRegex);
	return match ? `+251${match[1]}` : null;
}
