import { z } from 'zod/v4';

/** Empty inputs must not coerce to 0 — z.coerce.number() turns '' into 0. */
const blankToUndefined = (v: unknown) =>
	v === '' || v === null || (typeof v === 'string' && !v.trim()) ? undefined : v;

const money = z.coerce
	.number()
	.nonnegative('Price cannot be negative')
	.max(99_999_999.99, 'That price is too large for the field');

/**
 * The vendor's own editable slice of `vendors` — everything a business
 * controls about its own public listing. `status`, `isVerified`,
 * `isFeatured`, `ratingAvg` and `reviewCount` are deliberately absent: those
 * are set by Leora staff or computed from reviews, never by the vendor.
 */
export const vendorProfileSchema = z
	.object({
		businessName: z.string().trim().min(2, 'Business name is required').max(150),
		categoryId: z.coerce.number('Choose a category').positive(),
		description: z.string().trim().max(2000).optional(),
		city: z.string().trim().max(100).optional(),
		address: z.string().trim().max(255).optional(),
		phone: z.string().trim().max(30).optional(),
		email: z.email('Enter a valid email').optional().or(z.literal('')),
		website: z.url('Enter a valid URL').optional().or(z.literal('')),
		priceMin: z.preprocess(blankToUndefined, money.optional()),
		priceMax: z.preprocess(blankToUndefined, money.optional())
	})
	.refine((d) => !d.priceMin || !d.priceMax || d.priceMin <= d.priceMax, {
		message: 'The minimum price must be lower than the maximum',
		path: ['priceMax']
	});

export type VendorProfileSchema = typeof vendorProfileSchema;
