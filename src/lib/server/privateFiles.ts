import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { bookingPayments, contracts, payments } from '$lib/server/db/schema';

/**
 * Files that share the upload store but belong to someone: payment receipts and contracts.
 * The public `/files/[name]` route refuses these; each has its own route that checks who asks.
 */
export async function isPrivateFile(name: string): Promise<boolean> {
	const checks = await Promise.all([
		db.select({ id: bookingPayments.id }).from(bookingPayments).where(eq(bookingPayments.receiptFile, name)).limit(1),
		db.select({ id: payments.id }).from(payments).where(eq(payments.receiptFile, name)).limit(1),
		db.select({ id: contracts.id }).from(contracts).where(eq(contracts.documentUrl, name)).limit(1)
	]);
	return checks.some((rows) => rows.length > 0);
}
