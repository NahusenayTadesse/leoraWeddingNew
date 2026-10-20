import { z } from 'zod';
import { m } from '$lib/paraglide/messages.js';

/*
 * Messages are functions so they are read in the visitor's language at validation time, not
 * frozen in whichever language was active when this module was first imported.
 */

const password = z
	.string()
	.min(8, { error: () => m.auth_password_min() })
	.max(128);

export const forgotPasswordSchema = z.object({
	email: z.email()
});

export const resetPasswordSchema = z
	.object({
		token: z.string().min(1),
		newPassword: password,
		confirmPassword: z.string()
	})
	.refine((d) => d.newPassword === d.confirmPassword, {
		path: ['confirmPassword'],
		error: () => m.auth_password_mismatch()
	});

export const resendVerificationSchema = z.object({
	email: z.email()
});
