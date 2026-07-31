import { db } from '$lib/server/db';
import { weddings, city, region } from '$lib/server/db/schema';
import { and, asc, eq, isNull } from 'drizzle-orm';

export async function getWeddingByCoupleId(coupleId: number) {
	const [row] = await db
		.select()
		.from(weddings)
		.where(and(eq(weddings.coupleId, coupleId), isNull(weddings.deletedAt)))
		.orderBy(asc(weddings.id))
		.limit(1);

	return row ?? null;
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