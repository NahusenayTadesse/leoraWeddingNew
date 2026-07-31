import { z } from 'zod';

const ISO = /^\d{4}-\d{2}-\d{2}$/;
export const isoDate = z.string().trim().regex(ISO, 'Use a valid date');

/** Empty inputs must not coerce to 0 — z.coerce.number() turns '' into 0. */
const blankToUndefined = (v: unknown) =>
	v === '' || v === null || (typeof v === 'string' && !v.trim()) ? undefined : v;

/** decimal(10,2) tops out here. */
const money = z.coerce
	.number()
	.nonnegative('Price cannot be negative')
	.max(99_999_999.99, 'That price is too large for the field');

/* ---------- URL filters (parsed in load, never posted) ---------- */

export const bookingTab = z.enum(['upcoming', 'pending', 'confirmed', 'past', 'cancelled', 'all']);
export const bookingSort = z.enum(['date_asc', 'date_desc', 'created_desc', 'price_desc']);

export const bookingFilters = z.object({
	tab: bookingTab.catch('upcoming'),
	q: z.string().trim().max(100).catch(''),
	from: isoDate.optional().catch(undefined),
	to: isoDate.optional().catch(undefined),
	serviceId: z.coerce.number().int().positive().optional().catch(undefined),
	sort: bookingSort.catch('date_asc'),
	page: z.coerce.number().int().min(1).max(9999).catch(1)
});

export type BookingFilters = z.infer<typeof bookingFilters>;

/* ---------- actions ---------- */

const bookingId = z.coerce.number().int().positive();

export const confirmSchema = z.object({
	id: bookingId,
	agreedPrice: z.preprocess(blankToUndefined, money.optional()),
	allowOverlap: z.boolean().default(false)
});

export const cancelSchema = z.object({
	id: bookingId,
	reason: z
		.string()
		.trim()
		.min(10, 'Give the couple a real reason (10 characters or more)')
		.max(500, 'Keep it under 500 characters')
});

export const quoteSchema = z.object({
	id: bookingId,
	proposedPrice: money.refine((n) => n > 0, 'Enter a price above zero'),
	notes: z.string().trim().max(1000).optional()
});

export const rescheduleSchema = z.object({
	id: bookingId,
	eventDate: isoDate,
	allowOverlap: z.boolean().default(false)
});

export type ConfirmInput = z.infer<typeof confirmSchema>;
export type CancelInput = z.infer<typeof cancelSchema>;