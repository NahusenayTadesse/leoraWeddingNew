import { z } from 'zod';

/** Matches the options rendered in the Wedding style select. */
export const WEDDING_STYLES = [
	'Traditional Ethiopian',
	'Modern Western',
	'Mixed Cultural',
	'Destination Wedding'
] as const;

export type WeddingStyle = (typeof WEDDING_STYLES)[number];

const todayIso = () => new Date().toISOString().slice(0, 10);

export const allocationSchema = z.object({
	categoryId: z.int().positive(),
	/** Whole percent of the total budget. Amounts are always derived, never stored twice. */
	percent: z
		.number()
		.min(0, 'Allocation cannot be negative')
		.max(100, 'A single category cannot exceed 100%')
});

export const budgetSchema = z
	.object({
		// The old schema defaulted every field to 0/'', so an empty submit saved a
		// valid-looking 0 ETB wedding. Every field now has to be filled in.
		totalBudget: z
			.number('Enter your total budget as a number')
			.min(1, 'Enter a budget greater than zero')
			.max(1_000_000_000, 'That budget is larger than we can plan for'),

		expectedGuests: z
			.int('Enter the guest count as a whole number')
			.min(1, 'Enter at least one guest')
			.max(20_000, 'Enter a guest count under 20,000'),

		weddingStyle: z.enum(WEDDING_STYLES, 'Choose a wedding style'),

		weddingDate: z
			.string('Choose your wedding date')
			.regex(/^\d{4}-\d{2}-\d{2}$/, 'Choose a valid date')
			.refine((d) => d >= todayIso(), 'Choose a date that has not passed'),

		allocations: z.array(allocationSchema).default([])
	})
	.check((ctx) => {
		const total = ctx.value.allocations.reduce((sum, a) => sum + a.percent, 0);
		// Under-allocating is allowed — the remainder shows as "unassigned".
		// Over-allocating is not, because the amounts would exceed the budget.
		if (total > 100.001) {
			ctx.issues.push({
				code: 'custom',
				input: ctx.value.allocations,
				path: ['allocations'],
				message: `Allocations add up to ${Math.round(total)}%. Bring it down to 100% or less.`
			});
		}
	});

export type BudgetSchema = typeof budgetSchema;