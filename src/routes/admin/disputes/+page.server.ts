import { count, desc, eq, like, or, sql } from 'drizzle-orm';
import type { MySqlSelect } from 'drizzle-orm/mysql-core';
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
import { db } from '$lib/server/db';
import { disputes, vendorBookings, vendors } from '$lib/server/db/schema';
import { disputeUpdateSchema } from '$lib/schemas/admin';
import { audit } from '$lib/server/auditLog';
import type { Actions, PageServerLoad } from './$types';

const FILTERS = ['status', 'raisedBy'] as const;
type Filter = (typeof FILTERS)[number];

const SORTS = { bookingId: disputes.bookingId, vendor: vendors.businessName, createdAt: disputes.createdAt };

const spec: WhereSpec<Filter> = {
	search: (term) => or(like(vendors.businessName, `%${term}%`), like(disputes.reason, `%${term}%`)),
	dateColumn: disputes.createdAt,
	filters: {
		status: (v) => eq(disputes.status, v as typeof disputes.status._.data),
		raisedBy: (v) => eq(disputes.raisedBy, v as typeof disputes.raisedBy._.data)
	}
};

/** What still needs an admin comes first: open, then under review, then the settled ones. */
const needsActionFirst = sql`field(${disputes.status}, 'open', 'under_review', 'resolved', 'refunded')`;

function joined<T extends MySqlSelect>(query: T) {
	return query
		.innerJoin(vendorBookings, eq(vendorBookings.id, disputes.bookingId))
		.innerJoin(vendors, eq(vendors.id, vendorBookings.vendorId));
}

export const load: PageServerLoad = async ({ url }) => {
	const query = parseTableQuery(url, FILTERS, 20, Object.keys(SORTS));
	const where = buildWhere(query, spec);

	const [rows, [{ total }], facets, updateForm] = await Promise.all([
		joined(
			db
				.select({
					id: disputes.id,
					bookingId: disputes.bookingId,
					raisedBy: disputes.raisedBy,
					reason: disputes.reason,
					status: disputes.status,
					notes: disputes.resolutionNotes,
					createdAt: disputes.createdAt,
					vendor: vendors.businessName
				})
				.from(disputes)
				.$dynamic()
		)
			.where(where)
			.orderBy(...(orderBy(query, SORTS) ?? [needsActionFirst, desc(disputes.createdAt)]))
			.limit(query.limit)
			.offset(query.offset),
		joined(db.select({ total: count() }).from(disputes).$dynamic()).where(where),
		facetCounts({
			status: () =>
				joined(db.select({ value: disputes.status, count: count() }).from(disputes).$dynamic())
					.where(buildWhere(query, spec, { except: 'status' }))
					.groupBy(disputes.status),
			raisedBy: () =>
				joined(db.select({ value: disputes.raisedBy, count: count() }).from(disputes).$dynamic())
					.where(buildWhere(query, spec, { except: 'raisedBy' }))
					.groupBy(disputes.raisedBy)
		}),
		superValidate(zod4(disputeUpdateSchema))
	]);

	return {
		rows,
		server: { pagination: pagination(query, total), facets, filters: currentQuery(query) },
		updateForm
	};
};

export const actions = {
	update: async (event) => {
		const form = await superValidate(event.request, zod4(disputeUpdateSchema));
		if (!form.valid) return message(form, { type: 'error', text: 'Invalid request' }, { status: 400 });
		await db
			.update(disputes)
			.set({ status: form.data.status, resolutionNotes: form.data.notes || null })
			.where(eq(disputes.id, form.data.id));
		await audit(event, 'dispute.update', 'dispute', form.data.id, { status: form.data.status });
		return message(form, { type: 'success', text: 'Dispute updated' });
	}
} satisfies Actions;
