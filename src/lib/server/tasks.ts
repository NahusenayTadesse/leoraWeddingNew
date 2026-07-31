import { db } from '$lib/server/db';
import { weddingTasks, taskTemplates } from '$lib/server/db/schema';
import { and, asc, eq } from 'drizzle-orm';

export async function listTasks(weddingId: number) {
	return db
		.select()
		.from(weddingTasks)
		.where(eq(weddingTasks.weddingId, weddingId))
		.orderBy(asc(weddingTasks.dueDate), asc(weddingTasks.id));
}

export async function assertTaskOwnership(taskId: number, weddingId: number) {
	const [row] = await db
		.select({ id: weddingTasks.id })
		.from(weddingTasks)
		.where(and(eq(weddingTasks.id, taskId), eq(weddingTasks.weddingId, weddingId)))
		.limit(1);

	return !!row;
}

export async function listTaskTemplates() {
	return db
		.select()
		.from(taskTemplates)
		.orderBy(asc(taskTemplates.daysBeforeWedding));
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