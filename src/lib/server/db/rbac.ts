import { relations } from 'drizzle-orm';
import { mysqlTable, int, varchar, unique } from 'drizzle-orm/mysql-core';
import { secureFields, userRef, roles, user } from './common';

/** Role/permission tables. Kept out of auth.schema.ts — see common.ts. */

export const permissions = mysqlTable('permissions', {
	id: int('id').autoincrement().primaryKey(),
	name: varchar('name', { length: 50 }).notNull().unique(),
	description: varchar('description', { length: 255 })
});

export const rolePermissions = mysqlTable(
	'role_permissions',
	{
		id: int('id').autoincrement().primaryKey(),
		roleId: int('role_id')
			.notNull()
			.references(() => roles.id, { onDelete: 'cascade' }),
		permissionId: int('permission_id')
			.notNull()
			.references(() => permissions.id, { onDelete: 'cascade' }),
		...secureFields
	},
	// A grant is a fact, not a list entry — without this the same permission
	// can be granted to a role repeatedly, and the admin UI shows duplicates.
	(table) => [unique('role_permissions_role_permission_uq').on(table.roleId, table.permissionId)]
);

export const specialPermissions = mysqlTable(
	'special_permissions',
	{
		id: int('id').autoincrement().primaryKey(),
		userId: userRef('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		permissionId: int('permission_id')
			.notNull()
			.references(() => permissions.id, { onDelete: 'cascade' }),
		...secureFields
	},
	(table) => [
		unique('special_permissions_user_permission_uq').on(table.userId, table.permissionId)
	]
);

export const rolesRelations = relations(roles, ({ many }) => ({
	rolePermissions: many(rolePermissions)
}));

export const permissionsRelations = relations(permissions, ({ many }) => ({
	rolePermissions: many(rolePermissions),
	specialPermissions: many(specialPermissions)
}));

export const specialPermissionsRelations = relations(specialPermissions, ({ one }) => ({
	user: one(user, {
		fields: [specialPermissions.userId],
		references: [user.id]
	}),
	permission: one(permissions, {
		fields: [specialPermissions.permissionId],
		references: [permissions.id]
	})
}));

export const rolePermissionsRelations = relations(rolePermissions, ({ one }) => ({
	role: one(roles, {
		fields: [rolePermissions.roleId],
		references: [roles.id]
	}),
	permission: one(permissions, {
		fields: [rolePermissions.permissionId],
		references: [permissions.id]
	})
}));
