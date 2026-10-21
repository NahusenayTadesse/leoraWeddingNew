import { beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import type { RequestEvent } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { vendorServices } from '$lib/server/db/schema';
import { load, actions } from '../../routes/vendor-dashboard/services/+page.server';
import { makeVendor, resetDb } from '$lib/server/testing/db';

beforeEach(resetDb);

/** A vendor's request to the services page: their session, and form fields. */
function asVendor(userId: string, fields: Record<string, string> = {}) {
	const body = new FormData();
	for (const [k, v] of Object.entries(fields)) body.set(k, v);
	return {
		locals: { user: { id: userId } },
		request: new Request('http://localhost/vendor-dashboard/services', { method: 'POST', body }),
		url: new URL('http://localhost/vendor-dashboard/services'),
		params: {},
		getClientAddress: () => '127.0.0.1'
	} as unknown as RequestEvent & Parameters<typeof load>[0];
}

const status = (result: unknown) => (result as { status?: number }).status ?? 200;

describe('vendor services (admin-kit contentCrud with scope)', () => {
	it('a vendor adds, lists, edits and deletes only their own services', async () => {
		const mesk = await makeVendor('Mesk Studio');
		const other = await makeVendor('Other Studio');

		await actions.add(asVendor(mesk.userId, { title: 'Wedding photography', currency: 'ETB' }));
		await actions.add(asVendor(other.userId, { title: 'Video', currency: 'ETB' }));

		const rows = (await load(asVendor(mesk.userId))).rows;
		expect(rows.map((r) => r.title)).toEqual(['Wedding photography']);
		const [theirs] = await db
			.select()
			.from(vendorServices)
			.where(eq(vendorServices.vendorId, other.id));

		// Editing or deleting someone else's row finds nothing.
		const edit = await actions.edit(
			asVendor(mesk.userId, { id: String(theirs.id), title: 'Hijacked', currency: 'ETB' })
		);
		expect(status(edit)).toBe(404);
		const del = await actions.delete(asVendor(mesk.userId, { id: String(theirs.id) }));
		expect(status(del)).toBe(404);
		const [still] = await db.select().from(vendorServices).where(eq(vendorServices.id, theirs.id));
		expect(still.title).toBe('Video');
		expect(still.deletedAt).toBeNull();

		// Their own: allowed, and the delete is a soft one.
		const mine = rows[0];
		expect(status(await actions.delete(asVendor(mesk.userId, { id: String(mine.id) })))).toBe(200);
		expect((await load(asVendor(mesk.userId))).rows).toHaveLength(0);
		const [gone] = await db.select().from(vendorServices).where(eq(vendorServices.id, mine.id));
		expect(gone.deletedAt).not.toBeNull();
	});
});
