import { db } from '$lib/server/db';
import { budgetItems, budgetCategories } from '$lib/server/db/schema';
import { and, asc, eq, isNull, or } from 'drizzle-orm';

export async function listBudgetItems(coupleId: number) {
	const rows = await db
		.select({
			id: budgetItems.id,
			name: budgetItems.name,
			categoryId: budgetItems.budgetCategoryId,
			categoryName: budgetCategories.name,
			plannedAmount: budgetItems.estimatedCost,
			actualAmount: budgetItems.actualCost,
			notes: budgetItems.notes
		})
		.from(budgetItems)
		.innerJoin(budgetCategories, eq(budgetItems.budgetCategoryId, budgetCategories.id))
		.where(eq(budgetItems.coupleId, coupleId))
		.orderBy(asc(budgetCategories.name));

	// MySQL decimals arrive as strings.
	return rows.map((r) => ({
		...r,
		plannedAmount: Number(r.plannedAmount ?? 0),
		actualAmount: Number(r.actualAmount ?? 0)
	}));
}

/** System categories every couple sees, plus any this couple added themselves. */
export async function listBudgetCategories(coupleId: number) {
	return db
		.select({ id: budgetCategories.id, name: budgetCategories.name })
		.from(budgetCategories)
		.where(
			and(
				or(eq(budgetCategories.isSystem, true), eq(budgetCategories.coupleId, coupleId)),
				eq(budgetCategories.isActive, true),
				isNull(budgetCategories.deletedAt)
			)
		)
		.orderBy(asc(budgetCategories.name));
}

/** Confirms an item belongs to this couple before mutating it. */
export async function assertItemOwnership(itemId: number, coupleId: number) {
	const [row] = await db
		.select({ id: budgetItems.id })
		.from(budgetItems)
		.where(and(eq(budgetItems.id, itemId), eq(budgetItems.coupleId, coupleId)))
		.limit(1);

	return !!row;
}
