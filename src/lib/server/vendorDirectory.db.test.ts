import { beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { vendorAvailability, vendors } from '$lib/server/db/schema';
import { listVendors } from '$lib/server/vendorDirectory';
import { makeBooking, makeCoupleWithWedding, makeVendor, resetDb } from '$lib/server/testing/db';

beforeEach(resetDb);

const names = async (filters: Parameters<typeof listVendors>[0]) =>
	(await listVendors(filters)).vendors.map((v) => v.businessName).sort();

const set = (id: number, values: Partial<typeof vendors.$inferInsert>) =>
	db.update(vendors).set(values).where(eq(vendors.id, id));

describe('directory filters', () => {
	it('free on a date leaves out vendors who blocked or booked it', async () => {
		const blocked = await makeVendor('Blocked');
		const booked = await makeVendor('Booked');
		await makeVendor('Free');
		await db
			.insert(vendorAvailability)
			.values({ vendorId: blocked.id, availableDate: '2030-02-14', isAvailable: false });
		const couple = await makeCoupleWithWedding();
		await makeBooking(couple.weddingPlanId, booked.id); // confirmed, 2030-02-14

		expect(await names({ date: '2030-02-14' })).toEqual(['Free']);
		expect(await names({ date: '2030-02-15' })).toEqual(['Blocked', 'Booked', 'Free']);
	});

	it('guests keeps vendors big enough, and those without a stated capacity', async () => {
		const small = await makeVendor('Small hall');
		const big = await makeVendor('Big hall');
		await makeVendor('Photographer');
		await set(small.id, { maxGuests: 150 });
		await set(big.id, { maxGuests: 800 });

		expect(await names({ guests: 400 })).toEqual(['Big hall', 'Photographer']);
	});

	it('budget keeps vendors whose starting price fits, and drops unpriced ones', async () => {
		const cheap = await makeVendor('Cheap');
		const dear = await makeVendor('Dear');
		await makeVendor('Unpriced');
		await set(cheap.id, { priceMin: '20000.00' });
		await set(dear.id, { priceMin: '200000.00' });

		expect(await names({ budget: 50000 })).toEqual(['Cheap']);
	});
});
