import { count, desc, eq, like, or } from 'drizzle-orm';
import {
	buildWhere,
	currentQuery,
	facetCounts,
	orderBy,
	pagination,
	parseTableQuery,
	type WhereSpec
} from '@nahu/admin-kit/server/queryFilters';
import { z } from 'zod/v4';
import { db } from '$lib/server/db';
import { contactMessages } from '$lib/server/db/schema';
import { parse, ok } from '$lib/server/adminAction';
import { audit } from '$lib/server/auditLog';
import type { Actions, PageServerLoad } from './$types';

const SORTS = { name: contactMessages.name, subject: contactMessages.subject, createdAt: contactMessages.createdAt };

const FILTERS = ['status'] as const;

const SUBJECTS: Record<string, string> = {
	couple: 'Couple planning a wedding',
	new_vendor: 'Vendor interested in joining',
	vendor: 'Existing vendor',
	press: 'Press / Media',
	other: 'Other'
};

const spec: WhereSpec<(typeof FILTERS)[number]> = {
	filters: { status: (v) => eq(contactMessages.status, v as typeof contactMessages.status._.data) },
	search: (term) =>
		or(
			like(contactMessages.name, `%${term}%`),
			like(contactMessages.email, `%${term}%`),
			like(contactMessages.subject, `%${term}%`),
			like(contactMessages.message, `%${term}%`)
		),
	dateColumn: contactMessages.createdAt
};

export const load: PageServerLoad = async ({ url }) => {
	const query = parseTableQuery(url, FILTERS, 20, Object.keys(SORTS));
	const where = buildWhere(query, spec);

	const [rows, [{ total }], facets] = await Promise.all([
		db
			.select()
			.from(contactMessages)
			.where(where)
			.orderBy(...(orderBy(query, SORTS) ?? [desc(contactMessages.createdAt)]))
			.limit(query.limit)
			.offset(query.offset),
		db.select({ total: count() }).from(contactMessages).where(where),
		facetCounts({
			status: () =>
				db
					.select({ value: contactMessages.status, count: count() })
					.from(contactMessages)
					.where(buildWhere(query, spec, { except: 'status' }))
					.groupBy(contactMessages.status)
		})
	]);

	return {
		// The public form posts a subject key; older rows hold free text.
		rows: rows.map((r) => ({ ...r, subject: SUBJECTS[r.subject] ?? r.subject })),
		server: { pagination: pagination(query, total), facets, filters: currentQuery(query) }
	};
};

export const actions = {
	/** Inbox workflow: new → read → replied. */
	setStatus: async (event) => {
		const p = await parse(
			event.request,
			z.object({ id: z.coerce.number().int().positive(), status: z.enum(['new', 'read', 'replied']) })
		);
		if ('error' in p) return p.error;
		await db.update(contactMessages).set({ status: p.data.status }).where(eq(contactMessages.id, p.data.id));
		await audit(event, 'message.status', 'contact_message', p.data.id, { status: p.data.status });
		return ok(`Marked ${p.data.status}`);
	},
	remove: async (event) => {
		const p = await parse(event.request, z.object({ id: z.coerce.number().int().positive() }));
		if ('error' in p) return p.error;
		await db.delete(contactMessages).where(eq(contactMessages.id, p.data.id));
		await audit(event, 'message.delete', 'contact_message', p.data.id);
		return ok('Message deleted');
	}
} satisfies Actions;
