/**
 * The vendor's own numbers: how many couples saw the listing, saved it, got in touch and booked.
 * Shown on the vendor dashboard so a vendor can see what Leora (and their plan) brings them.
 */
import { and, count, eq, gte, inArray, ne, sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import {
	messages,
	savedVendors,
	vendorBookings,
	vendorProfileViews,
	weddingPlans
} from '$lib/server/db/schema';
import { isoDay } from '$lib/server/availability';

const BOT = /bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|telegram|lighthouse/i;

/** Counts one public profile view; the vendor looking at their own page and crawlers don't count. */
export async function recordProfileView(
	vendorId: number,
	viewer: { userId?: string | null; ownerUserId?: string | null; userAgent?: string | null }
) {
	if (viewer.userId && viewer.userId === viewer.ownerUserId) return;
	if (!viewer.userAgent || BOT.test(viewer.userAgent)) return;
	try {
		await db
			.insert(vendorProfileViews)
			.values({ vendorId, day: isoDay(new Date()), views: 1 })
			.onDuplicateKeyUpdate({ set: { views: sql`${vendorProfileViews.views} + 1` } });
	} catch (err) {
		// A lost view count must never break the page.
		console.error('[vendorStats] view not recorded:', err);
	}
}

export type Funnel = {
	views: number;
	saves: number;
	/** Couples who messaged or asked to book for the first time in the period. */
	inquiries: number;
	/** Of those requests, how many the vendor confirmed. */
	bookings: number;
};

/** The last `days` days of the funnel for one vendor. */
export async function vendorFunnel(
	vendorId: number,
	vendorUserId: string | null,
	days = 30
): Promise<Funnel> {
	const since = new Date(Date.now() - days * 24 * 3600_000);
	const [[views], [saves], messaged, requested, [bookings]] = await Promise.all([
		db
			.select({ n: sql<string>`COALESCE(SUM(${vendorProfileViews.views}), 0)` })
			.from(vendorProfileViews)
			.where(
				and(eq(vendorProfileViews.vendorId, vendorId), gte(vendorProfileViews.day, isoDay(since)))
			),
		db
			.select({ n: count() })
			.from(savedVendors)
			.where(and(eq(savedVendors.vendorId, vendorId), gte(savedVendors.createdAt, since))),
		db
			.selectDistinct({ coupleId: messages.coupleId })
			.from(messages)
			.where(
				and(
					eq(messages.vendorId, vendorId),
					gte(messages.createdAt, since),
					vendorUserId ? ne(messages.senderId, vendorUserId) : undefined
				)
			),
		db
			.selectDistinct({ coupleId: weddingPlans.coupleId })
			.from(vendorBookings)
			.innerJoin(weddingPlans, eq(weddingPlans.id, vendorBookings.weddingPlanId))
			.where(and(eq(vendorBookings.vendorId, vendorId), gte(vendorBookings.createdAt, since))),
		db
			.select({ n: count() })
			.from(vendorBookings)
			.where(
				and(
					eq(vendorBookings.vendorId, vendorId),
					gte(vendorBookings.createdAt, since),
					inArray(vendorBookings.status, ['confirmed', 'completed'])
				)
			)
	]);

	const couples = new Set(
		[...messaged, ...requested].map((r) => r.coupleId).filter((id): id is number => id !== null)
	);
	return {
		views: Number(views?.n ?? 0),
		saves: Number(saves?.n ?? 0),
		inquiries: couples.size,
		bookings: Number(bookings?.n ?? 0)
	};
}
