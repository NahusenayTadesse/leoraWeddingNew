/**
 * Plan limits, enforced server-side.
 *
 * These live in their own module rather than in a `+page.server.ts` because
 * SvelteKit only permits a fixed set of exports from route modules — anything
 * else fails the route at request time.
 *
 * The PHP app enforced the same numbers in api/vendors/compare.php. Keep the
 * checks on the server: the UI disabling a checkbox is a convenience, not a
 * limit.
 */
export const FREE_MAX_COMPARE = 2;
export const PAID_MAX_COMPARE = 5;
export const FREE_MAX_RUNS = 3;

export function compareLimitsFor(planSlug: string, runsUsed: number) {
	const isFree = planSlug === 'free';
	return {
		maxCompare: isFree ? FREE_MAX_COMPARE : PAID_MAX_COMPARE,
		runsUsed,
		maxRuns: isFree ? FREE_MAX_RUNS : null,
		exhausted: isFree && runsUsed >= FREE_MAX_RUNS
	};
}
