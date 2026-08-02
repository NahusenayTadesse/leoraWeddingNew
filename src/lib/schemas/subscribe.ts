import { z } from 'zod/v4';

export const subscribeSchema = z.object({
	planId: z.coerce.number({ message: 'Choose a plan' }).int().positive('Choose a plan')
});

export type SubscribeSchema = typeof subscribeSchema;
