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
