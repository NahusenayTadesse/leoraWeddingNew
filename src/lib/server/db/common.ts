import { mysqlTable, int, varchar, boolean, timestamp, datetime } from 'drizzle-orm/mysql-core';
import { sql } from 'drizzle-orm';
import { user } from './auth.schema';

/**
 * Re-exported so schema files have a single import site for the helpers and
 * the user table they reference. Only the reference target lives here; the
 * table itself is still defined by the generated auth.schema.ts.
 */
export { user } from './auth.schema';

/**
 * Shared column helpers.
 *
 * These deliberately do NOT live in auth.schema.ts. That file is the output
 * target of `npm run auth:schema`, which runs the better-auth CLI with --yes
 * and rewrites it wholesale — anything else kept there is destroyed on the
 * next run, and every schema file imports from here.
 */

/**
 * A reference to better-auth's `user.id`, which is varchar(36). Every column
 * pointing at it must use the same width or the FK indexes wider than needed.
 */
export const userRef = (column: string) => varchar(column, { length: 36 });

export const idMaker = () => int('id').autoincrement().primaryKey();

/**
 * The sentinel a live row carries in `aliveKey`. Any value works as long as it
 * is a legal DATETIME that a real deletion timestamp will never collide with.
 */
export const ALIVE = '1970-01-01 00:00:00';

/**
 * Makes a UNIQUE constraint apply to live rows only.
 *
 * A plain `UNIQUE(x)` alongside a soft delete locks the key forever: delete
 * your couple and you can never create another, delete your review and you can
 * never review that vendor again (both reproduce as ERROR 1062). Including a
 * NULL-able `deleted_at` in the key does not help either — MySQL treats every
 * NULL as distinct, which switches the constraint off for exactly the live
 * rows it is supposed to police.
 *
 * So live rows collapse to one shared sentinel and deleted rows each carry
 * their own deletion time. Add this column to the table and put it last in the
 * unique key:
 *
 *   unique('couples_partner1_uq').on(table.partner1UserId, table.aliveKey)
 */
export const aliveKey = datetime('alive_key').generatedAlwaysAs(
	// The sentinel must be a *typed* temporal literal. A bare string literal
	// makes the expression depend on sql_mode for its implicit conversion, and
	// both MariaDB and MySQL reject that in a generated column:
	//   ERROR 1901: Function or expression cannot be used in the
	//               GENERATED ALWAYS AS clause
	sql.raw(`(coalesce(\`deleted_at\`, TIMESTAMP'${ALIVE}'))`),
	{ mode: 'stored' }
);

export const secureFields = {
	/**
	 * Reversible deactivation — "hidden for now", not "gone".
	 *
	 * See docs/schema-conventions.md for how this interacts with `deletedAt`
	 * and with per-table `status` enums. Reads must not check one and ignore
	 * the others.
	 */
	isActive: boolean('is_active').default(true).notNull(),
	createdBy: userRef('created_by').references(() => user.id, {
		onDelete: 'set null'
	}),
	updatedBy: userRef('updated_by').references(() => user.id, {
		onDelete: 'set null'
	}),
	createdAt: timestamp('created_at', { fsp: 3 }).defaultNow().notNull(),
	/**
	 * fsp:3 must be declared on the column, not just in the default.
	 *
	 * Without it the column is TIMESTAMP(0) while the default asks for
	 * CURRENT_TIMESTAMP(3). MariaDB resolves that by silently dropping to
	 * `current_timestamp()` — so `updated_at` lost the millisecond precision
	 * `created_at` keeps, and rows touched in the same second sorted
	 * arbitrarily. MySQL 8 is stricter and rejects it outright (error 1067),
	 * which would have broken `drizzle-kit push` on a MySQL host.
	 */
	updatedAt: timestamp('updated_at', { fsp: 3 })
		.default(sql`CURRENT_TIMESTAMP(3) on update CURRENT_TIMESTAMP(3)`)
		.notNull(),
	deletedAt: datetime('deleted_at'),
	deletedBy: userRef('deleted_by').references(() => user.id, {
		onDelete: 'set null'
	})
};

export const roles = mysqlTable('roles', {
	id: int('id').autoincrement().primaryKey(),
	name: varchar('name', { length: 32 }).notNull().unique(),
	description: varchar('description', { length: 255 }),
	isActive: boolean('is_active').default(true).notNull()
});
