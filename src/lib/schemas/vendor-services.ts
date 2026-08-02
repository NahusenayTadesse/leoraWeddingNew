import { z } from 'zod/v4';

/**
 * `vendor_services` — the catalog a vendor publishes under their listing
 * (distinct from `vendor_packages`, which are priced bundles). `vendorId` is
 * injected by `contentCrud`'s `scope`, not collected from the form.
 */
export const vendorServiceAddSchema = z.object({
	title: z.string().trim().min(2, 'Give the service a name').max(150),
	categoryId: z.coerce.number().positive().optional(),
	description: z.string().trim().max(2000).optional(),
	currency: z.string().trim().length(3).default('ETB'),
	featuredImage: z
		.instanceof(File)
		.refine((f) => f.size <= 10 * 1024 * 1024, 'Image must be under 10MB')
		.optional()
});

export const vendorServiceEditSchema = vendorServiceAddSchema.extend({
	id: z.coerce.number().int().positive()
});

export type VendorServiceAddSchema = typeof vendorServiceAddSchema;
export type VendorServiceEditSchema = typeof vendorServiceEditSchema;
