import {
	mysqlTable,
	varchar,
	index,
	unique,
	int,
	decimal,
	text,
	mysqlEnum,
	timestamp,
	datetime,
	boolean
} from 'drizzle-orm/mysql-core';
import { secureFields, idMaker as intPk, userRef, user, aliveKey, jsonCol } from './common';
import { vendors, vendorBookings } from './vendors';
import { couples, weddingPlans } from './weddings';

/**
 * Two distinct money flows live here, and they are deliberately separate tables:
 *
 *   `payments`         — a couple paying Leora for a plan (Golden, Platinum).
 *   `bookingPayments`  — a couple paying a vendor for a booked service, which
 *                        Leora takes commission on and settles to a wallet.
 *
 * They were previously both called "payments"; a single table could not carry
 * both a `subscription_id` and a `payee_vendor_id` without half its columns
 * being null on every row.
 */

// ---------------------------------------------------------------------------
// PLATFORM BILLING — couples subscribing to a Leora plan
// ---------------------------------------------------------------------------

export const subscriptionPlans = mysqlTable('subscription_plans', {
	id: intPk(),
	/** Stable key used in code and checkout urls: free | golden | platinum. */
	slug: varchar('slug', { length: 30 }).notNull(),
	name: varchar('name', { length: 60 }).notNull(),
	price: decimal('price', { precision: 12, scale: 2 }).default('0').notNull(),
	billingCycle: mysqlEnum('billing_cycle', ['one_time', 'monthly', 'yearly'])
		.default('one_time')
		.notNull(),
	/** Bullet list shown on the pricing page. */
	features: jsonCol<string[]>('features'),

	/**
	 * Who the plan is sold to. Couples and vendors both subscribe, on separate
	 * tiers at overlapping prices, so the pricing page cannot tell them apart
	 * by price or billing cycle — without this column it renders all of them
	 * in one grid.
	 */
	audience: mysqlEnum('audience', ['couple', 'vendor']).default('couple').notNull(),

	/** Vendor-tier limits; null on the couple-facing plans. */
	maxBookings: int('max_bookings'),
	featuredListing: boolean('featured_listing').default(false).notNull(),
	prioritySupport: boolean('priority_support').default(false).notNull(),

	// isActive comes from secureFields — it is the same flag.
	...secureFields,
	aliveKey
},
(table) => [unique('subscription_plans_slug_uq').on(table.slug, table.aliveKey)]
);

export const coupons = mysqlTable('coupons', {
	id: intPk(),
	code: varchar('code', { length: 40 }).notNull(),
	type: mysqlEnum('type', ['percent', 'flat']).notNull(),
	value: decimal('value', { precision: 12, scale: 2 }).notNull(),
	maxUses: int('max_uses', { unsigned: true }),
	usesCount: int('uses_count', { unsigned: true }).default(0).notNull(),
	expiresAt: datetime('expires_at'),
	// isActive comes from secureFields — it is the same flag.
	...secureFields,
	aliveKey
},
(table) => [unique('coupons_code_uq').on(table.code, table.aliveKey)]
);

export const subscriptions = mysqlTable(
	'subscriptions',
	{
		id: intPk(),
		coupleId: int('couple_id')
			.notNull()
			.references(() => couples.id, { onDelete: 'cascade' }),
		subscriptionPlanId: int('subscription_plan_id')
			.notNull()
			.references(() => subscriptionPlans.id),
		status: mysqlEnum('status', ['active', 'expired', 'cancelled']).default('active').notNull(),
		startedAt: timestamp('started_at', { fsp: 3 }).defaultNow().notNull(),
		expiresAt: datetime('expires_at'),
		...secureFields
	},
	(table) => [
		index('subscriptions_couple_idx').on(table.coupleId),
		index('subscriptions_status_idx').on(table.status)
	]
);

/**
 * Leora's own accounts that customers may transfer to (plans and vendor bookings alike — the
 * platform collects, takes commission, and pays vendors out). Managed on the admin Settings page.
 */
export const bankAccounts = mysqlTable('bank_accounts', {
	id: intPk(),
	bankName: varchar('bank_name', { length: 100 }).notNull(),
	accountName: varchar('account_name', { length: 150 }).notNull(),
	accountNumber: varchar('account_number', { length: 50 }).notNull(),
	sortOrder: int('sort_order').default(0).notNull(),
	...secureFields
});

/**
 * How a payment row is being settled, shared by both payment tables. A Chapa row is settled
 * only by `verify` (server-to-server); a transfer only by staff checking the receipt.
 */
const settlementFields = () => ({
	/** Chapa's hosted checkout for this attempt. */
	checkoutUrl: text('checkout_url'),
	/** Uploaded transfer receipt (stored file name). Served only to the payer, payee and staff. */
	receiptFile: varchar('receipt_file', { length: 255 }),
	bankAccountId: int('bank_account_id').references(() => bankAccounts.id, { onDelete: 'set null' }),
	/** Chapa's verify response, or the reason a receipt was rejected. */
	verifyPayload: text('verify_payload'),
	verifiedAt: timestamp('verified_at', { fsp: 3 }),
	/** Staff member who confirmed or rejected a transfer. */
	reviewedBy: userRef('reviewed_by').references(() => user.id, { onDelete: 'set null' })
});

export const payments = mysqlTable(
	'payments',
	{
		id: intPk(),
		/** SET NULL, not CASCADE — see the note on bookingPayments. */
		coupleId: int('couple_id').references(() => couples.id, { onDelete: 'set null' }),
		subscriptionId: int('subscription_id').references(() => subscriptions.id, {
			onDelete: 'set null'
		}),
		amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
		currency: varchar('currency', { length: 10 }).default('ETB').notNull(),
		paymentMethod: mysqlEnum('payment_method', [
			'telebirr',
			'cbe_birr',
			'chapa',
			'bank_transfer',
			'card',
			'cash'
		]),
		/**
		 * The plan being bought. Stored on the row so settling can never be pointed at a different
		 * plan than the one priced (the old confirm link carried it in an editable token).
		 */
		subscriptionPlanId: int('subscription_plan_id').references(() => subscriptionPlans.id, {
			onDelete: 'set null'
		}),
		couponId: int('coupon_id').references(() => coupons.id, { onDelete: 'set null' }),
		discountAmount: decimal('discount_amount', { precision: 12, scale: 2 })
			.default('0')
			.notNull(),
		/**
		 * Rows start 'pending'. Only the payment gateway's server-to-server
		 * callback may move one to 'completed' — never the request that created it.
		 */
		status: mysqlEnum('status', ['pending', 'completed', 'failed', 'refunded'])
			.default('pending')
			.notNull(),
		transactionRef: varchar('transaction_ref', { length: 100 }),
		paidAt: timestamp('paid_at', { fsp: 3 }),
		...settlementFields(),
		...secureFields
	},
	(table) => [
		index('payments_couple_idx').on(table.coupleId),
		index('payments_status_idx').on(table.status),
		index('payments_receipt_idx').on(table.receiptFile),
		// The gateway's reference is the idempotency key: a retried or
		// duplicated callback must not create a second completed payment.
		unique('payments_transaction_ref_uq').on(table.transactionRef)
	]
);

// ---------------------------------------------------------------------------
// MARKETPLACE MONEY — couples paying vendors, and settlement
// ---------------------------------------------------------------------------

export const bookingPayments = mysqlTable(
	'booking_payments',
	{
		id: intPk(),
		/**
		 * Nullable + SET NULL, never CASCADE. Deleting a couple used to walk
		 * couples -> wedding_plans -> vendor_bookings -> booking_payments and
		 * silently erase settled money: a confirmed 50,000 ETB payment and its
		 * commission row vanished with no error. Payment records must survive
		 * the customer for reconciliation, vendor payouts and tax.
		 */
		weddingPlanId: int('wedding_plan_id').references(() => weddingPlans.id, {
			onDelete: 'set null'
		}),
		bookingId: int('booking_id').references(() => vendorBookings.id, { onDelete: 'set null' }),
		payerId: userRef('payer_id').references(() => user.id, { onDelete: 'set null' }),
		payeeVendorId: int('payee_vendor_id').references(() => vendors.id, { onDelete: 'set null' }),
		amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
		currency: varchar('currency', { length: 10 }).default('ETB').notNull(),
		paymentMethod: mysqlEnum('payment_method', [
			'cash',
			'bank_transfer',
			'mobile_money',
			'card',
			'chapa'
		]).notNull(),
		paymentType: mysqlEnum('payment_type', ['advance', 'full', 'balance']).notNull(),
		status: mysqlEnum('status', ['pending', 'confirmed', 'failed', 'refunded'])
			.default('pending')
			.notNull(),
		transactionReference: varchar('transaction_reference', { length: 150 }),
		paidAt: timestamp('paid_at', { fsp: 3 }),
		...settlementFields(),
		...secureFields
	},
	(table) => [
		index('booking_payments_status_idx').on(table.status),
		index('booking_payments_receipt_idx').on(table.receiptFile),
		index('booking_payments_wedding_plan_idx').on(table.weddingPlanId),
		index('booking_payments_booking_idx').on(table.bookingId),
		index('booking_payments_payer_idx').on(table.payerId),
		index('booking_payments_payee_vendor_idx').on(table.payeeVendorId),
		unique('booking_payments_transaction_ref_uq').on(table.transactionReference)
	]
);

export const walletTransactions = mysqlTable(
	'wallet_transactions',
	{
		id: intPk(),
		vendorId: int('vendor_id')
			.notNull()
			.references(() => vendors.id, { onDelete: 'cascade' }),
		bookingPaymentId: int('booking_payment_id').references(() => bookingPayments.id, {
			onDelete: 'set null'
		}),
		amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
		transactionType: mysqlEnum('transaction_type', [
			'credit',
			'debit',
			'commission',
			'payout'
		]).notNull(),
		description: varchar('description', { length: 255 }),
		createdAt: timestamp('created_at', { fsp: 3 }).defaultNow().notNull()
	},
	(table) => [index('wallet_transactions_vendor_idx').on(table.vendorId)]
);

export const paymentCommissions = mysqlTable(
	'payment_commissions',
	{
		id: intPk(),
		bookingPaymentId: int('booking_payment_id')
			.notNull()
			.references(() => bookingPayments.id, { onDelete: 'restrict' }),
		vendorId: int('vendor_id')
			.notNull()
			.references(() => vendors.id),
		grossAmount: decimal('gross_amount', { precision: 12, scale: 2 }).notNull(),
		commissionAmount: decimal('commission_amount', { precision: 12, scale: 2 }).notNull(),
		netAmount: decimal('net_amount', { precision: 12, scale: 2 }).notNull()
	},
	(table) => [
		// One commission record per payment — a second would double-charge the
		// vendor and corrupt the wallet balance.
		unique('payment_commissions_payment_uq').on(table.bookingPaymentId),
		index('payment_commissions_vendor_idx').on(table.vendorId)
	]
);

export const refunds = mysqlTable(
	'refunds',
	{
		id: intPk(),
		bookingPaymentId: int('booking_payment_id')
			.notNull()
			.references(() => bookingPayments.id, { onDelete: 'restrict' }),
		amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
		reason: text('reason'),
		status: mysqlEnum('status', ['pending', 'approved', 'rejected']).default('pending').notNull(),
		...secureFields
	},
	(table) => [index('refunds_booking_payment_idx').on(table.bookingPaymentId)]
);

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
			.references(() => vendorBookings.id, { onDelete: 'cascade' }),
		/** Stored file name of the PDF (served by /contracts/[id] to the two parties and staff). */
		documentUrl: varchar('document_url', { length: 255 }),
		title: varchar('title', { length: 150 }),
		signedByCouple: boolean('signed_by_couple').default(false).notNull(),
		signedByVendor: boolean('signed_by_vendor').default(false).notNull(),
		/** Typed-name e-signatures: who, when, from where. Cleared when the document changes. */
		coupleSignedName: varchar('couple_signed_name', { length: 150 }),
		coupleSignedAt: timestamp('couple_signed_at', { fsp: 3 }),
		coupleSignedIp: varchar('couple_signed_ip', { length: 45 }),
		vendorSignedName: varchar('vendor_signed_name', { length: 150 }),
		vendorSignedAt: timestamp('vendor_signed_at', { fsp: 3 }),
		vendorSignedIp: varchar('vendor_signed_ip', { length: 45 }),
		...secureFields
	},
	(table) => [
		index('contracts_booking_idx').on(table.bookingId),
		index('contracts_document_idx').on(table.documentUrl)
	]
);

export const disputes = mysqlTable(
	'disputes',
	{
		id: intPk(),
		bookingId: int('booking_id')
			.notNull()
			.references(() => vendorBookings.id, { onDelete: 'cascade' }),
		raisedBy: mysqlEnum('raised_by', ['couple', 'vendor']),
		reason: text('reason').notNull(),
		status: mysqlEnum('status', ['open', 'under_review', 'resolved', 'refunded'])
			.default('open')
			.notNull(),
		resolutionNotes: text('resolution_notes'),
		createdAt: timestamp('created_at', { fsp: 3 }).defaultNow().notNull()
	},
	(table) => [index('disputes_booking_idx').on(table.bookingId)]
);
