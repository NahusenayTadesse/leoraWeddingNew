import { z } from 'zod';

const isoDate = /^\d{4}-\d{2}-\d{2}$/;

export const taskSchema = z.object({
	id: z.coerce.number().int().positive().optional(),
	title: z.string().trim().min(2, 'Give the task a title').max(200),
	dueDate: z
		.string()
		.trim()
		.regex(isoDate, 'Pick a due date')
		.or(z.literal(''))
		.optional(),
	isConfirmed: z.coerce.boolean().default(false)
});

export const taskIdSchema = z.object({
	id: z.coerce.number().int().positive()
});

export const generateSchema = z.object({
	confirm: z.literal('yes')
});

export type TaskSchema = typeof taskSchema;