import { and, count, desc, eq, isNull, like, or, sql } from 'drizzle-orm';
import type { MySqlSelect } from 'drizzle-orm/mysql-core';
import { z } from 'zod/v4';
import {
	buildWhere,
	currentQuery,
	facetCounts,
	orderBy,
	pagination,
	parseTableQuery,
	type TableQuery,
	type WhereSpec
} from '@nahu/admin-kit/server/queryFilters';
import { db } from '$lib/server/db';
import { payments, bookingPayments, refunds, couples, vendors, paymentCommissions } from '$lib/server/db/schema';
import { parse, ok, bad } from '$lib/server/adminAction';
import { audit } from '$lib/server/auditLog';
import { toMoney } from '$lib/money';
import { confirmBookingPayment, failBookingPayment, paymentFailureMessage } from '$lib/server/bookingPayments';
import type { Actions, PageServerLoad } from './$types';

/**
 * Three lists, one per tab. Each is a server-paged table and they share the URL's table
 * params, so the tab is in the URL too (`?tab=`) and only the open tab's list is loaded.
 */
const TABS = ['vendor', 'plan', 'refunds'] as const;
type Tab = (typeof TABS)[number];

/* ---------- booking payments ---------- */

const VENDOR_FILTERS = ['status', 'method', 'type'] as const;
const vendorSorts = {
	id: bookingPayments.id,
	vendor: vendors.businessName,
	amount: bookingPayments.amount,
	date: bookingPayments.createdAt
};
const vendorSpec: WhereSpec<(typeof VENDOR_FILTERS)[number]> = {
	search: (term) =>
		or(like(vendors.businessName, `%${term}%`), like(bookingPayments.transactionReference, `%${term}%`)),
	dateColumn: bookingPayments.createdAt,
	filters: {
		status: (v) => eq(bookingPayments.status, v as typeof bookingPayments.status._.data),
		method: (v) => eq(bookingPayments.paymentMethod, v as typeof bookingPayments.paymentMethod._.data),
		type: (v) => eq(bookingPayments.paymentType, v as typeof bookingPayments.paymentType._.data)
	}
};
const vendorJoined = <T extends MySqlSelect>(q: T) =>
	q
		.leftJoin(vendors, eq(vendors.id, bookingPayments.payeeVendorId))
		.leftJoin(paymentCommissions, eq(paymentCommissions.bookingPaymentId, bookingPayments.id));

async function vendorTab(query: TableQuery<(typeof VENDOR_FILTERS)[number]>) {
	const where = buildWhere(query, vendorSpec);
	const facet = (key: (typeof VENDOR_FILTERS)[number], column: typeof bookingPayments.status | typeof bookingPayments.paymentMethod | typeof bookingPayments.paymentType) => () =>
		vendorJoined(db.select({ value: column, count: count() }).from(bookingPayments).$dynamic())
			.where(buildWhere(query, vendorSpec, { except: key }))
			.groupBy(column);

	const [rows, [{ total }], facets] = await Promise.all([
		vendorJoined(
			db
				.select({
					id: bookingPayments.id,
					amount: bookingPayments.amount,
					method: bookingPayments.paymentMethod,
					type: bookingPayments.paymentType,
					status: bookingPayments.status,
					ref: bookingPayments.transactionReference,
					paidAt: bookingPayments.paidAt,
					createdAt: bookingPayments.createdAt,
					vendor: vendors.businessName,
					commission: paymentCommissions.commissionAmount
				})
				.from(bookingPayments)
				.$dynamic()
		)
			.where(where)
			.orderBy(...(orderBy(query, vendorSorts) ?? [desc(bookingPayments.createdAt)]))
			.limit(query.limit)
			.offset(query.offset),
		vendorJoined(db.select({ total: count() }).from(bookingPayments).$dynamic()).where(where),
		facetCounts({
			status: facet('status', bookingPayments.status),
			method: facet('method', bookingPayments.paymentMethod),
			type: facet('type', bookingPayments.paymentType)
		})
	]);

	return {
		rows: rows.map((p) => ({
			...p,
			amount: toMoney(p.amount),
			commission: p.commission === null ? null : toMoney(p.commission)
		})),
		server: { pagination: pagination(query, total), facets, filters: currentQuery(query) }
	};
}

/* ---------- plan payments ---------- */

const PLAN_FILTERS = ['status', 'method'] as const;
const coupleName = sql<string>`concat_ws(' & ', nullif(${couples.brideName}, ''), nullif(${couples.groomName}, ''))`;
const planSorts = { id: payments.id, couple: coupleName, amount: payments.amount, date: payments.createdAt };
const planSpec: WhereSpec<(typeof PLAN_FILTERS)[number]> = {
	search: (term) =>
		or(
			like(couples.brideName, `%${term}%`),
			like(couples.groomName, `%${term}%`),
			like(payments.transactionRef, `%${term}%`)
		),
	dateColumn: payments.createdAt,
	filters: {
		status: (v) => eq(payments.status, v as typeof payments.status._.data),
		method: (v) => eq(payments.paymentMethod, v as typeof payments.paymentMethod._.data)
	}
};
const planJoined = <T extends MySqlSelect>(q: T) => q.leftJoin(couples, eq(couples.id, payments.coupleId));

async function planTab(query: TableQuery<(typeof PLAN_FILTERS)[number]>) {
	const where = buildWhere(query, planSpec);
	const [rows, [{ total }], facets] = await Promise.all([
		planJoined(
			db
				.select({
					id: payments.id,
					amount: payments.amount,
					method: payments.paymentMethod,
					status: payments.status,
					ref: payments.transactionRef,
					paidAt: payments.paidAt,
					createdAt: payments.createdAt,
					couple: coupleName
				})
				.from(payments)
				.$dynamic()
		)
			.where(where)
			.orderBy(...(orderBy(query, planSorts) ?? [desc(payments.createdAt)]))
			.limit(query.limit)
			.offset(query.offset),
		planJoined(db.select({ total: count() }).from(payments).$dynamic()).where(where),
		facetCounts({
			status: () =>
				planJoined(db.select({ value: payments.status, count: count() }).from(payments).$dynamic())
					.where(buildWhere(query, planSpec, { except: 'status' }))
					.groupBy(payments.status),
			method: () =>
				planJoined(db.select({ value: payments.paymentMethod, count: count() }).from(payments).$dynamic())
					.where(buildWhere(query, planSpec, { except: 'method' }))
					.groupBy(payments.paymentMethod)
		})
	]);

	return {
		rows: rows.map((p) => ({ ...p, amount: toMoney(p.amount), couple: p.couple || '—' })),
		server: { pagination: pagination(query, total), facets, filters: currentQuery(query) }
	};
}

/* ---------- refunds ---------- */

const REFUND_FILTERS = ['status'] as const;
const refundSorts = { id: refunds.id, amount: refunds.amount, date: refunds.createdAt };
const refundSpec: WhereSpec<(typeof REFUND_FILTERS)[number]> = {
	base: [isNull(refunds.deletedAt)],
	search: (term) => like(refunds.reason, `%${term}%`),
	dateColumn: refunds.createdAt,
	filters: { status: (v) => eq(refunds.status, v as typeof refunds.status._.data) }
};

async function refundsTab(query: TableQuery<(typeof REFUND_FILTERS)[number]>) {
	const where = buildWhere(query, refundSpec);
	const [rows, [{ total }], facets] = await Promise.all([
		db
			.select({
				id: refunds.id,
				paymentId: refunds.bookingPaymentId,
				amount: refunds.amount,
				reason: refunds.reason,
				status: refunds.status,
				createdAt: refunds.createdAt
			})
			.from(refunds)
			.where(where)
			.orderBy(...(orderBy(query, refundSorts) ?? [desc(refunds.createdAt)]))
			.limit(query.limit)
			.offset(query.offset),
		db.select({ total: count() }).from(refunds).where(where),
		facetCounts({
			status: () =>
				db
					.select({ value: refunds.status, count: count() })
					.from(refunds)
					.where(buildWhere(query, refundSpec, { except: 'status' }))
					.groupBy(refunds.status)
		})
	]);

	return {
		rows: rows.map((r) => ({ ...r, amount: toMoney(r.amount) })),
		server: { pagination: pagination(query, total), facets, filters: currentQuery(query) }
	};
}

export const load: PageServerLoad = async ({ url }) => {
	const asked = url.searchParams.get('tab');
	const tab: Tab = (TABS as readonly string[]).includes(asked ?? '') ? (asked as Tab) : 'vendor';

	// The tab badge counts pending refunds whichever tab is open.
	const pendingRefunds = db
		.select({ n: count() })
		.from(refunds)
		.where(and(eq(refunds.status, 'pending'), isNull(refunds.deletedAt)))
		.then(([r]) => r.n);

	const [pending, vendor, plan, refundList] = await Promise.all([
		pendingRefunds,
		tab === 'vendor' ? vendorTab(parseTableQuery(url, VENDOR_FILTERS, 20, Object.keys(vendorSorts))) : null,
		tab === 'plan' ? planTab(parseTableQuery(url, PLAN_FILTERS, 20, Object.keys(planSorts))) : null,
		tab === 'refunds' ? refundsTab(parseTableQuery(url, REFUND_FILTERS, 20, Object.keys(refundSorts))) : null
	]);

	return { tab, pendingRefunds: pending, vendor, plan, refunds: refundList };
};

const idOnly = z.object({ id: z.coerce.number().int().positive() });

export const actions = {
	confirmPayment: async (event) => {
		const p = await parse(event.request, idOnly);
		if ('error' in p) return p.error;
		const r = await confirmBookingPayment(p.data.id);
		if (!r.ok) return bad(paymentFailureMessage[r.reason]);
		await audit(event, 'payment.confirm', 'booking_payment', p.data.id, { commission: r.commission, net: r.net });
		return ok(`Payment confirmed. Commission ${r.commission.toFixed(2)} ETB, vendor credited ${r.net.toFixed(2)} ETB.`);
	},
	failPayment: async (event) => {
		const p = await parse(event.request, idOnly);
		if ('error' in p) return p.error;
		const r = await failBookingPayment(p.data.id);
		if (!r.ok) return bad(paymentFailureMessage[r.reason]);
		await audit(event, 'payment.fail', 'booking_payment', p.data.id);
		return ok('Payment marked as not received');
	},
	approveRefund: async (event) => {
		const p = await parse(event.request, idOnly);
		if ('error' in p) return p.error;
		const result = await db.transaction(async (tx) => {
			// Conditional update = the lock: a double-click can't approve twice.
			const res = await tx
				.update(refunds)
				.set({ status: 'approved' })
				.where(and(eq(refunds.id, p.data.id), eq(refunds.status, 'pending')));
			if (!res[0].affectedRows) return false;
			const [r] = await tx.select({ pid: refunds.bookingPaymentId }).from(refunds).where(eq(refunds.id, p.data.id));
			await tx.update(bookingPayments).set({ status: 'refunded' }).where(eq(bookingPayments.id, r.pid));
			return true;
		});
		if (!result) return bad('Refund is no longer pending');
		await audit(event, 'refund.approve', 'refund', p.data.id);
		return ok('Refund approved — remember to send the money back through the gateway.');
	},
	rejectRefund: async (event) => {
		const p = await parse(event.request, idOnly);
		if ('error' in p) return p.error;
		const res = await db
			.update(refunds)
			.set({ status: 'rejected' })
			.where(and(eq(refunds.id, p.data.id), eq(refunds.status, 'pending')));
		if (!res[0].affectedRows) return bad('Refund is no longer pending');
		await audit(event, 'refund.reject', 'refund', p.data.id);
		return ok('Refund rejected');
	}
} satisfies Actions;
