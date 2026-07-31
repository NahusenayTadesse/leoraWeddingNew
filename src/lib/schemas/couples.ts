import { z } from 'zod';

// Ethiopian mobile: 09xxxxxxxx, 07xxxxxxxx, +2519xxxxxxxx, +2517xxxxxxxx
const etPhone = z
	.string()
	.trim()
	.regex(/^(?:\+251|0)(9|7)\d{8}$/, 'Enter a valid Ethiopian phone number');

export const coupleSchema = z.object({
	groomName: z.string().trim().min(2, 'Groom name is required').max(255),
	brideName: z.string().trim().min(2, 'Bride name is required').max(255),
	phone: etPhone,
	phone2: etPhone.or(z.literal('')).optional(),
	email: z.email('Enter a valid email').max(255).or(z.literal('')).optional(),
	slug: z
		.string()
		.trim()
		.min(3, 'Too short')
		.max(255)
		.regex(/^[a-z0-9-]+$/, 'Lowercase letters, numbers and dashes only')
		.optional()
});

export type CoupleSchema = typeof coupleSchema;