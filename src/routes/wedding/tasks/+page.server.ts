import { redirect } from '@sveltejs/kit';
import { superValidate, message } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { db } from '$lib/server/db';
import { tasks as tasksTable } from '$lib/server/db/schema';
import { taskSchema, taskIdSchema, generateSchema } from '$lib/schemas/task';
import {
	listTasks,
	assertTaskOwnership,
	listTaskTemplates,
	dueDateFor,
	toDateInput
} from '$lib/server/tasks';
import { requireCoupleAndWedding } from '$lib/server/weddings';
import { parse, bad } from '$lib/server/adminAction';
import { and, eq } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent }) => {
	const { couple, wedding } = await parent();
	if (!wedding) throw redirect(302, '/wedding/wedding');

	const [rows, templates, form, deleteForm, generateForm] = await Promise.all([
		listTasks(couple!.id),
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
	save: async ({ request, locals }) => {
		const { couple } = await requireCoupleAndWedding(locals);

		const form = await superValidate(request, zod4(taskSchema), { id: 'task' });
		if (!form.valid) return message(form, { type: 'error', text: 'Please check the form for errors' }, { status: 400 });

		const values = {
			title: form.data.title,
			dueDate: form.data.dueDate ? new Date(`${form.data.dueDate}T00:00:00`) : null,
			status: form.data.isConfirmed ? ('done' as const) : ('todo' as const)
		};

		if (form.data.id) {
			if (!(await assertTaskOwnership(form.data.id, couple!.id))) return message(form, { type: 'error', text: 'That is not yours to change.' }, { status: 403 });

			await db
				.update(tasksTable)
				.set(values)
				.where(and(eq(tasksTable.id, form.data.id), eq(tasksTable.coupleId, couple!.id)));
		} else {
			await db.insert(tasksTable).values({ ...values, coupleId: couple!.id });
		}

		return message(form, { type: 'success', text: form.data.id ? 'Task updated.' : 'Task added.' });
	},

	toggle: async ({ request, locals }) => {
		const { couple } = await requireCoupleAndWedding(locals);

		const p = await parse(request, taskIdSchema);
		if ('error' in p) return p.error;

		const [current] = await db
			.select({ status: tasksTable.status })
			.from(tasksTable)
			.where(and(eq(tasksTable.id, p.data.id), eq(tasksTable.coupleId, couple!.id)))
			.limit(1);
		if (!current) return bad('That task is not on your checklist.', 403);

		await db
			.update(tasksTable)
			.set({ status: current.status === 'done' ? 'todo' : 'done' })
			.where(and(eq(tasksTable.id, p.data.id), eq(tasksTable.coupleId, couple!.id)));

		// Silent on success: the tick is the feedback.
		return { success: true };
	},

	delete: async ({ request, locals }) => {
		const { couple } = await requireCoupleAndWedding(locals);

		const form = await superValidate(request, zod4(taskIdSchema), { id: 'delete' });
		if (!form.valid) return message(form, { type: 'error', text: 'Please check the form for errors' }, { status: 400 });

		if (!(await assertTaskOwnership(form.data.id, couple!.id))) return message(form, { type: 'error', text: 'That is not yours to change.' }, { status: 403 });

		await db
			.delete(tasksTable)
			.where(and(eq(tasksTable.id, form.data.id), eq(tasksTable.coupleId, couple!.id)));

		return message(form, { type: 'success', text: 'Task removed.' });
	},

	generate: async ({ request, locals }) => {
		const { couple, wedding } = await requireCoupleAndWedding(locals);

		const form = await superValidate(request, zod4(generateSchema), { id: 'generate' });
		if (!form.valid) return message(form, { type: 'error', text: 'Please check the form for errors' }, { status: 400 });

		if (!wedding.weddingDate) {
			return message(form, { type: 'error', text: 'Set your wedding date first.' }, { status: 400 });
		}

		const [templates, existing] = await Promise.all([listTaskTemplates(), listTasks(couple!.id)]);

		const taken = new Set(existing.map((t) => (t.title ?? '').trim().toLowerCase()));
		const weddingDate = new Date(wedding.weddingDate);

		const toInsert = templates
			.filter((t) => t.title && !taken.has(t.title.trim().toLowerCase()))
			.map((t) => ({
				coupleId: couple!.id,
				taskCategoryId: t.taskCategoryId,
				title: t.title!,
				description: t.description,
				dueDate: dueDateFor(weddingDate, t.daysBeforeWedding),
				priority: t.priority,
				status: 'todo' as const
			}));

		if (toInsert.length === 0) {
			return message(form, { type: 'success', text: 'Your checklist already has every suggested task.' });
		}

		await db.insert(tasksTable).values(toInsert);

		return message(form, { type: 'success', text: `Added ${toInsert.length} task${toInsert.length === 1 ? '' : 's'}.` });
	}
};
