import { superValidate, message } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';

import { editGallery, addYoutube } from './schema';

import { db } from '$lib/server/db';
import { homeImages, youtubeUrl } from '$lib/server/db/schema';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const form = await superValidate(zod4(editGallery));
	const videoForm = await superValidate(zod4(addYoutube));

	const images = await db.select().from(homeImages);

	const gallery = images.map((img) => img.imageUrl);

	const rows = await db.select().from(youtubeUrl).limit(1); // Good practice to limit(1) if you only want one

	// 2. Check if a row actually exists before accessing properties
	const video = rows.length > 0 ? rows[0].videoUrl : null;

	return { form, gallery, video, videoForm };
};

import { saveUploadedFile } from '$lib/server/upload';

export const actions: Actions = {
	editGallery: async ({ request }) => {
		const form = await superValidate(request, zod4(editGallery));

		const { existing, gallery } = form.data;

		try {
			await db.transaction(async (tx) => {
				let galleryImages = [];

				// 1. Upload new files if they exist
				if (gallery && gallery.length > 0) {
					galleryImages = await uploadGallery(gallery);
				}
				const old = existing.split(',');
				// 2. Combine existing (edited) strings with newly uploaded URLs
				// We filter out empty strings/nulls to ensure data integrity
				const finalList = [...new Set([...old, ...galleryImages])].filter(
					(item) => item && item.trim() !== ''
				);

				// 3. ALWAYS sync if the final list is valid,
				// even if galleryImages.length is 0 (e.g., you just deleted an old photo)
				if (finalList.length > 0) {
					const imageRecords = finalList.map((url) => ({
						imageUrl: url
					}));

					// Wipe the old associations and replace with the new "finalList"
					await tx.delete(homeImages);
					await tx.insert(homeImages).values(imageRecords);
				} else {
					// Handle the case where all images were removed
					await tx.delete(homeImages);
				}
			});

			return message(form, { type: 'success', text: 'Homepage Gallery added Successfully!' });
		} catch (err) {
			console.error('Error marking adding homepage gallery:', err);
			return message(
				form,
				{ type: 'error', text: `Unexpected Error: ${err?.message}` },
				{ status: 500 }
			);
		}
	},

	addVideo: async ({ request }) => {
		const form = await superValidate(request, zod4(addYoutube));

		const { videoUrl } = form.data;

		try {
			await db.transaction(async (tx) => {
				// Wipe the old associations and replace with the new "finalList"
				await tx.delete(youtubeUrl);
				await tx.insert(youtubeUrl).values([{ videoUrl }]);
			});

			return message(form, { type: 'success', text: 'Youtube Video added Successfully!' });
		} catch (err) {
			console.error('Error marking adding Youtube Video:', err);
			return message(
				form,
				{ type: 'error', text: `Unexpected Error: ${err?.message}` },
				{ status: 500 }
			);
		}
	}
};

const uploadGallery = async (gallery: File[] | undefined) => {
	try {
		// 1. Map each file to the upload promise
		const uploadPromises = gallery.map(async (file) => {
			const address = await saveUploadedFile(file);
			return address; // This is the string returned by your function
		});

		// 2. Wait for all uploads to complete and store results in an array
		const uploadedAddresses: string[] = await Promise.all(uploadPromises);

		console.log('All files uploaded:', uploadedAddresses);

		return uploadedAddresses;
	} catch (error) {
		console.error('Error uploading gallery:', error);
		throw error;
	}
};
