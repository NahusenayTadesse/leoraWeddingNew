import { and, countDistinct, count, eq, isNull } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { couples, vendors } from '$lib/server/db/schema';
import type { PageServerLoad } from './$types';

/** Real numbers from the database rather than marketing copy that goes stale. */
export const load: PageServerLoad = async ({ setHeaders }) => {
	const live = and(isNull(vendors.deletedAt), eq(vendors.status, 'approved'));
	const [[vendorStats], [coupleStats]] = await Promise.all([
		db
			.select({ vendors: count(), cities: countDistinct(vendors.city) })
			.from(vendors)
			.where(live),
		db.select({ couples: count() }).from(couples).where(isNull(couples.deletedAt))
	]);
	setHeaders({ 'cache-control': 'public, max-age=600' });
	return {
		stats: {
			couples: coupleStats?.couples ?? 0,
			vendors: vendorStats?.vendors ?? 0,
			cities: vendorStats?.cities ?? 0
		}
	};
};
