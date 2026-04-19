import { z } from 'zod/v4';
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 5MB limit
const ACCEPTED_FILE_TYPES = [
	'image/jpeg', // Common for both platforms
	'image/png', // Common for both platforms (and screenshots)
	'image/webp', // Common modern format (often Android screenshots/exports)
	'image/heic', // High Efficiency Image File (iOS default)
	'image/heif', // High Efficiency Image File (related to HEIC)
	'application/pdf' // Document format, kept from original
];

export const edit = z.object({
	productName: z.string().min(1, { message: 'Product Name is required.' }),
	category: z.number('Category cannot be empty. Please select a Category'),
	subCategory: z.coerce.number('Sub Categories is required').array(),

	description: z
		.string()
		.max(500, { message: "Product description can't be more than 500 characters." })
		.optional(),
	image: z.file().optional()
});

export const editGallery = z.object({
	existing: z.string().array(),
	gallery: z.file().max(10000000).array().optional()
});

export type EditGallery = z.infer<typeof editGallery>;

export const editPrice = z.object({
	id: z.number('Price Not found'),
	price: z.coerce.number('Price must be a number'),
	amount: z.string('Product Variation is required')
});

export type EditPrice = z.infer<typeof editPrice>;

export const addPrice = z.object({
	price: z.coerce.number('Price must be a number'),
	amount: z.string('Product Variation is required')
});

export type AddPrice = z.infer<typeof addPrice>;
