import { mysqlTable, int, varchar, text, timestamp } from 'drizzle-orm/mysql-core';
export const contactMessages = mysqlTable('contact_messages', {
	id: int('id').primaryKey().autoincrement(),
	name: varchar('name', { length: 255 }).notNull(),
	email: varchar('email', { length: 100 }).notNull(),
	phone: varchar('phone', { length: 20 }),
	subject: varchar('subject', { length: 255 }).notNull(),
	message: text('message').notNull(),
	createdAt: timestamp('created_at').defaultNow().notNull()
});

export * from './vendors';
export * from './auth.schema';
export * from './payments';
export * from './weddings';
export * from './locations';
