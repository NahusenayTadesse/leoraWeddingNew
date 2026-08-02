/**
 * Shared price formatting. Lives outside $lib/server because components import
 * it — anything under $lib/server is server-only and cannot be bundled for the
 * browser.
 */

/** "ETB 40,000 – 150,000", or null when the vendor has published no range. */
export function formatPriceRange(min: string | null, max: string | null) {
	const lo = min === null ? null : Number(min);
	const hi = max === null ? null : Number(max);
	if (lo === null && hi === null) return null;
	if (lo !== null && hi !== null) return `ETB ${lo.toLocaleString()} – ${hi.toLocaleString()}`;
	return `From ETB ${(lo ?? hi)!.toLocaleString()}`;
}
