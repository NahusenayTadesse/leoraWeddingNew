import {
	mysqlTable,
	varchar,
	date,
	int,
	decimal,
	text,
	mysqlEnum,
	boolean,
	tinyint,
	timestamp,
	primaryKey,
	index
} from 'drizzle-orm/mysql-core';
import { secureFields, idMaker as intPk } from './auth.schema';
import { user } from './auth.schema';
import { weddings, couples } from './weddings';
import { subscriptionPlans } from './payments';
import { address } from './locations';

export const reviews = mysqlTable('reviews', {
	id: intPk(),
	vendorId: int('vendor_id')
		.notNull()
		.references(() => vendors.id),
	userId: varchar('user_id', { length: 255 })
		.notNull()
		.references(() => user.id),
	rating: tinyint('rating'),
	comment: text('comment'),
	...secureFields
});

export const vendors = mysqlTable('vendors', {
	id: intPk(),
	userId: varchar('user_id', { length: 255 })
		.notNull()
		.references(() => user.id),
	businessName: varchar('business_name', { length: 200 }).notNull(),
	phone: varchar('phone', { length: 20 }).notNull(),
	vendorCategory: int('vendor_category').references(() => vendorCategories.id),
	description: text('description'),
	city: varchar('city', { length: 100 }),
	address: int('address')
		.notNull()
		.references(() => address.id),
	priceRange: varchar('price_range', { length: 100 }),
	isVerified: boolean('is_verified').default(false),
	...secureFields
});

// export const orders = mysqlTable('orders', {
// 	id: int('id').autoincrement().primaryKey(),
// 	customerId: int('customer_id').references(() => couples.id),
// 	status: mysqlEnum('status', ['pending', 'delivered', 'cancelled']),
// 	...secureFields
// });

// export const orderItems = mysqlTable('order_items', {
// 	id: int('id').autoincrement().primaryKey(),
// 	orderId: int('order_id').references(() => orders.id),
// 	productId: int('product_id').references(() => vendorServices.id),
// 	quantity: int('quantity').notNull(),
// 	amount: varchar('amount', { length: 255 }).notNull(),
// 	price: decimal('price', { precision: 10, scale: 2 }).notNull(),
// 	...secureFields
// });
//

// 1. THE MAIN ORDER (Customer's view / Payment record)
export const orders = mysqlTable('orders', {
	id: intPk(),
	coupleId: int('customer_id')
		.notNull()
		.references(() => couples.id),
	totalAmount: decimal('total_amount', { precision: 10, scale: 2 }),
	status: mysqlEnum('status', ['pending', 'paid', 'failed']),
	...secureFields
});

// 2. THE VENDOR ORDER (The "Sub-Order")
// This is what the Vendor sees in their dashboard
export const vendorOrders = mysqlTable('vendor_orders', {
	id: intPk(),
	orderId: int('order_id')
		.notNull()
		.references(() => orders.id), // Link to the main Order
	vendorId: int('vendor_id')
		.notNull()
		.references(() => vendors.id),
	subtotal: decimal('subtotal', { precision: 10, scale: 2 }),
	status: mysqlEnum('status', ['pending', 'delivered', 'cancelled']),
	...secureFields
});

// 3. THE ITEMS
export const orderItems = mysqlTable('order_items', {
	id: intPk(),
	vendorOrderId: int('order_id')
		.notNull()
		.references(() => vendorOrders.id), // Links to the Vendor's sub-order
	productId: int('product_id').references(() => vendorServices.id),
	quantity: int('quantity').notNull(),
	amount: varchar('amount', { length: 255 }).notNull(),
	price: decimal('price', { precision: 10, scale: 2 }).notNull(),
	...secureFields
});

// Table: vendor_availability
export const vendorAvailability = mysqlTable('vendor_availability', {
	id: intPk(),
	vendorId: int('vendor_id')
		.notNull()
		.references(() => vendors.id),
	availableDate: date('available_date').notNull(),
	isAvailable: boolean('is_available').default(true)
});

// Table: vendor_bookings
export const vendorBookings = mysqlTable('vendor_bookings', {
	id: intPk(),
	weddingId: int('wedding_id')
		.notNull()
		.references(() => weddings.id),
	vendorId: int('vendor_id')
		.notNull()
		.references(() => vendors.id),
	serviceId: int('service_id').references(() => vendorServices.id),
	status: mysqlEnum('status', ['pending', 'confirmed', 'cancelled']).default('pending'),
	agreedPrice: decimal('agreed_price', { precision: 10, scale: 2 }),
	eventDate: date('event_date'),
	...secureFields
});

// Table: vendor_categories
export const vendorCategories = mysqlTable('vendor_categories', {
	id: intPk(),
	name: varchar('name', { length: 100 }).notNull().unique(),
	description: text('description'),
	listable: boolean('listable').default(true)
});

// Table: vendor_category_map (composite PK)
export const vendorCategoryMap = mysqlTable(
	'vendor_category_map',
	{
		vendorId: int('vendor_id')
			.notNull()
			.references(() => vendors.id),
		categoryId: int('category_id').references(() => vendorCategories.id)
	},
	(table) => ({
		pk: primaryKey({ columns: [table.vendorId, table.categoryId] })
	})
);

// Table: vendor_commissions
export const vendorCommissions = mysqlTable('vendor_commissions', {
	id: intPk(),
	vendorId: int('vendor_id')
		.notNull()
		.references(() => vendors.id),
	commissionType: mysqlEnum('commission_type', ['percentage', 'fixed']).notNull(),
	value: decimal('value', { precision: 10, scale: 2 }).notNull()
});

// Table: vendor_payouts
export const vendorPayouts = mysqlTable('vendor_payouts', {
	id: intPk(),
	vendorId: int('vendor_id')
		.notNull()
		.references(() => vendors.id),
	amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
	payoutMethod: mysqlEnum('payout_method', ['bank_transfer', 'mobile_money', 'cash']),
	status: mysqlEnum('status', ['requested', 'processing', 'completed', 'rejected']).default(
		'requested'
	),
	reference: varchar('reference', { length: 150 }),
	createdAt: timestamp('created_at').defaultNow().notNull()
});

// Table: vendor_promotions
export const vendorPromotions = mysqlTable('vendor_promotions', {
	id: intPk(),
	vendorId: int('vendor_id')
		.notNull()
		.references(() => vendors.id),
	type: mysqlEnum('type', ['featured', 'homepage', 'category_boost']),
	startsAt: date('starts_at'),
	endsAt: date('ends_at')
});

// Table: vendor_quotes
export const vendorQuotes = mysqlTable('vendor_quotes', {
	id: intPk(),
	bookingId: int('booking_id')
		.notNull()
		.references(() => vendorBookings.id),
	vendorId: int('vendor_id')
		.notNull()
		.references(() => vendors.id),
	proposedPrice: decimal('proposed_price', { precision: 12, scale: 2 }),
	notes: text('notes'),
	status: mysqlEnum('status', ['sent', 'accepted', 'rejected']),
	createdAt: timestamp('created_at').defaultNow().notNull()
});

// Table: vendor_services
export const vendorServices = mysqlTable('vendor_services', {
	id: intPk(),
	vendorId: int('vendor_id')
		.notNull()
		.references(() => vendors.id),
	title: varchar('title', { length: 150 }).notNull(),

	featuredImage: varchar('featured_image', { length: 255 }),
	description: text('description'),
	categoryId: int('category_id').references(() => serviceCategories.id, { onDelete: 'set null' }),

	currency: varchar('currency', { length: 10 }).default('ETB'),
	...secureFields
});

export const serviceCategories = mysqlTable('service_categories', {
	id: int('id').autoincrement().primaryKey(),
	name: varchar('name', { length: 50 }).notNull().unique(),
	description: varchar('description', { length: 255 }),

	...secureFields
});

export const subCategories = mysqlTable('sub_categories', {
	id: int('id').autoincrement().primaryKey(),
	name: varchar('name', { length: 50 }).notNull().unique(),
	description: varchar('description', { length: 255 }),
	parentId: int('parent_id').references(() => serviceCategories.id, { onDelete: 'cascade' })
});

export const subSubCategories = mysqlTable('sub_sub_categories', {
	id: int('id').autoincrement().primaryKey(),
	name: varchar('name', { length: 50 }).notNull().unique(),
	description: varchar('description', { length: 255 }),
	parentId: int('parent_id').references(() => subCategories.id, { onDelete: 'cascade' })
});

export const categoryServices = mysqlTable('category_services', {
	id: int('id').autoincrement().primaryKey(),
	subCategoryId: int('sub_category_id').references(() => subCategories.id, { onDelete: 'cascade' }),
	subSubId: int('sub_sub_id').references(() => subSubCategories.id, { onDelete: 'cascade' }),

	serviceId: int('service_id').references(() => vendorServices.id, { onDelete: 'cascade' })
});

export const discounts = mysqlTable('discounts', {
	id: int('id').primaryKey().autoincrement(),
	amount: decimal('amount', { precision: 10, scale: 2 }),
	productId: int('product_id').references(() => vendorServices.id, { onDelete: 'cascade' }),
	name: varchar('name', { length: 50 }).notNull(),
	description: varchar('description', { length: 255 }),
	...secureFields
});

export const prices = mysqlTable('prices', {
	id: int('id').primaryKey().autoincrement(),
	serviceId: int('service_id').references(() => vendorServices.id, { onDelete: 'cascade' }),
	price: decimal('price', { precision: 10, scale: 2 }).notNull(),
	amount: varchar('amount', { length: 255 }).notNull()
});

export const serviceImages = mysqlTable('service_images', {
	id: int('id').primaryKey().autoincrement(),
	productId: int('product_id').references(() => vendorServices.id, { onDelete: 'cascade' }),
	imageUrl: varchar('image_url', { length: 255 }).notNull()
});

export const vendorSubscriptions = mysqlTable('vendor_subscriptions', {
	id: intPk(),
	vendorId: int('vendor_id')
		.notNull()
		.references(() => vendors.id),
	planId: int('plan_id')
		.notNull()
		.references(() => subscriptionPlans.id),
	startsAt: date('starts_at'),
	endsAt: date('ends_at'),
	status: mysqlEnum('status', ['active', 'expired', 'cancelled'])
});

// Table: vendor_wallets (PK on vendor_id)
export const vendorWallets = mysqlTable('vendor_wallets', {
	vendorId: int('vendor_id')
		.notNull()
		.references(() => vendors.id)
		.primaryKey(),
	balance: decimal('balance', { precision: 14, scale: 2 }).default('0.00'),
	...secureFields
});
export const favorites = mysqlTable(
	'favorites',
	{
		userId: varchar('user_id', { length: 255 })
			.notNull()
			.references(() => user.id),
		vendorId: int('vendor_id')
			.notNull()
			.references(() => vendors.id)
	},
	(table) => ({
		pk: primaryKey({ columns: [table.userId, table.vendorId] }),
		vendorIdIdx: index('favorites_vendor_id_idx').on(table.vendorId)
	})
);
