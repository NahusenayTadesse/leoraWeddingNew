import { count, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { vendors, subscriptions, vendorSubscriptions, subscriptionPlans } from '$lib/server/db/schema';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const [statusRows, [{ planCount }], [{ activeCouple }], [{ activeVendor }]] = await Promise.all([
		db.select({ status: vendors.status, c: count() }).from(vendors).groupBy(vendors.status),
		db.select({ planCount: count() }).from(subscriptionPlans),
		db
			.select({ activeCouple: count() })
			.from(subscriptions)
			.where(eq(subscriptions.status, 'active')),
		db
			.select({ activeVendor: count() })
			.from(vendorSubscriptions)
			.where(eq(vendorSubscriptions.status, 'active'))
	]);

	const byStatus = Object.fromEntries(statusRows.map((s) => [s.status, s.c]));

	return {
		stats: {
			pendingVendors: byStatus.pending ?? 0,
			approvedVendors: byStatus.approved ?? 0,
			rejectedVendors: byStatus.rejected ?? 0,
			suspendedVendors: byStatus.suspended ?? 0,
			planCount,
			activeSubscribers: activeCouple + activeVendor
		}
	};
};
