import { z } from 'zod';
import { m } from '$lib/paraglide/messages.js';

const MAX_RECEIPT_BYTES = 10 * 1024 * 1024;
const RECEIPT_TYPES = [
	'image/jpeg',
	'image/png',
	'image/webp',
	'image/heic',
	'image/heif',
	'application/pdf'
];

/** A transfer receipt: a photo, a screenshot or a PDF. The kit re-checks type and size on save. */
export const receipt = z
	.instanceof(File, { error: () => m.pay_receipt_required() })
	.refine((file) => file.size > 0, { error: () => m.pay_receipt_required() })
	.refine((file) => file.size <= MAX_RECEIPT_BYTES, { error: () => m.pay_receipt_too_big() })
	.refine((file) => RECEIPT_TYPES.includes(file.type), { error: () => m.pay_receipt_type() });

const transferFields = {
	bankAccountId: z.coerce
		.number({ error: () => m.pay_account_required() })
		.int()
		.positive(),
	reference: z.string().trim().max(100).default(''),
	receipt
};

export const bookingPaySchema = z.object({
	bookingId: z.coerce.number().int().positive(),
	amount: z.coerce
		.number({ error: () => m.pay_amount_required() })
		.positive({ error: () => m.pay_amount_required() })
		.max(999_999_999),
	paymentType: z.enum(['advance', 'full', 'balance']).default('advance')
});

export const bookingTransferSchema = bookingPaySchema.extend(transferFields);

export const planPaySchema = z.object({
	planId: z.coerce.number().int().positive(),
	couponCode: z.string().trim().max(40).default('')
});

export const planTransferSchema = planPaySchema.extend(transferFields);

/** Staff decisions on the admin Payments page. */
export const reviewSchema = z.object({
	kind: z.enum(['booking', 'plan', 'vendor_plan']),
	id: z.coerce.number().int().positive(),
	reason: z.string().trim().max(500).default('')
});
