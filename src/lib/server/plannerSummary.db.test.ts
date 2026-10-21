import { beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { weddingPlans } from '$lib/server/db/schema';
import { plannerSummary } from '$lib/server/plannerSummary';
import { addWeddingWeek } from '$lib/server/planner';
import {
	makeBooking,
	makeCoupleWithWedding,
	makeUser,
	makeVendor,
	resetDb
} from '$lib/server/testing/db';

beforeEach(resetDb);

describe('plannerSummary', () => {
	it("summarises the couple's own plan, with the Ethiopian date and season notes", async () => {
		const couple = await makeCoupleWithWedding();
		await db
			.update(weddingPlans)
			.set({ weddingDate: new Date('2030-01-25T00:00:00'), totalBudget: '200000.00' })
			.where(eq(weddingPlans.id, couple.weddingPlanId));
		const vendor = await makeVendor('Mesk Studio');
		await makeBooking(couple.weddingPlanId, vendor.id, 30000);

		const s = await plannerSummary(couple.userId);
		if ('error' in s) throw new Error(s.error);
		expect(s.wedding.date).toBe('2030-01-25');
		expect(s.wedding.dateEthiopian).toMatch(/2022/);
		expect(s.wedding.seasonNotes).toContain('after_timket');
		expect(s.bookings).toMatchObject([{ vendor: 'Mesk Studio', stillOwed: 30000 }]);
	});

	it('says so when there is no workspace', async () => {
		const stranger = await makeUser('Stranger');
		expect(await plannerSummary(stranger.id)).toHaveProperty('error');
	});
});

describe('addWeddingWeek', () => {
	it('adds the traditional week once, dated from the wedding day', async () => {
		const couple = await makeCoupleWithWedding();
		const label = (k: string) => ({ name: k, note: `${k} note` });
		expect(await addWeddingWeek(couple.coupleId, '2030-01-25', couple.userId, label)).toBe(6);
		expect(await addWeddingWeek(couple.coupleId, '2030-01-25', couple.userId, label)).toBe(0);
	});
});
