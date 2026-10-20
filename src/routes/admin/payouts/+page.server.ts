import { and, count, desc, eq, like, or, sql } from 'drizzle-orm';
import type { MySqlSelect } from 'drizzle-orm/mysql-core';
import { z } from 'zod/v4';
import { message, superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import {
	buildWhere,
	currentQuery,
	facetCounts,
	orderBy,
	pagination,
	parseTableQuery,
	type WhereSpec
} from '@nahu/admin-kit/server/queryFilters';
import { payoutCompleteSchema } from '$lib/schemas/admin';
import { db } from '$lib/server/db';
import { vendorPayouts, vendors, vendorWallets, walletTransactions } from '$lib/server/db/schema';
import { parse, ok, bad } from '$lib/server/adminAction';
import { audit } from '$lib/server/auditLog';
import { toMoney, fromMoney, formatETB } from '$lib/money';
import { notify } from '$lib/server/notify';

/** Tells the vendor what happened to their payout request. */
async function tellVendor(payoutId: number, title: string, body: (amount: string) => string) {
	const [row] = await db
		.select({ userId: vendors.userId, amount: vendorPayouts.amount })
		.from(vendorPayouts)
		.innerJoin(vendors, eq(vendors.id, vendorPayouts.vendorId))
		.where(eq(vendorPayouts.id, payoutId));
	if (row) {
		await notify(row.userId, {
			type: 'payout_update',
			title,
			body: body(formatETB(toMoney(row.amount))),
			link: '/vendor-dashboard/payments'
		});
	}
}
import type { Actions, PageServerLoad } from './$types';

const FILTERS = ['status', 'method'] as const;
type Filter = (typeof FILTERS)[number];

const SORTS = {
	id: vendorPayouts.id,
	vendor: vendors.businessName,
	amount: vendorPayouts.amount,
	createdAt: vendorPayouts.createdAt
};

const spec: WhereSpec<Filter> = {
	search: (term) => or(like(vendors.businessName, `%${term}%`), like(vendorPayouts.reference, `%${term}%`)),
	dateColumn: vendorPayouts.createdAt,
	filters: {
		status: (v) => eq(vendorPayouts.status, v as typeof vendorPayouts.status._.data),
		method: (v) => eq(vendorPayouts.payoutMethod, v as typeof vendorPayouts.payoutMethod._.data)
	}
};

function joined<T extends MySqlSelect>(query: T) {
	return query
		.innerJoin(vendors, eq(vendors.id, vendorPayouts.vendorId))
		.leftJoin(vendorWallets, eq(vendorWallets.vendorId, vendorPayouts.vendorId));
}

export const load: PageServerLoad = async ({ url }) => {
	const query = parseTableQuery(url, FILTERS, 20, Object.keys(SORTS));
	const where = buildWhere(query, spec);

	const [rows, [{ total }], facets, completeForm] = await Promise.all([
		joined(
			db
				.select({
					id: vendorPayouts.id,
					vendorId: vendorPayouts.vendorId,
					vendor: vendors.businessName,
					amount: vendorPayouts.amount,
					method: vendorPayouts.payoutMethod,
					status: vendorPayouts.status,
					reference: vendorPayouts.reference,
					destination: vendorPayouts.destination,
					createdAt: vendorPayouts.createdAt,
					balance: vendorWallets.balance
				})
				.from(vendorPayouts)
				.$dynamic()
		)
			.where(where)
			.orderBy(...(orderBy(query, SORTS) ?? [desc(vendorPayouts.createdAt)]))
			.limit(query.limit)
			.offset(query.offset),
		joined(db.select({ total: count() }).from(vendorPayouts).$dynamic()).where(where),
		facetCounts({
			status: () =>
				joined(db.select({ value: vendorPayouts.status, count: count() }).from(vendorPayouts).$dynamic())
					.where(buildWhere(query, spec, { except: 'status' }))
					.groupBy(vendorPayouts.status),
			method: () =>
				joined(
					db.select({ value: vendorPayouts.payoutMethod, count: count() }).from(vendorPayouts).$dynamic()
				)
					.where(buildWhere(query, spec, { except: 'method' }))
					.groupBy(vendorPayouts.payoutMethod)
		}),
		superValidate(zod4(payoutCompleteSchema))
	]);

	return {
		rows: rows.map((r) => ({ ...r, amount: toMoney(r.amount), balance: toMoney(r.balance) })),
		server: { pagination: pagination(query, total), facets, filters: currentQuery(query) },
		completeForm
	};
};

const idOnly = z.object({ id: z.coerce.number().int().positive() });

export const actions = {
	process: async (event) => {
		const p = await parse(event.request, idOnly);
		if ('error' in p) return p.error;
		const res = await db
			.update(vendorPayouts)
			.set({ status: 'processing' })
			.where(and(eq(vendorPayouts.id, p.data.id), eq(vendorPayouts.status, 'requested')));
		if (!res[0].affectedRows) return bad('Payout is no longer in "requested"');
		await audit(event, 'payout.process', 'vendor_payout', p.data.id);
		return ok('Marked as processing');
	},
	reject: async (event) => {
		const p = await parse(event.request, idOnly);
		if ('error' in p) return p.error;
		const res = await db
			.update(vendorPayouts)
			.set({ status: 'rejected' })
			.where(
				and(eq(vendorPayouts.id, p.data.id), sql`${vendorPayouts.status} in ('requested','processing')`)
			);
		if (!res[0].affectedRows) return bad('Payout already settled');
		await audit(event, 'payout.reject', 'vendor_payout', p.data.id);
		await tellVendor(p.data.id, 'Payout request declined', (a) => `Your payout request for ${a} was declined. Contact us if you have questions.`);
		return ok('Payout rejected');
	},
	complete: async (event) => {
		const form = await superValidate(event.request, zod4(payoutCompleteSchema));
		if (!form.valid) return message(form, { type: 'error', text: 'Invalid request' }, { status: 400 });
		const p = { data: form.data };
		const outcome = await db.transaction(async (tx) => {
			const [payout] = await tx
				.select()
				.from(vendorPayouts)
				.where(eq(vendorPayouts.id, p.data.id))
				.for('update');
			if (!payout || !['requested', 'processing'].includes(payout.status)) return 'settled' as const;

			const [wallet] = await tx
				.select({ balance: vendorWallets.balance })
				.from(vendorWallets)
				.where(eq(vendorWallets.vendorId, payout.vendorId))
				.for('update');
			const amount = toMoney(payout.amount);
			if (!wallet || toMoney(wallet.balance) < amount) return 'insufficient' as const;

			await tx
				.update(vendorWallets)
				.set({ balance: fromMoney(toMoney(wallet.balance) - amount) })
				.where(eq(vendorWallets.vendorId, payout.vendorId));
			await tx.insert(walletTransactions).values({
				vendorId: payout.vendorId,
				amount: fromMoney(amount),
				transactionType: 'payout',
				description: `Payout #${payout.id}`
			});
			await tx
				.update(vendorPayouts)
				.set({ status: 'completed', reference: p.data.reference || payout.reference })
				.where(eq(vendorPayouts.id, payout.id));
			return 'done' as const;
		});
		if (outcome === 'settled') {
			return message(form, { type: 'error', text: 'Payout already settled' }, { status: 400 });
		}
		if (outcome === 'insufficient') {
			return message(
				form,
				{ type: 'error', text: "Vendor's wallet balance is lower than this payout." },
				{ status: 400 }
			);
		}
		await audit(event, 'payout.complete', 'vendor_payout', p.data.id);
		await tellVendor(p.data.id, 'Payout sent', (a) => `We've sent your payout of ${a}${form.data.reference ? ` (reference ${form.data.reference})` : ''}.`);
		return message(form, { type: 'success', text: 'Payout completed and wallet debited' });
	}
} satisfies Actions;
