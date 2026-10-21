/**
 * Booking terms a vendor chooses, shared by the server (refunds on cancellation, reminders) and the
 * pages (what a couple is told before they book or cancel).
 *
 * A cancellation policy is a list of tiers, longest notice first: cancelling at least `daysBefore`
 * days before the event gets `refundPercent` of what was paid back. When the vendor cancels, the
 * couple always gets everything back.
 */
export const CANCELLATION_POLICIES = ['flexible', 'moderate', 'strict'] as const;
export type CancellationPolicy = (typeof CANCELLATION_POLICIES)[number];

export const POLICY_TIERS: Record<
	CancellationPolicy,
	readonly { daysBefore: number; refundPercent: number }[]
> = {
	flexible: [
		{ daysBefore: 7, refundPercent: 100 },
		{ daysBefore: 0, refundPercent: 50 }
	],
	moderate: [
		{ daysBefore: 30, refundPercent: 100 },
		{ daysBefore: 7, refundPercent: 50 },
		{ daysBefore: 0, refundPercent: 0 }
	],
	strict: [
		{ daysBefore: 60, refundPercent: 50 },
		{ daysBefore: 0, refundPercent: 0 }
	]
};

export const DEFAULT_POLICY: CancellationPolicy = 'moderate';
export const DEFAULT_DEPOSIT_PERCENT = 30;
export const DEFAULT_BALANCE_DUE_DAYS = 14;

/** Whole days from `today` to `eventDate`, both `YYYY-MM-DD`; negative once the day has passed. */
export function daysUntil(eventDate: string, today: string): number {
	const day = (s: string) => Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10));
	return Math.round((day(eventDate) - day(today)) / 86_400_000);
}

/** The share of what was paid that comes back when the couple cancels on `today`. */
export function refundPercentFor(
	policy: CancellationPolicy,
	eventDate: string | null | undefined,
	today: string
): number {
	// No date agreed yet: nothing is reserved, so everything comes back.
	if (!eventDate) return 100;
	const days = daysUntil(eventDate, today);
	if (days < 0) return 0;
	return POLICY_TIERS[policy].find((t) => days >= t.daysBefore)?.refundPercent ?? 0;
}

/** The deposit that secures the date, in birr, rounded to whole birr. */
export function depositAmount(agreedPrice: number, depositPercent: number): number {
	return Math.round((agreedPrice * depositPercent) / 100);
}

/** `YYYY-MM-DD` by which the full balance is due, or null without an event date. */
export function balanceDueDate(eventDate: string | null | undefined, balanceDueDays: number) {
	if (!eventDate) return null;
	const d = new Date(
		Date.UTC(+eventDate.slice(0, 4), +eventDate.slice(5, 7) - 1, +eventDate.slice(8, 10))
	);
	d.setUTCDate(d.getUTCDate() - balanceDueDays);
	return d.toISOString().slice(0, 10);
}
