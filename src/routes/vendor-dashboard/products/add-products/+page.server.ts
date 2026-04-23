import { superValidate, message } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';

import { add } from './schema';
import { db } from '$lib/server/db';
import {
	vendorServices as inventory,
	serviceCategories as productCategories,
	subCategories,
	serviceImages as productImages,
	categoryServices,
	vendors,
	subSubCategories
} from '$lib/server/db/schema';
import type { Actions } from './$types';
import type { PageServerLoad } from './$types.js';
import { setFlash } from 'sveltekit-flash-message/server';
import { eq, inArray } from 'drizzle-orm';

export const load: PageServerLoad = async () => {
	const allCategories = await db
		.select({
			value: productCategories.id,
			name: productCategories.name,
			description: productCategories.description
		})
		.from(productCategories)
		.where(eq(productCategories.isActive, true));

	const subs = await db
		.select({
			value: subCategories.id,
			name: subCategories.name,
			description: subCategories.description,
			parentId: subCategories.parentId
		})
		.from(subCategories);

	const subsubs = await db
		.select({
			value: subSubCategories.id,
			name: subSubCategories.name,
			description: subSubCategories.description,
			parentId: subSubCategories.parentId
		})
		.from(subSubCategories);
	const form = await superValidate(zod4(add));

	return {
		form,
		subs,
		subsubs,
		allCategories
	};
};

import { saveUploadedFile } from '$lib/server/upload.js';

export const actions: Actions = {
	addProduct: async ({ request, cookies, locals }) => {
		const form = await superValidate(request, zod4(add));

		const vendorId = await db
			.select({
				vendorId: vendors.id
			})
			.from(vendors)
			.where(eq(vendors.userId, locals?.user?.id))
			.limit(1)
			.then((rows) => rows[0]);

		if (!vendorId) {
			// Stay on the same page and set a flash message
			return message(form, { type: 'error', text: 'Vendor Not Found.' }, { status: 400 });
		}

		console.log(form, vendorId);

		if (!form.valid) {
			// Stay on the same page and set a flash message
			return message(
				form,
				{ type: 'error', text: 'Please check your form data.' },
				{ status: 400 }
			);
		}

		const { productName, category, description, subCategory, subSubCategory, image, gallery } =
			form.data;

		try {
			await db.transaction(async (tx) => {
				const featuredImage = await saveUploadedFile(image);

				const [product] = await tx
					.insert(inventory)
					.values({
						title: productName,
						vendorId: vendorId.vendorId,
						categoryId: category,
						description,
						featuredImage
					})
					.$returningId();

				if (subSubCategory) {
					const subs = await tx
						.select()
						.from(subSubCategories)
						.where(inArray(subSubCategories.id, subSubCategory));

					const insertData = subs.map((sub) => ({
						serviceId: product.id,
						subCategoryId: sub.parentId,
						subSubId: sub.id
					}));

					if (insertData.length > 0) {
						await tx.insert(categoryServices).values(insertData);
					}
				} else {
					const priceRecords = subCategory.map((p) => ({
						serviceId: product.id,
						subCategoryId: p
					}));

					await tx.insert(categoryServices).values(priceRecords).$returningId();
				}

				const newProductId = product.id;

				if (gallery) {
					const galleryImages = await uploadGallery(gallery);

					if (galleryImages.length > 0) {
						const imageRecords = galleryImages.map((url) => ({
							productId: newProductId,
							imageUrl: url
						}));

						await tx.insert(productImages).values(imageRecords);
					}
				}

				// Return the ID or the full object if needed
				return newProductId;
			});

			// Stay on the same page and set a flash message
			setFlash({ type: 'success', message: 'New Product Successuflly Added' }, cookies);

			return message(form, { type: 'success', text: 'New Product Successfully Added' });
		} catch (err) {
			console.error(err);
			setFlash(
				{ type: 'error', message: 'An error occurred while adding the product.' + err?.message },
				cookies
			);

			return message(
				form,
				{
					type: 'error',
					text: 'An error occurred while adding the product.' + err?.message
				},
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
