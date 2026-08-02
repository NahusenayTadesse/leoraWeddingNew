import { and, asc, eq, isNull } from 'drizzle-orm';
import { redirect } from '@sveltejs/kit';
import { message, superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';

import { db } from '$lib/server/db';
import { vendorOnboardingSchema } from '$lib/ZodSchema';
import { fromMoney } from '$lib/money';
import {
	subscriptionPlans,
	vendorCategories,
	vendorPackages,
	vendorSubscriptions,
	vendors
} from '$lib/server/db/schema';
import type { Actions, PageServerLoad } from './$types';

/**
 * The 4-step "Become a Vendor" wizard from leora-events-vendor-onboarding.html
 * (Business Info -> Category -> First Listing -> Plan -> Review -> Success).
 * Reached after the auth card's vendor sign-up step opens the account — see
 * `$lib/server/authForms.ts`'s `vendorStart`.
 */
async function hasVendorProfile(userId: string): Promise<boolean> {
	return db
		.select({ id: vendors.id })
		.from(vendors)
		.where(and(eq(vendors.userId, userId), isNull(vendors.deletedAt)))
		.limit(1)
		.then((r) => r.length > 0);
}

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		redirect(302, '/signup?role=vendor');
	}
	if (await hasVendorProfile(locals.user.id)) {
		redirect(302, '/vendor-dashboard');
	}

	const [categories, plans, form] = await Promise.all([
		db
			.select({
				id: vendorCategories.id,
				name: vendorCategories.name,
				icon: vendorCategories.icon
			})
			.from(vendorCategories)
			.where(eq(vendorCategories.listable, true))
			.orderBy(asc(vendorCategories.sortOrder)),
		db
			.select({
				id: subscriptionPlans.id,
				name: subscriptionPlans.name,
				price: subscriptionPlans.price,
				billingCycle: subscriptionPlans.billingCycle,
				features: subscriptionPlans.features
			})
			.from(subscriptionPlans)
			.where(eq(subscriptionPlans.audience, 'vendor'))
			.orderBy(asc(subscriptionPlans.price)),
		superValidate(
			{ businessName: locals.user.name, email: locals.user.email },
			zod4(vendorOnboardingSchema),
			// Otherwise every unfilled field on later steps shows a validation
			// error before the visitor has typed anything.
			{ errors: false }
		)
	]);

	return { form, categories, plans };
};

export const actions: Actions = {
	createListing: async (event) => {
		const { locals } = event;
		if (!locals.user) redirect(302, '/signup?role=vendor');

		const form = await superValidate(event.request, zod4(vendorOnboardingSchema));
		if (!form.valid) {
			return message(form, { type: 'error', text: 'Please check the form.' }, { status: 400 });
		}

		// Guards against a double-submit (e.g. the browser back button then
		// re-confirming) creating a second vendor profile for the same user.
		if (await hasVendorProfile(locals.user.id)) {
			redirect(302, '/vendor-dashboard');
		}

		const {
			businessName,
			city,
			phone,
			email,
			description,
			// `.superRefine` above already guarantees these are set for a valid
			// form; zod's TS types don't narrow across that, so assert here.
			categoryId,
			packageName,
			packagePrice,
			packageCapacity,
			packageIncludes,
			planId
		} = form.data as typeof form.data & { categoryId: number; packagePrice: number };

		try {
			await db.transaction(async (tx) => {
				const [vendorRow] = await tx
					.insert(vendors)
					.values({
						userId: locals.user!.id,
						categoryId,
						businessName,
						description,
						phone,
						email,
						city,
						// New vendors need admin approval before they're visible in the
						// marketplace — see `$lib/server/vendorDirectory.ts`.
						status: 'pending'
					})
					.$returningId();

				const inclusions = [
					...(packageCapacity ? [`Guest capacity: ${packageCapacity}`] : []),
					...(packageIncludes ? [packageIncludes] : [])
				];

				await tx.insert(vendorPackages).values({
					vendorId: vendorRow.id,
					name: packageName,
					price: fromMoney(packagePrice),
					inclusions: inclusions.length ? inclusions : undefined
				});

				if (planId) {
					await tx.insert(vendorSubscriptions).values({
						vendorId: vendorRow.id,
						planId,
						status: 'active',
						startsAt: new Date().toISOString().slice(0, 10)
					});
				}
			});
		} catch (error) {
			console.error(error);
			return message(
				form,
				{ type: 'error', text: 'Something went wrong creating your listing. Please try again.' },
				{ status: 500 }
			);
		}

		// Stays on the wizard — the success step (with its "Go to Vendor Portal"
		// button) is part of the same card in the PHP flow, not a redirect.
		return message(form, { type: 'success', text: 'Listing created.' });
	}
};
