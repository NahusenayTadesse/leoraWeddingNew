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

/** Which bookings the table shows; `?tab=`. Search, filters, sort and paging are the table's own. */
export const bookingTab = z.enum(['upcoming', 'pending', 'confirmed', 'past', 'cancelled', 'all']);
export type BookingTab = z.infer<typeof bookingTab>;

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

/* ---------- full CRUD (direct add/edit/delete of a booking row) ---------- */

export const vendorBookingStatus = z.enum(['pending', 'confirmed', 'cancelled']);

export const vendorBookingAddSchema = z.object({
	weddingPlanId: z.coerce.number().int().positive('Choose a couple'),
	serviceId: z.preprocess(blankToUndefined, z.coerce.number().int().positive().optional()),
	status: vendorBookingStatus.default('pending'),
	agreedPrice: z.preprocess(blankToUndefined, money.optional()),
	eventDate: z.preprocess(blankToUndefined, isoDate.optional())
});

export const vendorBookingEditSchema = vendorBookingAddSchema.extend({
	id: bookingId
});

export type VendorBookingAddSchema = typeof vendorBookingAddSchema;
export type VendorBookingEditSchema = typeof vendorBookingEditSchema;

/* ---------- reply system ---------- */

export const replySchema = z.object({
	coupleId: z.coerce.number().int().positive(),
	body: z.string().trim().min(1, 'Write a reply').max(2000, 'Keep it under 2000 characters')
});

export type ReplyInput = z.infer<typeof replySchema>;