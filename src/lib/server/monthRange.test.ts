import { describe, expect, it } from 'vitest';
import { monthRange } from './monthRange';

describe('monthRange', () => {
	it('gives the first and last day of the asked month', () => {
		expect(monthRange('2027-02')).toEqual({
			month: '2027-02-01',
			from: '2027-02-01',
			to: '2027-02-28'
		});
		expect(monthRange('2028-02-14')).toMatchObject({ to: '2028-02-29' });
	});

	it('clamps a bad month and falls back to now without a param', () => {
		expect(monthRange('2027-13').month).toBe('2027-12-01');
		expect(monthRange(null).month).toMatch(/^\d{4}-\d{2}-01$/);
	});
});
