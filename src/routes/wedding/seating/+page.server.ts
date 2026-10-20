import { z } from 'zod/v4';
import { requireCoupleAndWedding } from '$lib/server/weddings';
import { getCoupleByUserId } from '$lib/server/couples';
import { addTables, removeTable, seatGuest, seatingOverview, updateTable } from '$lib/server/planner';
import { parse, ok, bad } from '$lib/server/adminAction';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const couple = await getCoupleByUserId(locals.user!.id);
	return couple ? await seatingOverview(couple.id) : { plan: null, tables: [], unseated: [] };
};

const id = z.coerce.number().int().positive();

export const actions = {
	addTables: async ({ request, locals }) => {
		const { couple } = await requireCoupleAndWedding(locals);
		const p = await parse(
			request,
			z.object({
				count: z.coerce.number().int().min(1).max(50),
				capacity: z.coerce.number().int().min(1).max(50),
				prefix: z.string().trim().max(30).default('Table')
			})
		);
		if ('error' in p) return p.error;
		await addTables(couple.id, p.data.count, p.data.capacity, p.data.prefix || 'Table');
		return ok(`${p.data.count} table${p.data.count === 1 ? '' : 's'} added`);
	},
	updateTable: async ({ request, locals }) => {
		const { couple } = await requireCoupleAndWedding(locals);
		const p = await parse(
			request,
			z.object({ id, name: z.string().trim().min(1).max(50), capacity: z.coerce.number().int().min(1).max(50) })
		);
		if ('error' in p) return p.error;
		if (!(await updateTable(couple.id, p.data.id, p.data.name, p.data.capacity))) return bad('Table not found', 404);
		return ok('Table saved');
	},
	removeTable: async ({ request, locals }) => {
		const { couple } = await requireCoupleAndWedding(locals);
		const p = await parse(request, z.object({ id }));
		if ('error' in p) return p.error;
		if (!(await removeTable(couple.id, p.data.id))) return bad('Table not found', 404);
		return ok('Table removed');
	},
	seat: async ({ request, locals }) => {
		const { couple } = await requireCoupleAndWedding(locals);
		const p = await parse(
			request,
			z.object({
				guestId: id,
				tableId: z.preprocess((v) => (v === '' || v === undefined ? null : v), id.nullable())
			})
		);
		if ('error' in p) return p.error;
		if (!(await seatGuest(couple.id, p.data.guestId, p.data.tableId))) return bad('Guest or table not found', 404);
		return ok(p.data.tableId ? 'Guest seated' : 'Guest unseated');
	}
} satisfies Actions;
