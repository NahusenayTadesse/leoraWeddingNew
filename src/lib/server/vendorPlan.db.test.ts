import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { subscriptionPlans, vendorSubscriptions } from '$lib/server/db/schema';
import { listVendors } from '$lib/server/vendorDirectory';
import { checkBookingAllowance } from '$lib/server/vendorPlan';
import { makeBooking, makeCoupleWithWedding, makeVendor, resetDb } from '$lib/server/testing/db';

beforeEach(resetDb);
/** Seed plans survive resetDb, so the one this file edits is put back. */
let restore: (() => Promise<unknown>) | null = null;
afterEach(async () => {
	delete process.env.REQUIRE_VENDOR_PLAN;
	await restore?.();
	restore = null;
});

async function giveVendorPlan(vendorId: number, maxBookings: number | null) {
	const [plan] = await db
		.select()
		.from(subscriptionPlans)
		.where(eq(subscriptionPlans.audience, 'vendor'))
		.limit(1);
	await db.update(subscriptionPlans).set({ maxBookings }).where(eq(subscriptionPlans.id, plan.id));
	await db.insert(vendorSubscriptions).values({
		vendorId,
		planId: plan.id,
		startsAt: '2020-01-01',
		endsAt: '2099-12-31',
		status: 'active'
	});
}

const names = async () => (await listVendors({})).vendors.map((v) => v.businessName).sort();

describe('REQUIRE_VENDOR_PLAN', () => {
	it('off (the default): everyone is listed and can confirm bookings', async () => {
		const vendor = await makeVendor('Free vendor');
		expect(await names()).toEqual(['Free vendor']);
		expect(await checkBookingAllowance(vendor.id)).toEqual({ ok: true });
	});

	it('on: only vendors with an active plan are listed, and max_bookings is enforced', async () => {
		process.env.REQUIRE_VENDOR_PLAN = 'true';
		const free = await makeVendor('Free vendor');
		const paid = await makeVendor('Paid vendor');
		await giveVendorPlan(paid.id, 1);

		expect(await names()).toEqual(['Paid vendor']);
		expect(await checkBookingAllowance(free.id)).toEqual({ ok: false, reason: 'no_plan' });
		expect(await checkBookingAllowance(paid.id)).toEqual({ ok: true });

		const couple = await makeCoupleWithWedding();
		await makeBooking(couple.weddingPlanId, paid.id); // confirmed
		expect(await checkBookingAllowance(paid.id)).toEqual({ ok: false, reason: 'limit', limit: 1 });
	});
});
