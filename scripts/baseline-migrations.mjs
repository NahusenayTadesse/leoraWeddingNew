#!/usr/bin/env node
/**
 * For a database that was created with `drizzle-kit push` (no migration history): records the
 * first migration (drizzle/0000_*) as already applied, so `npm run db:migrate` then applies only
 * 0001 onwards. Run it once, after a backup:
 *
 *   mysqldump --single-transaction DBNAME > backup.sql
 *   DATABASE_URL=… node scripts/baseline-migrations.mjs
 *   DATABASE_URL=… npm run db:migrate
 *
 * It refuses to run if the database already has a migration history, or has no app tables.
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import mysql from 'mysql2/promise';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('Set DATABASE_URL explicitly for this script (it does not read .env).');

const journal = JSON.parse(readFileSync('drizzle/meta/_journal.json', 'utf8'));
const first = journal.entries.find((e) => e.idx === 0);
const sql = readFileSync(`drizzle/${first.tag}.sql`, 'utf8');
const hash = createHash('sha256').update(sql).digest('hex');

const conn = await mysql.createConnection(url);
try {
	const [[db]] = await conn.query('SELECT DATABASE() AS name');
	const [tables] = await conn.query('SHOW TABLES');
	const names = tables.map((t) => Object.values(t)[0]);

	if (names.includes('__drizzle_migrations')) {
		const [[{ n }]] = await conn.query('SELECT COUNT(*) AS n FROM __drizzle_migrations');
		if (n > 0) throw new Error(`${db.name} already has a migration history (${n} rows). Nothing to do.`);
	}
	if (!names.includes('user') || !names.includes('vendors')) {
		throw new Error(`${db.name} has no app tables. On an empty database just run npm run db:migrate.`);
	}

	await conn.query(
		'CREATE TABLE IF NOT EXISTS `__drizzle_migrations` (id SERIAL PRIMARY KEY, hash text NOT NULL, created_at bigint)'
	);
	await conn.query('INSERT INTO `__drizzle_migrations` (hash, created_at) VALUES (?, ?)', [hash, first.when]);
	console.log(`Recorded ${first.tag} as applied on ${db.name}. Now run: npm run db:migrate`);
} finally {
	await conn.end();
}
