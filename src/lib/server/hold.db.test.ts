import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import {
	bookingPayments,
	disputes,
	notifications,
	refunds,
	vendorBookings,
	vendors,
	vendorWallets,
	walletTransactions
} from '$lib/server/db/schema';
import { cancelBooking } from '$lib/server/cancellations';
import { remindBalancesDue } from '$lib/server/jobs';
import {
	approveRefund,
	completeBooking,
	releaseBookingNow,
	releaseHeldFunds
} from '$lib/server/bookingPayments';
import { confirmTransfer, submitBookingTransfer } from '$lib/server/payments';
import { isoDay } from '$lib/server/availability';
import {
	makeBankAccount,
	makeBooking,
	makeCoupleWithWedding,
	makeVendor,
	resetDb,
	setCommission,
	stubChapa
} from '$lib/server/testing/db';

const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 3600_000);
const daysFromNow = (n: number) => daysAgo(-n);

/** A confirmed booking with one confirmed 10,000 ETB transfer (10% commission → 9,000 net). */
async function paidBooking() {
	const vendor = await makeVendor();
	const couple = await makeCoupleWithWedding();
	const booking = await makeBooking(couple.weddingPlanId, vendor.id, 30000);
	await submitBookingTransfer({
		booking,
		weddingPlanId: couple.weddingPlanId,
		payer: { id: couple.userId, name: 'Selam Dawit', email: couple.user.email },
		amount: 10000,
		paymentType: 'advance',
		bankAccountId: await makeBankAccount(),
		receiptFile: 'receipt.png'
	});
	const [payment] = await db.select().from(bookingPayments);
	await confirmTransfer('booking', payment.id, couple.userId);
	return { vendor, couple, booking, paymentId: payment.id };
}

const wallet = async (vendorId: number) => {
	const [w] = await db.select().from(vendorWallets).where(eq(vendorWallets.vendorId, vendorId));
	return { available: Number(w?.balance ?? 0), held: Number(w?.heldBalance ?? 0) };
};

const setEvent = (bookingId: number, day: Date) =>
	db
		.update(vendorBookings)
		.set({ eventDate: isoDay(day) })
		.where(eq(vendorBookings.id, bookingId));

const agePayment = (paymentId: number, days: number) =>
	db
		.update(bookingPayments)
		.set({ paidAt: daysAgo(days) })
		.where(eq(bookingPayments.id, paymentId));

const bookingStatus = async (id: number) =>
	(await db.select().from(vendorBookings).where(eq(vendorBookings.id, id)))[0].status;

let chapa: ReturnType<typeof stubChapa>;
beforeEach(async () => {
	await resetDb();
	await setCommission('percentage', 10);
	chapa = stubChapa();
});
afterEach(() => chapa.restore());

describe('held vendor money', () => {
	it('a confirmed payment is held, not withdrawable', async () => {
		const { vendor } = await paidBooking();
		expect(await wallet(vendor.id)).toEqual({ available: 0, held: 9000 });
	});

	it('the couple cannot confirm delivery before the event date', async () => {
		const { booking, couple } = await paidBooking();
		const outcome = await completeBooking(booking.id, couple.weddingPlanId, couple.userId);
		expect(outcome).toEqual({ ok: false, reason: 'too_early' });
	});

	it('confirming delivery completes the booking and releases the money at once', async () => {
		const { vendor, booking, couple, paymentId } = await paidBooking();
		await setEvent(booking.id, new Date());

		const outcome = await completeBooking(booking.id, couple.weddingPlanId, couple.userId);
		expect(outcome).toEqual({ ok: true, released: 9000, heldByDispute: false });
		expect(await bookingStatus(booking.id)).toBe('completed');
		expect(await wallet(vendor.id)).toEqual({ available: 9000, held: 0 });

		const [p] = await db.select().from(bookingPayments).where(eq(bookingPayments.id, paymentId));
		expect(p.releasedAt).not.toBeNull();
		const ledger = await db.select().from(walletTransactions);
		expect(ledger.map((l) => l.transactionType)).toEqual(['credit', 'commission', 'release']);

		// A second confirmation changes nothing.
		expect(await completeBooking(booking.id, couple.weddingPlanId, couple.userId)).toEqual({
			ok: false,
			reason: 'not_confirmed'
		});
		expect(await wallet(vendor.id)).toEqual({ available: 9000, held: 0 });
	});

	it("another couple's wedding cannot complete the booking", async () => {
		const { booking } = await paidBooking();
		await setEvent(booking.id, new Date());
		const other = await makeCoupleWithWedding();
		expect(await completeBooking(booking.id, other.weddingPlanId, other.userId)).toEqual({
			ok: false,
			reason: 'not_found'
		});
	});

	it('an open dispute keeps the money held until it is settled', async () => {
		const { vendor, booking, couple, paymentId } = await paidBooking();
		await setEvent(booking.id, daysAgo(10));
		await agePayment(paymentId, 10);
		const [d] = await db
			.insert(disputes)
			.values({ bookingId: booking.id, raisedBy: 'couple', reason: 'Photographer never came' })
			.$returningId();

		expect(await releaseHeldFunds()).toBe(0);
		expect(await bookingStatus(booking.id)).toBe('confirmed');

		const outcome = await completeBooking(booking.id, couple.weddingPlanId, couple.userId);
		expect(outcome).toEqual({ ok: true, released: 0, heldByDispute: true });
		expect(await wallet(vendor.id)).toEqual({ available: 0, held: 9000 });
		expect(await releaseBookingNow(booking.id)).toMatchObject({ ok: false });

		await db.update(disputes).set({ status: 'resolved' }).where(eq(disputes.id, d.id));
		expect(await releaseHeldFunds()).toBe(1);
		expect(await wallet(vendor.id)).toEqual({ available: 9000, held: 0 });
	});

	it('the daily job completes and releases bookings past the hold window only', async () => {
		const due = await paidBooking();
		await setEvent(due.booking.id, daysAgo(5));
		await agePayment(due.paymentId, 5);

		expect(await releaseHeldFunds()).toBe(1);
		expect(await bookingStatus(due.booking.id)).toBe('completed');
		expect(await wallet(due.vendor.id)).toEqual({ available: 9000, held: 0 });
	});

	it('the job waits while the event is recent', async () => {
		const { vendor, booking, paymentId } = await paidBooking();
		await setEvent(booking.id, daysAgo(1));
		await agePayment(paymentId, 30);

		expect(await releaseHeldFunds()).toBe(0);
		expect(await bookingStatus(booking.id)).toBe('confirmed');
		expect(await wallet(vendor.id)).toEqual({ available: 0, held: 9000 });
	});

	it('a payment made after the event still gets the full window', async () => {
		const { vendor, booking } = await paidBooking(); // paid just now
		await setEvent(booking.id, daysAgo(10));

		expect(await releaseHeldFunds()).toBe(0);
		expect(await bookingStatus(booking.id)).toBe('completed');
		expect(await wallet(vendor.id)).toEqual({ available: 0, held: 9000 });
	});

	it('a refund while held comes out of the hold, and only the rest is released', async () => {
		const { vendor, booking, couple, paymentId } = await paidBooking();
		const [r] = await db
			.insert(refunds)
			.values({ bookingPaymentId: paymentId, amount: '3000.00', reason: 'late', status: 'pending' })
			.$returningId();
		await approveRefund(r.id);
		expect(await wallet(vendor.id)).toEqual({ available: 0, held: 6300 });

		await setEvent(booking.id, new Date());
		await completeBooking(booking.id, couple.weddingPlanId, couple.userId);
		expect(await wallet(vendor.id)).toEqual({ available: 6300, held: 0 });
	});

	it('a refund after release comes out of the withdrawable balance', async () => {
		const { vendor, booking, couple, paymentId } = await paidBooking();
		await setEvent(booking.id, new Date());
		await completeBooking(booking.id, couple.weddingPlanId, couple.userId);
		const [r] = await db
			.insert(refunds)
			.values({ bookingPaymentId: paymentId, amount: '1000.00', reason: 'late', status: 'pending' })
			.$returningId();
		await approveRefund(r.id);
		expect(await wallet(vendor.id)).toEqual({ available: 8100, held: 0 });
	});

	it('a pending refund blocks release', async () => {
		const { vendor, booking, couple, paymentId } = await paidBooking();
		await db
			.insert(refunds)
			.values({ bookingPaymentId: paymentId, amount: '500.00', reason: 'late', status: 'pending' });
		await setEvent(booking.id, new Date());
		const outcome = await completeBooking(booking.id, couple.weddingPlanId, couple.userId);
		expect(outcome).toMatchObject({ ok: true, released: 0 });
		expect(await wallet(vendor.id)).toEqual({ available: 0, held: 9000 });
	});

	it('cancelled bookings are never released by the job, only by staff', async () => {
		const { vendor, booking, paymentId } = await paidBooking();
		await db
			.update(vendorBookings)
			.set({ status: 'cancelled', eventDate: isoDay(daysAgo(10)) })
			.where(eq(vendorBookings.id, booking.id));
		await agePayment(paymentId, 10);

		expect(await releaseHeldFunds()).toBe(0);
		expect(await wallet(vendor.id)).toEqual({ available: 0, held: 9000 });

		expect(await releaseBookingNow(booking.id)).toEqual({ ok: true, released: 9000 });
		expect(await wallet(vendor.id)).toEqual({ available: 9000, held: 0 });
	});
});

describe('cancelling under the vendor policy', () => {
	const setPolicy = (vendorId: number, policy: 'flexible' | 'moderate' | 'strict') =>
		db.update(vendors).set({ cancellationPolicy: policy }).where(eq(vendors.id, vendorId));
	const refundRows = () => db.select().from(refunds);

	it('a couple cancelling early under moderate gets everything back; the vendor keeps nothing', async () => {
		const { vendor, booking, couple, paymentId } = await paidBooking();
		await setPolicy(vendor.id, 'moderate');
		await setEvent(booking.id, daysFromNow(60));

		const outcome = await cancelBooking({
			bookingId: booking.id,
			by: 'couple',
			userId: couple.userId,
			weddingPlanId: couple.weddingPlanId
		});
		expect(outcome).toEqual({ ok: true, refundPercent: 100, refundTotal: 10000 });
		const [r] = await refundRows();
		expect(Number(r.amount)).toBe(10000);

		// Held until staff settle the refund; then nothing is left for the vendor.
		await agePayment(paymentId, 10);
		expect(await releaseHeldFunds()).toBe(0);
		await approveRefund(r.id);
		expect(await releaseHeldFunds()).toBe(0);
		expect(await wallet(vendor.id)).toEqual({ available: 0, held: 0 });
	});

	it('a late cancellation refunds half and releases the vendor’s half once settled', async () => {
		const { vendor, booking, couple, paymentId } = await paidBooking();
		await setPolicy(vendor.id, 'moderate');
		await setEvent(booking.id, daysFromNow(10));

		const outcome = await cancelBooking({
			bookingId: booking.id,
			by: 'couple',
			userId: couple.userId,
			weddingPlanId: couple.weddingPlanId
		});
		expect(outcome).toMatchObject({ ok: true, refundPercent: 50, refundTotal: 5000 });

		await agePayment(paymentId, 10);
		const [r] = await refundRows();
		await approveRefund(r.id);
		expect(await wallet(vendor.id)).toEqual({ available: 0, held: 4500 });
		expect(await releaseHeldFunds()).toBe(1);
		expect(await wallet(vendor.id)).toEqual({ available: 4500, held: 0 });
	});

	it('the vendor cancelling always refunds in full', async () => {
		const { vendor, booking, couple } = await paidBooking();
		await setPolicy(vendor.id, 'strict');
		await setEvent(booking.id, daysFromNow(3));

		const outcome = await cancelBooking({
			bookingId: booking.id,
			by: 'vendor',
			userId: couple.userId,
			reason: 'Double booked',
			vendorId: vendor.id
		});
		expect(outcome).toMatchObject({ ok: true, refundPercent: 100, refundTotal: 10000 });
	});

	it('an earlier refund request is not paid twice', async () => {
		const { vendor, booking, couple, paymentId } = await paidBooking();
		await setPolicy(vendor.id, 'flexible');
		await setEvent(booking.id, daysFromNow(30));
		await db.insert(refunds).values({
			bookingPaymentId: paymentId,
			amount: '2000.00',
			reason: 'late',
			status: 'pending'
		});

		const outcome = await cancelBooking({
			bookingId: booking.id,
			by: 'couple',
			userId: couple.userId,
			weddingPlanId: couple.weddingPlanId
		});
		expect(outcome).toMatchObject({ refundTotal: 8000 });
	});

	it('cannot cancel a completed booking or somebody else’s', async () => {
		const { booking, couple } = await paidBooking();
		const other = await makeCoupleWithWedding();
		expect(
			await cancelBooking({
				bookingId: booking.id,
				by: 'couple',
				userId: other.userId,
				weddingPlanId: other.weddingPlanId
			})
		).toEqual({ ok: false, reason: 'not_found' });

		await setEvent(booking.id, new Date());
		await completeBooking(booking.id, couple.weddingPlanId, couple.userId);
		expect(
			await cancelBooking({
				bookingId: booking.id,
				by: 'couple',
				userId: couple.userId,
				weddingPlanId: couple.weddingPlanId
			})
		).toEqual({ ok: false, reason: 'completed' });
	});
});

describe('balance reminders', () => {
	it('reminds couples three days before the balance is due, and on the day', async () => {
		const { booking } = await paidBooking(); // 30,000 agreed, 10,000 paid; due 14 days before
		await setEvent(booking.id, daysFromNow(17));
		expect(await remindBalancesDue()).toBe(1);
		await setEvent(booking.id, daysFromNow(14));
		expect(await remindBalancesDue()).toBe(1);
		await setEvent(booking.id, daysFromNow(20));
		expect(await remindBalancesDue()).toBe(0);
	});
});

describe('review requests', () => {
	it('the couple is asked for a review when the booking completes', async () => {
		const { booking, couple, vendor } = await paidBooking();
		await setEvent(booking.id, daysAgo(5));
		await releaseHeldFunds();
		const notes = await db.select().from(notifications);
		const ask = notes.find((n) => n.type === 'review_request');
		expect(ask?.userId).toBe(couple.userId);
		expect(ask?.data).toEqual({ link: `/vendors/${vendor.id}?tab=reviews` });
	});
});
