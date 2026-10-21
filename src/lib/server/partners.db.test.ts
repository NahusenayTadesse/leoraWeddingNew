import { beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { couples } from '$lib/server/db/schema';
import { getCoupleByUserId } from '$lib/server/couples';
import { joinCouple, makeInviteCode, removePartner, resetInvite } from '$lib/server/partners';
import { makeCoupleWithWedding, makeUser, makeVendor, resetDb } from '$lib/server/testing/db';

beforeEach(resetDb);

const inviteOf = async (coupleId: number) =>
	(await db.select().from(couples).where(eq(couples.id, coupleId)))[0].inviteCode;

/** What couple signup does: an account plus an empty workspace. */
async function signedUpPartner() {
	const u = await makeUser('Dawit', 2);
	await db
		.insert(couples)
		.values({ partner1UserId: u.id, inviteCode: makeInviteCode(), slug: `s-${u.id.slice(0, 8)}` });
	return u;
}

describe('partner invites', () => {
	it('a new partner joins, and the empty workspace from their signup is retired', async () => {
		const host = await makeCoupleWithWedding();
		const partner = await signedUpPartner();

		expect(await joinCouple(partner.id, await inviteOf(host.coupleId))).toEqual({
			ok: true,
			coupleId: host.coupleId
		});
		expect((await getCoupleByUserId(partner.id))?.id).toBe(host.coupleId);
	});

	it('someone with real planning of their own is not merged away', async () => {
		const host = await makeCoupleWithWedding();
		const other = await makeCoupleWithWedding();
		expect(await joinCouple(other.userId, await inviteOf(host.coupleId))).toEqual({
			ok: false,
			reason: 'has_workspace'
		});
		expect((await getCoupleByUserId(other.userId))?.id).toBe(other.coupleId);
	});

	it('only two partners, no vendors, no stale links', async () => {
		const host = await makeCoupleWithWedding();
		const code = await inviteOf(host.coupleId);
		const first = await signedUpPartner();
		await joinCouple(first.id, code);

		const second = await signedUpPartner();
		expect(await joinCouple(second.id, code)).toEqual({ ok: false, reason: 'full' });
		expect(await joinCouple(host.userId, code)).toEqual({ ok: false, reason: 'already_member' });

		const vendor = await makeVendor();
		const other = await makeCoupleWithWedding();
		expect(await joinCouple(vendor.userId, await inviteOf(other.coupleId))).toEqual({
			ok: false,
			reason: 'vendor_account'
		});

		expect(await resetInvite(other.coupleId, other.userId)).toBeTruthy();
		const late = await signedUpPartner();
		expect(await joinCouple(late.id, code.replace(/./, 'Z') + 'X')).toEqual({
			ok: false,
			reason: 'invalid'
		});
	});

	it('partner 1 can remove partner 2, which also replaces the link', async () => {
		const host = await makeCoupleWithWedding();
		const code = await inviteOf(host.coupleId);
		const partner = await signedUpPartner();
		await joinCouple(partner.id, code);

		expect(await removePartner(host.coupleId, partner.id)).toBe(false); // not partner 1
		expect(await removePartner(host.coupleId, host.userId)).toBe(true);
		expect(await getCoupleByUserId(partner.id)).toBeNull();
		expect(await inviteOf(host.coupleId)).not.toBe(code);
	});
});
