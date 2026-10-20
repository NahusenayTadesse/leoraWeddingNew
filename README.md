# Leora Events

Ethiopia's wedding platform: a vendor marketplace, couple planning tools (budget, guests,
tasks, events, seating, bookings) and the payments between them. SvelteKit 2 / Svelte 5,
Drizzle on MySQL/MariaDB, better-auth, Paraglide (English / አማርኛ), Chapa.

`@nahu/admin-kit` (tables, forms, CRUD, file storage) lives in the sibling folder
`../admin-kit` and is installed from there (`file:../admin-kit`). Clone both side by side.

## Quick start (development)

```sh
cd ../admin-kit && npm install && cd -   # build the kit once
npm install
cp .env.example .env                     # then fill it in (below)

# Your own local database — never a shared server
mariadb -u root -e "CREATE DATABASE leora_dev CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
                    CREATE USER IF NOT EXISTS 'dev'@'localhost'; GRANT ALL ON leora_dev.* TO 'dev'@'localhost';
                    GRANT ALL ON leora_test.* TO 'dev'@'localhost';"
npm run db:migrate                       # schema, from drizzle/
mariadb -u dev leora_dev < database/seed.sql   # roles, permissions, plans, categories, locations
mariadb -u dev leora_dev < database/demo.sql   # optional sample vendors (dev only)
node scripts/create-user.mjs --email you@example.com --role Admin   # first admin

npm run dev
```

In development, emails (confirmation links, password resets) are printed in the terminal
when `SMTP_HOST` is empty, and `ORIGIN` can stay empty so the app works on any port.

## Environment

Every variable is documented in [`.env.example`](.env.example). Required in production:
`DATABASE_URL`, `ORIGIN`, `BETTER_AUTH_SECRET`, `CHAPA_SECRET_KEY`, `SMTP_*`, and
`BODY_SIZE_LIMIT=12M` (adapter-node's 512K default silently drops receipt photos).

## Scripts

| Command                           | What it does                                              |
| --------------------------------- | --------------------------------------------------------- |
| `npm run dev`                     | Dev server                                                |
| `npm run check`                   | Type check (svelte-check) — kept at 0 errors / 0 warnings |
| `npm run lint` / `npm run format` | Prettier + ESLint                                         |
| `npm test`                        | Unit + database tests (needs `leora_test`, see below)     |
| `npm run db:generate`             | New migration from schema changes in `src/lib/server/db`  |
| `npm run db:migrate`              | Apply pending migrations                                  |
| `npm run build`                   | Production build into `build/` (+ `build.tar.gz`)         |

### Database changes

Change the schema in `src/lib/server/db/*.ts`, run `npm run db:generate`, review the SQL in
`drizzle/`, commit it, and `npm run db:migrate` everywhere. Don't use `db:push` on shared or
production databases. Rules the schema relies on are in
[docs/schema-conventions.md](docs/schema-conventions.md).

### Tests

`npm test` runs `src/**/*.test.ts` (unit) and `src/**/*.db.test.ts` against a real database,
`leora_test` by default (`TEST_DATABASE_URL` to change it). The test database is migrated and
seeded automatically and **emptied by the tests**; the runner refuses any database whose name
doesn't end in `_test`, whatever `.env` says.

## Production

### With Docker

The build context is the parent folder because admin-kit is a sibling:

```sh
cd .. && docker build -f leoraWeddingNew/Dockerfile -t leora-events .
```

[`docker-compose.yml`](docker-compose.yml) runs the app with MariaDB; its header lists the
first-deploy commands (migrate, seed, create the admin). Uploads live in the `/data` volume —
back it up along with the database.

### Without Docker

```sh
npm ci && npm run build
NODE_ENV=production node build     # with the production env vars set
```

Run `npm run db:migrate` before starting a new release. Put the app behind a reverse proxy
(nginx, Caddy) that terminates TLS and forwards `X-Forwarded-For`/`-Proto`.

### First deploy checklist

1. Create the database (`utf8mb4`), set the env vars, `npm run db:migrate`.
2. Load `database/seed.sql` (not `demo.sql`).
3. `node scripts/create-user.mjs --email … --role Admin`, sign in, and turn on two-step
   verification at **Account → Password & security** (required for staff in production).
4. Admin → Settings: set the commission and add the bank accounts customers transfer to.
5. Chapa dashboard: live secret key in `CHAPA_SECRET_KEY`; webhook URL
   `https://YOUR-DOMAIN/api/payments/chapa/callback` (secret in `CHAPA_WEBHOOK_SECRET`).
6. Fill in contact details and social links in [`src/lib/site.ts`](src/lib/site.ts).
7. Check SMTP by requesting a password reset.

### Moving an existing database onto migrations

A database created earlier with `drizzle-kit push` has no migration history. After a backup,
and ideally on a copy first:

```sh
mysqldump --single-transaction DBNAME > backup.sql
DATABASE_URL=… node scripts/baseline-migrations.mjs   # marks 0000 as applied
DATABASE_URL=… npm run db:migrate                      # applies 0001 onwards
```

### Operations

- **Background jobs** run inside the app process every 10 minutes: re-verify unfinished Chapa
  payments, expire plans, remind vendors before their plan ends. With several app instances,
  set `RUN_JOBS=false` on all but one.
- **Rate limits** (login, signup, reset, payments, chat) are in memory, per process.
- **Errors** are logged with a short reference id that users see on the error page.
- **Staff roles**: Admin (everything) and Support (inbox, disputes, bookings, vendors,
  reviews, read-only payments). Grant individual permissions in `special_permissions`.

## Project layout

```
src/lib/server/          services: payments/, bookingPayments, claims, contracts, planner,
                         availability, notify, email, jobs, permissions, rateLimit
src/lib/server/db/       Drizzle schema (see docs/schema-conventions.md)
src/routes/              public site, /wedding (couples), /vendor-dashboard, /admin
messages/                translations (en, am) — Paraglide
drizzle/                 migrations
database/                seed.sql (reference data), demo.sql (dev sample vendors)
scripts/                 create-user, baseline-migrations
leoara_php/              legacy PHP app, kept for reference only
```
