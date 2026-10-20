import { beforeEach, describe, expect, it, vi } from 'vitest';
import { resetRateLimits, takeToken } from './rateLimit';

describe('takeToken', () => {
	beforeEach(() => {
		resetRateLimits();
		vi.useRealTimers();
	});

	it('allows a burst up to capacity, then refuses', () => {
		const limit = { capacity: 3, perMinute: 1 };
		expect([1, 2, 3, 4].map(() => takeToken('k', limit))).toEqual([true, true, true, false]);
	});

	it('refills over time', () => {
		vi.useFakeTimers();
		const limit = { capacity: 1, perMinute: 2 };
		expect(takeToken('k', limit)).toBe(true);
		expect(takeToken('k', limit)).toBe(false);
		vi.advanceTimersByTime(30_000);
		expect(takeToken('k', limit)).toBe(true);
	});

	it('keeps keys separate', () => {
		const limit = { capacity: 1, perMinute: 1 };
		expect(takeToken('a', limit)).toBe(true);
		expect(takeToken('b', limit)).toBe(true);
	});
});
