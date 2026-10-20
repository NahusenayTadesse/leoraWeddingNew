import { error, redirect, type RequestHandler } from '@sveltejs/kit';
import { and, eq, or } from 'drizzle-orm';
import { streamStoredFile } from '@nahu/admin-kit/server/serveFile';
import { db } from '$lib/server/db';
import { bookingPayments, couples, payments, vendors } from '$lib/server/db/schema';
import { roleNameFor } from '$lib/server/authForms';

/**
 * A transfer receipt: shown to staff, the person who paid, and the vendor being paid — nobody
 * else. Receipts show account numbers, so unlike `/files/[name]` this is not public.
 */
export const GET: RequestHandler = async ({ params, request, locals, url }) => {
	if (!locals.user) redirect(302, `/login?redirectTo=${encodeURIComponent(url.pathname)}`);
	const userId = locals.user.id;

	if ((await roleNameFor(userId)) !== 'Admin') {
		const [booking] = await db
			.select({ id: bookingPayments.id })
			.from(bookingPayments)
			.leftJoin(vendors, eq(vendors.id, bookingPayments.payeeVendorId))
			.where(
				and(
					eq(bookingPayments.receiptFile, params.name!),
					or(eq(bookingPayments.payerId, userId), eq(vendors.userId, userId))
				)
			)
			.limit(1);
		const [plan] = booking
			? [booking]
			: await db
					.select({ id: payments.id })
					.from(payments)
					.innerJoin(couples, eq(couples.id, payments.coupleId))
					.where(
						and(
							eq(payments.receiptFile, params.name!),
							or(eq(couples.partner1UserId, userId), eq(couples.partner2UserId, userId))
						)
					)
					.limit(1);
		if (!plan) error(404, 'Not found');
	}

	return streamStoredFile(params.name!, request, 'private');
};
