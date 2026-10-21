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
	tinyint,
	timestamp,
	index,
	unique,
	primaryKey,
	check
} from 'drizzle-orm/mysql-core';
import { sql } from 'drizzle-orm';
import { secureFields, idMaker as intPk, userRef, user, aliveKey, jsonCol } from './common';
import { weddingPlans, couples } from './weddings';
import { subscriptionPlans } from './payments';
import { address } from './locations';

// ---------------------------------------------------------------------------
// DIRECTORY — the vendor marketplace couples browse and compare
// ---------------------------------------------------------------------------

export const vendorCategories = mysqlTable('vendor_categories', {
	id: intPk(),
	name: varchar('name', { length: 80 }).notNull(),
	/** Stable url key. Category filters match on this, never on the display name. */
	slug: varchar('slug', { length: 90 }).notNull().unique(),
	icon: varchar('icon', { length: 10 }),
	description: varchar('description', { length: 255 }),
	sortOrder: smallint('sort_order', { unsigned: true }).default(0).notNull(),
	listable: boolean('listable').default(true).notNull()
});

export const vendors = mysqlTable(
	'vendors',
	{
		id: intPk(),
		/**
		 * Nullable: staff can list a vendor from the admin console before that
		 * business has claimed an account, which the previous NOT NULL made
		 * impossible.
		 */
		userId: userRef('user_id').references(() => user.id, { onDelete: 'set null' }),
		categoryId: int('category_id')
			.notNull()
			.references(() => vendorCategories.id),
		businessName: varchar('business_name', { length: 150 }).notNull(),
		description: text('description'),

		city: varchar('city', { length: 100 }),
		/** Free-text address, as shown on the public listing. */
		address: varchar('address', { length: 255 }),
		/** Structured address, when the vendor has completed onboarding. */
		addressId: int('address_id').references(() => address.id, { onDelete: 'set null' }),

		phone: varchar('phone', { length: 30 }),
		email: varchar('email', { length: 190 }),
		website: varchar('website', { length: 255 }),

		/**
		 * A numeric range, not the old free-text `priceRange` string — the
		 * comparison tool sorts and scores on these and cannot do either
		 * against "2000-5000 birr".
		 */
		priceMin: decimal('price_min', { precision: 12, scale: 2 }),
		priceMax: decimal('price_max', { precision: 12, scale: 2 }),

		/**
		 * Largest party the vendor can serve (venue seats, catering covers). Null when it doesn't
		 * apply, e.g. a photographer; the directory's guest filter keeps those.
		 */
		maxGuests: smallint('max_guests', { unsigned: true }),

		/** Booking terms; the rules behind each value are in `$lib/policy`. */
		cancellationPolicy: mysqlEnum('cancellation_policy', ['flexible', 'moderate', 'strict'])
			.default('moderate')
			.notNull(),
		/** Share of the agreed price that secures the date. */
		depositPercent: tinyint('deposit_percent', { unsigned: true }).default(30).notNull(),
		/** The full balance is due this many days before the event. */
		balanceDueDays: smallint('balance_due_days', { unsigned: true }).default(14).notNull(),

		/** Denormalised from `vendor_reviews`; recompute on review write. */
		ratingAvg: decimal('rating_avg', { precision: 3, scale: 2 }).default('0.00').notNull(),
		reviewCount: int('review_count', { unsigned: true }).default(0).notNull(),

		isFeatured: boolean('is_featured').default(false).notNull(),
		/** Staff checked the trade licence and the owner's ID (set on /admin/vendors/[id]). */
		isVerified: boolean('is_verified').default(false).notNull(),
		verifiedAt: timestamp('verified_at', { fsp: 3 }),
		/**
		 * The approval workflow. Public listings must filter on
		 * `status = 'approved'` — `isVerified` is a trust badge, not a gate.
		 */
		status: mysqlEnum('status', ['pending', 'approved', 'rejected', 'suspended'])
			.default('pending')
			.notNull(),
		...secureFields
	},
	(table) => [
		index('vendors_category_idx').on(table.categoryId),
		index('vendors_status_idx').on(table.status),
		index('vendors_city_idx').on(table.city)
		// NOTE: the PHP app's keyword search uses
		//   MATCH(business_name, description) AGAINST (? IN NATURAL LANGUAGE MODE)
		// drizzle-kit cannot emit FULLTEXT indexes, so add it once by hand:
		//   ALTER TABLE vendors ADD FULLTEXT KEY ftx_vendors_search (business_name, description);
	]
);

/** Named price packages a vendor publishes on their listing. */
export const vendorPackages = mysqlTable(
	'vendor_packages',
	{
		id: intPk(),
		vendorId: int('vendor_id')
			.notNull()
			.references(() => vendors.id, { onDelete: 'cascade' }),
		name: varchar('name', { length: 150 }).notNull(),
		price: decimal('price', { precision: 12, scale: 2 }).notNull(),
		description: text('description'),
		inclusions: jsonCol<string[]>('inclusions'),
		...secureFields
	},
	(table) => [index('vendor_packages_vendor_idx').on(table.vendorId)]
);

export const vendorReviews = mysqlTable(
	'vendor_reviews',
	{
		id: intPk(),
		vendorId: int('vendor_id')
			.notNull()
			.references(() => vendors.id, { onDelete: 'cascade' }),
		/** Attributed to the couple, not one partner, so either can post it. */
		coupleId: int('couple_id')
			.notNull()
			.references(() => couples.id, { onDelete: 'cascade' }),
		rating: tinyint('rating', { unsigned: true }).notNull(),
		title: varchar('title', { length: 150 }),
		comment: text('comment'),
		/** The vendor's one public answer, shown under the review. */
		vendorReply: text('vendor_reply'),
		repliedAt: timestamp('replied_at', { fsp: 3 }),
		...secureFields,
		aliveKey
	},
	(table) => [
		// One review per vendor per couple. Without this a couple could pad or
		// tank a vendor's rating by posting repeatedly.
		unique('vendor_reviews_vendor_couple_uq').on(table.vendorId, table.coupleId, table.aliveKey),
		index('vendor_reviews_vendor_idx').on(table.vendorId),
		check('vendor_reviews_rating_ck', sql`rating between 1 and 5`)
	]
);

/**
 * Public profile views, one counter per vendor per day: enough for the vendor's dashboard,
 * nothing about who viewed. Written by `recordProfileView`.
 */
export const vendorProfileViews = mysqlTable(
	'vendor_profile_views',
	{
		vendorId: int('vendor_id')
			.notNull()
			.references(() => vendors.id, { onDelete: 'cascade' }),
		day: date('day', { mode: 'string' }).notNull(),
		views: int('views', { unsigned: true }).default(0).notNull()
	},
	(table) => [primaryKey({ columns: [table.vendorId, table.day] })]
);

/** A couple's shortlist. Replaces the old user-scoped `favorites`. */
export const savedVendors = mysqlTable(
	'saved_vendors',
	{
		id: intPk(),
		coupleId: int('couple_id')
			.notNull()
			.references(() => couples.id, { onDelete: 'cascade' }),
		vendorId: int('vendor_id')
			.notNull()
			.references(() => vendors.id, { onDelete: 'cascade' }),
		notes: varchar('notes', { length: 255 }),
		createdAt: timestamp('created_at', { fsp: 3 }).defaultNow().notNull()
	},
	(table) => [
		unique('saved_vendors_couple_vendor_uq').on(table.coupleId, table.vendorId),
		index('saved_vendors_vendor_idx').on(table.vendorId)
	]
);

// ---------------------------------------------------------------------------
// SERVICE CATALOG — what a vendor actually sells
// ---------------------------------------------------------------------------

export const serviceCategories = mysqlTable(
	'service_categories',
	{
		id: intPk(),
		name: varchar('name', { length: 50 }).notNull(),
		description: varchar('description', { length: 255 }),
		...secureFields,
		aliveKey
	},
	(table) => [unique('service_categories_name_uq').on(table.name, table.aliveKey)]
);

export const subCategories = mysqlTable(
	'sub_categories',
	{
		id: intPk(),
		name: varchar('name', { length: 50 }).notNull(),
		description: varchar('description', { length: 255 }),
		parentId: int('parent_id').references(() => serviceCategories.id, { onDelete: 'cascade' })
	},
	// Unique per parent, not globally — two different service categories can
	// each reasonably have a "Packages" or "Rentals" child.
	(table) => [unique('sub_categories_parent_name_uq').on(table.parentId, table.name)]
);

export const subSubCategories = mysqlTable(
	'sub_sub_categories',
	{
		id: intPk(),
		name: varchar('name', { length: 50 }).notNull(),
		description: varchar('description', { length: 255 }),
		parentId: int('parent_id').references(() => subCategories.id, { onDelete: 'cascade' })
	},
	(table) => [unique('sub_sub_categories_parent_name_uq').on(table.parentId, table.name)]
);

export const vendorServices = mysqlTable(
	'vendor_services',
	{
		id: intPk(),
		vendorId: int('vendor_id')
			.notNull()
			.references(() => vendors.id, { onDelete: 'cascade' }),
		title: varchar('title', { length: 150 }).notNull(),
		featuredImage: varchar('featured_image', { length: 255 }),
		description: text('description'),
		categoryId: int('category_id').references(() => serviceCategories.id, { onDelete: 'set null' }),
		currency: varchar('currency', { length: 10 }).default('ETB').notNull(),
		...secureFields
	},
	(table) => [index('vendor_services_vendor_idx').on(table.vendorId)]
);

export const categoryServices = mysqlTable('category_services', {
	id: intPk(),
	subCategoryId: int('sub_category_id').references(() => subCategories.id, { onDelete: 'cascade' }),
	subSubId: int('sub_sub_id').references(() => subSubCategories.id, { onDelete: 'cascade' }),
	serviceId: int('service_id').references(() => vendorServices.id, { onDelete: 'cascade' })
});

export const discounts = mysqlTable('discounts', {
	id: intPk(),
	amount: decimal('amount', { precision: 10, scale: 2 }),
	productId: int('product_id').references(() => vendorServices.id, { onDelete: 'cascade' }),
	name: varchar('name', { length: 50 }).notNull(),
	description: varchar('description', { length: 255 }),
	...secureFields
});

export const prices = mysqlTable('prices', {
	id: intPk(),
	serviceId: int('service_id').references(() => vendorServices.id, { onDelete: 'cascade' }),
	price: decimal('price', { precision: 10, scale: 2 }).notNull(),
	amount: varchar('amount', { length: 255 }).notNull()
});

export const serviceImages = mysqlTable('service_images', {
	id: intPk(),
	productId: int('product_id').references(() => vendorServices.id, { onDelete: 'cascade' }),
	imageUrl: varchar('image_url', { length: 255 }).notNull()
});

// ---------------------------------------------------------------------------
// COMMERCE — orders, bookings and vendor operations
// ---------------------------------------------------------------------------

/** The customer-facing order. One per checkout. */
export const orders = mysqlTable(
	'orders',
	{
		id: intPk(),
		/** Explicit restrict: an order is a financial record, see payments.ts. */
		coupleId: int('couple_id')
			.notNull()
			.references(() => couples.id, { onDelete: 'restrict' }),
		totalAmount: decimal('total_amount', { precision: 10, scale: 2 }),
		status: mysqlEnum('status', ['pending', 'paid', 'failed']).default('pending').notNull(),
		...secureFields
	},
	(table) => [index('orders_couple_idx').on(table.coupleId)]
);

/** The vendor-facing slice of an order — what shows in their dashboard. */
export const vendorOrders = mysqlTable(
	'vendor_orders',
	{
		id: intPk(),
		orderId: int('order_id')
			.notNull()
			.references(() => orders.id, { onDelete: 'cascade' }),
		vendorId: int('vendor_id')
			.notNull()
			.references(() => vendors.id),
		subtotal: decimal('subtotal', { precision: 10, scale: 2 }),
		status: mysqlEnum('status', ['pending', 'delivered', 'cancelled']).default('pending').notNull(),
		...secureFields
	},
	(table) => [
		index('vendor_orders_order_idx').on(table.orderId),
		index('vendor_orders_vendor_idx').on(table.vendorId)
	]
);

export const orderItems = mysqlTable(
	'order_items',
	{
		id: intPk(),
		// Column renamed from `order_id`: it points at vendor_orders, and the
		// old name read as a reference to `orders` in every raw query.
		vendorOrderId: int('vendor_order_id')
			.notNull()
			.references(() => vendorOrders.id, { onDelete: 'cascade' }),
		productId: int('product_id').references(() => vendorServices.id, { onDelete: 'set null' }),
		quantity: int('quantity').notNull(),
		amount: varchar('amount', { length: 255 }).notNull(),
		price: decimal('price', { precision: 10, scale: 2 }).notNull(),
		...secureFields
	},
	(table) => [index('order_items_vendor_order_idx').on(table.vendorOrderId)]
);

export const vendorAvailability = mysqlTable(
	'vendor_availability',
	{
		id: intPk(),
		vendorId: int('vendor_id')
			.notNull()
			.references(() => vendors.id, { onDelete: 'cascade' }),
		availableDate: date('available_date', { mode: 'string' }).notNull(),
		isAvailable: boolean('is_available').default(true).notNull()
	},
	(table) => [
		unique('vendor_availability_vendor_date_uq').on(table.vendorId, table.availableDate),
		index('vendor_availability_vendor_idx').on(table.vendorId)
	]
);

export const vendorBookings = mysqlTable(
	'vendor_bookings',
	{
		id: intPk(),
		weddingPlanId: int('wedding_plan_id')
			.notNull()
			.references(() => weddingPlans.id, { onDelete: 'cascade' }),
		vendorId: int('vendor_id')
			.notNull()
			.references(() => vendors.id),
		serviceId: int('service_id').references(() => vendorServices.id, { onDelete: 'set null' }),
		/**
		 * `completed` = the service was delivered: the couple said so, or the event date passed
		 * the hold window with no open dispute (see `releaseHeldFunds`). Only the system sets it.
		 */
		status: mysqlEnum('status', ['pending', 'confirmed', 'completed', 'cancelled'])
			.default('pending')
			.notNull(),
		agreedPrice: decimal('agreed_price', { precision: 10, scale: 2 }),
		eventDate: date('event_date', { mode: 'string' }),
		completedAt: timestamp('completed_at', { fsp: 3 }),
		cancellationReason: text('cancellation_reason'),
		cancelledBy: mysqlEnum('cancelled_by', ['couple', 'vendor', 'admin']),
		cancelledAt: timestamp('cancelled_at', { fsp: 3 }),
		/**
		 * Share of the confirmed payments the couple was owed back when the booking was cancelled
		 * (100 when the vendor cancelled). Set means refunds were raised and the vendor's kept share
		 * can be released once staff settle them.
		 */
		refundPercent: tinyint('refund_percent', { unsigned: true }),
		...secureFields
	},
	(table) => [
		index('vendor_bookings_vendor_idx').on(table.vendorId),
		index('vendor_bookings_vendor_date_idx').on(table.vendorId, table.eventDate),
		index('vendor_bookings_wedding_plan_idx').on(table.weddingPlanId)
	]
);

export const vendorQuotes = mysqlTable(
	'vendor_quotes',
	{
		id: intPk(),
		bookingId: int('booking_id')
			.notNull()
			.references(() => vendorBookings.id, { onDelete: 'cascade' }),
		vendorId: int('vendor_id')
			.notNull()
			.references(() => vendors.id),
		proposedPrice: decimal('proposed_price', { precision: 12, scale: 2 }),
		notes: text('notes'),
		status: mysqlEnum('status', ['sent', 'accepted', 'rejected']).default('sent').notNull(),
		createdAt: timestamp('created_at', { fsp: 3 }).defaultNow().notNull()
	},
	(table) => [index('vendor_quotes_booking_idx').on(table.bookingId)]
);

export const vendorCommissions = mysqlTable(
	'vendor_commissions',
	{
		id: intPk(),
		vendorId: int('vendor_id')
			.notNull()
			.references(() => vendors.id, { onDelete: 'cascade' }),
		commissionType: mysqlEnum('commission_type', ['percentage', 'fixed']).notNull(),
		value: decimal('value', { precision: 10, scale: 2 }).notNull()
	},
	(table) => [index('vendor_commissions_vendor_idx').on(table.vendorId)]
);

export const vendorPayouts = mysqlTable(
	'vendor_payouts',
	{
		id: intPk(),
		vendorId: int('vendor_id')
			.notNull()
			.references(() => vendors.id),
		amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
		payoutMethod: mysqlEnum('payout_method', ['bank_transfer', 'mobile_money', 'cash']),
		status: mysqlEnum('status', ['requested', 'processing', 'completed', 'rejected'])
			.default('requested')
			.notNull(),
		reference: varchar('reference', { length: 150 }),
		/** Where the vendor wants the money: bank and account number, or a phone for mobile money. */
		destination: varchar('destination', { length: 255 }),
		createdAt: timestamp('created_at', { fsp: 3 }).defaultNow().notNull()
	},
	(table) => [index('vendor_payouts_vendor_idx').on(table.vendorId)]
);

export const vendorPromotions = mysqlTable(
	'vendor_promotions',
	{
		id: intPk(),
		vendorId: int('vendor_id')
			.notNull()
			.references(() => vendors.id, { onDelete: 'cascade' }),
		type: mysqlEnum('type', ['featured', 'homepage', 'category_boost']),
		startsAt: date('starts_at', { mode: 'string' }),
		endsAt: date('ends_at', { mode: 'string' })
	},
	(table) => [index('vendor_promotions_vendor_idx').on(table.vendorId)]
);

export const vendorSubscriptions = mysqlTable(
	'vendor_subscriptions',
	{
		id: intPk(),
		vendorId: int('vendor_id')
			.notNull()
			.references(() => vendors.id, { onDelete: 'cascade' }),
		planId: int('plan_id')
			.notNull()
			.references(() => subscriptionPlans.id),
		startsAt: date('starts_at', { mode: 'string' }),
		endsAt: date('ends_at', { mode: 'string' }),
		status: mysqlEnum('status', ['active', 'expired', 'cancelled']).default('active').notNull()
	},
	(table) => [index('vendor_subscriptions_vendor_idx').on(table.vendorId)]
);

export const vendorWallets = mysqlTable('vendor_wallets', {
	vendorId: int('vendor_id')
		.notNull()
		.references(() => vendors.id, { onDelete: 'cascade' })
		.primaryKey(),
	/** Released money: what the vendor can withdraw. */
	balance: decimal('balance', { precision: 14, scale: 2 }).default('0.00').notNull(),
	/**
	 * Paid by couples but not yet earned: held until the service is delivered, so a vendor who
	 * disappears before the wedding has not already withdrawn the couple's money.
	 */
	heldBalance: decimal('held_balance', { precision: 14, scale: 2 }).default('0.00').notNull(),
	...secureFields
});
