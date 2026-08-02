import { and, count, desc, eq, gte, isNull } from 'drizzle-orm';
import { db } from '$lib/server/db';
import {
	vendorBookings,
	vendorPackages,
	vendorServices,
	vendorWallets,
	weddingPlans,
	couples
} from '$lib/server/db/schema';
import type { PageServerLoad } from './$types';

const todayISO = () => new Date().toISOString().slice(0, 10);

export const load: PageServerLoad = async ({ parent }) => {
	const { vendor } = await parent();
	const today = todayISO();

	const [
		statusRows,
		[wallet],
		[{ serviceCount }],
		[{ packageCount }],
		recentBookings
	] = await Promise.all([
		db
			.select({ status: vendorBookings.status, c: count() })
			.from(vendorBookings)
			.where(and(eq(vendorBookings.vendorId, vendor.id), isNull(vendorBookings.deletedAt)))
			.groupBy(vendorBookings.status),

		db
			.select({ balance: vendorWallets.balance })
			.from(vendorWallets)
			.where(eq(vendorWallets.vendorId, vendor.id))
			.limit(1),

		db
			.select({ serviceCount: count() })
			.from(vendorServices)
			.where(and(eq(vendorServices.vendorId, vendor.id), isNull(vendorServices.deletedAt))),

		db
			.select({ packageCount: count() })
			.from(vendorPackages)
			.where(and(eq(vendorPackages.vendorId, vendor.id), isNull(vendorPackages.deletedAt))),

		db
			.select({
				id: vendorBookings.id,
				status: vendorBookings.status,
				eventDate: vendorBookings.eventDate,
				agreedPrice: vendorBookings.agreedPrice,
				createdAt: vendorBookings.createdAt,
				groomName: couples.groomName,
				brideName: couples.brideName
			})
			.from(vendorBookings)
			.leftJoin(weddingPlans, eq(weddingPlans.id, vendorBookings.weddingPlanId))
			.leftJoin(couples, eq(couples.id, weddingPlans.coupleId))
			.where(and(eq(vendorBookings.vendorId, vendor.id), isNull(vendorBookings.deletedAt)))
			.orderBy(desc(vendorBookings.createdAt))
			.limit(5)
	]);

	const byStatus = Object.fromEntries(statusRows.map((s) => [s.status, s.c]));
	const upcomingConfirmed = await db
		.select({ c: count() })
		.from(vendorBookings)
		.where(
			and(
				eq(vendorBookings.vendorId, vendor.id),
				eq(vendorBookings.status, 'confirmed'),
				gte(vendorBookings.eventDate, today),
				isNull(vendorBookings.deletedAt)
			)
		)
		.then((r) => r[0]?.c ?? 0);

	return {
		stats: {
			pending: byStatus.pending ?? 0,
			confirmedUpcoming: upcomingConfirmed,
			totalBookings: (byStatus.pending ?? 0) + (byStatus.confirmed ?? 0) + (byStatus.cancelled ?? 0),
			walletBalance: Number(wallet?.balance ?? 0),
			serviceCount,
			packageCount
		},
		recentBookings: recentBookings.map((b) => ({
			...b,
			agreedPrice: b.agreedPrice ? Number(b.agreedPrice) : null,
			coupleNames: [b.groomName, b.brideName].filter(Boolean).join(' & ') || 'Couple'
		}))
	};
};
