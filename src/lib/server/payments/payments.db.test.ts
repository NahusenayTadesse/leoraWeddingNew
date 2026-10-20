import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import {
	bookingPayments,
	coupons,
	paymentCommissions,
	payments,
	refunds,
	subscriptions,
	vendorPromotions,
	vendorSubscriptions,
	vendorWallets,
	walletTransactions
} from '$lib/server/db/schema';
import { approveRefund } from '$lib/server/bookingPayments';
import {
	makeBankAccount,
	makeBooking,
	makeCoupleWithWedding,
	makeCoupon,
	makeVendor,
	resetDb,
	setCommission,
	stubChapa
} from '$lib/server/testing/db';
import {
	bookingBalance,
	confirmTransfer,
	PaymentRefused,
	quoteCoupon,
	rejectTransfer,
	settlePlan,
	startBookingChapa,
	startPlanChapa,
	startVendorPlanChapa,
	submitBookingTransfer,
	verify
} from './index';

const ORIGIN = 'http://localhost:5173';

async function setup(agreed = 30000) {
	const vendor = await makeVendor();
	const couple = await makeCoupleWithWedding();
	const booking = await makeBooking(couple.weddingPlanId, vendor.id, agreed);
	const accountId = await makeBankAccount();
	const payer = { id: couple.userId, name: 'Selam Dawit', email: couple.user.email, phone: '0911223344' };
	const pay = (amount: number, extra: Partial<Parameters<typeof submitBookingTransfer>[0]> = {}) =>
		submitBookingTransfer({
			booking,
			weddingPlanId: couple.weddingPlanId,
			payer,
			amount,
			paymentType: 'advance',
			bankAccountId: accountId,
			receiptFile: 'receipt.png',
			...extra
		});
	return { vendor, couple, booking, accountId, payer, pay };
}

const walletOf = async (vendorId: number) =>
	Number((await db.select().from(vendorWallets).where(eq(vendorWallets.vendorId, vendorId)))[0]?.balance ?? 0);

const lastBookingPayment = async () =>
	(await db.select().from(bookingPayments).orderBy(bookingPayments.id)).at(-1)!;

let chapa: ReturnType<typeof stubChapa>;
beforeEach(async () => {
	await resetDb();
	await setCommission('percentage', 10);
	chapa = stubChapa();
});
afterEach(() => chapa.restore());

describe('bank transfers on bookings', () => {
	it('confirming a receipt takes commission, credits the wallet and writes the ledger', async () => {
		const { vendor, pay, couple } = await setup();
		await pay(10000);
		const p = await lastBookingPayment();

		await confirmTransfer('booking', p.id, couple.userId);

		const [row] = await db.select().from(bookingPayments).where(eq(bookingPayments.id, p.id));
		expect(row.status).toBe('confirmed');
		const [commission] = await db.select().from(paymentCommissions);
		expect(Number(commission.commissionAmount)).toBe(1000);
		expect(Number(commission.netAmount)).toBe(9000);
		expect(await walletOf(vendor.id)).toBe(9000);
		const ledger = await db.select().from(walletTransactions);
		expect(ledger.map((l) => [l.transactionType, Number(l.amount)])).toEqual([
			['credit', 10000],
			['commission', 1000]
		]);
	});

	it('a receipt cannot be confirmed twice, even concurrently', async () => {
		const { vendor, pay, couple } = await setup();
		await pay(10000);
		const p = await lastBookingPayment();

		const results = await Promise.allSettled([
			confirmTransfer('booking', p.id, couple.userId),
			confirmTransfer('booking', p.id, couple.userId)
		]);
		expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
		expect(await walletOf(vendor.id)).toBe(9000);
		await expect(confirmTransfer('booking', p.id, couple.userId)).rejects.toThrow(PaymentRefused);
	});

	it('pending receipts count against the balance and a rejection frees it', async () => {
		const { booking, pay, couple } = await setup(30000);
		await pay(20000);
		expect((await bookingBalance(booking.id)).due).toBe(10000);
		await expect(pay(15000)).rejects.toThrow(/between 1 and/);

		const p = await lastBookingPayment();
		await rejectTransfer('booking', p.id, 'Not on statement', couple.userId);
		expect((await bookingBalance(booking.id)).due).toBe(30000);
	});

	it('refuses to take payment before the vendor confirms the booking', async () => {
		const vendor = await makeVendor();
		const couple = await makeCoupleWithWedding();
		const booking = await makeBooking(couple.weddingPlanId, vendor.id, 5000, 'pending');
		const accountId = await makeBankAccount();
		await expect(
			submitBookingTransfer({
				booking,
				weddingPlanId: couple.weddingPlanId,
				payer: { id: couple.userId, name: 'x', email: 'x@example.com' },
				amount: 1000,
				paymentType: 'advance',
				bankAccountId: accountId,
				receiptFile: 'r.png'
			})
		).rejects.toThrow(/vendor has confirmed/);
	});

	it('refuses an account that is not one of ours', async () => {
		const { pay } = await setup();
		await expect(pay(1000, { bankAccountId: 999 })).rejects.toThrow(/listed bank accounts/);
	});
});

describe('Chapa on bookings', () => {
	async function startChapa(amount = 5000) {
		const s = await setup();
		const url = await startBookingChapa(
			{ booking: s.booking, weddingPlanId: s.couple.weddingPlanId, payer: s.payer, amount, paymentType: 'advance' },
			ORIGIN
		);
		const p = await lastBookingPayment();
		return { ...s, url, txRef: p.transactionReference! };
	}

	it('stays pending until Chapa says it is paid, then settles exactly once', async () => {
		const { txRef, vendor, url } = await startChapa(5000);
		expect(url).toContain('checkout.chapa.co');

		expect((await verify(txRef)).status).toBe('pending');
		expect(await walletOf(vendor.id)).toBe(0);

		chapa.paid(txRef, 5000);
		const outcomes = await Promise.all([verify(txRef), verify(txRef), verify(txRef)]);
		expect(outcomes.every((o) => o.status === 'paid')).toBe(true);
		expect(await walletOf(vendor.id)).toBe(4500);
		expect(await db.select().from(paymentCommissions)).toHaveLength(1);
	});

	it('never settles a payment for less than was asked', async () => {
		const { txRef, vendor } = await startChapa(5000);
		chapa.paid(txRef, 50);
		expect((await verify(txRef)).status).toBe('pending');
		expect(await walletOf(vendor.id)).toBe(0);
	});

	it('marks a definite failure failed, but leaves an unreachable Chapa pending', async () => {
		const a = await startChapa(1000);
		chapa.down(a.txRef);
		expect(await verify(a.txRef)).toMatchObject({ status: 'pending', retryable: true });
		chapa.failed(a.txRef);
		expect((await verify(a.txRef)).status).toBe('failed');
		const [row] = await db.select().from(bookingPayments).where(eq(bookingPayments.transactionReference, a.txRef));
		expect(row.status).toBe('failed');
	});

	it('ignores references it did not issue', async () => {
		expect((await verify('bk-1-nottherealone')).status).toBe('pending');
		expect((await verify('zz-unknown')).kind).toBeNull();
	});
});

describe('refunds', () => {
	it('a partial refund keeps the payment confirmed and debits the vendor share', async () => {
		const { vendor, pay, couple, booking } = await setup(30000);
		await pay(10000);
		const p = await lastBookingPayment();
		await confirmTransfer('booking', p.id, couple.userId);

		const [r] = await db
			.insert(refunds)
			.values({ bookingPaymentId: p.id, amount: '3000.00', reason: 'late', status: 'pending' })
			.$returningId();
		const result = await approveRefund(r.id);
		expect(result).toEqual({ ok: true, debited: 2700 });
		expect(await walletOf(vendor.id)).toBe(6300);
		const [row] = await db.select().from(bookingPayments).where(eq(bookingPayments.id, p.id));
		expect(row.status).toBe('confirmed');
		expect((await bookingBalance(booking.id)).paid).toBe(7000);

		expect(await approveRefund(r.id)).toMatchObject({ ok: false });
	});

	it('a full refund marks the payment refunded', async () => {
		const { pay, couple } = await setup(30000);
		await pay(10000);
		const p = await lastBookingPayment();
		await confirmTransfer('booking', p.id, couple.userId);
		const [r] = await db
			.insert(refunds)
			.values({ bookingPaymentId: p.id, amount: '10000.00', reason: 'cancelled', status: 'pending' })
			.$returningId();
		await approveRefund(r.id);
		const [row] = await db.select().from(bookingPayments).where(eq(bookingPayments.id, p.id));
		expect(row.status).toBe('refunded');
	});
});

describe('plans and coupons', () => {
	it('prices coupons: percent, flat, expired and used up', async () => {
		await makeCoupon('HALF', 'percent', 50);
		await makeCoupon('FLAT1000', 'flat', 1000);
		await makeCoupon('GONE', 'flat', 100, 1);
		await db.update(coupons).set({ usesCount: 1 }).where(eq(coupons.code, 'GONE'));
		expect(await quoteCoupon('half', 2499)).toMatchObject({ discount: 1249.5, total: 1249.5 });
		expect(await quoteCoupon('FLAT1000', 500)).toMatchObject({ discount: 500, total: 0 });
		await expect(quoteCoupon('GONE', 2499)).rejects.toThrow(/fully used/);
		await expect(quoteCoupon('NOPE', 2499)).rejects.toThrow(/not valid/);
	});

	it('a coupon covering the whole price activates the plan without Chapa and is counted', async () => {
		const couple = await makeCoupleWithWedding();
		await makeCoupon('FREE', 'percent', 100);
		const started = await startPlanChapa(
			{ coupleId: couple.coupleId, planId: 2, payer: { id: couple.userId, name: 'S', email: 'a@example.com' }, couponCode: 'FREE' },
			ORIGIN
		);
		expect(started.kind).toBe('activated');
		const subs = await db.select().from(subscriptions).where(eq(subscriptions.coupleId, couple.coupleId));
		expect(subs.filter((s) => s.status === 'active')).toHaveLength(1);
		const [c] = await db.select().from(coupons).where(eq(coupons.code, 'FREE'));
		expect(c.usesCount).toBe(1);
	});

	it('settling a plan twice activates it once', async () => {
		const couple = await makeCoupleWithWedding();
		const started = await startPlanChapa(
			{ coupleId: couple.coupleId, planId: 2, payer: { id: couple.userId, name: 'S', email: 'a@example.com' } },
			ORIGIN
		);
		expect(started.kind).toBe('checkout');
		const [p] = await db.select().from(payments);
		expect(Number(p.amount)).toBe(2499);
		expect(p.subscriptionPlanId).toBe(2);

		const results = await Promise.all([settlePlan(p.id), settlePlan(p.id)]);
		expect(results.filter(Boolean)).toHaveLength(1);
		expect(await db.select().from(subscriptions)).toHaveLength(1);
	});

	it('a vendor buying the Featured plan gets a featured promotion for the period', async () => {
		const vendor = await makeVendor();
		const started = await startVendorPlanChapa(
			{ vendorId: vendor.id, planId: 5, payer: { id: vendor.userId, name: 'V', email: 'v@example.com' } },
			ORIGIN
		);
		expect(started.kind).toBe('checkout');
		const [p] = await db.select().from(payments);
		chapa.paid(p.transactionRef!, 4500);
		expect((await verify(p.transactionRef!)).status).toBe('paid');

		const [sub] = await db.select().from(vendorSubscriptions);
		expect(sub).toMatchObject({ vendorId: vendor.id, planId: 5, status: 'active' });
		const [promo] = await db.select().from(vendorPromotions);
		expect(promo).toMatchObject({ vendorId: vendor.id, type: 'featured', endsAt: sub.endsAt });
	});
});
