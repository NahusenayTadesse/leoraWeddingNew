/**
 * In-memory token buckets for abuse-prone actions (login, signup, password reset, chat, uploads).
 * better-auth's own limiter only sees requests to `/api/auth/*`; our forms call `auth.api.*` from
 * form actions, which never pass through it, so they are limited here.
 *
 * Per process: fine for one Node server. Behind several instances, move this to Redis or the DB.
 */

type Bucket = { tokens: number; updatedAt: number };

const buckets = new Map<string, Bucket>();

/** Drop idle buckets now and then so the map cannot grow without bound. */
let lastSweep = Date.now();
function sweep(now: number) {
	if (now - lastSweep < 60_000) return;
	lastSweep = now;
	for (const [key, bucket] of buckets) {
		if (now - bucket.updatedAt > 60 * 60_000) buckets.delete(key);
	}
}

/**
 * Takes one token from `key`'s bucket. Returns false when the bucket is empty, meaning the caller
 * should refuse. `capacity` is the burst size; `perMinute` the refill rate.
 */
export function takeToken(
	key: string,
	{ capacity, perMinute }: { capacity: number; perMinute: number }
): boolean {
	const now = Date.now();
	sweep(now);

	const bucket = buckets.get(key) ?? { tokens: capacity, updatedAt: now };
	const refill = ((now - bucket.updatedAt) / 60_000) * perMinute;
	bucket.tokens = Math.min(capacity, bucket.tokens + refill);
	bucket.updatedAt = now;

	if (bucket.tokens < 1) {
		buckets.set(key, bucket);
		return false;
	}
	bucket.tokens -= 1;
	buckets.set(key, bucket);
	return true;
}

/** Limits shared by the auth forms. */
export const LIMITS = {
	login: { capacity: 10, perMinute: 2 },
	signup: { capacity: 5, perMinute: 1 },
	passwordReset: { capacity: 3, perMinute: 0.5 },
	payment: { capacity: 6, perMinute: 6 },
	upload: { capacity: 20, perMinute: 10 },
	contact: { capacity: 3, perMinute: 0.5 }
} as const;

/** Test hook. */
export function resetRateLimits() {
	buckets.clear();
}
