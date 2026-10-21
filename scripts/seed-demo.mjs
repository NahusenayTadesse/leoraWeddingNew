#!/usr/bin/env node
/**
 * Fills a database with a believable demo marketplace: vendors with services, packages and
 * photos; couples at every stage (planning, marrying today, married) with guests, budgets,
 * tasks, events, bookings, held and released payments, reviews, invitations, gifts, a photo
 * wall, inspiration boards and messages; and the admin queues (approvals, payouts, a dispute,
 * a refund, contact messages).
 *
 *   npm run db:migrate
 *   mariadb -u USER -p DBNAME < database/seed.sql      # reference data first
 *   npm run seed:demo                                  # then this (refuses a non-empty DB)
 *   npm run seed:demo -- --reset                       # wipe the demo content and seed again
 *
 * Dates are relative to the day it runs, so a fresh seed always has a wedding today, weddings
 * coming up and weddings just past. Every demo account's password is DEMO_PASSWORD below.
 * Reads DATABASE_URL from the environment or .env. Never run it against real customer data.
 */
import { randomBytes, randomUUID } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import mysql from 'mysql2/promise';
import { hashPassword } from 'better-auth/crypto';
import {
	BLESSINGS,
	COUPLES,
	GIFT_FROM,
	NAMES,
	PENDING_VENDORS,
	REVIEWS,
	SONGS,
	SURNAMES,
	TESTIMONIALS,
	VENDOR_REPLIES,
	VENDORS,
	pic
} from './demo/data.mjs';

const DEMO_PASSWORD = 'LeoraDemo2026!';
const DOMAIN = 'leora.demo';
const COMMISSION = 0.1;

const { values: args } = parseArgs({ options: { reset: { type: 'boolean', default: false } } });

if (!process.env.DATABASE_URL && existsSync('.env')) {
	for (const line of readFileSync('.env', 'utf8').split('\n')) {
		const m = line.match(/^\s*DATABASE_URL\s*=\s*"?([^"\n]+)"?/);
		if (m) process.env.DATABASE_URL = m[1];
	}
}
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set');

// ---------------------------------------------------------------------------
// Helpers: a seeded random source (the same demo every run), dates in Addis Ababa time
// ---------------------------------------------------------------------------

let seed = 20260214;
const rand = () => {
	seed = (seed + 0x6d2b79f5) | 0;
	let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
	t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
	return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const between = (a, b) => Math.floor(a + rand() * (b - a + 1));
const pick = (list) => list[Math.floor(rand() * list.length)];
const chance = (p) => rand() < p;
const shuffle = (list) => [...list].sort(() => rand() - 0.5);
const round = (n, to = 1000) => Math.round(n / to) * to;
const money = (n) => (Math.round(n * 100) / 100).toFixed(2);

const TODAY = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Addis_Ababa' }).format(
	new Date()
);
/** `YYYY-MM-DD`, `offset` days from today. */
const day = (offset) =>
	new Date(Date.parse(`${TODAY}T00:00:00Z`) + offset * 86_400_000).toISOString().slice(0, 10);
/** A moment `offset` days from today at `time` in Addis Ababa, as a Date. */
const at = (offset, time = '12:00') => {
	const [h, m] = time.split(':').map((n) => n.padStart(2, '0'));
	return new Date(`${day(offset)}T${h}:${m}:00+03:00`);
};
const token = (n = 16) => randomBytes(n).toString('base64url').slice(0, n);
const inviteCode = () =>
	Array.from(randomBytes(12), (b) => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[b % 32]).join('');
const slugify = (s) =>
	s
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '');
const phone = () => `09${between(10, 99)}${between(100000, 999999)}`;

// ---------------------------------------------------------------------------

const conn = await mysql.createConnection({
	uri: process.env.DATABASE_URL,
	multipleStatements: true
});
const q = (sql, params = []) => conn.query(sql, params);
/** Insert one row, return its id. */
async function insert(table, row) {
	const cols = Object.keys(row);
	// Dates are stored as UTC, as the app's Drizzle columns write and read them.
	for (const c of cols) {
		if (row[c] instanceof Date) row[c] = row[c].toISOString().slice(0, 23).replace('T', ' ');
	}
	const [res] = await q(
		`INSERT INTO \`${table}\` (${cols.map((c) => `\`${c}\``).join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`,
		cols.map((c) => row[c])
	);
	return res.insertId;
}

const [[roleCheck]] = await q('SELECT COUNT(*) n FROM roles');
if (!roleCheck.n) throw new Error('Load database/seed.sql first (roles, categories, plans).');

/** Everything the demo writes. Reference data from seed.sql (roles, plans, categories) stays. */
const CONTENT_TABLES = [
	'board_items',
	'inspiration_boards',
	'guest_posts',
	'gift_payouts',
	'wedding_gifts',
	'vendor_profile_views',
	'notifications',
	'messages',
	'activity_logs',
	'contact_messages',
	'testimonials',
	'contracts',
	'disputes',
	'refunds',
	'wallet_transactions',
	'payment_commissions',
	'booking_payments',
	'payments',
	'vendor_wallets',
	'vendor_payouts',
	'vendor_quotes',
	'vendor_reviews',
	'saved_vendors',
	'vendor_availability',
	'vendor_bookings',
	'vendor_promotions',
	'vendor_subscriptions',
	'subscriptions',
	'service_images',
	'prices',
	'vendor_services',
	'vendor_packages',
	'vendors',
	'wedding_cards',
	'tasks',
	'budget_items',
	'seating_tables',
	'seating_plans',
	'guest_lists',
	'wedding_events',
	'wedding_plans',
	'couples',
	'two_factor',
	'session',
	'account',
	'verification',
	'user'
];

const [[vendorCount]] = await q('SELECT COUNT(*) n FROM vendors');
if (vendorCount.n && !args.reset) {
	throw new Error('This database already has vendors. Run with --reset to wipe the demo content.');
}
if (args.reset) {
	await q('SET FOREIGN_KEY_CHECKS = 0');
	for (const t of CONTENT_TABLES) await q(`TRUNCATE TABLE \`${t}\``);
	await q('SET FOREIGN_KEY_CHECKS = 1');
	console.log('Wiped demo content.');
}

const ROLE = Object.fromEntries(
	(await q('SELECT id, name FROM roles'))[0].map((r) => [r.name, r.id])
);
const PLAN = Object.fromEntries(
	(await q('SELECT id, slug FROM subscription_plans'))[0].map((p) => [p.slug, p.id])
);
const [templates] = await q('SELECT * FROM task_templates ORDER BY sort_order');
let [[bank]] = await q('SELECT id FROM bank_accounts LIMIT 1');
if (!bank) {
	const id = await insert('bank_accounts', {
		bank_name: 'Commercial Bank of Ethiopia',
		account_name: 'Leora Events PLC',
		account_number: '1000234567891'
	});
	bank = { id };
}

const hash = await hashPassword(DEMO_PASSWORD);
const accounts = [];

async function makeUser(name, email, role, image = null) {
	const id = randomUUID().replace(/-/g, '');
	await insert('user', {
		id,
		name,
		email,
		email_verified: 1,
		image,
		role_id: ROLE[role],
		role: role.toLowerCase(),
		created_at: at(-between(30, 420)),
		updated_at: new Date()
	});
	await insert('account', {
		id: randomUUID().replace(/-/g, ''),
		account_id: id,
		provider_id: 'credential',
		user_id: id,
		password: hash,
		created_at: new Date(),
		updated_at: new Date()
	});
	return id;
}

// ---------------------------------------------------------------------------
// Staff
// ---------------------------------------------------------------------------

const adminId = await makeUser('Leora Admin', `admin@${DOMAIN}`, 'Admin');
await makeUser('Support Desk', `support@${DOMAIN}`, 'Support');
accounts.push(['Admin', `admin@${DOMAIN}`], ['Support', `support@${DOMAIN}`]);

// ---------------------------------------------------------------------------
// Vendors, services, packages, plans
// ---------------------------------------------------------------------------

const vendors = [];
let picCursor = {};
const nextPic = (pool) => {
	picCursor[pool] = (picCursor[pool] ?? between(0, 6)) + 1;
	return pic(pool, picCursor[pool]);
};

for (const [i, v] of VENDORS.entries()) {
	const slug = v.login ?? slugify(v.name).slice(0, 24);
	const ownerName = `${pick(NAMES.MALE.concat(NAMES.FEMALE))} ${pick(SURNAMES)}`;
	const email = `${slug}@${DOMAIN}`;
	const userId = await makeUser(ownerName, email, 'Vendor');
	if (i < 3 || v.login) accounts.push([`Vendor (${v.name})`, email]);
	const verified = i % 5 !== 4;
	const id = await insert('vendors', {
		user_id: userId,
		category_id: v.cat,
		business_name: v.name,
		description: v.about,
		city: v.city,
		address: v.area,
		phone: `+2519${between(10000000, 99999999)}`,
		email: `hello@${slug}.example`,
		price_min: money(v.min),
		price_max: money(v.max),
		is_featured: i % 6 === 0 ? 1 : 0,
		is_verified: verified ? 1 : 0,
		verified_at: verified ? at(-between(20, 300)) : null,
		status: 'approved',
		max_guests: v.guests ?? null,
		cancellation_policy: v.policy,
		deposit_percent: v.deposit,
		balance_due_days: v.cat === 1 || v.cat === 4 ? 21 : 14,
		created_at: at(-between(120, 500)),
		created_by: userId
	});
	const services = [];
	for (const [title, price] of v.services) {
		const cover =
			v.coffee && services.length === 1
				? pic('coffee', 2)
				: v.dancers
					? pic('party', services.length + 1)
					: nextPic(v.pool);
		const sid = await insert('vendor_services', {
			vendor_id: id,
			title,
			featured_image: cover,
			currency: 'ETB',
			category_id: v.cat <= 8 ? v.cat : null,
			description: `${title} by ${v.name}. ${v.about.split('.')[0]}.`,
			created_by: userId
		});
		await insert('prices', { service_id: sid, price: money(price), amount: 1 });
		for (let g = 0; g < 3; g++) {
			await insert('service_images', {
				product_id: sid,
				image_url: v.coffee
					? pic('coffee', g + 1)
					: v.dancers
						? pic('party', g + 1)
						: nextPic(v.pool)
			});
		}
		services.push({ id: sid, title, price });
	}
	for (const [name, price, inclusions] of v.packages) {
		await insert('vendor_packages', {
			vendor_id: id,
			name,
			price: money(price),
			inclusions: JSON.stringify(inclusions),
			description: `${name}: ${inclusions.join(', ').toLowerCase()}.`,
			created_by: userId
		});
	}
	// A few blocked days ahead, as busy vendors have.
	for (let b = 0; b < between(2, 6); b++) {
		await q(
			'INSERT IGNORE INTO vendor_availability (vendor_id, available_date, is_available) VALUES (?, ?, 0)',
			[id, day(between(3, 150))]
		);
	}
	// Plans: featured listing for some, growth for others, free for the rest.
	if (i % 4 === 0 || i % 4 === 1) {
		const slugPlan = i % 4 === 0 ? 'featured' : 'growth';
		await insert('vendor_subscriptions', {
			vendor_id: id,
			plan_id: PLAN[slugPlan],
			starts_at: day(-between(10, 60)),
			ends_at: day(between(30, 330)),
			status: 'active'
		});
		await insert('payments', {
			vendor_id: id,
			subscription_plan_id: PLAN[slugPlan],
			amount: slugPlan === 'featured' ? '4500.00' : '1500.00',
			currency: 'ETB',
			payment_method: 'chapa',
			status: 'completed',
			transaction_ref: `vp-${id}-${token(10)}`,
			paid_at: at(-between(10, 60)),
			verified_at: at(-between(10, 60))
		});
		if (slugPlan === 'featured') {
			await insert('vendor_promotions', {
				vendor_id: id,
				type: 'featured',
				starts_at: day(-5),
				ends_at: day(60)
			});
		}
	}
	// Profile views over the last month.
	for (let d = 0; d < 30; d++) {
		await insert('vendor_profile_views', {
			vendor_id: id,
			day: day(-d),
			views: between(3, 40) + (v.login ? 25 : 0)
		});
	}
	vendors.push({ ...v, id, userId, services, wallet: { balance: 0, held: 0 } });
}

for (const v of PENDING_VENDORS) {
	const userId = await makeUser(
		`${pick(NAMES.MALE)} ${pick(SURNAMES)}`,
		`${slugify(v.name)}@${DOMAIN}`,
		'Vendor'
	);
	await insert('vendors', {
		user_id: userId,
		category_id: v.cat,
		business_name: v.name,
		description: v.about,
		city: v.city,
		price_min: money(v.min),
		price_max: money(v.max),
		status: v.status,
		created_at: at(-between(1, 6))
	});
}

const byCat = (cat) => vendors.filter((v) => v.cat === cat);
const vendorIn = (cat, city) => {
	const local = byCat(cat).filter((v) => v.city === city);
	return pick(local.length ? local : byCat(cat).filter((v) => v.city === 'Addis Ababa'));
};

// ---------------------------------------------------------------------------
// Couples
// ---------------------------------------------------------------------------

/** The couple photos that work as an invitation cover or an avatar: clear portraits. */
const PORTRAITS = [1, 6, 7, 9, 10, 8];

const ledger = []; // booking payments to settle into wallets
const planning = []; // couples still planning, for the vendors' open requests
const reviewsByVendor = new Map();
let guestNo = 0;

for (const [ci, c] of COUPLES.entries()) {
	const married = c.offset < 0;
	const today = c.offset === 0;
	const email = `${c.login ?? slugify(`${c.bride}-${c.groom}`)}@${DOMAIN}`;
	const p1 = await makeUser(
		`${c.bride} ${pick(SURNAMES)}`,
		email,
		'Couple',
		pic('couples', PORTRAITS[ci % PORTRAITS.length])
	);
	const p2 = c.partner
		? await makeUser(`${c.groom} ${pick(SURNAMES)}`, `${c.partner}@${DOMAIN}`, 'Couple')
		: null;
	if (c.login) accounts.push([`Couple (${c.bride} & ${c.groom})`, email]);
	if (c.partner) accounts.push([`Partner (${c.groom})`, `${c.partner}@${DOMAIN}`]);

	const slug = `${slugify(c.bride)}-and-${slugify(c.groom)}`;
	const coupleId = await insert('couples', {
		partner1_user_id: p1,
		partner2_user_id: p2,
		invite_code: inviteCode(),
		slug,
		wedding_hashtag: `#${c.bride}${c.groom}${new Date(day(c.offset)).getUTCFullYear()}`,
		groom_name: c.groom,
		bride_name: c.bride,
		phone: phone(),
		email,
		verified: 1,
		// Couples with the wedding far off signed up recently.
		created_at:
			c.offset > 150 ? at(-between(2, 25)) : at(Math.min(c.offset, 0) - between(150, 260)),
		created_by: p1
	});
	const weddingDay = day(c.offset);
	const planId = await insert('wedding_plans', {
		couple_id: coupleId,
		wedding_date: weddingDay,
		guest_count_estimate: c.guests,
		total_budget: money(c.budget),
		city: c.city,
		venue_tier: pick(['traditional', 'outdoor', 'luxury']),
		wedding_style: pick(['Traditional Habesha', 'Modern', 'Garden', 'Church and hall']),
		status: married ? 'completed' : 'planning',
		created_by: p1
	});

	if (c.offset > 20)
		planning.push({ coupleId, planId, p1, offset: c.offset, guests: c.guests, city: c.city });

	// Couple plan (cards need golden or platinum).
	if (c.plan !== 'free') {
		const subId = await insert('subscriptions', {
			couple_id: coupleId,
			subscription_plan_id: PLAN[c.plan],
			status: 'active',
			started_at: at(c.offset - 120),
			expires_at: at(c.offset + 365)
		});
		await insert('payments', {
			couple_id: coupleId,
			subscription_id: subId,
			subscription_plan_id: PLAN[c.plan],
			amount: c.plan === 'golden' ? '2499.00' : '25000.00',
			currency: 'ETB',
			payment_method: 'chapa',
			status: 'completed',
			transaction_ref: `pl-${coupleId}-${token(10)}`,
			paid_at: at(c.offset - 120)
		});
	}

	// The wedding week.
	const week = [
		[
			'shimgelegna',
			'Shimgilina',
			-90,
			'10:00',
			'Elders from the groom’s family visit the bride’s family to ask for her hand.'
		],
		['engagement', 'Engagement (ቀለበት)', -30, '15:00', 'Rings exchanged with both families.'],
		['other', 'Telosh', -1, '18:00', 'The groom’s family brings gifts to the bride’s home.'],
		['ceremony', 'Church ceremony', 0, '10:00', 'Holy Trinity Cathedral.'],
		['reception', 'Reception', 0, '14:00', 'Lunch, dancing and the cake.'],
		['melse', 'Melse', 1, '15:00', 'The couple in traditional dress.'],
		['kilikil', 'Kelekel', 7, '13:00', 'The bride’s family hosts the couple.']
	];
	for (const [k, [type, name, off, time, note]] of week.entries()) {
		await insert('wedding_events', {
			couple_id: coupleId,
			event_type: type,
			event_name: name,
			event_date: at(c.offset + off, time),
			venue_name: type === 'reception' ? 'Reception hall' : null,
			city: c.city,
			sort_order: k,
			notes: note,
			created_by: p1
		});
	}

	// Budget.
	const split = [
		[1, 'Venue and catering', 0.42],
		[2, 'Photography and film', 0.1],
		[3, 'Décor and flowers', 0.12],
		[4, 'Dresses, suits and makeup', 0.1],
		[5, 'Band and DJ', 0.07],
		[6, 'Invitations', 0.02],
		[7, 'Cars', 0.04],
		[8, 'Rings and other', 0.08]
	];
	for (const [cat, name, share] of split) {
		const planned = round(c.budget * share);
		const progress = married || today ? 1 : Math.max(0, 1 - c.offset / 200);
		await insert('budget_items', {
			couple_id: coupleId,
			budget_category_id: cat,
			name,
			estimated_cost: money(planned),
			actual_cost: money(round(planned * progress * (0.85 + rand() * 0.3))),
			status: progress > 0.9 ? 'paid' : progress > 0.3 ? 'booked' : 'planned',
			created_by: p1
		});
	}

	// Tasks from the templates.
	for (const t of templates) {
		const due = c.offset - (t.days_before_wedding ?? 30);
		const done = married || today || due < -10 || (due < 0 && chance(0.7));
		await insert('tasks', {
			couple_id: coupleId,
			task_category_id: t.task_category_id,
			title: t.title,
			description: t.description,
			due_date: day(due),
			status: done ? 'done' : due < 14 && chance(0.5) ? 'in_progress' : 'todo',
			priority: t.priority,
			created_by: p1
		});
	}

	// Guests with RSVPs, tables and entry passes.
	const guestCount = c.rich ? between(150, 190) : between(30, 70);
	const guests = [];
	const [planRow] = [await insert('seating_plans', { couple_id: coupleId, name: 'Reception' })];
	const tables = [];
	for (let t = 1; t <= Math.ceil(guestCount / 10); t++) {
		tables.push(
			await insert('seating_tables', {
				seating_plan_id: planRow,
				table_name: t === 1 ? 'Family' : `Table ${t}`,
				capacity: 10
			})
		);
	}
	for (let g = 0; g < guestCount; g++) {
		guestNo++;
		const female = chance(0.5);
		const full = `${pick(female ? NAMES.FEMALE : NAMES.MALE)} ${pick(SURNAMES)}`;
		const replied = married || today || chance(c.offset < 60 ? 0.75 : 0.35);
		const status = !replied ? 'pending' : chance(0.88) ? 'confirmed' : 'declined';
		const plusOnes = chance(0.3) ? 1 : 0;
		const gid = await insert('guest_lists', {
			couple_id: coupleId,
			full_name: full,
			phone: chance(0.7) ? phone() : null,
			side: pick(['bride', 'groom', 'both']),
			group_name: pick(['Family', 'Friends', 'Work', 'Church', 'Neighbours']),
			rsvp_status: status,
			plus_ones: plusOnes,
			rsvp_party_size:
				status === 'confirmed'
					? 1 + (plusOnes && chance(0.7) ? 1 : 0)
					: status === 'declined'
						? 0
						: null,
			rsvp_at: replied ? at(Math.min(c.offset, 0) - between(5, 40)) : null,
			meal_preference:
				status === 'confirmed' && chance(0.25)
					? pick(['Fasting', 'Vegetarian', 'No raw meat'])
					: null,
			seating_table_id: status === 'confirmed' ? tables[g % tables.length] : null,
			invite_token: token(16),
			checked_in_at: today && status === 'confirmed' && chance(0.55) ? at(0, '10:20') : null,
			created_by: p1
		});
		guests.push({ id: gid, name: full, status });
	}

	// The Leora Card.
	const published = c.plan !== 'free';
	await insert('wedding_cards', {
		couple_id: coupleId,
		theme: pick(['habesha', 'royal', 'garden']),
		cover_image: pic('couples', PORTRAITS[ci % PORTRAITS.length]),
		headline: 'Together with our families',
		message: `We would love you to celebrate with us in ${c.city}. Your presence is the greatest gift.`,
		rsvp_deadline: day(c.offset - 14),
		map_url: 'https://maps.google.com/?q=Addis+Ababa',
		published: published ? 1 : 0,
		published_at: published ? at(c.offset - 60) : null,
		gifts_enabled: published ? 1 : 0,
		wall_key: token(16)
	});

	// Vendors: venue, photographer, caterer always; others for the richer weddings.
	const wanted = [1, 2, 4, 3, 5, 6, 7, 8].slice(
		0,
		c.rich ? 7 : married ? between(4, 6) : between(2, 5)
	);
	const bookings = [];
	for (const [k, cat] of wanted.entries()) {
		const vendor = vendorIn(cat, c.city);
		const service = pick(vendor.services);
		let agreed = service.price < 3000 ? service.price * c.guests : service.price;
		agreed = round(agreed * (0.9 + rand() * 0.25), 500);
		const status = married
			? 'completed'
			: today || c.offset < 40 || k < 2
				? 'confirmed'
				: k === wanted.length - 1 && chance(0.5)
					? 'pending'
					: 'confirmed';
		const bookingId = await insert('vendor_bookings', {
			wedding_plan_id: planId,
			vendor_id: vendor.id,
			service_id: service.id,
			status,
			agreed_price: money(agreed),
			event_date: weddingDay,
			completed_at: married ? at(c.offset + 3) : null,
			// Planning couples booked recently, so vendors' 30-day numbers have something in them.
			created_at: married ? at(c.offset - between(60, 200)) : at(-between(3, 28)),
			created_by: p1
		});
		bookings.push({ id: bookingId, vendor, agreed, status });

		// Payments: married → paid in full and released; soon → deposit or more, held.
		if (status !== 'pending') {
			const deposit = round((agreed * vendor.deposit) / 100, 100);
			const parts =
				married || today
					? [deposit, agreed - deposit]
					: c.offset < 40
						? [deposit, chance(0.5) ? agreed - deposit : 0]
						: [deposit];
			for (const [n, amount] of parts.entries()) {
				if (amount <= 0) continue;
				const paidAt = at(Math.min(c.offset, 0) - (n === 0 ? between(40, 120) : between(5, 25)));
				const released = married;
				const payId = await insert('booking_payments', {
					wedding_plan_id: planId,
					booking_id: bookingId,
					payer_id: p1,
					payee_vendor_id: vendor.id,
					amount: money(amount),
					currency: 'ETB',
					payment_method: chance(0.75) ? 'chapa' : 'bank_transfer',
					payment_type: n === 0 ? 'advance' : 'balance',
					status: 'confirmed',
					transaction_reference: `bk-${bookingId}-${token(10)}`,
					paid_at: paidAt,
					verified_at: paidAt,
					released_at: released ? at(c.offset + 3) : null,
					bank_account_id: bank.id
				});
				ledger.push({ payId, vendor, amount, released, at: paidAt, releasedAt: at(c.offset + 3) });
			}
		}

		// A review for most completed bookings.
		if (married && chance(0.85)) {
			const rating = chance(0.7) ? 5 : chance(0.85) ? 4 : 3;
			const [title, comment] = pick(REVIEWS[rating]);
			const reply =
				chance(0.4) || rating === 3
					? rating === 3
						? VENDOR_REPLIES[3]
						: pick(VENDOR_REPLIES.slice(0, 3))
					: null;
			await insert('vendor_reviews', {
				vendor_id: vendor.id,
				couple_id: coupleId,
				rating,
				title,
				comment,
				vendor_reply: reply,
				replied_at: reply ? at(c.offset + 10) : null,
				created_at: at(c.offset + between(4, 20))
			});
			reviewsByVendor.set(vendor.id, [...(reviewsByVendor.get(vendor.id) ?? []), rating]);
		}
	}

	// Planning couples: an open quote, saved vendors, messages.
	if (!married) {
		const pending = bookings.find((b) => b.status === 'pending');
		if (pending) {
			await insert('vendor_quotes', {
				booking_id: pending.id,
				vendor_id: pending.vendor.id,
				proposed_price: money(round(pending.agreed * 0.95, 500)),
				notes: 'Includes setup and a second coordinator on the day.',
				status: 'sent'
			});
		}
		for (const v of shuffle(vendors).slice(0, c.rich ? 6 : 3)) {
			await q('INSERT IGNORE INTO saved_vendors (couple_id, vendor_id) VALUES (?, ?)', [
				coupleId,
				v.id
			]);
		}
		for (const b of bookings.slice(0, c.rich ? 4 : 1)) {
			const threadStart = between(6, 26);
			const thread = [
				[
					p1,
					b.vendor.userId,
					`Selam! We are getting married on ${weddingDay} in ${c.city}. Are you available?`
				],
				[
					b.vendor.userId,
					p1,
					`Congratulations! Yes, we have the date open. How many guests are you expecting?`
				],
				[p1, b.vendor.userId, `Around ${c.guests}. Could you share what your package includes?`],
				[
					b.vendor.userId,
					p1,
					'Of course, I have sent you a quote on Leora. Happy to adjust anything.'
				]
			];
			for (const [k, [from, to, body]] of thread.entries()) {
				await insert('messages', {
					sender_id: from,
					receiver_id: to,
					couple_id: coupleId,
					vendor_id: b.vendor.id,
					body,
					is_read: k < 3 ? 1 : 0,
					created_at: at(-threadStart + k)
				});
			}
		}
	}

	// Guests' gifts, photos, blessings and songs for the weddings that happened (and today's).
	if ((married && c.offset > -120) || today) {
		let gifts = 0;
		for (let g = 0; g < (today ? 9 : between(6, 14)); g++) {
			const guest = pick(guests);
			const amount = pick([500, 1000, 1000, 2000, 2000, 3000, 5000, 10000]);
			await insert('wedding_gifts', {
				couple_id: coupleId,
				guest_id: chance(0.6) ? guest.id : null,
				from_name: chance(0.6) ? guest.name : pick(GIFT_FROM),
				message: chance(0.7) ? pick(BLESSINGS) : null,
				amount: money(amount),
				status: 'paid',
				tx_ref: `gf-${coupleId}${g}-${token(10)}`,
				paid_at: at(Math.min(c.offset, 0) - between(0, 6), `${between(8, 21)}:${between(10, 59)}`),
				thanked_at: married && chance(0.6) ? at(c.offset + 5) : null
			});
			gifts += amount;
		}
		if (married && chance(0.6)) {
			await insert('gift_payouts', {
				couple_id: coupleId,
				amount: money(round(gifts * 0.6, 500)),
				destination: `CBE 1000${between(100000000, 999999999)}`,
				status: 'completed',
				reference: `FT${between(10000000, 99999999)}`,
				requested_by: p1
			});
		}
		const photos = today ? 9 : between(4, 8);
		for (let g = 0; g < photos; g++) {
			await insert('guest_posts', {
				couple_id: coupleId,
				guest_id: pick(guests).id,
				kind: 'photo',
				author_name: pick(guests).name.split(' ')[0],
				body: chance(0.5)
					? pick(['The dance!', 'Beautiful couple', 'Eskista time', 'Family photo', 'Best day'])
					: null,
				photo: pic('party', g + ci),
				created_at: at(Math.min(c.offset, 0), `${between(11, 20)}:${between(10, 59)}`)
			});
		}
		for (let g = 0; g < between(4, 8); g++) {
			await insert('guest_posts', {
				couple_id: coupleId,
				guest_id: pick(guests).id,
				kind: 'blessing',
				author_name: pick(guests).name,
				body: pick(BLESSINGS)
			});
		}
		for (const song of shuffle(SONGS).slice(0, between(4, 7))) {
			await insert('guest_posts', {
				couple_id: coupleId,
				guest_id: pick(guests).id,
				kind: 'song',
				author_name: pick(guests).name.split(' ')[0],
				body: song
			});
		}
	}

	// Inspiration boards for the planning couples.
	if (c.rich || (!married && chance(0.5))) {
		for (const [name, pools] of [
			['Décor', ['decor', 'venue']],
			['Attire', ['attire', 'couples']]
		]) {
			const boardId = await insert('inspiration_boards', {
				couple_id: coupleId,
				name,
				share_token: c.rich ? token(16) : null
			});
			for (let k = 1; k <= 6; k++) {
				const pool = pools[k % 2];
				await q('INSERT IGNORE INTO board_items (board_id, image, note) VALUES (?, ?, ?)', [
					boardId,
					pic(pool, k + ci),
					k === 1 ? 'Love this one' : null
				]);
			}
		}
	}

	// A notification or two for the main accounts.
	if (c.rich) {
		await insert('notifications', {
			user_id: p1,
			type: 'booking_confirmed',
			title: 'Booking confirmed',
			body: `${bookings[0].vendor.name} confirmed your booking.`,
			data: JSON.stringify({ link: '/wedding/bookings' })
		});
		if (today)
			await insert('notifications', {
				user_id: p1,
				type: 'gift_received',
				title: 'A gift from Aunt Almaz',
				body: 'Aunt Almaz sent you ETB 5,000.00.',
				data: JSON.stringify({ link: '/wedding/gifts' })
			});
	}

	// One dispute and one refund waiting for staff.
	if (ci === 2) {
		await insert('disputes', {
			booking_id: bookings[1].id,
			raised_by: 'couple',
			reason:
				'The photographer has not answered for two weeks and the wedding is in twelve days. We need to know they will come.',
			status: 'open'
		});
	}
	if (ci === 3) {
		const [[paid]] = await q(
			'SELECT id, amount FROM booking_payments WHERE booking_id = ? LIMIT 1',
			[bookings[0].id]
		);
		if (paid)
			await insert('refunds', {
				booking_payment_id: paid.id,
				amount: money(round(Number(paid.amount) * 0.2, 100)),
				reason: 'We reduced the guest count by 60; the caterer agreed to refund the difference.',
				status: 'pending'
			});
	}
}

// The demo vendor accounts get fresh requests to answer.
for (const v of vendors.filter((v) => v.login)) {
	for (const p of planning.slice(0, 3)) {
		const service = v.services[0];
		const bookingId = await insert('vendor_bookings', {
			wedding_plan_id: p.planId,
			vendor_id: v.id,
			service_id: service.id,
			status: 'pending',
			agreed_price: money(service.price),
			event_date: day(p.offset),
			created_at: at(-between(1, 6)),
			created_by: p.p1
		});
		const askedDaysAgo = between(2, 6);
		await insert('messages', {
			sender_id: p.p1,
			receiver_id: v.userId,
			couple_id: p.coupleId,
			vendor_id: v.id,
			is_read: 0,
			body: `Booking requested: ${service.title} for ${day(p.offset)}. Proposed price: ETB ${service.price.toLocaleString()}.`,
			created_at: at(-askedDaysAgo, '09:30')
		});
		await insert('messages', {
			sender_id: v.userId,
			receiver_id: p.p1,
			couple_id: p.coupleId,
			vendor_id: v.id,
			is_read: 0,
			body: 'Thank you for choosing us! The date is free. I will send our package details and a quote today.',
			created_at: at(-askedDaysAgo, '11:05')
		});
		if (bookingId % 2)
			await insert('notifications', {
				user_id: v.userId,
				type: 'booking_requested',
				title: 'New booking request',
				body: `A couple asked to book you for ${day(p.offset)}.`,
				data: JSON.stringify({ link: '/vendor-dashboard/bookings' })
			});
	}
}

// ---------------------------------------------------------------------------
// Money: commissions, wallet ledger, held vs released balances, payouts
// ---------------------------------------------------------------------------

for (const e of ledger) {
	const commission = Math.round(e.amount * COMMISSION * 100) / 100;
	const net = e.amount - commission;
	await insert('payment_commissions', {
		booking_payment_id: e.payId,
		vendor_id: e.vendor.id,
		gross_amount: money(e.amount),
		commission_amount: money(commission),
		net_amount: money(net)
	});
	await insert('wallet_transactions', {
		vendor_id: e.vendor.id,
		booking_payment_id: e.payId,
		amount: money(e.amount),
		transaction_type: 'credit',
		description: `Payment #${e.payId}`,
		created_at: e.at
	});
	await insert('wallet_transactions', {
		vendor_id: e.vendor.id,
		booking_payment_id: e.payId,
		amount: money(commission),
		transaction_type: 'commission',
		description: `Commission on payment #${e.payId}`,
		created_at: e.at
	});
	if (e.released) {
		await insert('wallet_transactions', {
			vendor_id: e.vendor.id,
			booking_payment_id: e.payId,
			amount: money(net),
			transaction_type: 'release',
			description: `Released payment #${e.payId}`,
			created_at: e.releasedAt
		});
		e.vendor.wallet.balance += net;
	} else {
		e.vendor.wallet.held += net;
	}
}
for (const v of vendors) {
	// Most vendors have already withdrawn part of what was released.
	if (v.wallet.balance > 20000 && chance(0.7)) {
		const amount = round(v.wallet.balance * 0.6, 1000);
		await insert('vendor_payouts', {
			vendor_id: v.id,
			amount: money(amount),
			payout_method: 'bank_transfer',
			status: 'completed',
			reference: `FT${between(10000000, 99999999)}`,
			destination: `CBE 1000${between(100000000, 999999999)}`,
			created_at: at(-between(3, 30))
		});
		await insert('wallet_transactions', {
			vendor_id: v.id,
			amount: money(amount),
			transaction_type: 'payout',
			description: 'Payout',
			created_at: at(-between(3, 30))
		});
		v.wallet.balance -= amount;
		if (chance(0.5)) {
			await insert('vendor_payouts', {
				vendor_id: v.id,
				amount: money(round(v.wallet.balance * 0.5, 1000)),
				payout_method: 'bank_transfer',
				status: 'requested',
				destination: `CBE 1000${between(100000000, 999999999)}`
			});
		}
	}
	await insert('vendor_wallets', {
		vendor_id: v.id,
		balance: money(v.wallet.balance),
		held_balance: money(v.wallet.held)
	});
	const ratings = reviewsByVendor.get(v.id) ?? [];
	if (ratings.length) {
		await q('UPDATE vendors SET rating_avg = ?, review_count = ? WHERE id = ?', [
			(ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(2),
			ratings.length,
			v.id
		]);
	}
}

// ---------------------------------------------------------------------------
// The public site and the admin inbox
// ---------------------------------------------------------------------------

for (const [name, position, message, n] of TESTIMONIALS) {
	await insert('testimonials', { name, position, message, avatar: pic('couples', n) });
}
for (const [name, subject, message, status] of [
	[
		'Tigist Alemu',
		'Listing my bakery',
		'Hello, I bake wedding cakes in Adama. How do I list my business on Leora?',
		'new'
	],
	[
		'Yonas Desta',
		'Gift transfer',
		'When will our wedding gifts be transferred to our account?',
		'replied'
	],
	[
		'Abebe Kebede',
		'Partnership',
		'We run a hotel in Arba Minch and would like to partner with Leora for destination weddings.',
		'new'
	],
	[
		'Meron Haile',
		'Card question',
		'Can guests RSVP for two events with one invitation link?',
		'read'
	]
]) {
	await insert('contact_messages', {
		name,
		email: `${slugify(name)}@example.com`,
		phone: phone(),
		subject,
		message,
		status
	});
}
for (const [action, entity] of [
	['vendor.approve', 'vendor'],
	['vendor.verify', 'vendor'],
	['payment.confirm', 'booking_payment'],
	['gift_payout.completed', 'gift_payout']
]) {
	await insert('activity_logs', {
		user_id: adminId,
		action,
		entity_type: entity,
		entity_id: between(1, 30),
		ip_address: '196.188.0.1',
		created_at: at(-between(1, 20))
	});
}

await conn.end();

console.log(
	`\nDemo ready: ${vendors.length + PENDING_VENDORS.length} vendors, ${COUPLES.length} couples, ${guestNo} guests, ${ledger.length} payments.`
);
console.log(`Every account's password: ${DEMO_PASSWORD}\n`);
for (const [who, email] of accounts) console.log(`  ${who.padEnd(42)} ${email}`);
