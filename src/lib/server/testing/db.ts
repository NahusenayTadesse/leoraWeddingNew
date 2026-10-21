/**
 * Fixtures for DB tests. Every helper writes straight to the tables; `resetDb` empties the ones
 * the tests use (reference data from seed.sql — roles, plans, categories — is kept).
 */
import { randomUUID } from 'node:crypto';
import { sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import {
	bankAccounts,
	commissionSettings,
	coupons,
	couples,
	user,
	vendorBookings,
	vendors,
	weddingPlans
} from '$lib/server/db/schema';

const TABLES = [
	'gift_payouts',
	'wedding_gifts',
	'guest_posts',
	'board_items',
	'inspiration_boards',
	'wedding_cards',
	'guest_lists',
	'wedding_events',
	'notifications',
	'messages',
	'wallet_transactions',
	'payment_commissions',
	'refunds',
	'booking_payments',
	'payments',
	'vendor_wallets',
	'vendor_payouts',
	'vendor_promotions',
	'vendor_profile_views',
	'saved_vendors',
	'vendor_subscriptions',
	'subscriptions',
	'contracts',
	'disputes',
	'vendor_quotes',
	'vendor_availability',
	'vendor_bookings',
	'vendor_commissions',
	'vendor_reviews',
	'wedding_plans',
	'couples',
	'vendors',
	'bank_accounts',
	'coupons',
	'commission_settings',
	'session',
	'account',
	'user'
];

export async function resetDb() {
	await db.execute(sql`SET FOREIGN_KEY_CHECKS = 0`);
	for (const t of TABLES) await db.execute(sql.raw(`TRUNCATE TABLE \`${t}\``));
	await db.execute(sql`SET FOREIGN_KEY_CHECKS = 1`);
}

export async function makeUser(name = 'Test User', roleId: number | null = null) {
	const id = randomUUID().replace(/-/g, '').slice(0, 32);
	await db
		.insert(user)
		.values({ id, name, email: `${id}@example.com`, emailVerified: true, roleId });
	return { id, name, email: `${id}@example.com` };
}

export async function makeVendor(name = 'Mesk Studio') {
	const owner = await makeUser(name, 6);
	const [row] = await db
		.insert(vendors)
		.values({
			userId: owner.id,
			businessName: name,
			status: 'approved',
			city: 'Addis Ababa',
			categoryId: 2
		})
		.$returningId();
	return { id: row.id, userId: owner.id };
}

export async function makeCoupleWithWedding() {
	const partner = await makeUser('Selam', 2);
	const [couple] = await db
		.insert(couples)
		.values({
			partner1UserId: partner.id,
			inviteCode: randomUUID().slice(0, 8),
			slug: `test-${randomUUID().slice(0, 8)}`,
			brideName: 'Selam',
			groomName: 'Dawit',
			email: partner.email,
			phone: '0911223344'
		})
		.$returningId();
	const [wedding] = await db.insert(weddingPlans).values({ coupleId: couple.id }).$returningId();
	return { coupleId: couple.id, weddingPlanId: wedding.id, userId: partner.id, user: partner };
}

export async function makeBooking(
	weddingPlanId: number,
	vendorId: number,
	agreedPrice = 30000,
	status: 'pending' | 'confirmed' = 'confirmed'
) {
	const [row] = await db
		.insert(vendorBookings)
		.values({
			weddingPlanId,
			vendorId,
			agreedPrice: agreedPrice.toFixed(2),
			status,
			eventDate: '2030-02-14'
		})
		.$returningId();
	return { id: row.id, vendorId, status };
}

export async function makeBankAccount() {
	const [row] = await db
		.insert(bankAccounts)
		.values({ bankName: 'CBE', accountName: 'Leora Events PLC', accountNumber: '1000123456789' })
		.$returningId();
	return row.id;
}

export async function setCommission(type: 'percentage' | 'fixed', value: number) {
	await db.insert(commissionSettings).values({ commissionType: type, value: value.toFixed(2) });
}

export async function makeCoupon(
	code: string,
	type: 'percent' | 'flat',
	value: number,
	maxUses?: number
) {
	const [row] = await db
		.insert(coupons)
		.values({ code, type, value: value.toFixed(2), maxUses: maxUses ?? null })
		.$returningId();
	return row.id;
}

/**
 * Chapa stubbed at `fetch`: `initialize` returns a checkout URL; `verify/<txRef>` answers with
 * whatever was registered for that reference (default: not paid yet).
 */
export function stubChapa() {
	const answers = new Map<string, Record<string, unknown> | 'down'>();
	const original = globalThis.fetch;
	globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
		const url = String(input);
		if (url.endsWith('/transaction/initialize')) {
			const body = JSON.parse(String(init?.body ?? '{}'));
			return new Response(
				JSON.stringify({
					status: 'success',
					data: { checkout_url: `https://checkout.chapa.co/test/${body.tx_ref}` }
				}),
				{ status: 200 }
			);
		}
		const match = url.match(/\/transaction\/verify\/(.+)$/);
		if (match) {
			const txRef = decodeURIComponent(match[1]);
			const answer = answers.get(txRef);
			if (answer === 'down') return new Response('bad gateway', { status: 502 });
			if (!answer)
				return new Response(JSON.stringify({ status: 'failed', message: 'Invalid transaction' }), {
					status: 400
				});
			return new Response(
				JSON.stringify({ status: 'success', data: { tx_ref: txRef, currency: 'ETB', ...answer } }),
				{
					status: 200
				}
			);
		}
		return original(input, init);
	}) as typeof fetch;
	return {
		paid: (txRef: string, amount: number) => answers.set(txRef, { status: 'success', amount }),
		failed: (txRef: string) => answers.set(txRef, { status: 'failed', amount: 0 }),
		down: (txRef: string) => answers.set(txRef, 'down'),
		restore: () => (globalThis.fetch = original)
	};
}
