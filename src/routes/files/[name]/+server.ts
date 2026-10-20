import { error } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { streamStoredFile } from '@nahu/admin-kit/server/serveFile';
import { db } from '$lib/server/db';
import { bookingPayments, payments } from '$lib/server/db/schema';
import type { RequestHandler } from './$types';

/** True when the name belongs to a payment receipt, which only `/receipts/[name]` may serve. */
async function isReceipt(name: string) {
	const [a] = await db
		.select({ id: bookingPayments.id })
		.from(bookingPayments)
		.where(eq(bookingPayments.receiptFile, name))
		.limit(1);
	if (a) return true;
	const [b] = await db
		.select({ id: payments.id })
		.from(payments)
		.where(eq(payments.receiptFile, name))
		.limit(1);
	return !!b;
}

/**
 * Uploaded files, open to anyone: the public vendor pages and the shop show images from here to
 * signed-out visitors, so this cannot be the kit's signed-in `GET`. Stored names are random UUIDs.
 * The kit resolves the name inside `FILES_DIR` and refuses anything that escapes it.
 * Payment receipts share the store but are refused here.
 */
export const GET: RequestHandler = async ({ params, request }) => {
	if (await isReceipt(params.name)) error(404, 'Not found');
	return streamStoredFile(params.name, request, 'private');
};
