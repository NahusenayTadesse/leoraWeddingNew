import { z } from 'zod';

export const budgetSchema = z.object({
	budget: z.number('Budget must be a number').default(0)
});
