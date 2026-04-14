import {
	mysqlTable,
	varchar,
	date,
	int,
	decimal,
	text,
	mysqlEnum,
	boolean
} from 'drizzle-orm/mysql-core';
import { secureFields, idMaker } from './auth.schema';
import { user } from './auth.schema';

export const budgetCategories = mysqlTable('budget_categories', {
	id: idMaker(),
	name: varchar('name', { length: 100 }).notNull(),
	description: varchar('description', { length: 255 }).notNull(),
	...secureFields
});

export const taskTemplates = mysqlTable('task_templates', {
	id: idMaker(),
	title: varchar('title', { length: 200 }),
	daysBeforeWedding: int('days_before_wedding')
});

export const couples = mysqlTable('couples', {
	id: idMaker(),
	slug: varchar('slug', { length: 255 }).unique(),
	groomName: varchar('groom_name', { length: 255 }).notNull(),
	brideName: varchar('bride_name', { length: 255 }).notNull(),
	phone: varchar('phone', { length: 20 }),
	phone2: varchar('phone2', { length: 20 }),
	email: varchar('email', { length: 255 }),
	userId: varchar('user_id', { length: 255 })
		.notNull()
		.references(() => user.id),
	verified: boolean('verified').default(false).notNull(),
	...secureFields
});

export const weddings = mysqlTable('weddings', {
	id: idMaker(),
	weddingStyle: varchar('wedding_style', { length: 100 }),
	coupleId: int('couple_id')
		.notNull()
		.references(() => couples.id),
	weddingDate: date('wedding_date'),
	expectedGuests: int('expected_guests'),
	city: varchar('city', { length: 100 }),
	totalBudget: decimal('total_budget', { precision: 12, scale: 2 }),
	...secureFields
});

// Table: wedding_budget_items
export const weddingBudgetItems = mysqlTable('wedding_budget_items', {
	id: idMaker(),
	weddingId: int('wedding_id')
		.notNull()
		.references(() => weddings.id),
	categoryId: int('category_id')
		.notNull()
		.references(() => budgetCategories.id),
	plannedAmount: decimal('planned_amount', { precision: 10, scale: 2 }),
	actualAmount: decimal('actual_amount', { precision: 10, scale: 2 }),
	notes: text('notes')
});

// Table: wedding_guests
export const weddingGuests = mysqlTable('wedding_guests', {
	id: idMaker(),
	weddingId: int('wedding_id')
		.notNull()
		.references(() => weddings.id),
	fullName: varchar('full_name', { length: 150 }),
	phone: varchar('phone', { length: 30 }),
	side: mysqlEnum('side', ['bride', 'groom']),
	isConfirmed: boolean('is_confirmed').default(false)
});

// Table: wedding_tasks
export const weddingTasks = mysqlTable('wedding_tasks', {
	id: idMaker(),
	weddingId: int('wedding_id')
		.notNull()
		.references(() => weddings.id),
	title: varchar('title', { length: 200 }),
	isConfirmed: boolean('is_confirmed').default(false),
	dueDate: date('due_date')
});
