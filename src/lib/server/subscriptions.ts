import { db } from '$lib/server/db';
import { subscriptions, subscriptionPlans } from '$lib/server/db/schema';
import { and, eq } from 'drizzle-orm';

/** A monthly/yearly plan expires; a one-time purchase never does. */
function expiryFor(billingCycle: string, from: Date): Date | null {
	if (billingCycle === 'monthly') {
		return new Date(from.getFullYear(), from.getMonth() + 1, from.getDate());
	}
	if (billingCycle === 'yearly') {
		return new Date(from.getFullYear() + 1, from.getMonth(), from.getDate());
	}
	return null;
}

/**
 * Called only after Chapa confirms the payment. Retires whatever plan the
 * couple currently holds and starts the new one — a couple has at most one
 * *active* subscription at a time, but old rows are kept (marked 'expired')
 * rather than overwritten, since they're the couple's billing history.
 */
type Writer = Pick<typeof db, 'select' | 'update' | 'insert'>;

/**
 * Pass `tx` to activate inside the transaction that settles the payment, so a crash between the
 * two cannot leave a paid payment without its plan (or the reverse).
 */
export async function activateSubscription(coupleId: number, planId: number, tx?: Writer) {
	if (tx) return activateIn(tx, coupleId, planId);
	return db.transaction((t) => activateIn(t, coupleId, planId));
}

async function activateIn(tx: Writer, coupleId: number, planId: number) {
	const [plan] = await tx
		.select()
		.from(subscriptionPlans)
		.where(eq(subscriptionPlans.id, planId))
		.limit(1);

	if (!plan) return null;

	const startedAt = new Date();
	const expiresAt = expiryFor(plan.billingCycle, startedAt);

	await tx
		.update(subscriptions)
		.set({ status: 'expired' })
		.where(and(eq(subscriptions.coupleId, coupleId), eq(subscriptions.status, 'active')));

	const [row] = await tx
		.insert(subscriptions)
		.values({ coupleId, subscriptionPlanId: planId, status: 'active', startedAt, expiresAt })
		.$returningId();

	return { subscriptionId: row.id, plan };
}
