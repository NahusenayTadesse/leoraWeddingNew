import { count, desc, eq, isNull, like, or } from 'drizzle-orm';
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

export const actions = {
	updateStatus: async (event) => {
		requirePermission(event.locals, PERM.vendorsApprove);
		const p = await parse(event.request, vendorStatusSchema);
		if ('error' in p) return p.error;

		const [before] = await db
			.select({ status: vendors.status, userId: vendors.userId, name: vendors.businessName })
			.from(vendors)
			.where(eq(vendors.id, p.data.id));
		if (!before) return bad('Vendor not found', 404);

		await db.update(vendors).set({ status: p.data.status }).where(eq(vendors.id, p.data.id));
		await audit(event, 'vendor.status', 'vendor', p.data.id, {
			from: before.status,
			to: p.data.status
		});

		if (before.status !== p.data.status) {
			const message = VENDOR_STATUS_MESSAGE[p.data.status];
			if (message) {
				await notify(before.userId, {
					type: `vendor_${p.data.status}`,
					title: message.title,
					body: message.body(before.name ?? 'your business'),
					link: '/vendor-dashboard'
				});
			}
		}
		return ok(`Vendor marked ${statusLabel(p.data.status).toLowerCase()}`);
	}
} satisfies Actions;
