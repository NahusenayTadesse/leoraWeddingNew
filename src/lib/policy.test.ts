import { describe, expect, it } from 'vitest';
import { balanceDueDate, daysUntil, depositAmount, refundPercentFor } from './policy';

describe('cancellation policy', () => {
	const today = '2030-01-01';

	it('counts whole days to the event', () => {
		expect(daysUntil('2030-01-31', today)).toBe(30);
		expect(daysUntil('2029-12-31', today)).toBe(-1);
	});

	it('flexible: everything back from 7 days out, half inside that', () => {
		expect(refundPercentFor('flexible', '2030-01-08', today)).toBe(100);
		expect(refundPercentFor('flexible', '2030-01-07', today)).toBe(50);
		expect(refundPercentFor('flexible', today, today)).toBe(50);
	});

	it('moderate: 100 / 50 / 0 at 30 and 7 days', () => {
		expect(refundPercentFor('moderate', '2030-01-31', today)).toBe(100);
		expect(refundPercentFor('moderate', '2030-01-30', today)).toBe(50);
		expect(refundPercentFor('moderate', '2030-01-08', today)).toBe(50);
		expect(refundPercentFor('moderate', '2030-01-07', today)).toBe(0);
	});

	it('strict: half back from 60 days out, nothing after', () => {
		expect(refundPercentFor('strict', '2030-03-02', today)).toBe(50);
		expect(refundPercentFor('strict', '2030-02-28', today)).toBe(0);
	});

	it('nothing back once the event has passed; everything without a date', () => {
		expect(refundPercentFor('flexible', '2029-12-31', today)).toBe(0);
		expect(refundPercentFor('strict', null, today)).toBe(100);
	});
});

describe('deposit and balance due', () => {
	it('works out the deposit in whole birr', () => {
		expect(depositAmount(33333, 30)).toBe(10000);
		expect(depositAmount(50000, 0)).toBe(0);
	});

	it('puts the balance due date the given days before the event', () => {
		expect(balanceDueDate('2030-03-01', 14)).toBe('2030-02-15');
		expect(balanceDueDate(null, 14)).toBeNull();
	});
});
