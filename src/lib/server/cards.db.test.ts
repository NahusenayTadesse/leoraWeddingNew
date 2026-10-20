import { beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import {
	couples,
	guestLists,
	notifications,
	subscriptionPlans,
	subscriptions
} from '$lib/server/db/schema';
import { makeCoupleWithWedding, resetDb } from '$lib/server/testing/db';
import {
	CardRefused,
	cardBySlug,
	checkIn,
	ensureInviteTokens,
	newInviteToken,
	saveCard,
	setPublished,
	submitRsvp
} from './cards';

async function coupleWithGuest(plusOnes = 1) {
	const couple = await makeCoupleWithWedding();
	const token = newInviteToken();
	const [g] = await db
		.insert(guestLists)
		.values({ coupleId: couple.coupleId, fullName: 'Abebe Kebede', plusOnes, inviteToken: token })
		.$returningId();
	const [c] = await db
		.select({ slug: couples.slug })
		.from(couples)
		.where(eq(couples.id, couple.coupleId));
	return { ...couple, slug: c.slug!, token, guestId: g.id };
}

async function subscribe(coupleId: number, slug: string) {
	const [plan] = await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.slug, slug));
	await db
		.insert(subscriptions)
		.values({ coupleId, subscriptionPlanId: plan.id, status: 'active' });
}

async function published(plusOnes = 1) {
	const c = await coupleWithGuest(plusOnes);
	await subscribe(c.coupleId, 'golden');
	await setPublished(c.coupleId, true);
	return { ...c, page: (await cardBySlug(c.slug))! };
}

const yes = (partySize: number) => ({
	attending: true,
	partySize,
	mealPreference: null,
	note: null
});

beforeEach(resetDb);

describe('publishing', () => {
	it('needs a Golden or Platinum plan, and hides drafts from everyone but the couple', async () => {
		const c = await coupleWithGuest();
		await saveCard(c.coupleId, {
			theme: 'royal',
			headline: 'Join us',
			message: null,
			rsvpDeadline: null,
			mapUrl: null
		});

		expect(await cardBySlug(c.slug)).toBeNull();
		expect((await cardBySlug(c.slug, c.coupleId))?.isPreview).toBe(true);

		await subscribe(c.coupleId, 'free');
		await expect(setPublished(c.coupleId, true)).rejects.toBeInstanceOf(CardRefused);

		await subscribe(c.coupleId, 'platinum');
		await setPublished(c.coupleId, true);
		const page = await cardBySlug(c.slug);
		expect(page?.card).toMatchObject({ theme: 'royal', headline: 'Join us', published: true });
	});

	it('refuses RSVPs on a preview', async () => {
		const c = await coupleWithGuest();
		const preview = (await cardBySlug(c.slug, c.coupleId))!;
		await expect(submitRsvp(preview, c.token, yes(1))).rejects.toThrow(/not published/);
	});
});

describe('RSVP', () => {
	it('caps the party at the plus-ones allowed and notifies the couple', async () => {
		const c = await published(2);
		expect(await submitRsvp(c.page, c.token, yes(9))).toEqual({ partySize: 3 });

		const [g] = await db.select().from(guestLists).where(eq(guestLists.id, c.guestId));
		expect(g).toMatchObject({ rsvpStatus: 'confirmed', rsvpPartySize: 3 });
		expect(g.rsvpAt).not.toBeNull();
		const [n] = await db.select().from(notifications);
		expect(n.title).toBe('Abebe Kebede is coming');
	});

	it('records a decline with a party of zero', async () => {
		const c = await published();
		await submitRsvp(c.page, c.token, {
			attending: false,
			partySize: 2,
			mealPreference: null,
			note: 'Abroad'
		});
		const [g] = await db.select().from(guestLists).where(eq(guestLists.id, c.guestId));
		expect(g).toMatchObject({ rsvpStatus: 'declined', rsvpPartySize: 0, rsvpNote: 'Abroad' });
	});

	it('refuses unknown tokens, other couples’ tokens and late answers', async () => {
		const c = await published();
		const other = await published();
		await expect(submitRsvp(c.page, 'notarealtoken123', yes(1))).rejects.toThrow(/not valid/);
		await expect(submitRsvp(c.page, other.token, yes(1))).rejects.toThrow(/not valid/);

		await saveCard(c.coupleId, {
			theme: 'habesha',
			headline: null,
			message: null,
			rsvpDeadline: '2020-01-01',
			mapUrl: null
		});
		const late = (await cardBySlug(c.slug))!;
		await expect(submitRsvp(late, c.token, yes(1))).rejects.toThrow(/closed/);
	});
});

describe('invite tokens and check-in', () => {
	it('backfills tokens for guests added before cards existed', async () => {
		const c = await coupleWithGuest();
		await db.insert(guestLists).values({ coupleId: c.coupleId, fullName: 'Old Guest' });
		expect(await ensureInviteTokens(c.coupleId)).toBe(1);
		expect(await ensureInviteTokens(c.coupleId)).toBe(0);
	});

	it('checks a guest in once, by token or id, only for their own couple', async () => {
		const c = await published();
		const other = await published();

		const first = await checkIn(c.coupleId, { token: c.token }, c.userId);
		expect(first).toMatchObject({ name: 'Abebe Kebede', alreadyAt: null });
		const again = await checkIn(c.coupleId, { guestId: c.guestId }, c.userId);
		expect(again.alreadyAt).toBeInstanceOf(Date);

		await expect(checkIn(c.coupleId, { token: other.token }, c.userId)).rejects.toBeInstanceOf(
			CardRefused
		);
		await expect(checkIn(c.coupleId, { guestId: other.guestId }, c.userId)).rejects.toBeInstanceOf(
			CardRefused
		);
	});
});
