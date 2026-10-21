import { redirect } from '@sveltejs/kit';
import { and, desc, eq } from 'drizzle-orm';
import { z } from 'zod/v4';
import { db } from '$lib/server/db';
import { notifications } from '$lib/server/db/schema';
import { parse, ok } from '@nahu/admin-kit/server/actionResults';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	if (!locals.user) redirect(303, `/login?redirectTo=${encodeURIComponent(url.pathname)}`);
	const rows = await db
		.select()
		.from(notifications)
		.where(eq(notifications.userId, locals.user.id))
		.orderBy(desc(notifications.createdAt))
		.limit(100);
	return {
		items: rows.map((n) => ({
			id: n.id,
			title: n.title,
			body: n.body,
			isRead: n.isRead,
			createdAt: n.createdAt,
			link: (n.data as { link?: string } | null)?.link ?? null
		}))
	};
};

export const actions = {
	/** Opens a notification: marks it read, then goes where it points (same-site paths only). */
	open: async ({ request, locals }) => {
		if (!locals.user) redirect(303, '/login');
		const p = await parse(request, z.object({ id: z.coerce.number().int().positive() }));
		if ('error' in p) return p.error;
		const [row] = await db
			.select({ data: notifications.data })
			.from(notifications)
			.where(and(eq(notifications.id, p.data.id), eq(notifications.userId, locals.user.id)));
		await db
			.update(notifications)
			.set({ isRead: true })
			.where(and(eq(notifications.id, p.data.id), eq(notifications.userId, locals.user.id)));
		const link = (row?.data as { link?: string } | null)?.link;
		if (link && link.startsWith('/') && !link.startsWith('//')) redirect(303, link);
		return ok('Marked as read');
	},
	readAll: async ({ locals }) => {
		if (!locals.user) redirect(303, '/login');
		await db
			.update(notifications)
			.set({ isRead: true })
			.where(and(eq(notifications.userId, locals.user.id), eq(notifications.isRead, false)));
		return ok('All caught up');
	}
} satisfies Actions;
