import { redirect } from '@sveltejs/kit';
import { z } from 'zod/v4';
import { saveUploadedFile, UploadRefused } from '@nahu/admin-kit/server/files';
import { getCoupleByUserId } from '$lib/server/couples';
import {
	createBoard,
	deleteBoard,
	listBoards,
	removeItem,
	saveItem,
	shareBoard
} from '$lib/server/boards';
import { parse, ok, bad } from '@nahu/admin-kit/server/actionResults';
import { m } from '$lib/paraglide/messages.js';
import type { Actions, PageServerLoad } from './$types';

async function requireCouple(locals: App.Locals) {
	const couple = await getCoupleByUserId(locals.user!.id);
	if (!couple) redirect(302, '/wedding/profile');
	return couple;
}

const id = z.coerce.number().int().positive();

export const load: PageServerLoad = async ({ locals, url }) => {
	const couple = await requireCouple(locals);
	const boards = await listBoards(couple.id);
	return {
		boards: boards.map((b) => ({
			...b,
			shareUrl: b.shareToken ? `${url.origin}/boards/${b.shareToken}` : null
		}))
	};
};

export const actions = {
	create: async ({ request, locals }) => {
		const couple = await requireCouple(locals);
		const p = await parse(request, z.object({ name: z.string().trim().min(1).max(80) }));
		if ('error' in p) return p.error;
		return (await createBoard(couple.id, p.data.name)) ? ok(p.data.name) : bad(m.srv_board_full());
	},

	remove: async ({ request, locals }) => {
		const couple = await requireCouple(locals);
		const p = await parse(request, z.object({ id }));
		if ('error' in p) return p.error;
		await deleteBoard(couple.id, p.data.id);
		return ok(m.boards_delete());
	},

	removeItem: async ({ request, locals }) => {
		const couple = await requireCouple(locals);
		const p = await parse(request, z.object({ id }));
		if ('error' in p) return p.error;
		await removeItem(couple.id, p.data.id);
		return ok(m.boards_remove());
	},

	upload: async ({ request, locals }) => {
		const couple = await requireCouple(locals);
		const form = await request.formData();
		const boardId = id.safeParse(form.get('boardId'));
		const file = form.get('photo');
		if (!boardId.success || !(file instanceof File) || !file.type.startsWith('image/'))
			return bad(m.wall_photo_needed());
		let image: string;
		try {
			image = await saveUploadedFile(file);
		} catch (err) {
			if (err instanceof UploadRefused) return bad(err.message);
			throw err;
		}
		const saved = await saveItem(couple.id, { boardId: boardId.data, image }, m.boards_default());
		return saved ? ok(m.boards_saved()) : bad(m.srv_board_full());
	},

	share: async ({ request, locals }) => {
		const couple = await requireCouple(locals);
		const p = await parse(request, z.object({ id }));
		if ('error' in p) return p.error;
		const token = await shareBoard(couple.id, p.data.id);
		return token ? ok(m.partner_copied()) : bad(m.srv_not_yours(), 403);
	}
} satisfies Actions;
