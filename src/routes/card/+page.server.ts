import { and, asc, eq, isNull } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { weddingEvents, weddingPlans } from '$lib/server/db/schema';
import { findCouple } from '$lib/server/db/queries/wedding';
import type { PageServerLoad } from './$types';

/**
 * The Leora Card — the couple's digital invitation.
 *
 * Signed-in couples see their own card previewed with their real names, date
 * and venue. Everyone else sees the product page. No placeholder couple is
 * ever rendered as if it were real.
 */
export const load: PageServerLoad = async ({ locals }) => {
	const couple = await findCouple(locals);
	if (!couple) return { couple: null, plan: null, ceremony: null };

	const [plan, ceremony] = await Promise.all([
		db
			.select()
			.from(weddingPlans)
			.where(and(eq(weddingPlans.coupleId, couple.id), isNull(weddingPlans.deletedAt)))
			.limit(1)
			.then((r) => r[0] ?? null),

		db
			.select({
				eventName: weddingEvents.eventName,
				eventDate: weddingEvents.eventDate,
				venueName: weddingEvents.venueName,
				venueAddress: weddingEvents.venueAddress,
				city: weddingEvents.city
			})
			.from(weddingEvents)
			.where(
				and(
					eq(weddingEvents.coupleId, couple.id),
					eq(weddingEvents.eventType, 'ceremony'),
					isNull(weddingEvents.deletedAt)
				)
			)
			.orderBy(asc(weddingEvents.sortOrder))
			.limit(1)
			.then((r) => r[0] ?? null)
	]);

	return { couple, plan, ceremony };
};
