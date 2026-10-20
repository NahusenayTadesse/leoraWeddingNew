#!/usr/bin/env node
/**
 * Creates (or promotes) a verified account from the command line — how the first admin gets in,
 * since there is no self-serve admin sign-up.
 *
 *   node scripts/create-user.mjs --email admin@leoraevents.et --name "Leora Admin" --role Admin
 *   node scripts/create-user.mjs --email x@y.z --password 'S3cret!' --role Admin   # non-interactive
 *
 * Roles are the seeded `roles.name` values (Admin, Couple, Vendor, …). An existing account with
 * that email gets the role (and a new password, if one is given) instead of a duplicate.
 * Reads DATABASE_URL from the environment or .env.
 */
import { randomUUID } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';
import { createInterface } from 'node:readline/promises';
import { parseArgs } from 'node:util';
import mysql from 'mysql2/promise';
import { hashPassword } from 'better-auth/crypto';

const { values: args } = parseArgs({
	options: {
		email: { type: 'string' },
		name: { type: 'string' },
		role: { type: 'string', default: 'Admin' },
		password: { type: 'string' }
	}
});

if (!process.env.DATABASE_URL && existsSync('.env')) {
	for (const line of readFileSync('.env', 'utf8').split('\n')) {
		const m = line.match(/^\s*DATABASE_URL\s*=\s*"?([^"\n]+)"?/);
		if (m) process.env.DATABASE_URL = m[1];
	}
}
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set');
if (!args.email) throw new Error('--email is required');

const email = args.email.trim().toLowerCase();
let password = args.password;
if (!password) {
	const rl = createInterface({ input: process.stdin, output: process.stdout });
	password = await rl.question('Password (min 8 characters): ');
	rl.close();
}
if (!password || password.length < 8) throw new Error('Password must be at least 8 characters');

const conn = await mysql.createConnection(process.env.DATABASE_URL);
try {
	const [[role]] = await conn.query('SELECT id FROM roles WHERE name = ?', [args.role]);
	if (!role) throw new Error(`No role named "${args.role}" — has database/seed.sql been loaded?`);

	const hash = await hashPassword(password);
	const [[existing]] = await conn.query('SELECT id FROM user WHERE email = ?', [email]);

	await conn.beginTransaction();
	if (existing) {
		await conn.query(
			'UPDATE user SET role_id = ?, role = ?, email_verified = 1, banned = 0 WHERE id = ?',
			[role.id, args.role.toLowerCase(), existing.id]
		);
		const [res] = await conn.query(
			"UPDATE account SET password = ? WHERE user_id = ? AND provider_id = 'credential'",
			[hash, existing.id]
		);
		if (!res.affectedRows) {
			await conn.query(
				"INSERT INTO account (id, account_id, provider_id, user_id, password, created_at, updated_at) VALUES (?, ?, 'credential', ?, ?, NOW(3), NOW(3))",
				[randomUUID(), existing.id, existing.id, hash]
			);
		}
		console.log(`Updated ${email}: role ${args.role}, password reset, email verified.`);
	} else {
		const id = randomUUID().replace(/-/g, '').slice(0, 32);
		await conn.query(
			'INSERT INTO user (id, name, email, email_verified, role_id, role, created_at, updated_at) VALUES (?, ?, ?, 1, ?, ?, NOW(3), NOW(3))',
			[id, args.name ?? email.split('@')[0], email, role.id, args.role.toLowerCase()]
		);
		await conn.query(
			"INSERT INTO account (id, account_id, provider_id, user_id, password, created_at, updated_at) VALUES (?, ?, 'credential', ?, ?, NOW(3), NOW(3))",
			[randomUUID(), id, id, hash]
		);
		console.log(`Created ${email} with role ${args.role}.`);
	}
	await conn.commit();
} catch (err) {
	await conn.rollback().catch(() => {});
	throw err;
} finally {
	await conn.end();
}
