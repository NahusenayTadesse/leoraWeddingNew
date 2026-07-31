import { z } from 'zod';

const isoDate = /^\d{4}-\d{2}-\d{2}$/;

export const bookingSchema = z.object({
	vendorId: z.coerce.number({ message: 'Choose a vendor' }).int().positive('Choose a vendor'),
	serviceId: z.coerce.number().int().positive().optional(),
	eventDate: z.string().trim().regex(isoDate, 'Pick the event date'),
	agreedPrice: z.coerce
		.number({ message: 'Enter an amount' })
		.min(0, 'Cannot be negative')
		.max(999999999, 'That seems too high')
		.default(0)
});

export const bookingIdSchema = z.object({
	id: z.coerce.number().int().positive()
});

export const paymentSchema = z.object({
	bookingId: z.coerce.number().int().positive(),
	amount: z.coerce
		.number({ message: 'Enter an amount' })
		.gt(0, 'Amount must be more than zero')
		.max(999999999, 'That seems too high'),
	paymentMethod: z.enum(['cash', 'bank_transfer', 'mobile_money', 'card'], {
		message: 'Choose a method'
	}),
	paymentType: z.enum(['advance', 'full', 'balance'], { message: 'Choose a type' }),
	transactionReference: z.string().trim().max(150).or(z.literal('')).optional()
});

export type BookingSchema = typeof bookingSchema;