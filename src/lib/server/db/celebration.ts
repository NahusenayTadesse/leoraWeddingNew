import {
	mysqlTable,
	varchar,
	int,
	decimal,
	text,
	mysqlEnum,
	boolean,
	index,
	unique,
	timestamp
} from 'drizzle-orm/mysql-core';
import { idMaker, userRef, user } from './common';
import { couples, guestLists } from './weddings';
import { vendors, vendorServices } from './vendors';

/**
 * What guests give and share: money gifts, photos, blessings and song requests. Everything hangs
 * off `couples.id`, like the rest of the wedding domain.
 */

/** A money gift through Chapa from the invitation. Leora holds it until the couple asks for it. */
export const weddingGifts = mysqlTable(
	'wedding_gifts',
	{
		id: idMaker(),
		coupleId: int('couple_id')
			.notNull()
			.references(() => couples.id, { onDelete: 'cascade' }),
		/** Set when the gift came through a guest's personal link. */
		guestId: int('guest_id').references(() => guestLists.id, { onDelete: 'set null' }),
		fromName: varchar('from_name', { length: 120 }).notNull(),
		/** A blessing to go with it, shown to the couple only. */
		message: varchar('message', { length: 500 }),
		amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
		status: mysqlEnum('status', ['pending', 'paid', 'failed']).default('pending').notNull(),
		txRef: varchar('tx_ref', { length: 60 }).notNull(),
		checkoutUrl: varchar('checkout_url', { length: 500 }),
		verifyPayload: text('verify_payload'),
		/** The couple marked it thanked. */
		thankedAt: timestamp('thanked_at', { fsp: 3 }),
		paidAt: timestamp('paid_at', { fsp: 3 }),
		createdAt: timestamp('created_at', { fsp: 3 }).defaultNow().notNull()
	},
	(table) => [
		unique('wedding_gifts_tx_ref_uq').on(table.txRef),
		index('wedding_gifts_couple_idx').on(table.coupleId, table.status)
	]
);

/** The couple asks for their gift money; staff send it and mark it done. */
export const giftPayouts = mysqlTable(
	'gift_payouts',
	{
		id: idMaker(),
		coupleId: int('couple_id')
			.notNull()
			.references(() => couples.id, { onDelete: 'cascade' }),
		amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
		destination: varchar('destination', { length: 255 }).notNull(),
		status: mysqlEnum('status', ['requested', 'completed', 'rejected'])
			.default('requested')
			.notNull(),
		reference: varchar('reference', { length: 150 }),
		requestedBy: userRef('requested_by').references(() => user.id, { onDelete: 'set null' }),
		createdAt: timestamp('created_at', { fsp: 3 }).defaultNow().notNull()
	},
	(table) => [index('gift_payouts_couple_idx').on(table.coupleId)]
);

/**
 * What guests post to the wedding: a photo for the wall, a blessing, or a song for the DJ.
 * Posted from a personal invite link or the wall link printed on the tables; the couple can hide
 * any of it.
 */
export const guestPosts = mysqlTable(
	'guest_posts',
	{
		id: idMaker(),
		coupleId: int('couple_id')
			.notNull()
			.references(() => couples.id, { onDelete: 'cascade' }),
		guestId: int('guest_id').references(() => guestLists.id, { onDelete: 'set null' }),
		kind: mysqlEnum('kind', ['photo', 'blessing', 'song']).notNull(),
		authorName: varchar('author_name', { length: 120 }).notNull(),
		/** The blessing, the song ("Title — Artist"), or a photo caption. */
		body: varchar('body', { length: 500 }),
		/** Stored file name, for a photo. */
		photo: varchar('photo', { length: 255 }),
		hidden: boolean('hidden').default(false).notNull(),
		createdAt: timestamp('created_at', { fsp: 3 }).defaultNow().notNull()
	},
	(table) => [index('guest_posts_couple_kind_idx').on(table.coupleId, table.kind, table.createdAt)]
);

/** The couple's mood boards, shared between the two partners and shown to a vendor on request. */
export const inspirationBoards = mysqlTable(
	'inspiration_boards',
	{
		id: idMaker(),
		coupleId: int('couple_id')
			.notNull()
			.references(() => couples.id, { onDelete: 'cascade' }),
		name: varchar('name', { length: 80 }).notNull(),
		/** In the read-only link the couple sends a vendor; null until they first share it. */
		shareToken: varchar('share_token', { length: 24 }),
		createdAt: timestamp('created_at', { fsp: 3 }).defaultNow().notNull()
	},
	(table) => [
		index('inspiration_boards_couple_idx').on(table.coupleId),
		unique('inspiration_boards_share_uq').on(table.shareToken)
	]
);

/** One saved picture on a board: from a vendor's work, or uploaded by the couple. */
export const boardItems = mysqlTable(
	'board_items',
	{
		id: idMaker(),
		boardId: int('board_id')
			.notNull()
			.references(() => inspirationBoards.id, { onDelete: 'cascade' }),
		image: varchar('image', { length: 500 }).notNull(),
		vendorId: int('vendor_id').references(() => vendors.id, { onDelete: 'set null' }),
		serviceId: int('service_id').references(() => vendorServices.id, { onDelete: 'set null' }),
		note: varchar('note', { length: 255 }),
		createdAt: timestamp('created_at', { fsp: 3 }).defaultNow().notNull()
	},
	(table) => [
		unique('board_items_board_image_uq').on(table.boardId, table.image),
		index('board_items_board_idx').on(table.boardId)
	]
);
