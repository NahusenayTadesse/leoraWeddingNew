import { fail, redirect } from '@sveltejs/kit';
import { superValidate, message, withFiles } from 'sveltekit-superforms';
import { redirect as flashRedirect } from 'sveltekit-flash-message/server';
import { saveUploadedFile, UploadRefused } from '@nahu/admin-kit/server/files';
import { zod4 } from 'sveltekit-superforms/adapters';
import { and, asc, eq, isNull } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { subscriptionPlans, subscriptions } from '$lib/server/db/schema';
import { findCouple } from '$lib/server/db/queries/wedding';
import { planPaySchema, planTransferSchema } from '$lib/schemas/payment';
import {
	PaymentRefused,
	PaymentStartError,
	quoteCoupon,
	startPlanChapa,
	submitPlanTransfer,
	transferAccounts
} from '$lib/server/payments';
import { LIMITS, takeToken } from '$lib/server/rateLimit';
import { m } from '$lib/paraglide/messages.js';
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

	const [transferForm, accounts] = await Promise.all([
		superValidate(zod4(planTransferSchema), { id: 'plan-transfer' }),
		couple ? transferAccounts() : []
	]);

	return {
		plans,
		currentPlanSlug,
		hasUser: !!locals.user,
		hasCouple: !!couple,
		transferForm,
		accounts
	};
};

async function payerFor(locals: App.Locals) {
	const couple = await findCouple(locals);
	if (!locals.user || !couple) return null;
	return {
		couple,
		payer: { id: locals.user.id, name: locals.user.name, email: locals.user.email, phone: couple.phone }
	};
}

export const actions: Actions = {
	/**
	 * Pay online: a plain form post answered with a 303 to Chapa (or straight to the planner when
	 * a coupon covers the whole price). The price is read from the database in `startPlanChapa`.
	 */
	subscribe: async (event) => {
		const { request, locals, url, getClientAddress } = event;
		if (!locals.user) {
			return fail(401, { message: { type: 'error', text: 'Please sign in to upgrade your plan.' } });
		}
		if (!takeToken(`pay:${getClientAddress()}`, LIMITS.payment)) {
			return fail(429, { message: { type: 'error', text: m.auth_too_many() } });
		}
		const form = await superValidate(request, zod4(planPaySchema));
		if (!form.valid) return fail(400, { message: { type: 'error', text: m.auth_form_invalid() } });

		const who = await payerFor(locals);
		if (!who) {
			return fail(400, { message: { type: 'error', text: 'Add your couple details before upgrading.' } });
		}

		let started;
		try {
			started = await startPlanChapa(
				{
					coupleId: who.couple.id,
					planId: form.data.planId,
					payer: who.payer,
					couponCode: form.data.couponCode || null
				},
				url.origin
			);
		} catch (err) {
			if (err instanceof PaymentRefused) {
				return fail(409, { message: { type: 'error', text: err.message } });
			}
			if (err instanceof PaymentStartError) {
				console.error('Chapa start failed:', err.cause);
				return fail(502, { message: { type: 'error', text: m.pay_unavailable() } });
			}
			throw err;
		}

		if (started.kind === 'activated') {
			flashRedirect('/wedding', { type: 'success', message: m.pay_plan_activated() }, event);
		}
		redirect(303, started.url);
	},

	/** Prices a plan with a coupon so the checkout can show the discount before paying. */
	quote: async ({ request, locals }) => {
		if (!locals.user) return fail(401, { quoteError: 'Please sign in.' });
		const data = await request.formData();
		const planId = Number(data.get('planId'));
		const code = String(data.get('couponCode') ?? '').trim();
		const [plan] = await db
			.select({ price: subscriptionPlans.price })
			.from(subscriptionPlans)
			.where(and(eq(subscriptionPlans.id, planId), isNull(subscriptionPlans.deletedAt)))
			.limit(1);
		if (!plan || !code) return fail(400, { quoteError: 'Enter a coupon code.' });
		try {
			const quote = await quoteCoupon(code, toMoney(plan.price));
			return { quote: { ...quote, planId } };
		} catch (err) {
			if (err instanceof PaymentRefused) return fail(400, { quoteError: err.message });
			throw err;
		}
	},

	/** Paid by bank transfer: the receipt waits for staff; the plan activates on confirmation. */
	transfer: async ({ request, locals, getClientAddress }) => {
		const form = await superValidate(request, zod4(planTransferSchema), { id: 'plan-transfer' });
		if (!takeToken(`pay:${getClientAddress()}`, LIMITS.payment)) {
			return message(withFiles(form), { type: 'error', text: m.auth_too_many() }, { status: 429 });
		}
		if (!form.valid) return fail(400, withFiles({ form }));

		const who = await payerFor(locals);
		if (!who) {
			return message(
				withFiles(form),
				{ type: 'error', text: 'Add your couple details before upgrading.' },
				{ status: 400 }
			);
		}

		try {
			const receiptFile = await saveUploadedFile(form.data.receipt);
			await submitPlanTransfer({
				coupleId: who.couple.id,
				planId: form.data.planId,
				payer: who.payer,
				couponCode: form.data.couponCode || null,
				bankAccountId: form.data.bankAccountId,
				reference: form.data.reference || undefined,
				receiptFile
			});
		} catch (err) {
			if (err instanceof PaymentRefused || err instanceof UploadRefused) {
				return message(withFiles(form), { type: 'error', text: err.message }, { status: 409 });
			}
			throw err;
		}
		return message(withFiles(form), { type: 'success', text: m.pay_transfer_received() });
	}
};
