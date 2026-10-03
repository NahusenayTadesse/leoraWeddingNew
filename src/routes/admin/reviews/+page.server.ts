import { and, desc, eq, isNull, sql } from 'drizzle-orm';
import { z } from 'zod/v4';
import { db } from '$lib/server/db';
import { vendorReviews, vendors } from '$lib/server/db/schema';
import { parse, ok, bad } from '$lib/server/adminAction';
import { audit } from '$lib/server/auditLog';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => ({
	rows: await db
		.select({
			id: vendorReviews.id,
			rating: vendorReviews.rating,
			title: vendorReviews.title,
			comment: vendorReviews.comment,
			createdAt: vendorReviews.createdAt,
			vendor: vendors.businessName
		})
		.from(vendorReviews)
		.innerJoin(vendors, eq(vendors.id, vendorReviews.vendorId))
		.where(isNull(vendorReviews.deletedAt))
		.orderBy(desc(vendorReviews.createdAt))
		.limit(500)
});

export const actions = {
	remove: async (event) => {
		const p = await parse(event.request, z.object({ id: z.coerce.number().int().positive() }));
		if ('error' in p) return p.error;

		const done = await db.transaction(async (tx) => {
			const [review] = await tx
				.select({ vendorId: vendorReviews.vendorId })
				.from(vendorReviews)
				.where(and(eq(vendorReviews.id, p.data.id), isNull(vendorReviews.deletedAt)));
			if (!review) return false;

			await tx
				.update(vendorReviews)
				.set({ deletedAt: new Date(), deletedBy: event.locals.user?.id ?? null })
				.where(eq(vendorReviews.id, p.data.id));

			// vendors.rating_avg / review_count are cached — see docs/schema-conventions.md
			const [agg] = await tx
				.select({
					avg: sql<string>`coalesce(avg(${vendorReviews.rating}), 0)`,
					n: sql<number>`count(*)`
				})
				.from(vendorReviews)
				.where(and(eq(vendorReviews.vendorId, review.vendorId), isNull(vendorReviews.deletedAt)));
			await tx
				.update(vendors)
				.set({ ratingAvg: Number(agg.avg).toFixed(2), reviewCount: Number(agg.n) })
				.where(eq(vendors.id, review.vendorId));
			return true;
		});
		if (!done) return bad('Review not found');
		await audit(event, 'review.remove', 'vendor_review', p.data.id);
		return ok('Review removed and vendor rating recalculated');
	}
} satisfies Actions;
