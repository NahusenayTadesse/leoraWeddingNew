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

export const add = z.object({
	productName: z.string().min(1, { message: 'Product Name is required.' }),
	category: z.number('Category cannot be empty. Please select a Category'),
	subCategory: z.number('Sub Category cannot be empty. Please select a Category').array(),
	subSubCategory: z
		.number('Sub Sub Category cannot be empty. Please select a Category')
		.array()
		.optional(),

	description: z
		.string()
		.max(500, { message: "Product description can't be more than 500 characters." })
		.optional(),

	image: z.file('Product Image is required').max(10000000, 'Image can not be more than 10MB'),
	gallery: z
		.file('Product Image is required')
		.max(10000000, 'Image can not be more than 10MB')
		.array()
		.optional()
});
