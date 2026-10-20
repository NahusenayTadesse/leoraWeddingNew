/**
 * Brings the test database up to date once per `vitest` run from the same `drizzle/` migrations
 * production uses, then loads the reference seed. The database must end in `_test`: every DB
 * test empties the tables it uses.
 */
import { readFileSync } from 'node:fs';
import mysql from 'mysql2/promise';
import { drizzle } from 'drizzle-orm/mysql2';
import { migrate } from 'drizzle-orm/mysql2/migrator';

export const TEST_DATABASE_URL =
	process.env.TEST_DATABASE_URL ?? 'mysql://dev@localhost:3306/leora_test';

export default async function setup() {
	const url = new URL(TEST_DATABASE_URL);
	const name = url.pathname.slice(1);
	if (!name.endsWith('_test')) {
		throw new Error(`Refusing to run DB tests against "${name}": the name must end in _test.`);
	}

	const server = await mysql.createConnection({ uri: TEST_DATABASE_URL.replace(`/${name}`, '/') });
	await server.query(
		`CREATE DATABASE IF NOT EXISTS \`${name}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
	);
	await server.end();

	const connection = await mysql.createConnection({
		uri: TEST_DATABASE_URL,
		multipleStatements: true
	});
	await migrate(drizzle(connection), { migrationsFolder: './drizzle' });
	await connection.query(readFileSync('database/seed.sql', 'utf8'));
	await connection.end();
}
