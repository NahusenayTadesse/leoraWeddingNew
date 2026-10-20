import { beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { bookingPayments, contracts, disputes, refunds } from '$lib/server/db/schema';
import { makeBooking, makeCoupleWithWedding, makeVendor, resetDb } from '$lib/server/testing/db';
import { ClaimRefused, openDispute, requestRefund } from './claims';
import { attachContract, contractForBooking, signContract } from './contracts';
import { canReviewVendor } from './vendorDirectory';

async function paidBooking(amount = 10000) {
	const vendor = await makeVendor();
	const couple = await makeCoupleWithWedding();
	const booking = await makeBooking(couple.weddingPlanId, vendor.id, 30000);
	const [p] = await db
		.insert(bookingPayments)
		.values({
			weddingPlanId: couple.weddingPlanId,
			bookingId: booking.id,
			payerId: couple.userId,
			payeeVendorId: vendor.id,
			amount: amount.toFixed(2),
			paymentMethod: 'bank_transfer',
			paymentType: 'advance',
			status: 'confirmed'
		})
		.$returningId();
	return { vendor, couple, booking, paymentId: p.id };
}

beforeEach(resetDb);

describe('refund requests', () => {
	it('caps requests at what is left of the payment', async () => {
		const { couple, paymentId } = await paidBooking(10000);
		const ask = (amount: number) =>
			requestRefund({ paymentId, weddingPlanId: couple.weddingPlanId, userId: couple.userId, amount, reason: 'Album never delivered' });

		await expect(ask(12000)).rejects.toThrow(/up to ETB\s10,000/);
		await ask(4000);
		await expect(ask(7000)).rejects.toThrow(/up to ETB\s6,000/);
		await ask(6000);
		await expect(ask(1)).rejects.toThrow(/already been requested/);
		expect(await db.select().from(refunds)).toHaveLength(2);
	});

	it('refuses someone else’s payment and unconfirmed payments', async () => {
		const { paymentId } = await paidBooking();
		const stranger = await makeCoupleWithWedding();
		await expect(
			requestRefund({ paymentId, weddingPlanId: stranger.weddingPlanId, userId: stranger.userId, amount: 1, reason: 'not mine at all' })
		).rejects.toThrow(ClaimRefused);

		await db.update(bookingPayments).set({ status: 'pending' }).where(eq(bookingPayments.id, paymentId));
		const [p] = await db.select().from(bookingPayments).where(eq(bookingPayments.id, paymentId));
		await expect(
			requestRefund({ paymentId, weddingPlanId: p.weddingPlanId!, userId: p.payerId!, amount: 1, reason: 'pending one here' })
		).rejects.toThrow(/Only confirmed/);
	});
});

describe('disputes', () => {
	it('allows one open dispute per booking', async () => {
		const { booking } = await paidBooking();
		await openDispute({ bookingId: booking.id, raisedBy: 'couple', reason: 'Photographer was late' });
		await expect(openDispute({ bookingId: booking.id, raisedBy: 'vendor', reason: 'Venue changed' })).rejects.toThrow(
			/already an open dispute/
		);
		await db.update(disputes).set({ status: 'resolved' });
		await openDispute({ bookingId: booking.id, raisedBy: 'vendor', reason: 'Venue changed' });
		expect(await db.select().from(disputes)).toHaveLength(2);
	});
});

describe('contracts', () => {
	it('replacing the document clears both signatures', async () => {
		const { booking, couple } = await paidBooking();
		expect(await signContract({ bookingId: booking.id, side: 'couple', name: 'Selam', ip: '1.1.1.1' })).toBe(false);

		await attachContract({ bookingId: booking.id, documentUrl: 'v1.pdf', title: 'Agreement', userId: couple.userId });
		await signContract({ bookingId: booking.id, side: 'couple', name: 'Selam T', ip: '1.1.1.1' });
		await signContract({ bookingId: booking.id, side: 'vendor', name: 'Mesk', ip: '2.2.2.2' });
		expect(await contractForBooking(booking.id)).toMatchObject({ signedByCouple: true, signedByVendor: true, coupleSignedName: 'Selam T' });

		await attachContract({ bookingId: booking.id, documentUrl: 'v2.pdf', title: 'Agreement v2', userId: couple.userId });
		expect(await contractForBooking(booking.id)).toMatchObject({
			documentUrl: 'v2.pdf',
			signedByCouple: false,
			signedByVendor: false,
			coupleSignedName: null
		});
		expect(await db.select().from(contracts)).toHaveLength(1);
	});
});

describe('review eligibility', () => {
	it('only couples who booked and paid (or whose event passed) may review', async () => {
		const { vendor, couple } = await paidBooking();
		expect(await canReviewVendor(couple.userId, vendor.id)).toBe(true);

		const other = await makeVendor('Abyssinia Decor');
		expect(await canReviewVendor(couple.userId, other.id)).toBe(false);

		const stranger = await makeCoupleWithWedding();
		expect(await canReviewVendor(stranger.userId, vendor.id)).toBe(false);
	});
});
