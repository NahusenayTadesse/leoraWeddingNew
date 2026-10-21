import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '$lib/server/db';
import { messages, savedVendors } from '$lib/server/db/schema';
import { recordProfileView, vendorFunnel } from '$lib/server/vendorStats';
import { makeBooking, makeCoupleWithWedding, makeVendor, resetDb } from '$lib/server/testing/db';

beforeEach(resetDb);

const BROWSER = 'Mozilla/5.0 (X11; Linux x86_64) Firefox/140.0';

describe('vendor funnel', () => {
	it('counts views (not the owner, not crawlers), saves, inquiries and bookings', async () => {
		const vendor = await makeVendor();
		await recordProfileView(vendor.id, { userAgent: BROWSER });
		await recordProfileView(vendor.id, { userAgent: BROWSER });
		await recordProfileView(vendor.id, { userAgent: 'Googlebot/2.1' });
		await recordProfileView(vendor.id, {
			userId: vendor.userId,
			ownerUserId: vendor.userId,
			userAgent: BROWSER
		});

		const asker = await makeCoupleWithWedding();
		await db.insert(messages).values({
			senderId: asker.userId,
			receiverId: vendor.userId,
			coupleId: asker.coupleId,
			vendorId: vendor.id,
			body: 'Hi'
		});
		await db.insert(savedVendors).values({ coupleId: asker.coupleId, vendorId: vendor.id });

		// Messaged and then booked: one inquiry, one booking.
		await makeBooking(asker.weddingPlanId, vendor.id);
		const requester = await makeCoupleWithWedding();
		await makeBooking(requester.weddingPlanId, vendor.id, 10000, 'pending');

		expect(await vendorFunnel(vendor.id, vendor.userId)).toEqual({
			views: 2,
			saves: 1,
			inquiries: 2,
			bookings: 1
		});
	});
});
