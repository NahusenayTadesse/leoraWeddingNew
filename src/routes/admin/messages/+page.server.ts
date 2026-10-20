import { count, desc, eq, like, or } from 'drizzle-orm';
import {
	buildWhere,
	currentQuery,
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

const spec: WhereSpec<never> = {
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
	const query = parseTableQuery(url, [], 20, Object.keys(SORTS));
	const where = buildWhere(query, spec);

	const [rows, [{ total }]] = await Promise.all([
		db
			.select()
			.from(contactMessages)
			.where(where)
			.orderBy(...(orderBy(query, SORTS) ?? [desc(contactMessages.createdAt)]))
			.limit(query.limit)
			.offset(query.offset),
		db.select({ total: count() }).from(contactMessages).where(where)
	]);

	return { rows, server: { pagination: pagination(query, total), filters: currentQuery(query) } };
};

export const actions = {
	remove: async (event) => {
		const p = await parse(event.request, z.object({ id: z.coerce.number().int().positive() }));
		if ('error' in p) return p.error;
		await db.delete(contactMessages).where(eq(contactMessages.id, p.data.id));
		await audit(event, 'message.delete', 'contact_message', p.data.id);
		return ok('Message deleted');
	}
} satisfies Actions;
