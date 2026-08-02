import { db } from '$lib/server/db';
import { tasks, taskTemplates } from '$lib/server/db/schema';
import { and, asc, eq } from 'drizzle-orm';

/**
 * `isConfirmed` is a derived convenience for the UI, which predates the
 * `status` enum ('todo' | 'in_progress' | 'done'). "Confirmed" maps to
 * status === 'done'; both other states read as unconfirmed.
 */
export async function listTasks(coupleId: number) {
	const rows = await db
		.select()
		.from(tasks)
		.where(eq(tasks.coupleId, coupleId))
		.orderBy(asc(tasks.dueDate), asc(tasks.id));

	return rows.map((t) => ({ ...t, isConfirmed: t.status === 'done' }));
}

export async function assertTaskOwnership(taskId: number, coupleId: number) {
	const [row] = await db
		.select({ id: tasks.id })
		.from(tasks)
		.where(and(eq(tasks.id, taskId), eq(tasks.coupleId, coupleId)))
		.limit(1);

	return !!row;
}

export async function listTaskTemplates() {
	return db.select().from(taskTemplates).orderBy(asc(taskTemplates.daysBeforeWedding));
}

/** Subtracts N days from the wedding date, clamped to today so nothing lands in the past. */
export function dueDateFor(weddingDate: Date, daysBefore: number | null) {
	const due = new Date(weddingDate);
	due.setHours(0, 0, 0, 0);
	due.setDate(due.getDate() - (daysBefore ?? 0));
	return due;
}

/** MySQL DATE -> 'YYYY-MM-DD', driver-agnostic. */
export function toDateInput(value: unknown): string {
	if (!value) return '';
	if (value instanceof Date) {
		const m = `${value.getMonth() + 1}`.padStart(2, '0');
		const d = `${value.getDate()}`.padStart(2, '0');
		return `${value.getFullYear()}-${m}-${d}`;
	}
	return String(value).slice(0, 10);
}
