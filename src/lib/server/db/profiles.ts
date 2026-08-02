import { mysqlTable, varchar, text, date, mysqlEnum, unique } from 'drizzle-orm/mysql-core';
import { secureFields, idMaker, userRef, user, aliveKey } from './common';

/**
 * Mirrors the PHP app's `user_profiles`.
 *
 * better-auth owns identity (`user.id`, email, emailVerified, image), so this
 * table holds only the profile fields it has no column for. `firstName` /
 * `lastName` are kept as a split of better-auth's single `name` because the
 * PHP pages address people by first name alone.
 */
export const userProfiles = mysqlTable(
	'user_profiles',
	{
		id: idMaker(),
		userId: userRef('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		firstName: varchar('first_name', { length: 80 }).notNull(),
		lastName: varchar('last_name', { length: 80 }),
		phone: varchar('phone', { length: 30 }),
		avatarUrl: varchar('avatar_url', { length: 255 }),
		city: varchar('city', { length: 100 }),
		country: varchar('country', { length: 100 }).default('Ethiopia').notNull(),
		dateOfBirth: date('date_of_birth', { mode: 'string' }),
		gender: mysqlEnum('gender', ['female', 'male', 'other', 'prefer_not_to_say']),
		bio: text('bio'),
		...secureFields,
		aliveKey
	},
	(table) => [unique('user_profiles_user_uq').on(table.userId, table.aliveKey)]
);
