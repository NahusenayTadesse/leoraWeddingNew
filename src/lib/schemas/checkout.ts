import { z } from 'zod/v4';

export const cartLineSchema = z.object({
	productId: z.number({ message: 'Product is required' }).int().positive('Product is required'),
	/** The `prices.amount` label — identifies which package was chosen. */
	amount: z.string().trim().min(1, 'Package is required').max(255),
	quantity: z
		.number({ message: 'Quantity is required' })
		.int()
		.positive('At least 1')
		.max(999, 'Too many')
});

export const checkoutSchema = z.object({
	items: z.array(cartLineSchema).min(1, 'Your cart is empty').max(100, 'Too many lines'),
	notes: z.string().trim().max(1000, 'Too long').or(z.literal('')).optional()
});

export const validateSchema = z.object({
	items: z.array(cartLineSchema).max(100)
});

export type CheckoutSchema = typeof checkoutSchema;
export type CartLine = z.infer<typeof cartLineSchema>;