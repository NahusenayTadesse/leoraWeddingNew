import { z } from 'zod/v4';

export const edit = z.object({
	id: z.coerce.number(),

	status: z
		.enum(['pending', 'delivered', 'cancelled'], { message: 'Status is required' })
		.default('pending')
});
export type Edit = z.infer<typeof edit>;
