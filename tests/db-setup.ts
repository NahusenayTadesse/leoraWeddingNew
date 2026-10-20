/**
 * Per test file: refuse to touch anything but a `_test` database (the app's .env may point at a
 * shared server), and close the pool when the file is done so vitest can exit.
 */
import { afterAll, beforeAll } from 'vitest';
import { sql } from 'drizzle-orm';
import { configureKit } from '@nahu/admin-kit/server/db';
import { db } from '$lib/server/db';

configureKit({ db, loginPath: '/login' });

beforeAll(async () => {
	const [rows] = (await db.execute(sql`SELECT DATABASE() AS name`)) as unknown as [
		{ name: string }[]
	];
	const name = rows[0]?.name ?? '';
	if (!name.endsWith('_test')) {
		throw new Error(`DB tests are connected to "${name}", not a _test database. Aborting.`);
	}
});

afterAll(() => db.$client.end());
