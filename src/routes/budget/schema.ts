import { z } from 'zod';

export const budgetSchema = z.object({
	totalBudget: z.number('Total budget must be a number').default(0),
	expectedGuests: z.number('Expected guests must be a number').default(0),
	weddingStyle: z.string('Wedding style is required.').default(''),
	weddingDate: z.string('Wedding date is required.').default(''),
	budget: z.number('Budget must be a number').default(0)
});
