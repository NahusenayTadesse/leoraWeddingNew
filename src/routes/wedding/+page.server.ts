import { db } from '$lib/server/db';
import {
	weddings,
	couples,
	weddingBudgetItems,
	weddingGuests,
	weddingTasks
} from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const weddingId = 5;
	if (isNaN(weddingId)) {
		throw error(400, 'Invalid wedding ID');
	}

	const [wedding] = await db.select().from(weddings).where(eq(weddings.id, weddingId)).limit(1);

	if (!wedding) {
		throw error(404, 'Wedding not found');
	}

	const [couple] = await db.select().from(couples).where(eq(couples.id, wedding.coupleId)).limit(1);

	if (!couple) {
		throw error(404, 'Couple not found');
	}

	const [budgetItems, guests, tasks] = await Promise.all([
		db.select().from(weddingBudgetItems).where(eq(weddingBudgetItems.weddingId, weddingId)),

		db.select().from(weddingGuests).where(eq(weddingGuests.weddingId, weddingId)),

		db
			.select()
			.from(weddingTasks)
			.where(eq(weddingTasks.weddingId, weddingId))
			.orderBy(weddingTasks.dueDate)
	]);

	const totalPlanned = budgetItems.reduce((sum, item) => sum + Number(item.plannedAmount ?? 0), 0);
	const totalActual = budgetItems.reduce((sum, item) => sum + Number(item.actualAmount ?? 0), 0);

	const confirmedGuests = guests.filter((g) => g.isConfirmed).length;
	const completedTasks = tasks.filter((t) => t.isConfirmed).length;

	const daysUntilWedding = wedding.weddingDate
		? Math.ceil((new Date(wedding.weddingDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
		: null;

	return {
		wedding,
		couple,
		budgetItems,
		guests,
		tasks,
		stats: {
			totalPlanned,
			totalActual,
			confirmedGuests,
			totalGuests: guests.length,
			completedTasks,
			totalTasks: tasks.length,
			daysUntilWedding
		}
	};
};
