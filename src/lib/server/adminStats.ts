import { and, count, desc, eq, gte, isNull, sql, sum } from 'drizzle-orm';
import { db } from '$lib/server/db';
import {
	user,
	couples,
	vendors,
	vendorCategories,
	vendorBookings,
	bookingPayments,
	paymentCommissions,
	payments,
	subscriptionPlans,
	subscriptions,
	vendorSubscriptions,
	disputes,
	vendorPayouts,
	refunds,
	vendorReviews,
	contactMessages,
	weddingPlans
} from '$lib/server/db/schema';
import { toMoney } from '$lib/money';

export type Range = { from: Date; to: Date };

/** Month keys ('2026-03') from `from` to `to` inclusive, so empty months chart as 0. */
export function monthKeys({ from, to }: Range): string[] {
	const keys: string[] = [];
	const d = new Date(from.getFullYear(), from.getMonth(), 1);
	const end = new Date(to.getFullYear(), to.getMonth(), 1);
	while (d <= end && keys.length < 60) {
		keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
		d.setMonth(d.getMonth() + 1);
	}
	return keys;
}

export function monthLabel(key: string) {
	const [y, m] = key.split('-').map(Number);
	return new Date(y, m - 1, 1).toLocaleString('en', { month: 'short', year: '2-digit' });
}

export function lastMonths(n: number): Range {
	const to = new Date();
	const from = new Date(to.getFullYear(), to.getMonth() - (n - 1), 1);
	return { from, to };
}

/** Spread sparse `{month, v}` rows over every month key. */
function fill(keys: string[], rows: { month: string; v: unknown }[]) {
	const map = new Map(rows.map((r) => [r.month, toMoney(r.v as string | number)]));
	return keys.map((k) => map.get(k) ?? 0);
}

const ym = (col: unknown) => sql<string>`DATE_FORMAT(${col}, '%Y-%m')`;

/** Platform income, GMV and subscription revenue per month. */
export async function revenueSeries(range: Range) {
	const keys = monthKeys(range);
	const [plan, gmv, commission] = await Promise.all([
		db
			.select({ month: ym(payments.paidAt), v: sum(payments.amount) })
			.from(payments)
			.where(
				and(
					eq(payments.status, 'completed'),
					gte(payments.paidAt, range.from),
					sql`${payments.paidAt} <= ${range.to}`
				)
			)
			.groupBy(ym(payments.paidAt)),
		db
			.select({ month: ym(bookingPayments.paidAt), v: sum(bookingPayments.amount) })
			.from(bookingPayments)
			.where(
				and(
					eq(bookingPayments.status, 'confirmed'),
					gte(bookingPayments.paidAt, range.from),
					sql`${bookingPayments.paidAt} <= ${range.to}`
				)
			)
			.groupBy(ym(bookingPayments.paidAt)),
		db
			.select({ month: ym(bookingPayments.paidAt), v: sum(paymentCommissions.commissionAmount) })
			.from(paymentCommissions)
			.innerJoin(bookingPayments, eq(bookingPayments.id, paymentCommissions.bookingPaymentId))
			.where(
				and(
					eq(bookingPayments.status, 'confirmed'),
					gte(bookingPayments.paidAt, range.from),
					sql`${bookingPayments.paidAt} <= ${range.to}`
				)
			)
			.groupBy(ym(bookingPayments.paidAt))
	]);
	const planRev = fill(keys, plan);
	const gmvRev = fill(keys, gmv);
	const commRev = fill(keys, commission);
	return {
		labels: keys.map(monthLabel),
		subscriptions: planRev,
		gmv: gmvRev,
		commission: commRev,
		platform: planRev.map((v, i) => v + commRev[i])
	};
}

/** Signups per month for couples and vendors. */
export async function signupSeries(range: Range) {
	const keys = monthKeys(range);
	const [c, v] = await Promise.all([
		db
			.select({ month: ym(couples.createdAt), v: count() })
			.from(couples)
			.where(and(isNull(couples.deletedAt), gte(couples.createdAt, range.from)))
			.groupBy(ym(couples.createdAt)),
		db
			.select({ month: ym(vendors.createdAt), v: count() })
			.from(vendors)
			.where(and(isNull(vendors.deletedAt), gte(vendors.createdAt, range.from)))
			.groupBy(ym(vendors.createdAt))
	]);
	return { labels: keys.map(monthLabel), couples: fill(keys, c), vendors: fill(keys, v) };
}

export async function bookingSeries(range: Range) {
	const keys = monthKeys(range);
	const rows = await db
		.select({ month: ym(vendorBookings.createdAt), v: count() })
		.from(vendorBookings)
		.where(and(isNull(vendorBookings.deletedAt), gte(vendorBookings.createdAt, range.from)))
		.groupBy(ym(vendorBookings.createdAt));
	return { labels: keys.map(monthLabel), bookings: fill(keys, rows) };
}

function toPairs<K extends string>(rows: { k: K | null; c: number }[]) {
	return {
		labels: rows.map((r) => String(r.k ?? 'unknown')),
		values: rows.map((r) => Number(r.c))
	};
}

export async function breakdowns() {
	const [bookingStatus, vendorStatus, vendorCats, payMethod, weddingStatus, planMix] =
		await Promise.all([
			db
				.select({ k: vendorBookings.status, c: count() })
				.from(vendorBookings)
				.where(isNull(vendorBookings.deletedAt))
				.groupBy(vendorBookings.status),
			db
				.select({ k: vendors.status, c: count() })
				.from(vendors)
				.where(isNull(vendors.deletedAt))
				.groupBy(vendors.status),
			db
				.select({ k: vendorCategories.name, c: count(vendors.id) })
				.from(vendorCategories)
				.leftJoin(
					vendors,
					and(eq(vendors.categoryId, vendorCategories.id), isNull(vendors.deletedAt))
				)
				.groupBy(vendorCategories.id, vendorCategories.name)
				.orderBy(desc(count(vendors.id)))
				.limit(10),
			db
				.select({ k: bookingPayments.paymentMethod, c: count() })
				.from(bookingPayments)
				.where(eq(bookingPayments.status, 'confirmed'))
				.groupBy(bookingPayments.paymentMethod),
			db
				.select({ k: weddingPlans.status, c: count() })
				.from(weddingPlans)
				.where(isNull(weddingPlans.deletedAt))
				.groupBy(weddingPlans.status),
			db
				.select({ k: subscriptionPlans.name, c: count(subscriptions.id) })
				.from(subscriptionPlans)
				.leftJoin(
					subscriptions,
					and(
						eq(subscriptions.subscriptionPlanId, subscriptionPlans.id),
						eq(subscriptions.status, 'active')
					)
				)
				.where(eq(subscriptionPlans.audience, 'couple'))
				.groupBy(subscriptionPlans.id, subscriptionPlans.name)
		]);
	return {
		bookingStatus: toPairs(bookingStatus),
		vendorStatus: toPairs(vendorStatus),
		vendorCategories: toPairs(vendorCats),
		paymentMethods: toPairs(payMethod),
		weddingStatus: toPairs(weddingStatus),
		planMix: toPairs(planMix)
	};
}

export async function topVendors(range: Range, limit = 8) {
	const rows = await db
		.select({
			id: vendors.id,
			name: vendors.businessName,
			gross: sum(paymentCommissions.grossAmount),
			commission: sum(paymentCommissions.commissionAmount),
			bookings: count()
		})
		.from(paymentCommissions)
		.innerJoin(bookingPayments, eq(bookingPayments.id, paymentCommissions.bookingPaymentId))
		.innerJoin(vendors, eq(vendors.id, paymentCommissions.vendorId))
		.where(
			and(
				eq(bookingPayments.status, 'confirmed'),
				gte(bookingPayments.paidAt, range.from),
				sql`${bookingPayments.paidAt} <= ${range.to}`
			)
		)
		.groupBy(vendors.id, vendors.businessName)
		.orderBy(desc(sum(paymentCommissions.grossAmount)))
		.limit(limit);
	return rows.map((r) => ({
		id: r.id,
		name: r.name,
		gross: toMoney(r.gross),
		commission: toMoney(r.commission),
		payments: Number(r.bookings)
	}));
}

/** Headline numbers and the "needs attention" queue. */
export async function overview() {
	const one = async <T>(q: Promise<T[]>) => (await q)[0];
	const [
		users,
		couplesN,
		vendorsN,
		gmv,
		planRev,
		commission,
		activeSubsC,
		activeSubsV,
		pendingVendors,
		openDisputes,
		pendingPayouts,
		pendingRefunds,
		recentMessages,
		newReviews
	] = await Promise.all([
		one(db.select({ n: count() }).from(user)),
		one(db.select({ n: count() }).from(couples).where(isNull(couples.deletedAt))),
		one(db.select({ n: count() }).from(vendors).where(isNull(vendors.deletedAt))),
		one(
			db
				.select({ v: sum(bookingPayments.amount) })
				.from(bookingPayments)
				.where(eq(bookingPayments.status, 'confirmed'))
		),
		one(
			db
				.select({ v: sum(payments.amount) })
				.from(payments)
				.where(eq(payments.status, 'completed'))
		),
		one(
			db
				.select({ v: sum(paymentCommissions.commissionAmount) })
				.from(paymentCommissions)
				.innerJoin(bookingPayments, eq(bookingPayments.id, paymentCommissions.bookingPaymentId))
				.where(eq(bookingPayments.status, 'confirmed'))
		),
		one(db.select({ n: count() }).from(subscriptions).where(eq(subscriptions.status, 'active'))),
		one(
			db
				.select({ n: count() })
				.from(vendorSubscriptions)
				.where(eq(vendorSubscriptions.status, 'active'))
		),
		one(
			db
				.select({ n: count() })
				.from(vendors)
				.where(and(eq(vendors.status, 'pending'), isNull(vendors.deletedAt)))
		),
		one(
			db
				.select({ n: count() })
				.from(disputes)
				.where(sql`${disputes.status} in ('open','under_review')`)
		),
		one(db.select({ n: count() }).from(vendorPayouts).where(eq(vendorPayouts.status, 'requested'))),
		one(db.select({ n: count() }).from(refunds).where(and(eq(refunds.status, 'pending'), isNull(refunds.deletedAt)))),
		one(
			db
				.select({ n: count() })
				.from(contactMessages)
				.where(gte(contactMessages.createdAt, new Date(Date.now() - 7 * 864e5)))
		),
		one(
			db
				.select({ n: count() })
				.from(vendorReviews)
				.where(
					and(isNull(vendorReviews.deletedAt), gte(vendorReviews.createdAt, new Date(Date.now() - 7 * 864e5)))
				)
		)
	]);
	const subscriptionRevenue = toMoney(planRev?.v);
	const commissionRevenue = toMoney(commission?.v);
	return {
		users: users?.n ?? 0,
		couples: couplesN?.n ?? 0,
		vendors: vendorsN?.n ?? 0,
		gmv: toMoney(gmv?.v),
		subscriptionRevenue,
		commissionRevenue,
		platformRevenue: subscriptionRevenue + commissionRevenue,
		activeSubscribers: (activeSubsC?.n ?? 0) + (activeSubsV?.n ?? 0),
		queue: {
			pendingVendors: pendingVendors?.n ?? 0,
			openDisputes: openDisputes?.n ?? 0,
			pendingPayouts: pendingPayouts?.n ?? 0,
			pendingRefunds: pendingRefunds?.n ?? 0,
			messagesThisWeek: recentMessages?.n ?? 0,
			reviewsThisWeek: newReviews?.n ?? 0
		}
	};
}
