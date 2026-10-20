import { z } from 'zod/v4';

/** `vendors.status` — the approval workflow gate (see db/vendors.ts). */
export const vendorStatusSchema = z.object({
	id: z.coerce.number().int().positive(),
	status: z.enum(['pending', 'approved', 'rejected', 'suspended'])
});

const money = z.coerce
	.number()
	.nonnegative('Price cannot be negative')
	.max(99_999_999.99, 'That price is too large for the field');

/**
 * `subscription_plans` edit form. Admins may only ever `edit` here — plans are
 * a fixed catalog, not something added or removed from this dashboard.
 * `contentCrud` still wants an `addSchema` to type-check against, so one is
 * derived but never wired to a route action.
 */
export const subscriptionPlanEditSchema = z.object({
	id: z.coerce.number().int().positive(),
	name: z.string().trim().min(2, 'Give the plan a name').max(60),
	price: money,
	billingCycle: z.enum(['one_time', 'monthly', 'yearly']),
	features: z.string().trim().max(2000).optional()
});

export const subscriptionPlanAddSchema = subscriptionPlanEditSchema.omit({ id: true });

export type VendorStatusSchema = typeof vendorStatusSchema;
export type SubscriptionPlanEditSchema = typeof subscriptionPlanEditSchema;
export type SubscriptionPlanAddSchema = typeof subscriptionPlanAddSchema;

/*
 * Row actions that take input. Each is one `FormDialog` on its page, seeded with the row's id
 * when a row's button opens it.
 */

export const bookingCancelSchema = z.object({
	id: z.coerce.number().int().positive(),
	reason: z.string().trim().min(3, 'Give a reason').max(500)
});

/** `user.id` is better-auth's string id, not a number. */
export const userBanSchema = z.object({
	id: z.string().min(1),
	reason: z.string().trim().max(250).optional()
});

/** `roleId` 0 means "no role". */
export const userRoleSchema = z.object({
	id: z.string().min(1),
	roleId: z.coerce.number().int().min(0)
});

export const payoutCompleteSchema = z.object({
	id: z.coerce.number().int().positive(),
	reference: z.string().trim().max(150).optional()
});

export const disputeUpdateSchema = z.object({
	id: z.coerce.number().int().positive(),
	status: z.enum(['open', 'under_review', 'resolved', 'refunded']),
	notes: z.string().trim().max(2000).optional()
});

const optionalNumber = z.preprocess(
	(v) => (v === '' || v === null ? undefined : v),
	z.coerce.number().int().positive().optional()
);

export const couponCreateSchema = z
	.object({
		code: z
			.string()
			.trim()
			.toUpperCase()
			.regex(/^[A-Z0-9_-]{3,40}$/, 'Code: 3–40 letters, numbers, - or _'),
		type: z.enum(['percent', 'flat']).default('percent'),
		value: z.coerce.number().positive('Value must be above 0').max(99_999_999),
		maxUses: optionalNumber,
		/** `YYYY-MM-DD` from the kit's date input; empty means it never expires. */
		expiresAt: z.string().trim().optional()
	})
	.refine((d) => d.type !== 'percent' || d.value <= 100, {
		message: 'A percent coupon cannot exceed 100',
		path: ['value']
	});

export const commissionSchema = z
	.object({
		type: z.enum(['percentage', 'fixed']).default('percentage'),
		value: z.coerce.number().min(0, 'Cannot be negative').max(99_999_999)
	})
	.refine((d) => d.type !== 'percentage' || d.value <= 100, {
		message: 'A percentage cannot exceed 100',
		path: ['value']
	});
