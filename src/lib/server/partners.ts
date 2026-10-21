/**
 * The second partner joins the couple's workspace through a link carrying `couples.invite_code`.
 * Both partners then share everything; partner 1 can make a new link (the old one stops working)
 * or remove partner 2.
 *
 * Couple signup always creates a workspace, so someone who signs up from an invite already has an
 * empty one. Joining replaces it only while it is still empty (no wedding set up yet); a workspace
 * with real planning in it is never thrown away.
 */
import { randomBytes } from 'node:crypto';
import { and, eq, isNull, or } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { couples, vendors, weddingPlans } from '$lib/server/db/schema';
import { notify } from '$lib/server/notify';

/** Carries an invite through signup and email verification. */
export const INVITE_COOKIE = 'leora_invite';

/** No 0/O or 1/I: a code may be read aloud. */
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** 12 characters from 32: about 60 bits, not guessable. */
export function makeInviteCode(): string {
	return Array.from(randomBytes(12), (b) => ALPHABET[b % ALPHABET.length]).join('');
}

export async function findCoupleByInvite(code: string) {
	if (!/^[A-Za-z0-9]{6,20}$/.test(code)) return null;
	const [row] = await db
		.select({
			id: couples.id,
			brideName: couples.brideName,
			groomName: couples.groomName,
			partner1UserId: couples.partner1UserId,
			partner2UserId: couples.partner2UserId
		})
		.from(couples)
		.where(and(eq(couples.inviteCode, code), isNull(couples.deletedAt)))
		.limit(1);
	return row ?? null;
}

export type JoinOutcome =
	| { ok: true; coupleId: number }
	| {
			ok: false;
			reason: 'invalid' | 'already_member' | 'full' | 'has_workspace' | 'vendor_account';
	  };

export async function joinCouple(userId: string, code: string): Promise<JoinOutcome> {
	const outcome = await db.transaction(async (tx) => {
		const [target] = await tx
			.select()
			.from(couples)
			.where(and(eq(couples.inviteCode, code), isNull(couples.deletedAt)))
			.for('update');
		if (!target) return { ok: false, reason: 'invalid' } as const;
		if (target.partner1UserId === userId || target.partner2UserId === userId) {
			return { ok: false, reason: 'already_member' } as const;
		}
		if (target.partner2UserId) return { ok: false, reason: 'full' } as const;

		const [vendor] = await tx
			.select({ id: vendors.id })
			.from(vendors)
			.where(and(eq(vendors.userId, userId), isNull(vendors.deletedAt)))
			.limit(1);
		if (vendor) return { ok: false, reason: 'vendor_account' } as const;

		const [own] = await tx
			.select()
			.from(couples)
			.where(
				and(
					or(eq(couples.partner1UserId, userId), eq(couples.partner2UserId, userId)),
					isNull(couples.deletedAt)
				)
			)
			.for('update');
		if (own) {
			const [plan] = await tx
				.select({ id: weddingPlans.id })
				.from(weddingPlans)
				.where(and(eq(weddingPlans.coupleId, own.id), isNull(weddingPlans.deletedAt)))
				.limit(1);
			if (own.partner2UserId || plan) return { ok: false, reason: 'has_workspace' } as const;
			// The empty workspace their own signup made: retire it.
			await tx
				.update(couples)
				.set({ deletedAt: new Date(), deletedBy: userId })
				.where(eq(couples.id, own.id));
		}

		await tx
			.update(couples)
			.set({ partner2UserId: userId, updatedBy: userId })
			.where(eq(couples.id, target.id));
		return { ok: true, coupleId: target.id, partner1: target.partner1UserId } as const;
	});

	if (!outcome.ok) return outcome;
	await notify(outcome.partner1, {
		type: 'partner_joined',
		title: 'Your partner joined',
		body: 'You now plan the wedding together: guests, budget, bookings and messages are shared.',
		link: '/wedding/profile'
	});
	return { ok: true, coupleId: outcome.coupleId };
}

/** A new invite link; the old one stops working. Partner 1 only. */
export async function resetInvite(coupleId: number, userId: string) {
	const code = makeInviteCode();
	const [res] = await db
		.update(couples)
		.set({ inviteCode: code, updatedBy: userId })
		.where(and(eq(couples.id, coupleId), eq(couples.partner1UserId, userId)));
	return res.affectedRows ? code : null;
}

/** Takes partner 2 out of the workspace, and makes a fresh link so the old one can't bring them back. */
export async function removePartner(coupleId: number, userId: string) {
	const [res] = await db
		.update(couples)
		.set({ partner2UserId: null, inviteCode: makeInviteCode(), updatedBy: userId })
		.where(and(eq(couples.id, coupleId), eq(couples.partner1UserId, userId)));
	return res.affectedRows > 0;
}
