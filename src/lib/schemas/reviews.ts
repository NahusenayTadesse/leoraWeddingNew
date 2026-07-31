import { z } from 'zod';

export const reviewSchema = z.object({
	rating: z.coerce
		.number({ message: 'Pick a rating' })
		.int()
		.min(1, 'Pick a rating')
		.max(5, 'Pick a rating'),
	comment: z.string().trim().max(2000, 'Too long').or(z.literal('')).optional()
});

export const favoriteSchema = z.object({
	vendorId: z.coerce.number().int().positive()
});

export type ReviewSchema = typeof reviewSchema;