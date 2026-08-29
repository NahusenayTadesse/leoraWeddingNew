import {
	mysqlTable,
	varchar,
	int,
	text,
	boolean,
	timestamp,
	index
} from 'drizzle-orm/mysql-core';
import { secureFields, idMaker, userRef, user, jsonCol } from './common';
import { couples } from './weddings';
import { vendors } from './vendors';

export const notifications = mysqlTable(
	'notifications',
	{
		id: idMaker(),
		userId: userRef('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		type: varchar('type', { length: 50 }).notNull(),
		title: varchar('title', { length: 200 }).notNull(),
		body: varchar('body', { length: 255 }),
		isRead: boolean('is_read').default(false).notNull(),
		/** Payload for the click-through target, e.g. `{ bookingId: 12 }`. */
		data: jsonCol('data'),
		createdAt: timestamp('created_at', { fsp: 3 }).defaultNow().notNull()
	},
	(table) => [
		// The unread badge queries both columns together on every page load.
		index('notifications_user_read_idx').on(table.userId, table.isRead)
	]
);

export const messages = mysqlTable(
	'messages',
	{
		id: idMaker(),
		senderId: userRef('sender_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		receiverId: userRef('receiver_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		/** Context for the thread: which wedding and/or vendor it concerns. */
		coupleId: int('couple_id').references(() => couples.id, { onDelete: 'set null' }),
		vendorId: int('vendor_id').references(() => vendors.id, { onDelete: 'set null' }),
		body: text('body').notNull(),
		isRead: boolean('is_read').default(false).notNull(),
		createdAt: timestamp('created_at', { fsp: 3 }).defaultNow().notNull()
	},
	(table) => [
		index('messages_sender_idx').on(table.senderId),
		// Inboxes read newest-first for one recipient.
		index('messages_receiver_created_idx').on(table.receiverId, table.createdAt)
	]
);

export const files = mysqlTable(
	'files',
	{
		id: idMaker(),
		uploaderId: userRef('uploader_id').references(() => user.id, { onDelete: 'set null' }),
		coupleId: int('couple_id').references(() => couples.id, { onDelete: 'cascade' }),
		vendorId: int('vendor_id').references(() => vendors.id, { onDelete: 'cascade' }),
		fileName: varchar('file_name', { length: 255 }).notNull(),
		filePath: varchar('file_path', { length: 500 }).notNull(),
		fileType: varchar('file_type', { length: 50 }),
		fileSize: int('file_size', { unsigned: true }),
		...secureFields
	},
	(table) => [
		index('files_couple_idx').on(table.coupleId),
		index('files_vendor_idx').on(table.vendorId)
	]
);

/**
 * Audit trail. `userId` is nullable with ON DELETE SET NULL so removing an
 * account does not erase the record of what that account did.
 */
export const activityLogs = mysqlTable(
	'activity_logs',
	{
		id: idMaker(),
		userId: userRef('user_id').references(() => user.id, { onDelete: 'set null' }),
		action: varchar('action', { length: 100 }).notNull(),
		entityType: varchar('entity_type', { length: 60 }),
		entityId: int('entity_id', { unsigned: true }),
		ipAddress: varchar('ip_address', { length: 45 }),
		userAgent: varchar('user_agent', { length: 255 }),
		meta: jsonCol('meta'),
		createdAt: timestamp('created_at', { fsp: 3 }).defaultNow().notNull()
	},
	(table) => [
		index('activity_logs_user_idx').on(table.userId),
		index('activity_logs_action_idx').on(table.action),
		// The dashboard's "recent activity" panel sorts by time.
		index('activity_logs_created_idx').on(table.createdAt)
	]
);
