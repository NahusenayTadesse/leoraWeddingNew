import { z } from 'zod';

const etPhone = z
	.string()
	.trim()
	.regex(/^(?:\+251|0)(9|7)\d{8}$/, 'Enter a valid Ethiopian phone number');

export const guestSchema = z.object({
	id: z.coerce.number().int().positive().optional(),
	fullName: z.string().trim().min(2, 'Name is required').max(150),
	phone: etPhone.or(z.literal('')).optional(),
	side: z.enum(['bride', 'groom', 'both'], { message: 'Choose a side' }),
	isConfirmed: z.coerce.boolean().default(false)
});

export const bulkGuestSchema = z.object({
	side: z.enum(['bride', 'groom', 'both'], { message: 'Choose a side' }),
	names: z
		.string()
		.trim()
		.min(2, 'Paste at least one name')
		.max(20000, 'Too much at once — split it into batches')
});

export const guestIdSchema = z.object({
	id: z.coerce.number().int().positive()
});

export type GuestSchema = typeof guestSchema;