import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { building } from '$app/environment';
import * as schema from './schema';
import { env } from '$env/dynamic/private';

// `vite build` imports server modules to analyse routes, without a database. The pool only
// connects on first query, so a placeholder is safe there; at runtime the URL is required.
if (!env.DATABASE_URL && !building) throw new Error('DATABASE_URL is not set');

const client = mysql.createPool(env.DATABASE_URL || 'mysql://build@localhost/build');

export const db = drizzle(client, { schema, mode: 'default' });
