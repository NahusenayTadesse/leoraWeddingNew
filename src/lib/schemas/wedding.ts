import { z } from 'zod';

export const WEDDING_STYLES = [
	'Traditional Ethiopian',
	'Modern',
	'Church / Religious',
	'Garden / Outdoor',
	'Destination',
	'Intimate',
	'Other'
] as const;

const isoDate = /^\d{4}-\d{2}-\d{2}$/;

export const weddingSchema = z.object({
	weddingDate: z
		.string()
		.trim()
		.regex(isoDate, 'Pick a wedding date')
		.refine((v) => {
			const today = new Date();
			today.setHours(0, 0, 0, 0);
			return new Date(`${v}T00:00:00`) >= today;
		}, 'The wedding date cannot be in the past'),
	weddingStyle: z.string().trim().max(100).or(z.literal('')).optional(),
	city: z.string().trim().min(2, 'Choose a city').max(100),
	expectedGuests: z.coerce
		.number({ message: 'Enter a number' })
		.int('Whole numbers only')
		.min(1, 'At least 1 guest')
		.max(100000, 'That seems too high'),
	totalBudget: z.coerce
		.number({ message: 'Enter an amount' })
		.min(0, 'Cannot be negative')
		.max(999999999, 'That seems too high')
});

export type WeddingSchema = typeof weddingSchema;