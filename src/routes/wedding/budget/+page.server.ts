import { fail, redirect } from '@sveltejs/kit';
import { superValidate, message } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { db } from '$lib/server/db';
import { weddingBudgetItems } from '$lib/server/db/schema';
import { budgetItemSchema, deleteItemSchema } from '$lib/schemas/budget';
import { listBudgetItems, listBudgetCategories, assertItemOwnership } from '$lib/server/budget';
import { and, eq } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent }) => {
	const { wedding } = await parent();
	if (!wedding) throw redirect(302, '/dashboard/wedding');

	const [items, categories, form, deleteForm] = await Promise.all([
		listBudgetItems(wedding.id),
		listBudgetCategories(),
		superValidate(zod4(budgetItemSchema), { id: 'item' }),
		superValidate(zod4(deleteItemSchema), { id: 'delete' })
	]);

	return {
		items,
		categoryItems: categories.map((c) => ({ value: String(c.id), name: c.name })),
		totalBudget: Number(wedding.totalBudget ?? 0),
		form,
		deleteForm
	};
};

export const actions: Actions = {
	save: async ({ request, parent }) => {
		const { wedding } = await parent();
		if (!wedding) throw redirect(302, '/dashboard/wedding');

		const form = await superValidate(request, zod4(budgetItemSchema), { id: 'item' });
		if (!form.valid) return fail(400, { form });

		const values = {
			categoryId: form.data.categoryId,
			plannedAmount: form.data.plannedAmount.toFixed(2),
			actualAmount: form.data.actualAmount.toFixed(2),
			notes: form.data.notes || null
		};

		if (form.data.id) {
			if (!(await assertItemOwnership(form.data.id, wedding.id))) {
				return fail(403, { form });
			}
			await db
				.update(weddingBudgetItems)
				.set(values)
				.where(
					and(
						eq(weddingBudgetItems.id, form.data.id),
						eq(weddingBudgetItems.weddingId, wedding.id)
					)
				);
		} else {
			await db.insert(weddingBudgetItems).values({ ...values, weddingId: wedding.id });
		}

		return message(form, form.data.id ? 'Line item updated.' : 'Line item added.');
	},

	delete: async ({ request, parent }) => {
		const { wedding } = await parent();
		if (!wedding) throw redirect(302, '/dashboard/wedding');

		const form = await superValidate(request, zod4(deleteItemSchema), { id: 'delete' });
		if (!form.valid) return fail(400, { form });

		if (!(await assertItemOwnership(form.data.id, wedding.id))) {
			return fail(403, { form });
		}

		await db
			.delete(weddingBudgetItems)
			.where(
				and(eq(weddingBudgetItems.id, form.data.id), eq(weddingBudgetItems.weddingId, wedding.id))
			);

		return message(form, 'Line item removed.');
	}
};