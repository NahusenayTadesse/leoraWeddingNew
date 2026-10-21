import { error } from '@sveltejs/kit';
import { and, desc, eq, isNull, sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import {
	bookingPayments,
	couples,
	disputes,
	paymentCommissions,
	subscriptionPlans,
	user,
	vendorBookings,
	vendorCategories,
	vendorPayouts,
	vendorReviews,
	vendors,
	vendorSubscriptions,
	vendorWallets,
	weddingPlans
} from '$lib/server/db/schema';
import { toMoney } from '$lib/money';
import { parse, ok, bad } from '@nahu/admin-kit/server/actionResults';
import { requirePermission } from '$lib/server/permissions';
import { PERM } from '$lib/access';
import { audit } from '$lib/server/auditLog';
import { notify } from '$lib/server/notify';
import { z } from 'zod/v4';
import type { Actions, PageServerLoad } from './$types';

/** Everything about one vendor on one screen: listing, plan, money, bookings, reviews, disputes. */
export const load: PageServerLoad = async ({ params }) => {
	const id = Number(params.id);
	if (!Number.isInteger(id)) error(404, 'Vendor not found');

	const [vendor] = await db
		.select({
			id: vendors.id,
			businessName: vendors.businessName,
			status: vendors.status,
			isActive: vendors.isActive,
			isVerified: vendors.isVerified,
			city: vendors.city,
			phone: vendors.phone,
			email: vendors.email,
			description: vendors.description,
			ratingAvg: vendors.ratingAvg,
			reviewCount: vendors.reviewCount,
			createdAt: vendors.createdAt,
			category: vendorCategories.name,
			ownerName: user.name,
			ownerEmail: user.email
		})
		.from(vendors)
		.leftJoin(vendorCategories, eq(vendorCategories.id, vendors.categoryId))
		.leftJoin(user, eq(user.id, vendors.userId))
		.where(and(eq(vendors.id, id), isNull(vendors.deletedAt)));
	if (!vendor) error(404, 'Vendor not found');

	const coupleName = sql<string>`concat_ws(' & ', nullif(${couples.brideName}, ''), nullif(${couples.groomName}, ''))`;

	const [wallet, plan, bookings, money, payouts, reviews, openDisputes] = await Promise.all([
		db
			.select({ balance: vendorWallets.balance })
			.from(vendorWallets)
			.where(eq(vendorWallets.vendorId, id)),
		db
			.select({
				name: subscriptionPlans.name,
				status: vendorSubscriptions.status,
				endsAt: vendorSubscriptions.endsAt
			})
			.from(vendorSubscriptions)
			.innerJoin(subscriptionPlans, eq(subscriptionPlans.id, vendorSubscriptions.planId))
			.where(eq(vendorSubscriptions.vendorId, id))
			.orderBy(desc(vendorSubscriptions.id))
			.limit(1),
		db
			.select({
				id: vendorBookings.id,
				status: vendorBookings.status,
				eventDate: vendorBookings.eventDate,
				agreedPrice: vendorBookings.agreedPrice,
				couple: coupleName
			})
			.from(vendorBookings)
			.leftJoin(weddingPlans, eq(weddingPlans.id, vendorBookings.weddingPlanId))
			.leftJoin(couples, eq(couples.id, weddingPlans.coupleId))
			.where(and(eq(vendorBookings.vendorId, id), isNull(vendorBookings.deletedAt)))
			.orderBy(desc(vendorBookings.createdAt))
			.limit(20),
		db
			.select({
				gross: sql<string>`coalesce(sum(case when ${bookingPayments.status} = 'confirmed' then ${bookingPayments.amount} end), 0)`,
				commission: sql<string>`coalesce(sum(${paymentCommissions.commissionAmount}), 0)`,
				payments: sql<number>`count(distinct case when ${bookingPayments.status} = 'confirmed' then ${bookingPayments.id} end)`
			})
			.from(bookingPayments)
			.leftJoin(paymentCommissions, eq(paymentCommissions.bookingPaymentId, bookingPayments.id))
			.where(eq(bookingPayments.payeeVendorId, id)),
		db
			.select()
			.from(vendorPayouts)
			.where(eq(vendorPayouts.vendorId, id))
			.orderBy(desc(vendorPayouts.createdAt))
			.limit(10),
		db
			.select({
				id: vendorReviews.id,
				rating: vendorReviews.rating,
				comment: vendorReviews.comment,
				createdAt: vendorReviews.createdAt
			})
			.from(vendorReviews)
			.where(and(eq(vendorReviews.vendorId, id), isNull(vendorReviews.deletedAt)))
			.orderBy(desc(vendorReviews.createdAt))
			.limit(10),
		db
			.select({
				id: disputes.id,
				status: disputes.status,
				reason: disputes.reason,
				raisedBy: disputes.raisedBy,
				createdAt: disputes.createdAt
			})
			.from(disputes)
			.innerJoin(vendorBookings, eq(vendorBookings.id, disputes.bookingId))
			.where(eq(vendorBookings.vendorId, id))
			.orderBy(desc(disputes.createdAt))
			.limit(10)
	]);

	return {
		vendor: { ...vendor, ratingAvg: Number(vendor.ratingAvg ?? 0) },
		wallet: toMoney(wallet[0]?.balance),
		plan: plan[0] ?? null,
		bookings: bookings.map((b) => ({
			...b,
			agreedPrice: toMoney(b.agreedPrice),
			couple: b.couple || '—'
		})),
		money: {
			gross: toMoney(money[0]?.gross),
			commission: toMoney(money[0]?.commission),
			payments: Number(money[0]?.payments ?? 0)
		},
		payouts: payouts.map((p) => ({ ...p, amount: toMoney(p.amount) })),
		reviews,
		disputes: openDisputes
	};
};

export const actions = {
	/**
	 * Grants or removes the Verified badge. Staff grant it only after checking the business's trade
	 * licence and the owner's ID; the public page tells couples that is what it means.
	 */
	setVerified: async (event) => {
		requirePermission(event.locals, PERM.vendorsApprove);
		const p = await parse(event.request, z.object({ verified: z.enum(['yes', 'no']) }));
		if ('error' in p) return p.error;
		const id = Number(event.params.id);
		const verified = p.data.verified === 'yes';
		const [res] = await db
			.update(vendors)
			.set({ isVerified: verified, verifiedAt: verified ? new Date() : null })
			.where(eq(vendors.id, id));
		if (!res.affectedRows) return bad('Vendor not found', 404);

		await audit(event, verified ? 'vendor.verify' : 'vendor.unverify', 'vendor', id);
		const [owner] = await db
			.select({ userId: vendors.userId })
			.from(vendors)
			.where(eq(vendors.id, id));
		if (verified) {
			await notify(owner?.userId, {
				type: 'vendor_verified',
				title: 'Your business is verified',
				body: 'Couples now see the Verified badge on your listing.',
				link: '/vendor-dashboard/profile'
			});
		}
		return ok(verified ? 'Vendor verified' : 'Verification removed');
	}
} satisfies Actions;
