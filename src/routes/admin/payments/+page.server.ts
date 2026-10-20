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
import {
	payments,
	bookingPayments,
	refunds,
	couples,
	vendors,
	paymentCommissions,
	bankAccounts,
	subscriptionPlans,
	user
} from '$lib/server/db/schema';
import { parse, ok, bad } from '$lib/server/adminAction';
import { audit } from '$lib/server/auditLog';
import { toMoney } from '$lib/money';
import { approveRefund } from '$lib/server/bookingPayments';
import {
	confirmTransfer,
	PaymentRefused,
	reconcileStale,
	rejectTransfer,
	verify,
	type PaymentKind
} from '$lib/server/payments';
import { reviewSchema } from '$lib/schemas/payment';
import { requirePermission } from '$lib/server/permissions';
import { PERM } from '$lib/access';
import type { Actions, PageServerLoad } from './$types';

/**
 * Three lists, one per tab. Each is a server-paged table and they share the URL's table
 * params, so the tab is in the URL too (`?tab=`) and only the open tab's list is loaded.
 */
const TABS = ['review', 'vendor', 'plan', 'refunds'] as const;
type Tab = (typeof TABS)[number];

const coupleName = sql<string>`concat_ws(' & ', nullif(${couples.brideName}, ''), nullif(${couples.groomName}, ''))`;

/* ---------- receipts waiting for review ---------- */

/**
 * Every manual payment still `pending`, from both tables: the work queue. Bounded by nature
 * (each is a receipt someone has to look at), so not paged.
 */
async function reviewTab() {
	const [bookingRows, planRows] = await Promise.all([
		db
			.select({
				id: bookingPayments.id,
				amount: bookingPayments.amount,
				method: bookingPayments.paymentMethod,
				type: bookingPayments.paymentType,
				receiptFile: bookingPayments.receiptFile,
				note: bookingPayments.verifyPayload,
				createdAt: bookingPayments.createdAt,
				payer: user.name,
				payerEmail: user.email,
				vendor: vendors.businessName,
				bank: bankAccounts.bankName,
				account: bankAccounts.accountNumber
			})
			.from(bookingPayments)
			.leftJoin(user, eq(user.id, bookingPayments.payerId))
			.leftJoin(vendors, eq(vendors.id, bookingPayments.payeeVendorId))
			.leftJoin(bankAccounts, eq(bankAccounts.id, bookingPayments.bankAccountId))
			.where(
				and(
					eq(bookingPayments.status, 'pending'),
					sql`${bookingPayments.paymentMethod} <> 'chapa'`,
					isNull(bookingPayments.deletedAt)
				)
			)
			.orderBy(bookingPayments.createdAt),
		db
			.select({
				id: payments.id,
				amount: payments.amount,
				method: payments.paymentMethod,
				receiptFile: payments.receiptFile,
				note: payments.verifyPayload,
				createdAt: payments.createdAt,
				couple: coupleName,
				payerEmail: couples.email,
				vendorId: payments.vendorId,
				vendorName: vendors.businessName,
				vendorEmail: vendors.email,
				plan: subscriptionPlans.name,
				bank: bankAccounts.bankName,
				account: bankAccounts.accountNumber
			})
			.from(payments)
			.leftJoin(couples, eq(couples.id, payments.coupleId))
			.leftJoin(vendors, eq(vendors.id, payments.vendorId))
			.leftJoin(subscriptionPlans, eq(subscriptionPlans.id, payments.subscriptionPlanId))
			.leftJoin(bankAccounts, eq(bankAccounts.id, payments.bankAccountId))
			.where(and(eq(payments.status, 'pending'), eq(payments.paymentMethod, 'bank_transfer')))
			.orderBy(payments.createdAt)
	]);

	return [
		...bookingRows.map((r) => ({
			kind: 'booking' as PaymentKind,
			id: r.id,
			amount: toMoney(r.amount),
			payer: r.payer ?? '—',
			payerEmail: r.payerEmail,
			forWhat: `${r.vendor ?? 'Vendor'} (${r.type})`,
			bank: r.bank ? `${r.bank} · ${r.account}` : '—',
			receiptFile: r.receiptFile,
			note: r.note,
			createdAt: r.createdAt
		})),
		...planRows.map((r) => ({
			kind: (r.vendorId ? 'vendor_plan' : 'plan') as PaymentKind,
			id: r.id,
			amount: toMoney(r.amount),
			payer: r.vendorId ? (r.vendorName ?? 'Vendor') : r.couple || '—',
			payerEmail: r.vendorId ? r.vendorEmail : r.payerEmail,
			forWhat: `${r.plan ?? 'Plan'} ${r.vendorId ? 'vendor ' : ''}plan`,
			bank: r.bank ? `${r.bank} · ${r.account}` : '—',
			receiptFile: r.receiptFile,
			note: r.note,
			createdAt: r.createdAt
		}))
	].sort((a, b) => +a.createdAt - +b.createdAt);
}

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
					receiptFile: bookingPayments.receiptFile,
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
const planJoined = <T extends MySqlSelect>(q: T) =>
	q.leftJoin(couples, eq(couples.id, payments.coupleId)).leftJoin(vendors, eq(vendors.id, payments.vendorId));

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
					receiptFile: payments.receiptFile,
					paidAt: payments.paidAt,
					createdAt: payments.createdAt,
					couple: coupleName,
					vendorName: vendors.businessName
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
		rows: rows.map((p) => ({
			...p,
			amount: toMoney(p.amount),
			couple: p.couple || (p.vendorName ? `${p.vendorName} (vendor)` : '—')
		})),
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
	const tab: Tab = (TABS as readonly string[]).includes(asked ?? '') ? (asked as Tab) : 'review';

	// The tab badge counts pending refunds whichever tab is open.
	const pendingRefunds = db
		.select({ n: count() })
		.from(refunds)
		.where(and(eq(refunds.status, 'pending'), isNull(refunds.deletedAt)))
		.then(([r]) => r.n);

	const [pending, review, vendor, plan, refundList] = await Promise.all([
		pendingRefunds,
		reviewTab(),
		tab === 'vendor' ? vendorTab(parseTableQuery(url, VENDOR_FILTERS, 20, Object.keys(vendorSorts))) : null,
		tab === 'plan' ? planTab(parseTableQuery(url, PLAN_FILTERS, 20, Object.keys(planSorts))) : null,
		tab === 'refunds' ? refundsTab(parseTableQuery(url, REFUND_FILTERS, 20, Object.keys(refundSorts))) : null
	]);

	return { tab, pendingRefunds: pending, review, vendor, plan, refunds: refundList };
};

const idOnly = z.object({ id: z.coerce.number().int().positive() });

export const actions = {
	/** The receipt matches the bank statement: settle it (commission and wallet, or the plan). */
	confirmTransfer: async (event) => {
		requirePermission(event.locals, PERM.paymentsManage);
		const p = await parse(event.request, reviewSchema);
		if ('error' in p) return p.error;
		try {
			await confirmTransfer(p.data.kind, p.data.id, event.locals.user!.id);
		} catch (err) {
			if (err instanceof PaymentRefused) return bad(err.message);
			throw err;
		}
		await audit(event, 'payment.confirm', `${p.data.kind}_payment`, p.data.id);
		return ok('Payment confirmed. The payer has been notified.');
	},
	/** The receipt doesn't match: fail it with a reason the payer is told. */
	rejectTransfer: async (event) => {
		requirePermission(event.locals, PERM.paymentsManage);
		const p = await parse(event.request, reviewSchema);
		if ('error' in p) return p.error;
		if (!p.data.reason) return bad('Give a reason — the payer will see it.');
		try {
			await rejectTransfer(p.data.kind, p.data.id, p.data.reason, event.locals.user!.id);
		} catch (err) {
			if (err instanceof PaymentRefused) return bad(err.message);
			throw err;
		}
		await audit(event, 'payment.reject', `${p.data.kind}_payment`, p.data.id, { reason: p.data.reason });
		return ok('Receipt rejected. The payer has been told why.');
	},
	/** Asks Chapa again about one pending online payment. */
	recheckChapa: async (event) => {
		requirePermission(event.locals, PERM.paymentsManage);
		const p = await parse(event.request, z.object({ ref: z.string().min(3).max(150) }));
		if ('error' in p) return p.error;
		const outcome = await verify(p.data.ref);
		return outcome.status === 'paid'
			? ok('Chapa confirmed the payment; it is now settled.')
			: outcome.status === 'failed'
				? ok('Chapa says this payment failed.')
				: bad('Chapa has not confirmed this payment yet.');
	},
	/** Runs the reconcile job now instead of waiting for the next tick. */
	reconcile: async ({ locals }) => {
		requirePermission(locals, PERM.paymentsManage);
		const settled = await reconcileStale(50);
		return ok(`Checked open Chapa payments: ${settled} newly settled.`);
	},
	approveRefund: async (event) => {
		requirePermission(event.locals, PERM.refunds);
		const p = await parse(event.request, idOnly);
		if ('error' in p) return p.error;
		const result = await approveRefund(p.data.id);
		if (!result.ok) return bad(result.reason);
		await audit(event, 'refund.approve', 'refund', p.data.id, { debited: result.debited });
		return ok(
			`Refund approved${result.debited ? ` and ${result.debited.toFixed(2)} ETB taken back from the vendor's wallet` : ''}. Send the money back through Chapa or by transfer.`
		);
	},
	rejectRefund: async (event) => {
		requirePermission(event.locals, PERM.refunds);
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
