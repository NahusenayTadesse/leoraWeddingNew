import { fail } from '@sveltejs/kit';
import { superValidate, message } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { and, asc, eq, isNull } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { subscriptionPlans, subscriptions, payments } from '$lib/server/db/schema';
import { findCouple } from '$lib/server/db/queries/wedding';
import { subscribeSchema } from '$lib/schemas/subscribe';
import { chapa, encodeCheckoutToken, normalizeEthiopianPhone } from '$lib/server/chapa';
import { toMoney } from '$lib/money';
import type { Actions, PageServerLoad } from './$types';

/**
 * Plans come from `subscription_plans`, not a hard-coded array — the PHP
 * pricing page listed plan slugs (`growth`, `featured`) that did not exist in
 * its own plan table, and checkout silently fell back to Golden at the wrong
 * price. Reading the catalog means a link can only ever point at a real plan.
 */
export const load: PageServerLoad = async ({ locals }) => {
	const plans = await db
		.select({
			id: subscriptionPlans.id,
			slug: subscriptionPlans.slug,
			name: subscriptionPlans.name,
			price: subscriptionPlans.price,
			billingCycle: subscriptionPlans.billingCycle,
			features: subscriptionPlans.features
		})
		.from(subscriptionPlans)
		.where(
			and(
				// Couple-facing tiers only. Vendor tiers live in the same table at
				// overlapping prices, so without this filter they render in the
				// same grid as the couple plans.
				eq(subscriptionPlans.audience, 'couple'),
				eq(subscriptionPlans.isActive, true),
				isNull(subscriptionPlans.deletedAt)
			)
		)
		.orderBy(asc(subscriptionPlans.price));

	const couple = await findCouple(locals);

	const currentPlanSlug = couple
		? await db
				.select({ slug: subscriptionPlans.slug })
				.from(subscriptions)
				.innerJoin(subscriptionPlans, eq(subscriptionPlans.id, subscriptions.subscriptionPlanId))
				.where(and(eq(subscriptions.coupleId, couple.id), eq(subscriptions.status, 'active')))
				.limit(1)
				.then((r) => r[0]?.slug ?? 'free')
		: null;

	const subscribeForm = await superValidate(zod4(subscribeSchema));

	return {
		plans,
		currentPlanSlug,
		hasUser: !!locals.user,
		hasCouple: !!couple,
		subscribeForm
	};
};

export const actions: Actions = {
	subscribe: async ({ request, locals, url }) => {
		const form = await superValidate(request, zod4(subscribeSchema));

		if (!locals.user) {
			return message(form, { type: 'error', text: 'Please sign in to upgrade your plan.' }, { status: 401 });
		}
		if (!form.valid) return fail(400, { form });

		const couple = await findCouple(locals);
		if (!couple) {
			return message(
				form,
				{ type: 'error', text: 'Add your couple details before upgrading.' },
				{ status: 400 }
			);
		}

		const [plan] = await db
			.select()
			.from(subscriptionPlans)
			.where(
				and(
					eq(subscriptionPlans.id, form.data.planId),
					eq(subscriptionPlans.audience, 'couple'),
					eq(subscriptionPlans.isActive, true),
					isNull(subscriptionPlans.deletedAt)
				)
			)
			.limit(1);

		if (!plan) {
			return message(form, { type: 'error', text: 'This plan is no longer available.' }, { status: 404 });
		}

		const amount = toMoney(plan.price);
		if (amount <= 0) {
			return message(form, { type: 'error', text: "That plan is free — there's nothing to pay." }, { status: 400 });
		}

		const tx_ref = chapa.genTxRef();

		// Recorded as 'pending' before we ever talk to Chapa — a payment that
		// never got a checkout_url must still be visible for reconciliation,
		// not silently dropped.
		await db.insert(payments).values({
			coupleId: couple.id,
			amount: amount.toFixed(2),
			currency: 'ETB',
			paymentMethod: 'chapa',
			status: 'pending',
			transactionRef: tx_ref
		});

		try {
			const [firstName, ...rest] = (locals.user.name || 'Guest Customer').trim().split(/\s+/);
			const token = encodeCheckoutToken(tx_ref, plan.id);

			const init = await chapa.initialize({
				amount: amount.toFixed(2),
				currency: 'ETB',
				email: locals.user.email,
				first_name: firstName,
				last_name: rest.join(' ') || 'Customer',
				phone_number: normalizeEthiopianPhone(couple.phone),
				tx_ref,
				return_url: `${url.origin}/pricing/confirm/${token}`,
				customization: {
					title: 'Leora Events',
					// Chapa only accepts letters, numbers, hyphens, underscores, spaces
					// and dots here.
					description: `Upgrade to ${plan.name}`.replace(/[^a-zA-Z0-9 .-]/g, '')
				}
			});

			if (!init?.data?.checkout_url) {
				throw new Error(init?.message || 'Payment initialization failed');
			}

			return message(form, {
				type: 'success',
				text: 'Redirecting you to Chapa to complete payment…',
				checkoutUrl: init.data.checkout_url
			});
		} catch (err) {
			console.error('Chapa subscription initialize error:', err);
			return message(
				form,
				{
					type: 'error',
					text: 'Could not start payment. Please try again or contact support.'
				},
				{ status: 502 }
			);
		}
	}
};
