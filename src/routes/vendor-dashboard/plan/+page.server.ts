import { fail, redirect } from '@sveltejs/kit';
import { and, asc, desc, eq, isNull } from 'drizzle-orm';
import { message, superValidate, withFiles } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { redirect as flashRedirect } from 'sveltekit-flash-message/server';
import { saveUploadedFile, UploadRefused } from '@nahu/admin-kit/server/files';
import { db } from '$lib/server/db';
import { payments, subscriptionPlans, vendorSubscriptions, vendors } from '$lib/server/db/schema';
import { requireVendor } from '$lib/server/vendor';
import {
	PaymentRefused,
	PaymentStartError,
	startVendorPlanChapa,
	submitVendorPlanTransfer,
	transferAccounts
} from '$lib/server/payments';
import { planPaySchema, planTransferSchema } from '$lib/schemas/payment';
import { LIMITS, takeToken } from '$lib/server/rateLimit';
import { toMoney } from '$lib/money';
import { m } from '$lib/paraglide/messages.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const vendor = await requireVendor(locals, '/vendor-dashboard/plan');
	const [plans, [current], pending, accounts, transferForm] = await Promise.all([
		db
			.select({
				id: subscriptionPlans.id,
				name: subscriptionPlans.name,
				price: subscriptionPlans.price,
				billingCycle: subscriptionPlans.billingCycle,
				features: subscriptionPlans.features
			})
			.from(subscriptionPlans)
			.where(
				and(
					eq(subscriptionPlans.audience, 'vendor'),
					eq(subscriptionPlans.isActive, true),
					isNull(subscriptionPlans.deletedAt)
				)
			)
			.orderBy(asc(subscriptionPlans.price)),
		db
			.select({
				planId: vendorSubscriptions.planId,
				name: subscriptionPlans.name,
				endsAt: vendorSubscriptions.endsAt
			})
			.from(vendorSubscriptions)
			.innerJoin(subscriptionPlans, eq(subscriptionPlans.id, vendorSubscriptions.planId))
			.where(
				and(eq(vendorSubscriptions.vendorId, vendor.id), eq(vendorSubscriptions.status, 'active'))
			)
			.orderBy(desc(vendorSubscriptions.id))
			.limit(1),
		db
			.select({ id: payments.id, plan: subscriptionPlans.name, amount: payments.amount })
			.from(payments)
			.leftJoin(subscriptionPlans, eq(subscriptionPlans.id, payments.subscriptionPlanId))
			.where(
				and(
					eq(payments.vendorId, vendor.id),
					eq(payments.status, 'pending'),
					eq(payments.paymentMethod, 'bank_transfer')
				)
			),
		transferAccounts(),
		superValidate(zod4(planTransferSchema), { id: 'plan-transfer' })
	]);
	return {
		plans: plans.map((p) => ({ ...p, price: toMoney(p.price) })),
		current: current ?? null,
		pending: pending.map((p) => ({ ...p, amount: toMoney(p.amount) })),
		accounts,
		transferForm
	};
};

async function payer(locals: App.Locals) {
	const vendor = await requireVendor(locals);
	const [row] = await db
		.select({ phone: vendors.phone })
		.from(vendors)
		.where(eq(vendors.id, vendor.id));
	return {
		vendor,
		payer: {
			id: locals.user!.id,
			name: vendor.businessName ?? locals.user!.name,
			email: locals.user!.email,
			phone: row?.phone
		}
	};
}

export const actions = {
	subscribe: async (event) => {
		const { request, locals, url, getClientAddress } = event;
		if (!takeToken(`pay:${getClientAddress()}`, LIMITS.payment)) {
			return fail(429, { message: { type: 'error', text: m.auth_too_many() } });
		}
		const form = await superValidate(request, zod4(planPaySchema));
		if (!form.valid) return fail(400, { message: { type: 'error', text: m.auth_form_invalid() } });
		const { vendor, payer: who } = await payer(locals);

		let started;
		try {
			started = await startVendorPlanChapa(
				{ vendorId: vendor.id, planId: form.data.planId, payer: who },
				url.origin
			);
		} catch (err) {
			if (err instanceof PaymentRefused)
				return fail(409, { message: { type: 'error', text: err.message } });
			if (err instanceof PaymentStartError) {
				console.error('Chapa start failed:', err.cause);
				return fail(502, { message: { type: 'error', text: m.pay_unavailable() } });
			}
			throw err;
		}
		if (started.kind === 'activated') {
			flashRedirect(
				'/vendor-dashboard/plan',
				{ type: 'success', message: m.pay_plan_activated() },
				event
			);
		}
		redirect(303, started.url);
	},

	transfer: async ({ request, locals, getClientAddress }) => {
		const form = await superValidate(request, zod4(planTransferSchema), { id: 'plan-transfer' });
		if (!takeToken(`pay:${getClientAddress()}`, LIMITS.payment)) {
			return message(withFiles(form), { type: 'error', text: m.auth_too_many() }, { status: 429 });
		}
		if (!form.valid) return fail(400, withFiles({ form }));
		const { vendor, payer: who } = await payer(locals);
		try {
			const receiptFile = await saveUploadedFile(form.data.receipt);
			await submitVendorPlanTransfer({
				vendorId: vendor.id,
				planId: form.data.planId,
				payer: who,
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
} satisfies Actions;
