/**
 * Every stored status in Leora, mapped onto the kit's badge colours.
 *
 * The kit's `Statuses` badge colours a status by name from its own vocabulary. Some of ours are not
 * in it (`under_review`, `requested`, `todo`), and some it colours differently from what they mean
 * here, so each status names the kit word whose colour it should wear and the label it shows:
 * `<Statuses {...badge(status)} />`, or `status(value)` in a column.
 */
type Tone = 'success' | 'danger' | 'warning' | 'info' | 'neutral';

/** A word the kit already colours in each tone. */
const TONE_WORD: Record<Tone, string> = {
	success: 'active',
	danger: 'inactive',
	warning: 'pending',
	info: 'ready',
	neutral: 'neutral'
};

const TONES: Record<string, Tone> = {
	// approvals: vendors, refunds, quotes
	pending: 'warning',
	approved: 'success',
	rejected: 'danger',
	suspended: 'danger',
	sent: 'info',
	accepted: 'success',
	// bookings, RSVPs, weddings
	confirmed: 'success',
	cancelled: 'danger',
	declined: 'danger',
	planning: 'info',
	planned: 'neutral',
	booked: 'info',
	completed: 'success',
	// money
	paid: 'success',
	failed: 'danger',
	refunded: 'neutral',
	requested: 'warning',
	processing: 'info',
	delivered: 'success',
	held: 'info',
	released: 'success',
	// disputes
	open: 'warning',
	under_review: 'info',
	resolved: 'success',
	// subscriptions, coupons, accounts
	active: 'success',
	expired: 'neutral',
	paused: 'neutral',
	banned: 'danger',
	// contact inbox
	new: 'warning',
	read: 'info',
	replied: 'success',
	// tasks
	todo: 'neutral',
	in_progress: 'info',
	done: 'success'
};

/** `under_review` → "Under review". */
export const statusLabel = (value: string) =>
	value.charAt(0).toUpperCase() + value.slice(1).replace(/_/g, ' ');

/** Props for the kit's `Statuses` badge: the colour of the status's tone, and its label. */
export function badge(value: string | null | undefined, label?: string) {
	if (!value) return { status: TONE_WORD.neutral, label: label ?? '—' };
	return { status: TONE_WORD[TONES[value] ?? 'neutral'], label: label ?? statusLabel(value) };
}
