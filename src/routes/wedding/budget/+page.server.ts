import { redirect } from '@sveltejs/kit';
import { superValidate, message } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { db } from '$lib/server/db';
import { budgetItems } from '$lib/server/db/schema';
import { budgetItemSchema, deleteItemSchema } from '$lib/schemas/budget';
import { listBudgetItems, listBudgetCategories, assertItemOwnership } from '$lib/server/budget';
import { requireCoupleAndWedding } from '$lib/server/weddings';
import { and, eq } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';
import { m } from '$lib/paraglide/messages.js';

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
		categoryItems: categories.map((c) => ({ value: c.id, name: c.name })),
		totalBudget: Number(wedding.totalBudget ?? 0),
		form,
		deleteForm
	};
};

export const actions: Actions = {
	save: async ({ request, locals }) => {
		const { couple } = await requireCoupleAndWedding(locals);

		const form = await superValidate(request, zod4(budgetItemSchema), { id: 'item' });
		if (!form.valid)
			return message(form, { type: 'error', text: m.srv_check_form() }, { status: 400 });

		const values = {
			name: form.data.name,
			budgetCategoryId: form.data.categoryId,
			estimatedCost: form.data.plannedAmount.toFixed(2),
			actualCost: form.data.actualAmount.toFixed(2),
			notes: form.data.notes || null
		};

		if (form.data.id) {
			if (!(await assertItemOwnership(form.data.id, couple!.id))) {
				return message(form, { type: 'error', text: m.srv_not_yours() }, { status: 403 });
			}
			await db
				.update(budgetItems)
				.set(values)
				.where(and(eq(budgetItems.id, form.data.id), eq(budgetItems.coupleId, couple!.id)));
		} else {
			await db.insert(budgetItems).values({ ...values, coupleId: couple!.id });
		}

		return message(form, {
			type: 'success',
			text: form.data.id ? m.srv_item_updated() : m.srv_item_added()
		});
	},

	delete: async ({ request, locals }) => {
		const { couple } = await requireCoupleAndWedding(locals);

		const form = await superValidate(request, zod4(deleteItemSchema), { id: 'delete' });
		if (!form.valid)
			return message(form, { type: 'error', text: m.srv_check_form() }, { status: 400 });

		if (!(await assertItemOwnership(form.data.id, couple!.id))) {
			return message(form, { type: 'error', text: m.srv_not_yours() }, { status: 403 });
		}

		await db
			.delete(budgetItems)
			.where(and(eq(budgetItems.id, form.data.id), eq(budgetItems.coupleId, couple!.id)));

		return message(form, { type: 'success', text: m.srv_item_removed() });
	}
};
