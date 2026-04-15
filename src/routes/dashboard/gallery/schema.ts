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

export const editGallery = z.object({
	existing: z.string(),
	gallery: z
		.instanceof(File)
		.refine((file) => file.size <= MAX_FILE_SIZE, `Max file size is 10MB.`)
		.refine((file) => ACCEPTED_FILE_TYPES.includes(file.type), 'Invalid file type.')
		.array()
		.optional()
});

export type EditGallery = z.infer<typeof editGallery>;

export const addYoutube = z.object({
	videoUrl: z
		.url('Please enter a valid URL.')
		.regex(/^(https?:\/\/)?(www\.|m\.)?(youtube\.com|youtu\.be)\/.+$/, {
			message: 'Please enter a valid YouTube URL.'
		})
});

export type AddYoutube = z.infer<typeof addYoutube>;
