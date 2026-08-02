import { fail, redirect } from '@sveltejs/kit';
import { superValidate, message } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { db } from '$lib/server/db';
import { budgetItems } from '$lib/server/db/schema';
import { budgetItemSchema, deleteItemSchema } from '$lib/schemas/budget';
import { listBudgetItems, listBudgetCategories, assertItemOwnership } from '$lib/server/budget';
import { requireCoupleAndWedding } from '$lib/server/weddings';
import { and, eq } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent }) => {
	const { couple, wedding } = await parent();
	if (!wedding) throw redirect(302, '/wedding/wedding');

	const [items, categories, form, deleteForm] = await Promise.all([
		listBudgetItems(couple!.id),
		listBudgetCategories(couple!.id),
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
	save: async ({ request, locals }) => {
		const { couple } = await requireCoupleAndWedding(locals);

		const form = await superValidate(request, zod4(budgetItemSchema), { id: 'item' });
		if (!form.valid) return fail(400, { form });

		const values = {
			name: form.data.name,
			budgetCategoryId: form.data.categoryId,
			estimatedCost: form.data.plannedAmount.toFixed(2),
			actualCost: form.data.actualAmount.toFixed(2),
			notes: form.data.notes || null
		};

		if (form.data.id) {
			if (!(await assertItemOwnership(form.data.id, couple!.id))) {
				return fail(403, { form });
			}
			await db
				.update(budgetItems)
				.set(values)
				.where(and(eq(budgetItems.id, form.data.id), eq(budgetItems.coupleId, couple!.id)));
		} else {
			await db.insert(budgetItems).values({ ...values, coupleId: couple!.id });
		}

		return message(form, form.data.id ? 'Line item updated.' : 'Line item added.');
	},

	delete: async ({ request, locals }) => {
		const { couple } = await requireCoupleAndWedding(locals);

		const form = await superValidate(request, zod4(deleteItemSchema), { id: 'delete' });
		if (!form.valid) return fail(400, { form });

		if (!(await assertItemOwnership(form.data.id, couple!.id))) {
			return fail(403, { form });
		}

		await db
			.delete(budgetItems)
			.where(and(eq(budgetItems.id, form.data.id), eq(budgetItems.coupleId, couple!.id)));

		return message(form, 'Line item removed.');
	}
};
