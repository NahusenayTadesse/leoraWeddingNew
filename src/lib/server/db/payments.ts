import {
	mysqlTable,
	varchar,
	index,
	int,
	decimal,
	text,
	mysqlEnum,
	tinyint,
	timestamp,
	boolean
} from 'drizzle-orm/mysql-core';
import { secureFields, idMaker as intPk } from './auth.schema';
import { user } from './auth.schema';
import { vendors, vendorBookings } from './vendors';
import { weddings } from './weddings';

export const subscriptionPlans = mysqlTable('subscription_plans', {
	id: intPk(),
	name: varchar('name', { length: 100 }),
	monthlyPrice: decimal('monthly_price', { precision: 10, scale: 2 }),
	maxBookings: int('max_bookings'),
	featuredListing: tinyint('featured_listing').default(0),
	prioritySupport: tinyint('priority_support').default(0),
	...secureFields
});

export const walletTransactions = mysqlTable('wallet_transactions', {
	id: intPk(),
	vendorId: int('vendor_id')
		.notNull()
		.references(() => vendors.id),
	paymentId: int('payment_id').references(() => payments.id),
	amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
	transactionType: mysqlEnum('transaction_type', [
		'credit',
		'debit',
		'commission',
		'payout'
	]).notNull(),
	description: varchar('description', { length: 255 }),
	createdAt: timestamp('created_at').defaultNow().notNull()
});

export const payments = mysqlTable(
	'payments',
	{
		id: intPk(),
		weddingId: int('wedding_id')
			.notNull()
			.references(() => weddings.id),
		bookingId: int('booking_id').references(() => vendorBookings.id),
		payerId: varchar('payer_id', { length: 255 })
			.notNull()
			.references(() => user.id),
		payeeVendorId: int('payee_vendor_id').references(() => vendors.id),
		amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
		currency: varchar('currency', { length: 10 }).default('ETB'),
		paymentMethod: mysqlEnum('payment_method', [
			'cash',
			'bank_transfer',
			'mobile_money',
			'card'
		]).notNull(),
		paymentType: mysqlEnum('payment_type', ['advance', 'full', 'balance']).notNull(),
		status: mysqlEnum('status', ['pending', 'confirmed', 'failed', 'refunded']).default('pending'),
		transactionReference: varchar('transaction_reference', { length: 150 }),
		paidAt: timestamp('paid_at'),
		createdAt: timestamp('created_at').defaultNow().notNull()
	},
	(table) => ({
		weddingIdIdx: index('payments_wedding_id_idx').on(table.weddingId),
		bookingIdIdx: index('payments_booking_id_idx').on(table.bookingId),
		payerIdIdx: index('payments_payer_id_idx').on(table.payerId),
		payeeVendorIdIdx: index('payments_payee_vendor_id_idx').on(table.payeeVendorId)
	})
);

// Table: payment_commissions
export const paymentCommissions = mysqlTable(
	'payment_commissions',
	{
		id: intPk(),
		paymentId: int('payment_id')
			.notNull()
			.references(() => payments.id),
		vendorId: int('vendor_id')
			.notNull()
			.references(() => vendors.id),
		grossAmount: decimal('gross_amount', { precision: 12, scale: 2 }).notNull(),
		commissionAmount: decimal('commission_amount', { precision: 12, scale: 2 }).notNull(),
		netAmount: decimal('net_amount', { precision: 12, scale: 2 }).notNull()
	},
	(table) => ({
		paymentIdIdx: index('payment_commissions_payment_id_idx').on(table.paymentId),
		vendorIdIdx: index('payment_commissions_vendor_id_idx').on(table.vendorId)
	})
);

// Table: refunds
export const refunds = mysqlTable(
	'refunds',
	{
		id: intPk(),
		paymentId: int('payment_id')
			.notNull()
			.references(() => payments.id),
		amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
		reason: text('reason'),
		status: mysqlEnum('status', ['pending', 'approved', 'rejected']).default('pending'),
		...secureFields
	},
	(table) => ({
		paymentIdIdx: index('refunds_payment_id_idx').on(table.paymentId)
	})
);

// Table: commission_settings
export const commissionSettings = mysqlTable('commission_settings', {
	id: intPk(),
	commissionType: mysqlEnum('commission_type', ['percentage', 'fixed']).notNull(),
	value: decimal('value', { precision: 10, scale: 2 }).notNull(),
	...secureFields
});

export const contracts = mysqlTable(
	'contracts',
	{
		id: intPk(),
		bookingId: int('booking_id')
			.notNull()
			.references(() => vendorBookings.id),
		documentUrl: text('document_url'),
		signedByCouple: boolean('signed_by_couple').default(false),
		signedByVendor: boolean('signed_by_vendor').default(false),
		...secureFields
	},
	(table) => ({
		bookingIdIdx: index('contracts_booking_id_idx').on(table.bookingId)
	})
);

// Table: disputes
export const disputes = mysqlTable(
	'disputes',
	{
		id: intPk(),
		bookingId: int('booking_id')
			.notNull()
			.references(() => vendorBookings.id),
		raisedBy: mysqlEnum('raised_by', ['couple', 'vendor']),
		reason: text('reason').notNull(),
		status: mysqlEnum('status', ['open', 'under_review', 'resolved', 'refunded']).default('open'),
		resolutionNotes: text('resolution_notes'),
		createdAt: timestamp('created_at').defaultNow().notNull()
	},
	(table) => ({
		bookingIdIdx: index('disputes_booking_id_idx').on(table.bookingId)
	})
);
