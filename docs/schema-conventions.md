# Schema conventions

Rules the schema relies on. Breaking one of these produces wrong data rather
than an error, so they are worth following exactly.

## The three lifecycle flags

Most tables carry `secureFields`, which brings both `isActive` and `deletedAt`.
Several also have their own `status` enum. They mean different things and a
query that checks one while ignoring the others will silently disagree with the
next query:

| Flag | Meaning | Set by | Reversible |
|---|---|---|---|
| `deletedAt` | Gone. Retained only for audit and FK integrity. | User or admin deleting the record | Not through the UI |
| `isActive` | Temporarily hidden — "paused", "off", "draft". | Owner toggling visibility | Yes |
| `status` | Where the row sits in its own workflow (`pending` → `approved`, `todo` → `done`). | Domain logic | Yes, per workflow |

**The rule for every read:** filter `isNull(deletedAt)` always. Add `isActive`
only where a user can pause the thing. Add `status` only where the workflow
matters.

```ts
// public vendor listing — all three apply
where(and(
  isNull(vendors.deletedAt),
  eq(vendors.isActive, true),
  eq(vendors.status, 'approved')   // isVerified is a badge, NOT a gate
))
```

`status = 'approved'` on a row with `isActive = false` is legal and means
"approved, but the vendor has paused their listing". Do not collapse the two.

## Uniqueness alongside soft delete

A plain `UNIQUE(x)` on a soft-deleted table locks the key forever: delete your
couple and you can never create another (ERROR 1062). Including a nullable
`deleted_at` in the key does not fix it either — MySQL treats each NULL as
distinct, which disables the constraint for exactly the live rows it should
police.

So affected tables carry a generated `aliveKey` column, and it goes **last** in
the unique key:

```ts
aliveKey  // = coalesce(deleted_at, '1970-01-01'), stored
unique('couples_partner1_uq').on(table.partner1UserId, table.aliveKey)
```

Live rows share the sentinel, so only one may exist. Deleted rows each carry
their own deletion timestamp, so any number may accumulate.

Applies to: `couples`, `wedding_plans`, `user_profiles`, `vendor_reviews`,
`coupons`, `subscription_plans`, `service_categories`. Add it to any new
soft-deleted table that needs a unique constraint.

## Money

`decimal` columns arrive as **strings**. `'50000.00' + 1000` is
`'50000.001000'` and throws nothing. Parse at the boundary with
`toMoney()` / `fromMoney()` from `$lib/money`, and prefer SQL `SUM()`
for aggregates.

## Financial records never cascade

Deleting a couple must not erase money. `booking_payments`, `payments`,
`payment_commissions`, `refunds` and `orders` use `SET NULL` or `RESTRICT`, never
`CASCADE` — a single `DELETE FROM couples` previously destroyed a settled
50,000 ETB payment and its commission row without an error.

Planning data (guests, tasks, budget, events, seating) *does* cascade from
`couples`; that is intentional.

## Denormalised counters

`vendors.rating_avg` and `vendors.review_count` are cached from
`vendor_reviews`. Nothing in the database keeps them in sync — recompute both
in the same transaction as any review insert, update or soft delete.

## auth.schema.ts is generated

`npm run auth:schema` writes to `.better-auth-generated.ts` for hand-merging.
Never point it at `src/lib/server/db/auth.schema.ts`: it runs with `--yes` and
would drop the hand-added `user.roleId` column. Shared helpers live in
`common.ts` and role tables in `rbac.ts` so a regeneration cannot take the rest
of the schema with it.

## FULLTEXT search

drizzle-kit cannot emit FULLTEXT indexes. After the first migration, run once:

```sql
ALTER TABLE vendors ADD FULLTEXT KEY ftx_vendors_search (business_name, description);
```

## Creating the database

drizzle-kit emits no `CHARACTER SET` clause, so tables inherit the database
default. Create it explicitly or Amharic depends on server configuration:

```sql
CREATE DATABASE leora CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```
