import { describe, expect, it } from 'vitest';
import { kindOf, newTxRef } from './index';

describe('tx refs', () => {
	it('round-trips the kind and never repeats', () => {
		expect(kindOf(newTxRef('booking', 7))).toBe('booking');
		expect(kindOf(newTxRef('plan', 7))).toBe('plan');
		expect(kindOf(newTxRef('vendor_plan', 7))).toBe('vendor_plan');
		expect(kindOf(newTxRef('gift', 7))).toBe('gift');
		expect(kindOf('xx-1-abc')).toBeNull();
		expect(newTxRef('booking', 1)).not.toBe(newTxRef('booking', 1));
	});
});
