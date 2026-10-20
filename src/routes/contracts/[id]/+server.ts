import { error, redirect, type RequestHandler } from '@sveltejs/kit';
import { and, eq, isNull } from 'drizzle-orm';
import { streamStoredFile } from '@nahu/admin-kit/server/serveFile';
import { db } from '$lib/server/db';
import { contracts, couples, vendorBookings, vendors, weddingPlans } from '$lib/server/db/schema';
import { roleNameFor } from '$lib/server/authForms';

/** A booking's contract document, for the couple, the vendor and staff only. */
export const GET: RequestHandler = async ({ params, request, locals, url }) => {
	if (!locals.user) redirect(302, `/login?redirectTo=${encodeURIComponent(url.pathname)}`);
	const id = Number(params.id);
	if (!Number.isInteger(id)) error(404, 'Not found');
	const userId = locals.user.id;

	const [row] = await db
		.select({
			file: contracts.documentUrl,
			vendorUserId: vendors.userId,
			p1: couples.partner1UserId,
			p2: couples.partner2UserId
		})
		.from(contracts)
		.innerJoin(vendorBookings, eq(vendorBookings.id, contracts.bookingId))
		.innerJoin(vendors, eq(vendors.id, vendorBookings.vendorId))
		.innerJoin(weddingPlans, eq(weddingPlans.id, vendorBookings.weddingPlanId))
		.innerJoin(couples, eq(couples.id, weddingPlans.coupleId))
		.where(and(eq(contracts.id, id), isNull(contracts.deletedAt)));

	if (!row?.file) error(404, 'Not found');
	const isParty = [row.vendorUserId, row.p1, row.p2].includes(userId);
	if (!isParty && (await roleNameFor(userId)) !== 'Admin') error(404, 'Not found');

	return streamStoredFile(row.file, request, 'private');
};
