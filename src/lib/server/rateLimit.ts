/**
 * Leora's rate limits. The token buckets themselves are admin-kit's (`server/rateLimit`); these are
 * the sizes for the forms that need them.
 */
export { takeToken, resetRateLimits } from '@nahu/admin-kit/server/rateLimit';

/** Limits shared by the auth forms. */
export const LIMITS = {
	login: { capacity: 10, perMinute: 2 },
	signup: { capacity: 5, perMinute: 1 },
	passwordReset: { capacity: 3, perMinute: 0.5 },
	payment: { capacity: 6, perMinute: 6 },
	upload: { capacity: 20, perMinute: 10 },
	contact: { capacity: 3, perMinute: 0.5 }
} as const;
