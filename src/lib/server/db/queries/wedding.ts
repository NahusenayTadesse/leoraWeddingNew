import { error, redirect } from '@sveltejs/kit';
import { and, eq, isNull } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { couples, weddings } from '$lib/server/db/schema';

/**
 * Ownership guards for everything under /dashboard.
 *
 * The planner is scoped to the signed-in user's own couple row — no wedding id
 * is ever read from the URL. That removes the whole class of "change the number
 * and read someone else's guest list" bugs rather than trying to check for them
 * in each handler.
 *
 * Every action calls one of these before touching the database. Loading a page
 * safely is not enough; the actions are separately reachable.
 */

export async function requireCouple(locals: App.Locals, returnTo = '/dashboard') {
	if (!locals.user?.id) {
		redirect(303, `/signin?redirectTo=${encodeURIComponent(returnTo)}`);
	}

	const couple = await db
		.select()
		.from(couples)
		.where(and(eq(couples.userId, locals.user.id), isNull(couples.deletedAt)))
		.limit(1)
		.then((rows) => rows[0]);

	if (!couple) {
		error(403, 'The wedding planner is for couples. Create a couple profile to get started.');
	}

	return couple;
}

export async function requireWedding(locals: App.Locals, returnTo = '/dashboard') {
	const couple = await requireCouple(locals, returnTo);

	const wedding = await db
		.select()
		.from(weddings)
		.where(and(eq(weddings.coupleId, couple.id), isNull(weddings.deletedAt)))
		.limit(1)
		.then((rows) => rows[0]);

	return { couple, wedding: wedding ?? null };
}

/** Same as requireWedding, but for actions that can't proceed without one. */
export async function requireExistingWedding(locals: App.Locals) {
	const { couple, wedding } = await requireWedding(locals);
	if (!wedding) error(404, 'Set up your wedding details before making changes.');
	return { couple, wedding };
}