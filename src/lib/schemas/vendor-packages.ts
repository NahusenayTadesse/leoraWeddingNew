import { z } from 'zod/v4';

const money = z.coerce
	.number()
	.positive('Enter a price above zero')
	.max(99_999_999.99, 'That price is too large for the field');

/**
 * `vendor_packages` — named, priced bundles a vendor publishes on their
 * listing. `inclusions` is entered one line per item and stored as a JSON
 * array by `contentCrud`'s `listFields`.
 */
export const vendorPackageAddSchema = z.object({
	name: z.string().trim().min(2, 'Give the package a name').max(150),
	price: money,
	description: z.string().trim().max(1000).optional(),
	inclusions: z.string().trim().max(2000).optional()
});

export const vendorPackageEditSchema = vendorPackageAddSchema.extend({
	id: z.coerce.number().int().positive()
});

export type VendorPackageAddSchema = typeof vendorPackageAddSchema;
export type VendorPackageEditSchema = typeof vendorPackageEditSchema;
