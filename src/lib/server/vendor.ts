import { error, redirect } from '@sveltejs/kit';
import { and, eq, isNull } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { vendors } from '$lib/server/db/schema';

export async function requireVendor(locals: App.Locals, redirectTo = '/vendor-dashboard') {
	const userId = locals.user?.id;
	if (!userId) redirect(302, `/login?redirectTo=${encodeURIComponent(redirectTo)}`);

	const [vendor] = await db
		.select({
			id: vendors.id,
			businessName: vendors.businessName,
			isVerified: vendors.isVerified,
			status: vendors.status,
			ratingAvg: vendors.ratingAvg,
			reviewCount: vendors.reviewCount
		})
		.from(vendors)
		.where(and(eq(vendors.userId, userId), eq(vendors.isActive, true), isNull(vendors.deletedAt)))
		.limit(1);

	if (!vendor) error(403, 'No vendor profile is linked to this account');
	return { ...vendor, userId };
}