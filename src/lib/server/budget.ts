import { db } from '$lib/server/db';
import { weddingBudgetItems, budgetCategories } from '$lib/server/db/schema';
import { and, asc, eq, isNull } from 'drizzle-orm';

export async function listBudgetItems(weddingId: number) {
	const rows = await db
		.select({
			id: weddingBudgetItems.id,
			categoryId: weddingBudgetItems.categoryId,
			categoryName: budgetCategories.name,
			plannedAmount: weddingBudgetItems.plannedAmount,
			actualAmount: weddingBudgetItems.actualAmount,
			notes: weddingBudgetItems.notes
		})
		.from(weddingBudgetItems)
		.innerJoin(budgetCategories, eq(weddingBudgetItems.categoryId, budgetCategories.id))
		.where(eq(weddingBudgetItems.weddingId, weddingId))
		.orderBy(asc(budgetCategories.name));

	// MySQL decimals arrive as strings.
	return rows.map((r) => ({
		...r,
		plannedAmount: Number(r.plannedAmount ?? 0),
		actualAmount: Number(r.actualAmount ?? 0)
	}));
}

export async function listBudgetCategories() {
	return db
		.select({ id: budgetCategories.id, name: budgetCategories.name })
		.from(budgetCategories)
		.where(and(eq(budgetCategories.isActive, true), isNull(budgetCategories.deletedAt)))
		.orderBy(asc(budgetCategories.name));
}

/** Confirms an item belongs to this wedding before mutating it. */
export async function assertItemOwnership(itemId: number, weddingId: number) {
	const [row] = await db
		.select({ id: weddingBudgetItems.id })
		.from(weddingBudgetItems)
		.where(and(eq(weddingBudgetItems.id, itemId), eq(weddingBudgetItems.weddingId, weddingId)))
		.limit(1);

	return !!row;
}