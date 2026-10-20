import { and, count, desc, eq, like, or, sql } from 'drizzle-orm';
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
import { vendorBookings, vendors, weddingPlans, couples } from '$lib/server/db/schema';
import { bookingCancelSchema } from '$lib/schemas/admin';
import { audit } from '$lib/server/auditLog';
import { toMoney } from '$lib/money';
import type { Actions, PageServerLoad } from './$types';

const FILTERS = ['status'] as const;
type Filter = (typeof FILTERS)[number];

const coupleName = sql<string>`concat_ws(' & ', nullif(${couples.brideName}, ''), nullif(${couples.groomName}, ''))`;

const SORTS = {
	id: vendorBookings.id,
	couple: coupleName,
	vendor: vendors.businessName,
	eventDate: vendorBookings.eventDate,
	price: vendorBookings.agreedPrice,
	createdAt: vendorBookings.createdAt
};

const spec: WhereSpec<Filter> = {
	search: (term) =>
		or(
			like(vendors.businessName, `%${term}%`),
			like(couples.brideName, `%${term}%`),
			like(couples.groomName, `%${term}%`)
		),
	dateColumn: vendorBookings.eventDate,
	filters: {
		status: (value) => eq(vendorBookings.status, value as typeof vendorBookings.status._.data)
	}
};

/** The joins every query on this list shares, so search and facets see the same rows. */
function joined<T extends MySqlSelect>(query: T) {
	return query
		.innerJoin(vendors, eq(vendors.id, vendorBookings.vendorId))
		.innerJoin(weddingPlans, eq(weddingPlans.id, vendorBookings.weddingPlanId))
		.innerJoin(couples, eq(couples.id, weddingPlans.coupleId));
}

export const load: PageServerLoad = async ({ url }) => {
	const query = parseTableQuery(url, FILTERS, 20, Object.keys(SORTS));
	const where = buildWhere(query, spec);

	const [rows, [{ total }], facets, cancelForm] = await Promise.all([
		joined(
			db
				.select({
					id: vendorBookings.id,
					status: vendorBookings.status,
					price: vendorBookings.agreedPrice,
					eventDate: vendorBookings.eventDate,
					createdAt: vendorBookings.createdAt,
					cancelledBy: vendorBookings.cancelledBy,
					reason: vendorBookings.cancellationReason,
					vendor: vendors.businessName,
					couple: coupleName
				})
				.from(vendorBookings)
				.$dynamic()
		)
			.where(where)
			.orderBy(...(orderBy(query, SORTS) ?? [desc(vendorBookings.createdAt)]))
			.limit(query.limit)
			.offset(query.offset),
		joined(db.select({ total: count() }).from(vendorBookings).$dynamic()).where(where),
		facetCounts({
			status: () =>
				joined(
					db.select({ value: vendorBookings.status, count: count() }).from(vendorBookings).$dynamic()
				)
					.where(buildWhere(query, spec, { except: 'status' }))
					.groupBy(vendorBookings.status)
		}),
		superValidate(zod4(bookingCancelSchema))
	]);

	return {
		rows: rows.map((r) => ({
			...r,
			price: r.price === null ? null : toMoney(r.price),
			couple: r.couple || 'Couple'
		})),
		server: { pagination: pagination(query, total), facets, filters: currentQuery(query) },
		cancelForm
	};
};

export const actions = {
	cancel: async (event) => {
		const form = await superValidate(event.request, zod4(bookingCancelSchema));
		if (!form.valid) {
			return message(form, { type: 'error', text: 'Give a reason' }, { status: 400 });
		}
		const res = await db
			.update(vendorBookings)
			.set({
				status: 'cancelled',
				cancelledBy: 'admin',
				cancellationReason: form.data.reason,
				cancelledAt: new Date()
			})
			.where(and(eq(vendorBookings.id, form.data.id), eq(vendorBookings.status, 'pending')));
		if (!res[0].affectedRows) {
			// confirmed bookings may carry payments; cancel those via disputes/refunds
			return message(
				form,
				{
					type: 'error',
					text: 'Only pending bookings can be cancelled here. Use disputes/refunds for confirmed ones.'
				},
				{ status: 400 }
			);
		}
		await audit(event, 'booking.cancel', 'vendor_booking', form.data.id, { reason: form.data.reason });
		return message(form, { type: 'success', text: 'Booking cancelled' });
	}
} satisfies Actions;
