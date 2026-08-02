import {
	mysqlTable,
	varchar,
	date,
	datetime,
	int,
	smallint,
	tinyint,
	decimal,
	text,
	mysqlEnum,
	boolean,
	index,
	unique
} from 'drizzle-orm/mysql-core';
import { secureFields, idMaker, userRef, user, aliveKey } from './common';

/**
 * The wedding-planning domain, modelled on the PHP app's schema.sql.
 *
 * Everything a couple owns hangs off `couples.id` — that single column is the
 * tenant boundary, exactly as `current_couple()` establishes it in the PHP app.
 * Query helpers must filter by it on every read and write.
 */

export const couples = mysqlTable(
	'couples',
	{
		id: idMaker(),

		/**
		 * Both partners can hold their own login and share one workspace.
		 *
		 * Both sides are nullable with ON DELETE SET NULL. The PHP schema made
		 * partner1 NOT NULL and cascaded, which meant deleting the first
		 * partner's account silently destroyed the couple and every guest,
		 * budget item and task hanging off it — even when partner2 was still
		 * active. Losing the link is recoverable; losing the wedding is not.
		 */
		partner1UserId: userRef('partner1_user_id').references(() => user.id, {
			onDelete: 'set null'
		}),
		partner2UserId: userRef('partner2_user_id').references(() => user.id, {
			onDelete: 'set null'
		}),

		/** Shared with the second partner so they can join this workspace. */
		inviteCode: varchar('invite_code', { length: 20 }).notNull(),
		weddingHashtag: varchar('wedding_hashtag', { length: 60 }),

		slug: varchar('slug', { length: 255 }),
		groomName: varchar('groom_name', { length: 255 }),
		brideName: varchar('bride_name', { length: 255 }),
		phone: varchar('phone', { length: 20 }),
		phone2: varchar('phone2', { length: 20 }),
		email: varchar('email', { length: 255 }),
		verified: boolean('verified').default(false).notNull(),
		...secureFields,
		aliveKey
	},
	(table) => [
		unique('couples_invite_code_uq').on(table.inviteCode, table.aliveKey),
		unique('couples_slug_uq').on(table.slug, table.aliveKey),
		// A user gets one couple workspace on each side of the marriage.
		// Without these, `requireCouple()`'s `.limit(1)` silently picks an
		// arbitrary row when a duplicate exists and the planner appears to
		// lose data.
		unique('couples_partner1_uq').on(table.partner1UserId, table.aliveKey),
		unique('couples_partner2_uq').on(table.partner2UserId, table.aliveKey)
	]
);

export const weddingPlans = mysqlTable(
	'wedding_plans',
	{
		id: idMaker(),
		coupleId: int('couple_id')
			.notNull()
			.references(() => couples.id, { onDelete: 'cascade' }),
		weddingDate: date('wedding_date'),
		guestCountEstimate: int('guest_count_estimate'),
		venueTier: mysqlEnum('venue_tier', ['traditional', 'outdoor', 'luxury']),
		totalBudget: decimal('total_budget', { precision: 12, scale: 2 }),
		theme: varchar('theme', { length: 100 }),
		status: mysqlEnum('status', ['planning', 'confirmed', 'completed', 'cancelled'])
			.default('planning')
			.notNull(),
		weddingStyle: varchar('wedding_style', { length: 100 }),
		city: varchar('city', { length: 100 }),
		...secureFields,
		aliveKey
	},
	// One plan per couple — `requireWedding()` assumes this.
	(table) => [unique('wedding_plans_couple_uq').on(table.coupleId, table.aliveKey)]
);

/**
 * The Ethiopian multi-event wedding flow. Modelled as rows rather than columns
 * so couples can add, rename and reorder the ceremonies they actually hold.
 */
export const weddingEvents = mysqlTable(
	'wedding_events',
	{
		id: idMaker(),
		coupleId: int('couple_id')
			.notNull()
			.references(() => couples.id, { onDelete: 'cascade' }),
		eventType: mysqlEnum('event_type', [
			'engagement',
			'shimgelegna',
			'gebez_enshoshela',
			'ceremony',
			'melse',
			'kilikil',
			'reception',
			'other'
		]).notNull(),
		eventName: varchar('event_name', { length: 150 }).notNull(),
		eventDate: datetime('event_date'),
		venueName: varchar('venue_name', { length: 150 }),
		venueAddress: varchar('venue_address', { length: 255 }),
		city: varchar('city', { length: 100 }),
		sortOrder: smallint('sort_order', { unsigned: true }).default(0).notNull(),
		notes: text('notes'),
		...secureFields
	},
	(table) => [index('wedding_events_couple_idx').on(table.coupleId)]
);

export const seatingPlans = mysqlTable(
	'seating_plans',
	{
		id: idMaker(),
		coupleId: int('couple_id')
			.notNull()
			.references(() => couples.id, { onDelete: 'cascade' }),
		name: varchar('name', { length: 150 }).default('Reception Seating').notNull(),
		...secureFields
	},
	(table) => [index('seating_plans_couple_idx').on(table.coupleId)]
);

export const seatingTables = mysqlTable(
	'seating_tables',
	{
		id: idMaker(),
		seatingPlanId: int('seating_plan_id')
			.notNull()
			.references(() => seatingPlans.id, { onDelete: 'cascade' }),
		tableName: varchar('table_name', { length: 50 }).notNull(),
		capacity: tinyint('capacity', { unsigned: true }).default(8).notNull(),
		...secureFields
	},
	(table) => [index('seating_tables_plan_idx').on(table.seatingPlanId)]
);

export const guestLists = mysqlTable(
	'guest_lists',
	{
		id: idMaker(),
		coupleId: int('couple_id')
			.notNull()
			.references(() => couples.id, { onDelete: 'cascade' }),
		fullName: varchar('full_name', { length: 150 }).notNull(),
		email: varchar('email', { length: 190 }),
		phone: varchar('phone', { length: 30 }),
		/**
		 * 'both' matters here — plenty of guests (colleagues, mutual friends,
		 * family of both families) belong to neither side alone.
		 */
		side: mysqlEnum('side', ['bride', 'groom', 'both']).default('both').notNull(),
		groupName: varchar('group_name', { length: 100 }),
		/**
		 * Three-state, not a boolean. The previous `isConfirmed` flag could not
		 * tell "hasn't replied yet" apart from "replied no", so declined guests
		 * were indistinguishable from silent ones and head counts were wrong.
		 */
		rsvpStatus: mysqlEnum('rsvp_status', ['pending', 'confirmed', 'declined'])
			.default('pending')
			.notNull(),
		plusOnes: tinyint('plus_ones', { unsigned: true }).default(0).notNull(),
		mealPreference: varchar('meal_preference', { length: 100 }),
		seatingTableId: int('seating_table_id').references(() => seatingTables.id, {
			onDelete: 'set null'
		}),
		notes: varchar('notes', { length: 255 }),
		...secureFields
	},
	(table) => [
		index('guest_lists_couple_idx').on(table.coupleId),
		index('guest_lists_rsvp_idx').on(table.rsvpStatus)
	]
);

export const taskCategories = mysqlTable('task_categories', {
	id: idMaker(),
	name: varchar('name', { length: 80 }).notNull(),
	icon: varchar('icon', { length: 10 }),
	sortOrder: smallint('sort_order', { unsigned: true }).default(0).notNull(),
	isSystem: boolean('is_system').default(true).notNull()
});

export const tasks = mysqlTable(
	'tasks',
	{
		id: idMaker(),
		coupleId: int('couple_id')
			.notNull()
			.references(() => couples.id, { onDelete: 'cascade' }),
		taskCategoryId: int('task_category_id').references(() => taskCategories.id, {
			onDelete: 'set null'
		}),
		assignedTo: userRef('assigned_to').references(() => user.id, { onDelete: 'set null' }),
		title: varchar('title', { length: 200 }).notNull(),
		description: text('description'),
		dueDate: date('due_date'),
		/** Three states, so "started but not finished" is representable. */
		status: mysqlEnum('status', ['todo', 'in_progress', 'done']).default('todo').notNull(),
		priority: mysqlEnum('priority', ['low', 'medium', 'high']).default('medium').notNull(),
		...secureFields
	},
	(table) => [
		index('tasks_couple_idx').on(table.coupleId),
		index('tasks_status_idx').on(table.status),
		index('tasks_due_date_idx').on(table.dueDate)
	]
);

/** Seed checklist rows cloned into `tasks` when a couple starts planning. */
export const taskTemplates = mysqlTable('task_templates', {
	id: idMaker(),
	taskCategoryId: int('task_category_id').references(() => taskCategories.id, {
		onDelete: 'set null'
	}),
	title: varchar('title', { length: 200 }).notNull(),
	description: text('description'),
	daysBeforeWedding: int('days_before_wedding'),
	priority: mysqlEnum('priority', ['low', 'medium', 'high']).default('medium').notNull(),
	sortOrder: smallint('sort_order', { unsigned: true }).default(0).notNull()
});

export const notes = mysqlTable(
	'notes',
	{
		id: idMaker(),
		coupleId: int('couple_id')
			.notNull()
			.references(() => couples.id, { onDelete: 'cascade' }),
		userId: userRef('user_id').references(() => user.id, { onDelete: 'set null' }),
		title: varchar('title', { length: 200 }),
		body: text('body').notNull(),
		...secureFields
	},
	(table) => [index('notes_couple_idx').on(table.coupleId)]
);
