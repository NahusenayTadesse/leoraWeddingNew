import { and, eq, isNull } from 'drizzle-orm';
import { z } from 'zod/v4';
import { db } from '$lib/server/db';
import { vendorReviews } from '$lib/server/db/schema';
import { requireVendor } from '$lib/server/vendor';
import { getVendorReviews } from '$lib/server/vendorDirectory';
import { parse, ok, bad } from '@nahu/admin-kit/server/actionResults';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const vendor = await requireVendor(locals, '/vendor-dashboard/reviews');
	const { reviews, buckets } = await getVendorReviews(vendor.id, 200);
	return { reviews, buckets, vendorId: vendor.id };
};

const replySchema = z.object({
	id: z.coerce.number().int().positive(),
	reply: z.string().trim().max(1000, 'Keep it under 1,000 characters')
});

export const actions = {
	/** One public reply per review; sending an empty reply removes it. */
	reply: async ({ request, locals }) => {
		const vendor = await requireVendor(locals);
		const p = await parse(request, replySchema);
		if ('error' in p) return p.error;
		const [res] = await db
			.update(vendorReviews)
			.set({
				vendorReply: p.data.reply || null,
				repliedAt: p.data.reply ? new Date() : null
			})
			.where(
				and(
					eq(vendorReviews.id, p.data.id),
					eq(vendorReviews.vendorId, vendor.id),
					isNull(vendorReviews.deletedAt)
				)
			);
		if (!res.affectedRows) return bad('Review not found', 404);
		return ok(p.data.reply ? 'Reply posted' : 'Reply removed');
	}
} satisfies Actions;
