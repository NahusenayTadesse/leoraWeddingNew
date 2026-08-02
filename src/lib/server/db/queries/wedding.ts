import { error, redirect } from '@sveltejs/kit';
import { and, eq, isNull, or } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { couples, weddingPlans } from '$lib/server/db/schema';

/**
 * Ownership guards for everything under the planner.
 *
 * The planner is scoped to the signed-in user's own couple row — no wedding id
 * is ever read from the URL. That removes the whole class of "change the number
 * and read someone else's guest list" bugs rather than trying to check for them
 * in each handler.
 *
 * Every action calls one of these before touching the database. Loading a page
 * safely is not enough; the actions are separately reachable.
 */

/**
 * A user reaches their workspace from either side of the marriage, so both
 * partner columns are checked. `couples_partner1_uq` / `couples_partner2_uq`
 * guarantee at most one live row per user, which is what makes `.limit(1)`
 * safe here — without them this silently picked an arbitrary row.
 */
export async function requireCouple(locals: App.Locals, returnTo = '/dashboard') {
	if (!locals.user?.id) {
		redirect(303, `/login?redirectTo=${encodeURIComponent(returnTo)}`);
	}

	const couple = await db
		.select()
		.from(couples)
		.where(
			and(
				or(
					eq(couples.partner1UserId, locals.user.id),
					eq(couples.partner2UserId, locals.user.id)
				),
				isNull(couples.deletedAt)
			)
		)
		.limit(1)
		.then((rows) => rows[0]);

	if (!couple) {
		error(403, 'The wedding planner is for couples. Create a couple profile to get started.');
	}

	return couple;
}

export async function requireWedding(locals: App.Locals, returnTo = '/dashboard') {
	const couple = await requireCouple(locals, returnTo);

	const plan = await db
		.select()
		.from(weddingPlans)
		.where(and(eq(weddingPlans.coupleId, couple.id), isNull(weddingPlans.deletedAt)))
		.limit(1)
		.then((rows) => rows[0]);

	return { couple, plan: plan ?? null };
}

/** Same as requireWedding, but for actions that can't proceed without one. */
export async function requireExistingWedding(locals: App.Locals) {
	const { couple, plan } = await requireWedding(locals);
	if (!plan) error(404, 'Set up your wedding details before making changes.');
	return { couple, plan };
}

/**
 * Resolves the couple for a signed-in user without throwing — for pages that
 * show a logged-out/no-workspace preview instead of redirecting, the way
 * dashboard.php did.
 */
export async function findCouple(locals: App.Locals) {
	if (!locals.user?.id) return null;

	return db
		.select()
		.from(couples)
		.where(
			and(
				or(
					eq(couples.partner1UserId, locals.user.id),
					eq(couples.partner2UserId, locals.user.id)
				),
				isNull(couples.deletedAt)
			)
		)
		.limit(1)
		.then((rows) => rows[0] ?? null);
}
