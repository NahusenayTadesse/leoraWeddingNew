import { desc, eq } from 'drizzle-orm';
import { z } from 'zod/v4';
import { db } from '$lib/server/db';
import { contactMessages } from '$lib/server/db/schema';
import { parse, ok } from '$lib/server/adminAction';
import { audit } from '$lib/server/auditLog';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => ({
	rows: await db.select().from(contactMessages).orderBy(desc(contactMessages.createdAt)).limit(500)
});

export const actions = {
	remove: async (event) => {
		const p = await parse(event.request, z.object({ id: z.coerce.number().int().positive() }));
		if ('error' in p) return p.error;
		await db.delete(contactMessages).where(eq(contactMessages.id, p.data.id));
		await audit(event, 'message.delete', 'contact_message', p.data.id);
		return ok('Message deleted');
	}
} satisfies Actions;
