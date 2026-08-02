import { z } from 'zod';

export const budgetItemSchema = z.object({
	id: z.coerce.number().int().positive().optional(),
	name: z.string().trim().min(2, 'Give this line item a name').max(150),
	categoryId: z.coerce.number({ message: 'Choose a category' }).int().positive('Choose a category'),
	plannedAmount: z.coerce
		.number({ message: 'Enter an amount' })
		.min(0, 'Cannot be negative')
		.max(999999999, 'That seems too high'),
	actualAmount: z.coerce
		.number({ message: 'Enter an amount' })
		.min(0, 'Cannot be negative')
		.max(999999999, 'That seems too high')
		.default(0),
	notes: z.string().trim().max(1000, 'Too long').or(z.literal('')).optional()
});

export const deleteItemSchema = z.object({
	id: z.coerce.number().int().positive()
});

export type BudgetItemSchema = typeof budgetItemSchema;