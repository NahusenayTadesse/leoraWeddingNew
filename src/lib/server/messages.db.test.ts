import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '$lib/server/db';
import { messages, vendorBookings } from '$lib/server/db/schema';
import { CONTACT_PLACEHOLDER } from '@nahu/admin-kit/contactMask';
import { responseStats, sendMessage } from '$lib/server/messages';
import { makeBooking, makeCoupleWithWedding, makeVendor, resetDb } from '$lib/server/testing/db';
import { eq } from 'drizzle-orm';

beforeEach(resetDb);

async function pair(status: 'pending' | 'confirmed' = 'pending') {
	const vendor = await makeVendor();
	const couple = await makeCoupleWithWedding();
	const booking = await makeBooking(couple.weddingPlanId, vendor.id, 20000, status);
	const fromCouple = (body: string) =>
		sendMessage({
			senderId: couple.userId,
			receiverId: vendor.userId,
			coupleId: couple.coupleId,
			vendorId: vendor.id,
			body,
			from: 'couple'
		});
	return { vendor, couple, booking, fromCouple };
}

const lastBody = async () => (await db.select().from(messages)).at(-1)!.body;

describe('contact details in messages', () => {
	it('are hidden before a booking is confirmed', async () => {
		const { fromCouple } = await pair('pending');
		expect(await fromCouple('Call me on 0911 22 33 44')).toEqual({ ok: true, masked: true });
		expect(await lastBody()).toBe(`Call me on ${CONTACT_PLACEHOLDER}`);
	});

	it('flow freely once it is confirmed', async () => {
		const { fromCouple, booking } = await pair('pending');
		await db
			.update(vendorBookings)
			.set({ status: 'confirmed' })
			.where(eq(vendorBookings.id, booking.id));
		expect(await fromCouple('Call me on 0911 22 33 44')).toEqual({ ok: true, masked: false });
		expect(await lastBody()).toBe('Call me on 0911 22 33 44');
	});

	it('a vendor cannot write to a couple that never contacted them', async () => {
		const vendor = await makeVendor('Other Vendor');
		const couple = await makeCoupleWithWedding();
		const result = await sendMessage({
			senderId: vendor.userId,
			receiverId: couple.userId,
			coupleId: couple.coupleId,
			vendorId: vendor.id,
			body: 'Special offer!',
			from: 'vendor'
		});
		expect(result).toEqual({ ok: false, reason: 'unknown_couple' });
		expect(await db.select().from(messages)).toHaveLength(0);
	});
});

describe('response stats', () => {
	const at = (hoursAgo: number) => new Date(Date.now() - hoursAgo * 3600_000);

	it('need a few conversations, then report reply rate and median time', async () => {
		const vendor = await makeVendor();
		const thread = async (askedHoursAgo: number, repliedAfter: number | null) => {
			const couple = await makeCoupleWithWedding();
			await db.insert(messages).values({
				senderId: couple.userId,
				receiverId: vendor.userId,
				coupleId: couple.coupleId,
				vendorId: vendor.id,
				body: 'Are you free?',
				createdAt: at(askedHoursAgo)
			});
			if (repliedAfter !== null)
				await db.insert(messages).values({
					senderId: vendor.userId,
					receiverId: couple.userId,
					coupleId: couple.coupleId,
					vendorId: vendor.id,
					body: 'Yes!',
					createdAt: at(askedHoursAgo - repliedAfter)
				});
		};
		await thread(100, 2);
		await thread(80, 5);
		expect(await responseStats(vendor.id, vendor.userId)).toBeNull();

		await thread(60, null);
		await thread(40, 1);
		const stats = await responseStats(vendor.id, vendor.userId);
		expect(stats?.replyRate).toBe(75);
		expect(stats?.medianHours).toBeCloseTo(2, 3);
	});
});
