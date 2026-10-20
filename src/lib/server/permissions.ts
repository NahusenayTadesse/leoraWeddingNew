import { error } from '@sveltejs/kit';
import { and, eq, isNull } from 'drizzle-orm';
import type { Grant } from '@nahu/admin-kit/server/hooks';
import { db } from '$lib/server/db';
import { permissions, rolePermissions, roles, specialPermissions, user } from '$lib/server/db/schema';
import { ADMIN_PERMISSION, PERM } from '$lib/access';

export const NO_GRANT: Grant = { permList: [], isSuperAdmin: false };

/**
 * A user's staff permissions: the 'Admin' role is a super admin (everything); any other role
 * gets its `role_permissions`, plus anything granted to the person in `special_permissions`.
 * Anyone holding at least one also gets `admin.access`, which opens the overview.
 */
export async function loadGrant(userId: string): Promise<Grant> {
	const [row] = await db
		.select({ roleId: user.roleId, roleName: roles.name })
		.from(user)
		.leftJoin(roles, eq(user.roleId, roles.id))
		.where(eq(user.id, userId))
		.limit(1);
	if (!row) return NO_GRANT;
	if (row.roleName === 'Admin') return { permList: [ADMIN_PERMISSION], isSuperAdmin: true };

	const [fromRole, personal] = await Promise.all([
		row.roleId
			? db
					.select({ name: permissions.name })
					.from(rolePermissions)
					.innerJoin(permissions, eq(permissions.id, rolePermissions.permissionId))
					.where(
						and(
							eq(rolePermissions.roleId, row.roleId),
							eq(rolePermissions.isActive, true),
							isNull(rolePermissions.deletedAt)
						)
					)
			: [],
		db
			.select({ name: permissions.name })
			.from(specialPermissions)
			.innerJoin(permissions, eq(permissions.id, specialPermissions.permissionId))
			.where(
				and(
					eq(specialPermissions.userId, userId),
					eq(specialPermissions.isActive, true),
					isNull(specialPermissions.deletedAt)
				)
			)
	]);

	// Only staff permissions count. The Vendor role's seeded payment.view/order.view are for its
	// own portal and must not open the admin console.
	const staff = new Set<string>(Object.values(PERM));
	const names = [...new Set([...fromRole, ...personal].map((p) => p.name))].filter((n) => staff.has(n));
	const permList = row.roleName === 'Vendor' ? personal.map((p) => p.name).filter((n) => staff.has(n)) : names;
	return permList.length ? { permList: [ADMIN_PERMISSION, ...permList], isSuperAdmin: false } : NO_GRANT;
}

/** For actions that need more than the page's own permission. Super admins pass. */
export function requirePermission(locals: App.Locals, permission: string) {
	if (locals.isSuperAdmin || locals.permList?.includes(permission)) return;
	error(403, 'You do not have permission to do that.');
}
