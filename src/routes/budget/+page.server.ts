import { setError, superValidate, message } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { eq } from 'drizzle-orm';
import { addUser } from '$lib/ZodSchema.js';

import { budgetSchema } from './schema';
import { db } from '$lib/server/db';
import { weddings, couples } from '$lib/server/db/schema';
import type { Actions } from './$types';
import type { PageServerLoad } from './$types.js';

export const load: PageServerLoad = async () => {
	const form = await superValidate(zod4(budgetSchema));
	const signupForm = await superValidate(zod4(addUser));

	return {
		form,
		signupForm
	};
};

export const actions: Actions = {
	budget: async ({ request, locals }) => {
		const form = await superValidate(request, zod4(budgetSchema));

		if (!form.valid) {
			return message(form, { type: 'error', text: 'Please check the form for Errors' });
		}

		const { weddingDate, totalBudget, expectedGuests, weddingStyle } = form.data;

		try {
			await db.transaction(async (tx) => {
				const isCouple = await tx
					.select({ userId: couples.userId, id: couples.id })
					.from(couples)
					.where(eq(couples.userId, locals?.user?.id))
					.then((rows) => rows[0]);

				if (!isCouple) {
					return message(form, {
						type: 'error',
						text: 'Couple not found, only couples can add a budget'
					});
				}

				await tx.delete(weddings).where(eq(weddings.coupleId, isCouple?.id));

				await tx.insert(weddings).values({
					weddingDate,
					totalBudget,
					expectedGuests,
					weddingStyle,
					coupleId: isCouple?.id
				});
			});

			return message(form, { type: 'success', text: 'Budget Successfully Added' });
		} catch (err: any) {
			console.error(err);
			return message(form, {
				type: 'error',
				text: 'Unexpected error: Please try again later'
			});
		}
	}
};
