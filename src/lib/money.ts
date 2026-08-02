/**
 * Money handling.
 *
 * Every `decimal` column comes back from mysql2 as a **string**, not a number:
 *
 *   typeof row.amount        // 'string'
 *   row.amount               // '50000.00'
 *   row.amount + 1000        // '50000.001000'   <-- silently wrong
 *
 * Nothing throws — you get a plausible-looking wrong total. So money is parsed
 * once at the boundary with `toMoney`, kept as a number inside the app, and
 * converted back with `fromMoney` on the way to the database.
 *
 * Arithmetic directly on a decimal column value is a bug. Prefer SQL `SUM()`
 * for aggregates so the database does the exact-precision work, then parse the
 * single result.
 */

/** Column value (or SQL SUM result) -> number. Null/undefined become 0. */
export function toMoney(value: string | number | null | undefined): number {
	if (value === null || value === undefined) return 0;
	const n = typeof value === 'number' ? value : Number(value);
	return Number.isFinite(n) ? n : 0;
}

/** Number -> the fixed-2dp string a decimal column expects. */
export function fromMoney(value: number): string {
	if (!Number.isFinite(value)) return '0.00';
	return value.toFixed(2);
}

/** Sum a set of decimal column values without ever concatenating them. */
export function sumMoney(values: Array<string | number | null | undefined>): number {
	return values.reduce<number>((total, v) => total + toMoney(v), 0);
}

/** Display helper: `formatETB(50000)` -> `'ETB 50,000.00'`. */
export function formatETB(value: string | number | null | undefined): string {
	return new Intl.NumberFormat('en-ET', {
		style: 'currency',
		currency: 'ETB',
		currencyDisplay: 'code'
	}).format(toMoney(value));
}
