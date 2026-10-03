import { desc, eq, isNull, and } from 'drizzle-orm';
import { z } from 'zod/v4';
import { db } from '$lib/server/db';
import { user, roles, couples, vendors } from '$lib/server/db/schema';
import { parse, ok, bad } from '$lib/server/adminAction';
import { audit } from '$lib/server/auditLog';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const [users, roleList, coupleRows, vendorRows] = await Promise.all([
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
				createdAt: user.createdAt
			})
			.from(user)
			.leftJoin(roles, eq(roles.id, user.roleId))
			.orderBy(desc(user.createdAt))
			.limit(1000),
		db.select({ id: roles.id, name: roles.name }).from(roles).where(eq(roles.isActive, true)),
		db
			.select({ p1: couples.partner1UserId, p2: couples.partner2UserId })
			.from(couples)
			.where(isNull(couples.deletedAt)),
		db.select({ userId: vendors.userId }).from(vendors).where(isNull(vendors.deletedAt))
	]);

	const coupleIds = new Set(coupleRows.flatMap((c) => [c.p1, c.p2]).filter(Boolean));
	const vendorIds = new Set(vendorRows.map((v) => v.userId).filter(Boolean));

	return {
		roles: roleList,
		users: users.map((u) => ({
			...u,
			kind: vendorIds.has(u.id) ? 'vendor' : coupleIds.has(u.id) ? 'couple' : 'none'
		}))
	};
};

const idOnly = z.object({ id: z.string().min(1) });

export const actions = {
	ban: async (event) => {
		const p = await parse(
			event.request,
			idOnly.extend({ reason: z.string().trim().max(250).optional() })
		);
		if ('error' in p) return p.error;
		if (p.data.id === event.locals.user?.id) return bad("You can't ban your own account.");
		await db
			.update(user)
			.set({ banned: true, banReason: p.data.reason || null, banExpires: null })
			.where(eq(user.id, p.data.id));
		await audit(event, 'user.ban', 'user', null, { userId: p.data.id, reason: p.data.reason });
		return ok('User banned. Their sessions stop working on the next request.');
	},
	unban: async (event) => {
		const p = await parse(event.request, idOnly);
		if ('error' in p) return p.error;
		await db
			.update(user)
			.set({ banned: false, banReason: null, banExpires: null })
			.where(eq(user.id, p.data.id));
		await audit(event, 'user.unban', 'user', null, { userId: p.data.id });
		return ok('User restored');
	},
	setRole: async (event) => {
		const p = await parse(event.request, idOnly.extend({ roleId: z.coerce.number().int().min(0) }));
		if ('error' in p) return p.error;
		if (p.data.id === event.locals.user?.id) return bad("You can't change your own role.");
		const roleId = p.data.roleId === 0 ? null : p.data.roleId;
		if (roleId !== null) {
			const [r] = await db
				.select({ id: roles.id })
				.from(roles)
				.where(and(eq(roles.id, roleId), eq(roles.isActive, true)))
				.limit(1);
			if (!r) return bad('Unknown role');
		}
		await db.update(user).set({ roleId }).where(eq(user.id, p.data.id));
		await audit(event, 'user.setRole', 'user', null, { userId: p.data.id, roleId });
		return ok('Role updated');
	}
} satisfies Actions;
