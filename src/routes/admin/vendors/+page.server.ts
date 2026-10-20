import { and, count, desc, eq, isNull, like, or } from 'drizzle-orm';
import { z } from 'zod/v4';
import type { MySqlSelect } from 'drizzle-orm/mysql-core';
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
import { vendors, vendorCategories } from '$lib/server/db/schema';
import { vendorStatusSchema } from '$lib/schemas/admin';
import { parse, ok, bad } from '$lib/server/adminAction';
import { statusLabel } from '$lib/status';
import { audit } from '$lib/server/auditLog';
import { notify } from '$lib/server/notify';
import { requirePermission } from '$lib/server/permissions';
import { PERM } from '$lib/access';
import type { Actions, PageServerLoad } from './$types';

const FILTERS = ['status', 'categoryId'] as const;
type Filter = (typeof FILTERS)[number];

const SORTS = {
	businessName: vendors.businessName,
	city: vendors.city,
	createdAt: vendors.createdAt
};

const spec: WhereSpec<Filter> = {
	base: [isNull(vendors.deletedAt)],
	search: (term) =>
		or(
			like(vendors.businessName, `%${term}%`),
			like(vendors.email, `%${term}%`),
			like(vendors.phone, `%${term}%`),
			like(vendors.city, `%${term}%`)
		),
	dateColumn: vendors.createdAt,
	filters: {
		status: (v) => eq(vendors.status, v as typeof vendors.status._.data),
		categoryId: (v) => eq(vendors.categoryId, Number(v))
	}
};

function joined<T extends MySqlSelect>(query: T) {
	return query.leftJoin(vendorCategories, eq(vendorCategories.id, vendors.categoryId));
}

export const load: PageServerLoad = async ({ url }) => {
	const query = parseTableQuery(url, FILTERS, 20, Object.keys(SORTS));
	const where = buildWhere(query, spec);

	const [rows, [{ total }], facets] = await Promise.all([
		joined(
			db
				.select({
					id: vendors.id,
					businessName: vendors.businessName,
					category: vendorCategories.name,
					city: vendors.city,
					email: vendors.email,
					phone: vendors.phone,
					status: vendors.status,
					isVerified: vendors.isVerified,
					createdAt: vendors.createdAt
				})
				.from(vendors)
				.$dynamic()
		)
			.where(where)
			.orderBy(...(orderBy(query, SORTS) ?? [desc(vendors.createdAt)]))
			.limit(query.limit)
			.offset(query.offset),
		joined(db.select({ total: count() }).from(vendors).$dynamic()).where(where),
		facetCounts({
			status: () =>
				joined(db.select({ value: vendors.status, count: count() }).from(vendors).$dynamic())
					.where(buildWhere(query, spec, { except: 'status' }))
					.groupBy(vendors.status),
			categoryId: () =>
				joined(
					db
						.select({ value: vendorCategories.id, label: vendorCategories.name, count: count() })
						.from(vendors)
						.$dynamic()
				)
					.where(buildWhere(query, spec, { except: 'categoryId' }))
					.groupBy(vendorCategories.id, vendorCategories.name)
		})
	]);

	return {
		rows,
		server: { pagination: pagination(query, total), facets, filters: currentQuery(query) }
	};
};

/** What a vendor is told when an admin changes their listing's status. */
const VENDOR_STATUS_MESSAGE: Record<string, { title: string; body: (name: string) => string }> = {
	approved: {
		title: 'Your listing is live',
		body: (name) => `${name} has been approved and is now visible to couples on Leora Events.`
	},
	rejected: {
		title: 'Your listing was not approved',
		body: (name) =>
			`We couldn't approve ${name} yet. Reply to this email or contact vendors@leoraevents.et and we'll tell you what's needed.`
	},
	suspended: {
		title: 'Your listing has been suspended',
		body: (name) =>
			`${name} is hidden from couples for now. Contact vendors@leoraevents.et to resolve this.`
	}
};

/** Changes a vendor's status, audits it and tells the vendor. False if there is no such vendor. */
async function setVendorStatus(
	event: Parameters<typeof audit>[0],
	id: number,
	status: 'pending' | 'approved' | 'rejected' | 'suspended'
) {
	const [before] = await db
		.select({ status: vendors.status, userId: vendors.userId, name: vendors.businessName })
		.from(vendors)
		.where(and(eq(vendors.id, id), isNull(vendors.deletedAt)));
	if (!before) return false;

	await db.update(vendors).set({ status }).where(eq(vendors.id, id));
	await audit(event, 'vendor.status', 'vendor', id, { from: before.status, to: status });

	if (before.status !== status) {
		const message = VENDOR_STATUS_MESSAGE[status];
		if (message) {
			await notify(before.userId, {
				type: `vendor_${status}`,
				title: message.title,
				body: message.body(before.name ?? 'your business'),
				link: '/vendor-dashboard'
			});
		}
	}
	return true;
}

export const actions = {
	/** One decision for several vendors at once; each is audited and told, as for a single one. */
	bulkStatus: async (event) => {
		requirePermission(event.locals, PERM.vendorsApprove);
		const p = await parse(
			event.request,
			z.object({
				ids: z
					.string()
					.transform((v) =>
						v
							.split(',')
							.map(Number)
							.filter((n) => Number.isInteger(n) && n > 0)
					)
					.refine((a) => a.length > 0 && a.length <= 200, 'Select between 1 and 200 vendors'),
				status: z.enum(['approved', 'rejected'])
			})
		);
		if ('error' in p) return p.error;
		let changed = 0;
		for (const id of p.data.ids) {
			if (await setVendorStatus(event, id, p.data.status)) changed++;
		}
		return ok(`${changed} vendor${changed === 1 ? '' : 's'} marked ${p.data.status}`);
	},
	updateStatus: async (event) => {
		requirePermission(event.locals, PERM.vendorsApprove);
		const p = await parse(event.request, vendorStatusSchema);
		if ('error' in p) return p.error;

		if (!(await setVendorStatus(event, p.data.id, p.data.status)))
			return bad('Vendor not found', 404);
		return ok(`Vendor marked ${statusLabel(p.data.status).toLowerCase()}`);
	}
} satisfies Actions;
