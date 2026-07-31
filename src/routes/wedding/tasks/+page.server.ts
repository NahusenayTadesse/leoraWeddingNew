import { fail, redirect } from '@sveltejs/kit';
import { superValidate, message } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { db } from '$lib/server/db';
import { weddingTasks } from '$lib/server/db/schema';
import { taskSchema, taskIdSchema, generateSchema } from '$lib/schemas/task';
import {
	listTasks,
	assertTaskOwnership,
	listTaskTemplates,
	dueDateFor,
	toDateInput
} from '$lib/server/tasks';
import { and, eq, not } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent }) => {
	const { wedding } = await parent();
	if (!wedding) throw redirect(302, '/dashboard/wedding');

	const [rows, templates, form, deleteForm, generateForm] = await Promise.all([
		listTasks(wedding.id),
		listTaskTemplates(),
		superValidate(zod4(taskSchema), { id: 'task' }),
		superValidate(zod4(taskIdSchema), { id: 'delete' }),
		superValidate(zod4(generateSchema), { id: 'generate' })
	]);

	return {
		tasks: rows.map((t) => ({ ...t, dueDate: toDateInput(t.dueDate) })),
		weddingDate: toDateInput(wedding.weddingDate),
		templateCount: templates.length,
		form,
		deleteForm,
		generateForm
	};
};

export const actions: Actions = {
	save: async ({ request, parent }) => {
		const { wedding } = await parent();
		if (!wedding) throw redirect(302, '/dashboard/wedding');

		const form = await superValidate(request, zod4(taskSchema), { id: 'task' });
		if (!form.valid) return fail(400, { form });

		const values = {
			title: form.data.title,
			dueDate: form.data.dueDate ? new Date(`${form.data.dueDate}T00:00:00`) : null,
			isConfirmed: form.data.isConfirmed
		};

		if (form.data.id) {
			if (!(await assertTaskOwnership(form.data.id, wedding.id))) return fail(403, { form });

			await db
				.update(weddingTasks)
				.set(values)
				.where(and(eq(weddingTasks.id, form.data.id), eq(weddingTasks.weddingId, wedding.id)));
		} else {
			await db.insert(weddingTasks).values({ ...values, weddingId: wedding.id });
		}

		return message(form, form.data.id ? 'Task updated.' : 'Task added.');
	},

	toggle: async ({ request, parent }) => {
		const { wedding } = await parent();
		if (!wedding) throw redirect(302, '/dashboard/wedding');

		const form = await superValidate(request, zod4(taskIdSchema), { id: 'toggle' });
		if (!form.valid) return fail(400, { form });

		if (!(await assertTaskOwnership(form.data.id, wedding.id))) return fail(403, { form });

		await db
			.update(weddingTasks)
			.set({ isConfirmed: not(weddingTasks.isConfirmed) })
			.where(and(eq(weddingTasks.id, form.data.id), eq(weddingTasks.weddingId, wedding.id)));

		return { success: true };
	},

	delete: async ({ request, parent }) => {
		const { wedding } = await parent();
		if (!wedding) throw redirect(302, '/dashboard/wedding');

		const form = await superValidate(request, zod4(taskIdSchema), { id: 'delete' });
		if (!form.valid) return fail(400, { form });

		if (!(await assertTaskOwnership(form.data.id, wedding.id))) return fail(403, { form });

		await db
			.delete(weddingTasks)
			.where(and(eq(weddingTasks.id, form.data.id), eq(weddingTasks.weddingId, wedding.id)));

		return message(form, 'Task removed.');
	},

	generate: async ({ request, parent }) => {
		const { wedding } = await parent();
		if (!wedding) throw redirect(302, '/dashboard/wedding');

		const form = await superValidate(request, zod4(generateSchema), { id: 'generate' });
		if (!form.valid) return fail(400, { form });

		if (!wedding.weddingDate) {
			return message(form, 'Set your wedding date first.', { status: 400 });
		}

		const [templates, existing] = await Promise.all([
			listTaskTemplates(),
			listTasks(wedding.id)
		]);

		const taken = new Set(existing.map((t) => (t.title ?? '').trim().toLowerCase()));
		const weddingDate = new Date(wedding.weddingDate);

		const toInsert = templates
			.filter((t) => t.title && !taken.has(t.title.trim().toLowerCase()))
			.map((t) => ({
				weddingId: wedding.id,
				title: t.title!,
				dueDate: dueDateFor(weddingDate, t.daysBeforeWedding),
				isConfirmed: false
			}));

		if (toInsert.length === 0) {
			return message(form, 'Your checklist already has every suggested task.');
		}

		await db.insert(weddingTasks).values(toInsert);

		return message(form, `Added ${toInsert.length} task${toInsert.length === 1 ? '' : 's'}.`);
	}
};