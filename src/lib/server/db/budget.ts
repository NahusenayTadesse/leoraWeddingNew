import {
	mysqlTable,
	varchar,
	date,
	int,
	smallint,
	decimal,
	text,
	mysqlEnum,
	boolean,
	index
} from 'drizzle-orm/mysql-core';
import { secureFields, idMaker, jsonCol } from './common';
import { couples } from './weddings';
import { vendors } from './vendors';

/**
 * The budget planner ("Mode 2" in the PHP app). The vendor comparison tool
 * ("Mode 1") reads `vendors` directly and persists each run into
 * `budget_comparisons` so plan limits can be counted server-side.
 */

export const budgetCategories = mysqlTable(
	'budget_categories',
	{
		id: idMaker(),
		/**
		 * NULL means this is a system template every couple sees; a value means
		 * one couple added it themselves. Reads should match
		 * `coupleId = :id OR isSystem`, never `coupleId = :id` alone.
		 */
		coupleId: int('couple_id').references(() => couples.id, { onDelete: 'cascade' }),
		name: varchar('name', { length: 100 }).notNull(),
		/** Optional — the PHP schema required a description with no default,
		 * which forced every insert to invent one. */
		description: varchar('description', { length: 255 }),
		icon: varchar('icon', { length: 10 }),
		sortOrder: smallint('sort_order', { unsigned: true }).default(0).notNull(),
		isSystem: boolean('is_system').default(false).notNull(),
		...secureFields
	},
	(table) => [index('budget_categories_couple_idx').on(table.coupleId)]
);

export const budgetItems = mysqlTable(
	'budget_items',
	{
		id: idMaker(),
		coupleId: int('couple_id')
			.notNull()
			.references(() => couples.id, { onDelete: 'cascade' }),
		/**
		 * Nullable with ON DELETE SET NULL rather than the PHP schema's NOT NULL
		 * + RESTRICT. That combination deadlocked deletion: removing a couple
		 * cascades into both `budget_categories` and `budget_items`, and the
		 * RESTRICT on the category aborted the whole cascade, so any couple with
		 * a custom category could not be deleted at all. Uncategorised items
		 * group under "Other" in the UI.
		 */
		budgetCategoryId: int('budget_category_id').references(() => budgetCategories.id, {
			onDelete: 'set null'
		}),
		vendorId: int('vendor_id').references(() => vendors.id, { onDelete: 'set null' }),
		name: varchar('name', { length: 150 }).notNull(),
		estimatedCost: decimal('estimated_cost', { precision: 12, scale: 2 }).default('0').notNull(),
		actualCost: decimal('actual_cost', { precision: 12, scale: 2 }).default('0').notNull(),
		status: mysqlEnum('status', ['planned', 'booked', 'paid']).default('planned').notNull(),
		dueDate: date('due_date'),
		notes: text('notes'),
		...secureFields
	},
	(table) => [
		index('budget_items_couple_idx').on(table.coupleId),
		index('budget_items_category_idx').on(table.budgetCategoryId)
	]
);

/**
 * One saved run of the vendor comparison tool. Rows are counted to enforce the
 * Free plan's "3 estimator uses" limit, so they must be written on every run
 * even when the couple never looks at the result again.
 */
export const budgetComparisons = mysqlTable(
	'budget_comparisons',
	{
		id: idMaker(),
		coupleId: int('couple_id')
			.notNull()
			.references(() => couples.id, { onDelete: 'cascade' }),
		name: varchar('name', { length: 150 }).default('Untitled comparison').notNull(),
		vendorIds: jsonCol<number[]>('vendor_ids').notNull(),
		resultSummary: jsonCol('result_summary'),
		...secureFields
	},
	(table) => [index('budget_comparisons_couple_idx').on(table.coupleId)]
);
