import { describe, expect, it } from 'vitest';
import { localPhone } from './chapa';
import { kindOf, newTxRef } from './index';

describe('localPhone', () => {
	it('normalises Ethiopian mobiles and drops anything else', () => {
		expect(localPhone('0911223344')).toBe('0911223344');
		expect(localPhone('+251 911 223 344')).toBe('0911223344');
		expect(localPhone('251711223344')).toBe('0711223344');
		expect(localPhone('0111223344')).toBeUndefined();
		expect(localPhone(null)).toBeUndefined();
	});
});

describe('tx refs', () => {
	it('round-trips the kind and never repeats', () => {
		expect(kindOf(newTxRef('booking', 7))).toBe('booking');
		expect(kindOf(newTxRef('plan', 7))).toBe('plan');
		expect(kindOf(newTxRef('vendor_plan', 7))).toBe('vendor_plan');
		expect(kindOf('xx-1-abc')).toBeNull();
		expect(newTxRef('booking', 1)).not.toBe(newTxRef('booking', 1));
	});
});
