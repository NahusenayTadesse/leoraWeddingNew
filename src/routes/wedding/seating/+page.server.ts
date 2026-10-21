import { z } from 'zod/v4';
import { requireCoupleAndWedding } from '$lib/server/weddings';
import { getCoupleByUserId } from '$lib/server/couples';
import {
	addTables,
	removeTable,
	seatGuest,
	seatingOverview,
	updateTable
} from '$lib/server/planner';
import { parse, ok, bad } from '@nahu/admin-kit/server/actionResults';
import type { Actions, PageServerLoad } from './$types';
import { m } from '$lib/paraglide/messages.js';

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
		return ok(m.srv_tables_added({ count: p.data.count }));
	},
	updateTable: async ({ request, locals }) => {
		const { couple } = await requireCoupleAndWedding(locals);
		const p = await parse(
			request,
			z.object({
				id,
				name: z.string().trim().min(1).max(50),
				capacity: z.coerce.number().int().min(1).max(50)
			})
		);
		if ('error' in p) return p.error;
		if (!(await updateTable(couple.id, p.data.id, p.data.name, p.data.capacity)))
			return bad(m.srv_table_not_found(), 404);
		return ok(m.srv_table_saved());
	},
	removeTable: async ({ request, locals }) => {
		const { couple } = await requireCoupleAndWedding(locals);
		const p = await parse(request, z.object({ id }));
		if ('error' in p) return p.error;
		if (!(await removeTable(couple.id, p.data.id))) return bad(m.srv_table_not_found(), 404);
		return ok(m.srv_table_removed());
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
		if (!(await seatGuest(couple.id, p.data.guestId, p.data.tableId)))
			return bad(m.srv_seat_not_found(), 404);
		return ok(p.data.tableId ? m.srv_guest_seated() : m.srv_guest_unseated());
	}
} satisfies Actions;
