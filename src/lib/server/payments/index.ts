/**
 * The payment pipeline for both money flows (see db/payments.ts):
 *
 *   booking      — a couple paying a vendor through Leora → `booking_payments`, tx_ref `bk-…`
 *   plan         — a couple buying a Leora plan           → `payments`,         tx_ref `pl-…`
 *   vendor_plan  — a vendor buying a vendor plan          → `payments`,         tx_ref `vp-…`
 *
 * Each attempt is one row, written `pending` before the customer leaves for Chapa so a webhook
 * that beats them back can be matched. A row becomes paid in exactly two ways:
 *
 *   Chapa     — `verify(txRef)`, called by the callback, the webhook, the return page and the
 *               reconcile job. Only Chapa's server-to-server answer counts, and only once.
 *   Transfer  — staff check the uploaded receipt against the bank statement (`confirmTransfer`).
 *
 * Both end in the same settlement: `confirmBookingPayment` (commission, wallet, ledger) for a
 * booking; `settlePlan` (subscription, coupon use) for a plan.
 */
import { randomBytes } from 'node:crypto';
import { and, asc, eq, inArray, isNull, lt, sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import {
	bankAccounts,
	bookingPayments,
	couples,
	coupons,
	payments,
	refunds,
	subscriptionPlans,
	vendorBookings,
	vendors,
	weddingGifts
} from '$lib/server/db/schema';
import { confirmBookingPayment } from '$lib/server/bookingPayments';
import { activateSubscription, activateVendorPlan } from '$lib/server/subscriptions';
import { notify, notifyAdmins } from '$lib/server/notify';
import { formatETB, fromMoney, toMoney } from '$lib/money';
import { initializeTransaction, verifyTransaction } from '@nahu/admin-kit/server/chapa';
import { giftReturnPath, settleGift } from '$lib/server/gifts';
import { m } from '$lib/paraglide/messages.js';

export type PaymentKind = 'booking' | 'plan' | 'vendor_plan' | 'gift';

/** Money comparisons get a cent of slack for decimal round-tripping. */
const TOLERANCE = 0.01;

const RETURN_PATH: Record<PaymentKind, string> = {
	booking: '/wedding/bookings',
	plan: '/pricing',
	vendor_plan: '/vendor-dashboard/plan',
	// Replaced by the couple's invitation once the gift is found (see `verify`).
	gift: '/'
};

const TX_PREFIX: Record<PaymentKind, string> = {
	booking: 'bk',
	plan: 'pl',
	vendor_plan: 'vp',
	gift: 'gf'
};

/** Something the customer can be told: the record can't be paid, the account is wrong… */
export class PaymentRefused extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'PaymentRefused';
	}
}

/** Chapa could not start the checkout. The row is marked failed; the customer may retry. */
export class PaymentStartError extends Error {
	constructor(cause: unknown) {
		super(cause instanceof Error ? cause.message : 'Could not start the payment', { cause });
		this.name = 'PaymentStartError';
	}
}

/** `bk-12-a1b2c3d4e5`: kind, record, and enough randomness that attempts never collide. */
export function newTxRef(kind: PaymentKind, id: number) {
	return `${TX_PREFIX[kind]}-${id}-${randomBytes(5).toString('hex')}`;
}

export function kindOf(txRef: string): PaymentKind | null {
	const prefix = txRef.split('-')[0];
	const found = (Object.keys(TX_PREFIX) as PaymentKind[]).find((k) => TX_PREFIX[k] === prefix);
	return found ?? null;
}

function callbackUrls(origin: string, txRef: string) {
	return {
		callbackUrl: `${origin}/api/payments/chapa/callback`,
		returnUrl: `${origin}/payments/return?tx_ref=${encodeURIComponent(txRef)}`
	};
}

// ---------------------------------------------------------------------------
// Bank accounts
// ---------------------------------------------------------------------------

/** The accounts a customer may transfer to, for checkout panels. */
export function transferAccounts() {
	return db
		.select({
			id: bankAccounts.id,
			bankName: bankAccounts.bankName,
			accountName: bankAccounts.accountName,
			accountNumber: bankAccounts.accountNumber
		})
		.from(bankAccounts)
		.where(and(eq(bankAccounts.isActive, true), isNull(bankAccounts.deletedAt)))
		.orderBy(asc(bankAccounts.sortOrder), asc(bankAccounts.id));
}

async function assertAccount(bankAccountId: number) {
	const accounts = await transferAccounts();
	if (!accounts.some((a) => a.id === bankAccountId)) {
		throw new PaymentRefused(m.srv_choose_account());
	}
}

// ---------------------------------------------------------------------------
// Booking payments
// ---------------------------------------------------------------------------

export type BookingBalance = { agreed: number; paid: number; underReview: number; due: number };

/**
 * What is still owed on a booking: the agreed price, less confirmed payments and transfers
 * waiting for review. Abandoned Chapa attempts don't count — they may never be paid.
 */
export async function bookingBalance(bookingId: number): Promise<BookingBalance> {
	const [booking] = await db
		.select({ agreedPrice: vendorBookings.agreedPrice })
		.from(vendorBookings)
		.where(eq(vendorBookings.id, bookingId));
	const [sums] = await db
		.select({
			paid: sql<string>`coalesce(sum(case when ${bookingPayments.status} = 'confirmed' then ${bookingPayments.amount} end), 0)`,
			underReview: sql<string>`coalesce(sum(case when ${bookingPayments.status} = 'pending' and ${bookingPayments.paymentMethod} <> 'chapa' then ${bookingPayments.amount} end), 0)`
		})
		.from(bookingPayments)
		.where(and(eq(bookingPayments.bookingId, bookingId), isNull(bookingPayments.deletedAt)));

	const [refunded] = await db
		.select({ total: sql<string>`coalesce(sum(${refunds.amount}), 0)` })
		.from(refunds)
		.innerJoin(bookingPayments, eq(bookingPayments.id, refunds.bookingPaymentId))
		.where(
			and(
				eq(bookingPayments.bookingId, bookingId),
				eq(bookingPayments.status, 'confirmed'),
				eq(refunds.status, 'approved')
			)
		);

	const agreed = toMoney(booking?.agreedPrice ?? 0);
	// Partial refunds leave a payment confirmed; what came back no longer counts as paid.
	const paid = toMoney(sums?.paid ?? 0) - toMoney(refunded?.total ?? 0);
	const underReview = toMoney(sums?.underReview ?? 0);
	const due = Math.max(0, Math.round((agreed - paid - underReview) * 100) / 100);
	return { agreed, paid, underReview, due };
}

export type BookingPayInput = {
	booking: { id: number; vendorId: number; status: string };
	weddingPlanId: number;
	payer: { id: string; name: string; email: string; phone?: string | null };
	amount: number;
	paymentType: 'advance' | 'full' | 'balance';
};

async function checkBookingPayable(input: BookingPayInput) {
	if (input.booking.status !== 'confirmed') {
		throw new PaymentRefused(m.srv_pay_after_confirm());
	}
	const { due } = await bookingBalance(input.booking.id);
	if (due <= 0) throw new PaymentRefused(m.srv_nothing_owed());
	if (!(input.amount > 0) || input.amount > due + TOLERANCE) {
		throw new PaymentRefused(m.srv_amount_between({ amount: formatETB(due) }));
	}
}

/** Starts a Chapa attempt for a booking and returns the checkout URL. */
export async function startBookingChapa(input: BookingPayInput, origin: string): Promise<string> {
	await checkBookingPayable(input);
	const txRef = newTxRef('booking', input.booking.id);

	await db.insert(bookingPayments).values({
		weddingPlanId: input.weddingPlanId,
		bookingId: input.booking.id,
		payerId: input.payer.id,
		payeeVendorId: input.booking.vendorId,
		amount: fromMoney(input.amount),
		currency: 'ETB',
		paymentMethod: 'chapa',
		paymentType: input.paymentType,
		status: 'pending',
		transactionReference: txRef
	});

	try {
		const checkoutUrl = await initializeTransaction({
			title: 'Leora Events',
			amount: input.amount,
			name: input.payer.name,
			email: input.payer.email,
			phone: input.payer.phone,
			txRef,
			...callbackUrls(origin, txRef),
			description: `Booking ${input.booking.id}`
		});
		await db
			.update(bookingPayments)
			.set({ checkoutUrl })
			.where(eq(bookingPayments.transactionReference, txRef));
		return checkoutUrl;
	} catch (err) {
		await db
			.update(bookingPayments)
			.set({ status: 'failed', verifyPayload: String((err as Error).message).slice(0, 2000) })
			.where(
				and(eq(bookingPayments.transactionReference, txRef), eq(bookingPayments.status, 'pending'))
			);
		throw new PaymentStartError(err);
	}
}

/**
 * Records a transfer the couple says they made, with their receipt. It stays `pending` (and
 * counts against the balance) until staff confirm it against the bank statement.
 */
export async function submitBookingTransfer(
	input: BookingPayInput & { bankAccountId: number; receiptFile: string; reference?: string }
) {
	await checkBookingPayable(input);
	await assertAccount(input.bankAccountId);

	await db.insert(bookingPayments).values({
		weddingPlanId: input.weddingPlanId,
		bookingId: input.booking.id,
		payerId: input.payer.id,
		payeeVendorId: input.booking.vendorId,
		amount: fromMoney(input.amount),
		currency: 'ETB',
		paymentMethod: 'bank_transfer',
		paymentType: input.paymentType,
		status: 'pending',
		transactionReference: newTxRef('booking', input.booking.id),
		bankAccountId: input.bankAccountId,
		receiptFile: input.receiptFile,
		verifyPayload: input.reference ? `Customer reference: ${input.reference}`.slice(0, 2000) : null
	});

	await notifyAdmins({
		type: 'payment_review',
		title: 'Transfer receipt to review',
		body: `${input.payer.name} uploaded a receipt for ${formatETB(input.amount)} (booking #${input.booking.id}).`,
		link: '/admin/payments'
	});
}

/** Tells the couple and the vendor that a booking payment has been confirmed. */
async function announceBookingPaid(paymentId: number) {
	const [row] = await db
		.select({
			amount: bookingPayments.amount,
			payerId: bookingPayments.payerId,
			vendorUserId: vendors.userId,
			businessName: vendors.businessName
		})
		.from(bookingPayments)
		.leftJoin(vendors, eq(vendors.id, bookingPayments.payeeVendorId))
		.where(eq(bookingPayments.id, paymentId));
	if (!row) return;
	const amount = formatETB(toMoney(row.amount));
	await notify(row.payerId, {
		type: 'payment_confirmed',
		title: 'Payment confirmed',
		body: `Your payment of ${amount} to ${row.businessName ?? 'your vendor'} has been confirmed.`,
		link: '/wedding/bookings'
	});
	await notify(row.vendorUserId, {
		type: 'payment_received',
		title: 'Payment received',
		body: `A couple's payment of ${amount} has been confirmed and credited to your wallet (less commission).`,
		link: '/vendor-dashboard/payments'
	});
}

// ---------------------------------------------------------------------------
// Plan payments
// ---------------------------------------------------------------------------

export type CouponQuote = { couponId: number; code: string; discount: number; total: number };

/** Prices a plan with a coupon code, or explains why the code doesn't apply. */
export async function quoteCoupon(code: string, price: number): Promise<CouponQuote> {
	const [coupon] = await db
		.select()
		.from(coupons)
		.where(
			and(
				eq(coupons.code, code.trim().toUpperCase()),
				eq(coupons.isActive, true),
				isNull(coupons.deletedAt)
			)
		)
		.limit(1);

	if (!coupon) throw new PaymentRefused(m.srv_coupon_invalid());
	if (coupon.expiresAt && coupon.expiresAt < new Date()) {
		throw new PaymentRefused(m.srv_coupon_expired());
	}
	if (coupon.maxUses != null && coupon.usesCount >= coupon.maxUses) {
		throw new PaymentRefused(m.srv_coupon_used());
	}

	const value = toMoney(coupon.value);
	const raw = coupon.type === 'percent' ? (price * Math.min(value, 100)) / 100 : value;
	const discount = Math.min(price, Math.round(raw * 100) / 100);
	return {
		couponId: coupon.id,
		code: coupon.code,
		discount,
		total: Math.round((price - discount) * 100) / 100
	};
}

export type PlanPayInput = {
	coupleId: number;
	planId: number;
	payer: { id: string; name: string; email: string; phone?: string | null };
	couponCode?: string | null;
};

/** The live couple plan and its price after any coupon, from the database only. */
async function pricePlan(input: PlanPayInput) {
	const [plan] = await db
		.select()
		.from(subscriptionPlans)
		.where(
			and(
				eq(subscriptionPlans.id, input.planId),
				eq(subscriptionPlans.audience, 'couple'),
				eq(subscriptionPlans.isActive, true),
				isNull(subscriptionPlans.deletedAt)
			)
		)
		.limit(1);
	if (!plan) throw new PaymentRefused(m.srv_plan_unavailable());

	const price = toMoney(plan.price);
	if (price <= 0) throw new PaymentRefused("That plan is free — there's nothing to pay.");

	const quote = input.couponCode ? await quoteCoupon(input.couponCode, price) : null;
	return { plan, price, quote, total: quote ? quote.total : price };
}

export type PlanStart = { kind: 'checkout'; url: string } | { kind: 'activated' };

/**
 * Starts paying for a plan. A coupon that covers the whole price activates it straight away;
 * otherwise this returns Chapa's checkout URL.
 */
export async function startPlanChapa(input: PlanPayInput, origin: string): Promise<PlanStart> {
	const { plan, quote, total } = await pricePlan(input);

	if (total <= 0) {
		const [row] = await db
			.insert(payments)
			.values({
				coupleId: input.coupleId,
				subscriptionPlanId: plan.id,
				amount: '0.00',
				couponId: quote?.couponId ?? null,
				discountAmount: fromMoney(quote?.discount ?? 0),
				status: 'pending',
				transactionRef: newTxRef('plan', input.coupleId)
			})
			.$returningId();
		await settlePlan(row.id, { verifyPayload: 'Fully covered by coupon' });
		return { kind: 'activated' };
	}

	const txRef = newTxRef('plan', input.coupleId);
	await db.insert(payments).values({
		coupleId: input.coupleId,
		subscriptionPlanId: plan.id,
		amount: fromMoney(total),
		currency: 'ETB',
		paymentMethod: 'chapa',
		couponId: quote?.couponId ?? null,
		discountAmount: fromMoney(quote?.discount ?? 0),
		status: 'pending',
		transactionRef: txRef
	});

	try {
		const url = await initializeTransaction({
			title: 'Leora Events',
			amount: total,
			name: input.payer.name,
			email: input.payer.email,
			phone: input.payer.phone,
			txRef,
			...callbackUrls(origin, txRef),
			description: `Upgrade to ${plan.name}`
		});
		await db.update(payments).set({ checkoutUrl: url }).where(eq(payments.transactionRef, txRef));
		return { kind: 'checkout', url };
	} catch (err) {
		await db
			.update(payments)
			.set({ status: 'failed', verifyPayload: String((err as Error).message).slice(0, 2000) })
			.where(and(eq(payments.transactionRef, txRef), eq(payments.status, 'pending')));
		throw new PaymentStartError(err);
	}
}

/** A plan paid by bank transfer: the receipt waits for staff, the plan activates on confirm. */
export async function submitPlanTransfer(
	input: PlanPayInput & { bankAccountId: number; receiptFile: string; reference?: string }
) {
	const { plan, quote, total } = await pricePlan(input);
	if (total <= 0) throw new PaymentRefused(m.srv_plan_covered());
	await assertAccount(input.bankAccountId);

	await db.insert(payments).values({
		coupleId: input.coupleId,
		subscriptionPlanId: plan.id,
		amount: fromMoney(total),
		currency: 'ETB',
		paymentMethod: 'bank_transfer',
		couponId: quote?.couponId ?? null,
		discountAmount: fromMoney(quote?.discount ?? 0),
		status: 'pending',
		transactionRef: newTxRef('plan', input.coupleId),
		bankAccountId: input.bankAccountId,
		receiptFile: input.receiptFile,
		verifyPayload: input.reference ? `Customer reference: ${input.reference}`.slice(0, 2000) : null
	});

	await notifyAdmins({
		type: 'payment_review',
		title: 'Transfer receipt to review',
		body: `${input.payer.name} uploaded a receipt for ${formatETB(total)} (${plan.name} plan).`,
		link: '/admin/payments'
	});
}

/**
 * Marks a plan payment completed and activates its plan, in one transaction under a row lock,
 * so however many callers race here the plan is activated once. Returns false if it was not
 * pending (already settled, or failed).
 */
export async function settlePlan(
	paymentId: number,
	extra: Partial<typeof payments.$inferInsert> = {}
): Promise<boolean> {
	const settled = await db.transaction(async (tx) => {
		const [p] = await tx.select().from(payments).where(eq(payments.id, paymentId)).for('update');
		if (!p || p.status !== 'pending' || !p.coupleId || !p.subscriptionPlanId) return null;

		const now = new Date();
		const activated = await activateSubscription(p.coupleId, p.subscriptionPlanId, tx);
		await tx
			.update(payments)
			.set({
				status: 'completed',
				paidAt: now,
				verifiedAt: now,
				subscriptionId: activated?.subscriptionId ?? null,
				...extra
			})
			.where(eq(payments.id, p.id));

		if (p.couponId) {
			await tx
				.update(coupons)
				.set({ usesCount: sql`${coupons.usesCount} + 1` })
				.where(eq(coupons.id, p.couponId));
		}
		return { coupleId: p.coupleId, planName: activated?.plan.name ?? 'your plan' };
	});

	if (settled) {
		const [couple] = await db
			.select({ id: couples.partner1UserId })
			.from(couples)
			.where(eq(couples.id, settled.coupleId));
		await notify(couple?.id, {
			type: 'plan_activated',
			title: 'Your plan is active',
			body: `Thank you! ${settled.planName} is now active on your account.`,
			link: '/wedding'
		});
	}
	return !!settled;
}

// ---------------------------------------------------------------------------
// Vendor plans
// ---------------------------------------------------------------------------

export type VendorPlanInput = {
	vendorId: number;
	planId: number;
	payer: { id: string; name: string; email: string; phone?: string | null };
};

async function priceVendorPlan(planId: number) {
	const [plan] = await db
		.select()
		.from(subscriptionPlans)
		.where(
			and(
				eq(subscriptionPlans.id, planId),
				eq(subscriptionPlans.audience, 'vendor'),
				eq(subscriptionPlans.isActive, true),
				isNull(subscriptionPlans.deletedAt)
			)
		)
		.limit(1);
	if (!plan) throw new PaymentRefused(m.srv_plan_unavailable());
	return { plan, price: toMoney(plan.price) };
}

/** Starts paying for a vendor plan; a free plan is activated straight away. */
export async function startVendorPlanChapa(
	input: VendorPlanInput,
	origin: string
): Promise<PlanStart> {
	const { plan, price } = await priceVendorPlan(input.planId);
	const txRef = newTxRef('vendor_plan', input.vendorId);

	if (price <= 0) {
		const [row] = await db
			.insert(payments)
			.values({
				vendorId: input.vendorId,
				subscriptionPlanId: plan.id,
				amount: '0.00',
				status: 'pending',
				transactionRef: txRef
			})
			.$returningId();
		await settleVendorPlan(row.id, { verifyPayload: 'Free plan' });
		return { kind: 'activated' };
	}

	await db.insert(payments).values({
		vendorId: input.vendorId,
		subscriptionPlanId: plan.id,
		amount: fromMoney(price),
		currency: 'ETB',
		paymentMethod: 'chapa',
		status: 'pending',
		transactionRef: txRef
	});
	try {
		const url = await initializeTransaction({
			title: 'Leora Events',
			amount: price,
			name: input.payer.name,
			email: input.payer.email,
			phone: input.payer.phone,
			txRef,
			...callbackUrls(origin, txRef),
			description: `${plan.name} vendor plan`
		});
		await db.update(payments).set({ checkoutUrl: url }).where(eq(payments.transactionRef, txRef));
		return { kind: 'checkout', url };
	} catch (err) {
		await db
			.update(payments)
			.set({ status: 'failed', verifyPayload: String((err as Error).message).slice(0, 2000) })
			.where(and(eq(payments.transactionRef, txRef), eq(payments.status, 'pending')));
		throw new PaymentStartError(err);
	}
}

export async function submitVendorPlanTransfer(
	input: VendorPlanInput & { bankAccountId: number; receiptFile: string; reference?: string }
) {
	const { plan, price } = await priceVendorPlan(input.planId);
	if (price <= 0) throw new PaymentRefused(m.srv_plan_free());
	await assertAccount(input.bankAccountId);
	await db.insert(payments).values({
		vendorId: input.vendorId,
		subscriptionPlanId: plan.id,
		amount: fromMoney(price),
		currency: 'ETB',
		paymentMethod: 'bank_transfer',
		status: 'pending',
		transactionRef: newTxRef('vendor_plan', input.vendorId),
		bankAccountId: input.bankAccountId,
		receiptFile: input.receiptFile,
		verifyPayload: input.reference ? `Customer reference: ${input.reference}`.slice(0, 2000) : null
	});
	await notifyAdmins({
		type: 'payment_review',
		title: 'Transfer receipt to review',
		body: `${input.payer.name} uploaded a receipt for ${formatETB(price)} (${plan.name} vendor plan).`,
		link: '/admin/payments'
	});
}

/** Marks a vendor plan payment completed and activates the plan, once, under a row lock. */
export async function settleVendorPlan(
	paymentId: number,
	extra: Partial<typeof payments.$inferInsert> = {}
): Promise<boolean> {
	const settled = await db.transaction(async (tx) => {
		const [p] = await tx.select().from(payments).where(eq(payments.id, paymentId)).for('update');
		if (!p || p.status !== 'pending' || !p.vendorId || !p.subscriptionPlanId) return null;
		const activated = await activateVendorPlan(p.vendorId, p.subscriptionPlanId, tx);
		const now = new Date();
		await tx
			.update(payments)
			.set({ status: 'completed', paidAt: now, verifiedAt: now, ...extra })
			.where(eq(payments.id, p.id));
		return {
			vendorId: p.vendorId,
			planName: activated?.planName ?? 'your plan',
			endsAt: activated?.endsAt
		};
	});
	if (settled) {
		const [v] = await db
			.select({ userId: vendors.userId })
			.from(vendors)
			.where(eq(vendors.id, settled.vendorId));
		await notify(v?.userId, {
			type: 'plan_activated',
			title: 'Your vendor plan is active',
			body: `${settled.planName} is active${settled.endsAt ? ` until ${settled.endsAt}` : ''}.`,
			link: '/vendor-dashboard/plan'
		});
	}
	return !!settled;
}

// ---------------------------------------------------------------------------
// Settlement: Chapa verify, staff review, reconcile
// ---------------------------------------------------------------------------

export type VerifyOutcome = {
	status: 'paid' | 'failed' | 'pending';
	kind: PaymentKind | null;
	returnPath: string;
	/** Asking again later could change the answer. */
	retryable?: boolean;
};

/** Everything `verify` needs from any table, read the same way. */
async function attemptFor(kind: PaymentKind, txRef: string) {
	if (kind === 'gift') {
		const [r] = await db
			.select({ id: weddingGifts.id, amount: weddingGifts.amount, status: weddingGifts.status })
			.from(weddingGifts)
			.where(eq(weddingGifts.txRef, txRef));
		return r && { ...r, method: 'chapa' as const, settled: r.status === 'paid' };
	}
	if (kind === 'booking') {
		const [r] = await db
			.select({
				id: bookingPayments.id,
				amount: bookingPayments.amount,
				method: bookingPayments.paymentMethod,
				status: bookingPayments.status
			})
			.from(bookingPayments)
			.where(eq(bookingPayments.transactionReference, txRef));
		return r && { ...r, settled: r.status === 'confirmed' };
	}
	const [r] = await db
		.select({
			id: payments.id,
			amount: payments.amount,
			method: payments.paymentMethod,
			status: payments.status
		})
		.from(payments)
		.where(eq(payments.transactionRef, txRef));
	return r && { ...r, settled: r.status === 'completed' };
}

async function markFailed(kind: PaymentKind, id: number, payload: string) {
	const values = { status: 'failed' as const, verifyPayload: payload.slice(0, 2000) };
	if (kind === 'gift') {
		await db
			.update(weddingGifts)
			.set(values)
			.where(and(eq(weddingGifts.id, id), eq(weddingGifts.status, 'pending')));
	} else if (kind === 'booking') {
		await db
			.update(bookingPayments)
			.set(values)
			.where(and(eq(bookingPayments.id, id), eq(bookingPayments.status, 'pending')));
	} else {
		await db
			.update(payments)
			.set(values)
			.where(and(eq(payments.id, id), eq(payments.status, 'pending')));
	}
}

/**
 * Asks Chapa about one attempt and, if it genuinely went through for what we asked (our
 * reference, ETB, at least the amount), settles it — exactly once, however many callers race
 * here: the settlement functions lock the row and only act on `pending`.
 */
export async function verify(txRef: string): Promise<VerifyOutcome> {
	const kind = kindOf(txRef);
	const returnPath = kind === 'gift' ? await giftReturnPath(txRef) : kind ? RETURN_PATH[kind] : '/';
	if (!kind) return { status: 'pending', kind, returnPath, retryable: false };

	const row = await attemptFor(kind, txRef);
	if (!row || row.method !== 'chapa')
		return { status: 'pending', kind, returnPath, retryable: false };
	if (row.settled) return { status: 'paid', kind, returnPath };
	if (row.status !== 'pending') return { status: 'failed', kind, returnPath };

	let result;
	try {
		result = await verifyTransaction(txRef);
	} catch (err) {
		console.error(`Chapa verify failed for ${txRef}:`, err);
		return { status: 'pending', kind, returnPath, retryable: true };
	}

	if (!result.paid) {
		if (result.failed) {
			await markFailed(kind, row.id, result.raw);
			return { status: 'failed', kind, returnPath };
		}
		return { status: 'pending', kind, returnPath, retryable: true };
	}

	const expected = toMoney(row.amount);
	const mismatch =
		(result.txRef && result.txRef !== txRef && 'reference') ||
		(result.currency && result.currency !== 'ETB' && 'currency') ||
		((!Number.isFinite(result.amount) || result.amount + TOLERANCE < expected) && 'amount');
	if (mismatch) {
		// Paid, but not what we asked for. Never settled automatically; staff look at it.
		console.error(`Chapa ${mismatch} mismatch on ${txRef}: ${result.raw}`);
		return { status: 'pending', kind, returnPath, retryable: false };
	}

	const extra = { verifyPayload: result.raw };
	if (kind === 'gift') {
		await settleGift(row.id, result.raw);
	} else if (kind === 'booking') {
		const outcome = await confirmBookingPayment(row.id, { extra });
		if (outcome.ok) await announceBookingPaid(row.id);
	} else if (kind === 'vendor_plan') {
		await settleVendorPlan(row.id, extra);
	} else {
		await settlePlan(row.id, extra);
	}
	return { status: 'paid', kind, returnPath };
}

/** Staff checked a transfer receipt against the statement and the money is there. */
export async function confirmTransfer(kind: PaymentKind, id: number, reviewerId: string) {
	if (kind === 'gift') throw new PaymentRefused('Gifts are paid through Chapa only.');
	if (kind === 'booking') {
		const [row] = await db
			.select({ method: bookingPayments.paymentMethod })
			.from(bookingPayments)
			.where(eq(bookingPayments.id, id));
		if (!row) throw new PaymentRefused('Payment not found.');
		if (row.method === 'chapa') {
			throw new PaymentRefused('Chapa payments settle through Chapa. Use "Check with Chapa".');
		}
		const outcome = await confirmBookingPayment(id, { extra: { reviewedBy: reviewerId } });
		if (!outcome.ok) throw new PaymentRefused('This payment is no longer pending.');
		await announceBookingPaid(id);
		return outcome;
	}

	const [row] = await db
		.select({ method: payments.paymentMethod })
		.from(payments)
		.where(eq(payments.id, id));
	if (!row) throw new PaymentRefused('Payment not found.');
	if (row.method === 'chapa') {
		throw new PaymentRefused('Chapa payments settle through Chapa. Use "Check with Chapa".');
	}
	const settle = kind === 'vendor_plan' ? settleVendorPlan : settlePlan;
	if (!(await settle(id, { reviewedBy: reviewerId }))) {
		throw new PaymentRefused('This payment is no longer pending.');
	}
}

/**
 * Staff could not match a receipt (wrong amount, not on the statement). The payment fails with
 * the reason, which the couple is told, and the balance is freed so they can pay again.
 */
export async function rejectTransfer(
	kind: PaymentKind,
	id: number,
	reason: string,
	reviewerId: string
) {
	if (kind === 'gift') throw new PaymentRefused('Gifts are paid through Chapa only.');
	const values = {
		status: 'failed' as const,
		verifyPayload: `Rejected: ${reason}`.slice(0, 2000),
		reviewedBy: reviewerId
	};
	let payerId: string | null = null;

	if (kind === 'booking') {
		const res = await db
			.update(bookingPayments)
			.set(values)
			.where(
				and(
					eq(bookingPayments.id, id),
					eq(bookingPayments.status, 'pending'),
					inArray(bookingPayments.paymentMethod, ['bank_transfer', 'cash', 'mobile_money', 'card'])
				)
			);
		if (!res[0].affectedRows) throw new PaymentRefused('This payment is no longer pending.');
		const [row] = await db
			.select({ payerId: bookingPayments.payerId })
			.from(bookingPayments)
			.where(eq(bookingPayments.id, id));
		payerId = row?.payerId ?? null;
	} else {
		const res = await db
			.update(payments)
			.set(values)
			.where(
				and(
					eq(payments.id, id),
					eq(payments.status, 'pending'),
					eq(payments.paymentMethod, 'bank_transfer')
				)
			);
		if (!res[0].affectedRows) throw new PaymentRefused('This payment is no longer pending.');
		const [row] = await db
			.select({ p1: couples.partner1UserId, vendorUser: vendors.userId })
			.from(payments)
			.leftJoin(couples, eq(couples.id, payments.coupleId))
			.leftJoin(vendors, eq(vendors.id, payments.vendorId))
			.where(eq(payments.id, id));
		payerId = row?.p1 ?? row?.vendorUser ?? null;
	}

	await notify(payerId, {
		type: 'payment_rejected',
		title: 'We could not confirm your transfer',
		body: `Reason: ${reason}. Please check the details and submit the payment again.`,
		link: RETURN_PATH[kind]
	});
}

/**
 * Verifies Chapa attempts nobody came back for: `pending` and older than ten minutes. After a
 * day without an answer the checkout session is dead, so the attempt is marked failed.
 * Bounded per run.
 */
export async function reconcileStale(limit = 20): Promise<number> {
	const tenMinutesAgo = new Date(Date.now() - 10 * 60_000);
	const dayAgo = new Date(Date.now() - 24 * 60 * 60_000);

	const [bookingRefs, planRefs, giftRefs] = await Promise.all([
		db
			.select({ txRef: bookingPayments.transactionReference, createdAt: bookingPayments.createdAt })
			.from(bookingPayments)
			.where(
				and(
					eq(bookingPayments.paymentMethod, 'chapa'),
					eq(bookingPayments.status, 'pending'),
					lt(bookingPayments.createdAt, tenMinutesAgo)
				)
			)
			.orderBy(asc(bookingPayments.id))
			.limit(limit),
		db
			.select({ txRef: payments.transactionRef, createdAt: payments.createdAt })
			.from(payments)
			.where(
				and(
					eq(payments.paymentMethod, 'chapa'),
					eq(payments.status, 'pending'),
					lt(payments.createdAt, tenMinutesAgo)
				)
			)
			.orderBy(asc(payments.id))
			.limit(limit),
		db
			.select({ txRef: weddingGifts.txRef, createdAt: weddingGifts.createdAt })
			.from(weddingGifts)
			.where(and(eq(weddingGifts.status, 'pending'), lt(weddingGifts.createdAt, tenMinutesAgo)))
			.orderBy(asc(weddingGifts.id))
			.limit(limit)
	]);

	let settled = 0;
	for (const { txRef, createdAt } of [...bookingRefs, ...planRefs, ...giftRefs]) {
		if (!txRef) continue;
		const outcome = await verify(txRef);
		if (outcome.status === 'paid') settled++;
		if (outcome.status === 'pending' && outcome.retryable && createdAt < dayAgo) {
			const kind = kindOf(txRef)!;
			const row = await attemptFor(kind, txRef);
			if (row) await markFailed(kind, row.id, 'Abandoned: no payment after 24 hours');
		}
	}
	return settled;
}
