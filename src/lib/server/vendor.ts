import { error, redirect } from '@sveltejs/kit';
import { and, eq, isNull } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { vendors } from '$lib/server/db/schema';

export async function requireVendor(locals: App.Locals, redirectTo = '/vendor') {
	const userId = locals.session?.user?.id;
	if (!userId) redirect(302, `/login?redirect=${encodeURIComponent(redirectTo)}`);

	const [vendor] = await db
		.select({
			id: vendors.id,
			businessName: vendors.businessName,
			isVerified: vendors.isVerified
		})
		.from(vendors)
		.where(and(eq(vendors.userId, userId), eq(vendors.isActive, true), isNull(vendors.deletedAt)))
		.limit(1);

	if (!vendor) error(403, 'No vendor profile is linked to this account');
	return { ...vendor, userId };
}