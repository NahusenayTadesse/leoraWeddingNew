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
import { db } from '$lib/server/db';
import { user, session, roles, couples, vendors } from '$lib/server/db/schema';
import { userBanSchema, userRoleSchema } from '$lib/schemas/admin';
import { parse, ok } from '@nahu/admin-kit/server/actionResults';
import { audit } from '$lib/server/auditLog';
import { requirePermission } from '$lib/server/permissions';
import { PERM } from '$lib/access';
import type { Actions, PageServerLoad } from './$types';

const FILTERS = ['kind', 'roleId', 'banned'] as const;
type Filter = (typeof FILTERS)[number];

/** Which profile the account owns: a vendor profile wins over a couple, as on the old page. */
const kind = sql<'vendor' | 'couple' | 'none'>`case
	when exists (select 1 from ${vendors} where ${vendors.userId} = ${user.id} and ${vendors.deletedAt} is null) then 'vendor'
	when exists (select 1 from ${couples} where (${couples.partner1UserId} = ${user.id} or ${couples.partner2UserId} = ${user.id}) and ${couples.deletedAt} is null) then 'couple'
	else 'none' end`;

/** `banned` is nullable; null is "never banned". */
const bannedState = sql<
	'banned' | 'active'
>`if(coalesce(${user.banned}, false), 'banned', 'active')`;

const SORTS = { name: user.name, email: user.email, createdAt: user.createdAt };

const spec: WhereSpec<Filter> = {
	search: (term) => or(like(user.name, `%${term}%`), like(user.email, `%${term}%`)),
	dateColumn: user.createdAt,
	filters: {
		kind: (value) => sql`${kind} = ${value}`,
		// `0` is the "No role" facet.
		roleId: (value) =>
			value === '0' ? sql`${user.roleId} is null` : eq(user.roleId, Number(value)),
		banned: (value) => sql`${bannedState} = ${value}`
	}
};

function joined<T extends MySqlSelect>(query: T) {
	return query.leftJoin(roles, eq(roles.id, user.roleId));
}

export const load: PageServerLoad = async ({ url }) => {
	const query = parseTableQuery(url, FILTERS, 20, Object.keys(SORTS));
	const where = buildWhere(query, spec);

	const [rows, [{ total }], facets, roleList, banForm, roleForm] = await Promise.all([
		joined(
			db
				.select({
					id: user.id,
					name: user.name,
					email: user.email,
					emailVerified: user.emailVerified,
					banned: user.banned,
					banReason: user.banReason,
					roleId: user.roleId,
					roleName: roles.name,
					kind,
					createdAt: user.createdAt
				})
				.from(user)
				.$dynamic()
		)
			.where(where)
			.orderBy(...(orderBy(query, SORTS) ?? [desc(user.createdAt)]))
			.limit(query.limit)
			.offset(query.offset),
		joined(db.select({ total: count() }).from(user).$dynamic()).where(where),
		facetCounts({
			kind: () =>
				joined(db.select({ value: kind, count: count() }).from(user).$dynamic())
					.where(buildWhere(query, spec, { except: 'kind' }))
					.groupBy(kind),
			roleId: () =>
				joined(
					db
						.select({
							value: sql<number>`coalesce(${user.roleId}, 0)`,
							label: sql<string>`coalesce(${roles.name}, 'No role')`,
							count: count()
						})
						.from(user)
						.$dynamic()
				)
					.where(buildWhere(query, spec, { except: 'roleId' }))
					.groupBy(sql`coalesce(${user.roleId}, 0)`, sql`coalesce(${roles.name}, 'No role')`),
			banned: () =>
				joined(db.select({ value: bannedState, count: count() }).from(user).$dynamic())
					.where(buildWhere(query, spec, { except: 'banned' }))
					.groupBy(bannedState)
		}),
		db.select({ id: roles.id, name: roles.name }).from(roles).where(eq(roles.isActive, true)),
		superValidate(zod4(userBanSchema)),
		superValidate(zod4(userRoleSchema))
	]);

	return {
		rows,
		roles: roleList,
		server: { pagination: pagination(query, total), facets, filters: currentQuery(query) },
		banForm,
		roleForm
	};
};

async function isAdminAccount(userId: string) {
	const [row] = await db
		.select({ name: roles.name })
		.from(user)
		.innerJoin(roles, eq(roles.id, user.roleId))
		.where(eq(user.id, userId))
		.limit(1);
	return row?.name === 'Admin';
}

export const actions = {
	ban: async (event) => {
		requirePermission(event.locals, PERM.usersManage);
		const form = await superValidate(event.request, zod4(userBanSchema));
		if (!form.valid)
			return message(form, { type: 'error', text: 'Invalid request' }, { status: 400 });
		if (form.data.id === event.locals.user?.id) {
			return message(
				form,
				{ type: 'error', text: "You can't ban your own account." },
				{ status: 400 }
			);
		}
		if (!event.locals.isSuperAdmin && (await isAdminAccount(form.data.id))) {
			return message(
				form,
				{ type: 'error', text: 'Only an admin can ban an admin.' },
				{ status: 403 }
			);
		}
		await db
			.update(user)
			.set({ banned: true, banReason: form.data.reason || null, banExpires: null })
			.where(eq(user.id, form.data.id));
		// Pages already refuse banned users in hooks; deleting the session rows
		// also closes the better-auth API, which would otherwise keep answering.
		await db.delete(session).where(eq(session.userId, form.data.id));
		await audit(event, 'user.ban', 'user', null, {
			userId: form.data.id,
			reason: form.data.reason
		});
		return message(form, { type: 'success', text: 'User banned and signed out everywhere.' });
	},
	unban: async (event) => {
		requirePermission(event.locals, PERM.usersManage);
		const p = await parse(event.request, z.object({ id: z.string().min(1) }));
		if ('error' in p) return p.error;
		await db
			.update(user)
			.set({ banned: false, banReason: null, banExpires: null })
			.where(eq(user.id, p.data.id));
		await audit(event, 'user.unban', 'user', null, { userId: p.data.id });
		return ok('User restored');
	},
	setRole: async (event) => {
		requirePermission(event.locals, PERM.usersManage);
		const form = await superValidate(event.request, zod4(userRoleSchema));
		if (!form.valid)
			return message(form, { type: 'error', text: 'Invalid request' }, { status: 400 });
		if (form.data.id === event.locals.user?.id) {
			return message(
				form,
				{ type: 'error', text: "You can't change your own role." },
				{ status: 400 }
			);
		}
		const roleId = form.data.roleId === 0 ? null : form.data.roleId;
		let roleName: string | null = null;
		if (roleId !== null) {
			const [r] = await db
				.select({ id: roles.id, name: roles.name })
				.from(roles)
				.where(and(eq(roles.id, roleId), eq(roles.isActive, true)))
				.limit(1);
			if (!r) return message(form, { type: 'error', text: 'Unknown role' }, { status: 400 });
			roleName = r.name;
		}
		// Granting or taking away Admin is for admins only; otherwise a staff member with
		// user.manage could promote an account they control.
		if (
			!event.locals.isSuperAdmin &&
			(roleName === 'Admin' || (await isAdminAccount(form.data.id)))
		) {
			return message(
				form,
				{ type: 'error', text: 'Only an admin can change admin roles.' },
				{ status: 403 }
			);
		}
		await db.update(user).set({ roleId }).where(eq(user.id, form.data.id));
		await audit(event, 'user.setRole', 'user', null, { userId: form.data.id, roleId });
		return message(form, { type: 'success', text: 'Role updated' });
	}
} satisfies Actions;
