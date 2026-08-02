import { redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { weddingPlans, city, region } from '$lib/server/db/schema';
import { and, asc, eq, isNull } from 'drizzle-orm';
import { getCoupleByUserId } from '$lib/server/couples';

export async function getWeddingByCoupleId(coupleId: number) {
	const [row] = await db
		.select()
		.from(weddingPlans)
		.where(and(eq(weddingPlans.coupleId, coupleId), isNull(weddingPlans.deletedAt)))
		.orderBy(asc(weddingPlans.id))
		.limit(1);

	return row ?? null;
}

/**
 * Actions run before any `load` and never see the layout's `parent()` chain,
 * so they must re-resolve the couple and wedding themselves rather than
 * reading them off the page data.
 */
export async function requireCoupleAndWedding(locals: App.Locals) {
	const couple = await getCoupleByUserId(locals.user!.id);
	if (!couple) throw redirect(302, '/wedding/profile');

	const wedding = await getWeddingByCoupleId(couple.id);
	if (!wedding) throw redirect(302, '/wedding/wedding');

	return { couple, wedding };
}

/** Cities for the picker, with their region as context. */
export async function listCities() {
	return db
		.select({ name: city.name, region: region.name })
		.from(city)
		.innerJoin(region, eq(city.regionId, region.id))
		.where(and(eq(city.isActive, true), isNull(city.deletedAt)))
		.orderBy(asc(city.name));
}
