/**
 * The Leora Card: a couple's digital invitation.
 *
 *   /i/<slug>           the card itself (once published; the couple can always preview it)
 *   /i/<slug>/<token>   a guest's personal copy: their name, RSVP form and check-in QR code
 *
 * A guest can only RSVP or be checked in through their own token, so a shared card link alone
 * never lets strangers add themselves to the guest list.
 */
import { randomBytes } from 'node:crypto';
import { and, asc, desc, eq, inArray, isNull, or, sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import {
	couples,
	guestLists,
	subscriptionPlans,
	subscriptions,
	weddingCards,
	weddingEvents,
	weddingPlans
} from '$lib/server/db/schema';
import { notify } from '$lib/server/notify';

/** Plans that include publishing a card (see the /card and /pricing pages). */
export const CARD_PLANS = ['golden', 'platinum'];

export const CARD_THEMES = ['habesha', 'royal', 'garden'] as const;
export type CardTheme = (typeof CARD_THEMES)[number];

export class CardRefused extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'CardRefused';
	}
}

export async function getCard(coupleId: number) {
	const [row] = await db.select().from(weddingCards).where(eq(weddingCards.coupleId, coupleId));
	return row ?? null;
}

/** Whether the couple's active plan includes publishing a card. */
export async function canPublish(coupleId: number): Promise<boolean> {
	const [row] = await db
		.select({ slug: subscriptionPlans.slug })
		.from(subscriptions)
		.innerJoin(subscriptionPlans, eq(subscriptionPlans.id, subscriptions.subscriptionPlanId))
		.where(
			and(
				eq(subscriptions.coupleId, coupleId),
				eq(subscriptions.status, 'active'),
				inArray(subscriptionPlans.slug, CARD_PLANS)
			)
		)
		.limit(1);
	return !!row;
}

export type CardInput = {
	theme: CardTheme;
	headline: string | null;
	message: string | null;
	rsvpDeadline: string | null;
	mapUrl: string | null;
	coverImage?: string | null;
};

export async function saveCard(coupleId: number, input: CardInput) {
	const values = { ...input };
	if (values.coverImage === undefined) delete values.coverImage;
	await db
		.insert(weddingCards)
		.values({ coupleId, ...values })
		.onDuplicateKeyUpdate({ set: values });
}

/** Publishing needs a plan that includes the card; unpublishing is always allowed. */
export async function setPublished(coupleId: number, published: boolean) {
	if (published && !(await canPublish(coupleId))) {
		throw new CardRefused('Publishing your card is included with the Golden and Platinum plans.');
	}
	await db
		.insert(weddingCards)
		.values({ coupleId, published, publishedAt: published ? new Date() : null })
		.onDuplicateKeyUpdate({
			set: {
				published,
				publishedAt: published ? sql`coalesce(${weddingCards.publishedAt}, now(3))` : null
			}
		});
}

/** 16 URL-safe characters (96 bits): short enough for a QR code, impossible to guess. */
export function newInviteToken() {
	return randomBytes(12).toString('base64url');
}

/** Gives every guest of the couple without a personal link one. Returns how many were added. */
export async function ensureInviteTokens(coupleId: number): Promise<number> {
	const missing = await db
		.select({ id: guestLists.id })
		.from(guestLists)
		.where(
			and(
				eq(guestLists.coupleId, coupleId),
				isNull(guestLists.inviteToken),
				isNull(guestLists.deletedAt)
			)
		);
	for (const g of missing) {
		await db
			.update(guestLists)
			.set({ inviteToken: newInviteToken() })
			.where(eq(guestLists.id, g.id));
	}
	return missing.length;
}

/**
 * Everything a card page shows, by the couple's slug. Unpublished cards are only returned to
 * the couple themselves (`viewerCoupleId`), as a preview.
 */
export async function cardBySlug(slug: string, viewerCoupleId?: number | null) {
	const [couple] = await db
		.select({
			id: couples.id,
			brideName: couples.brideName,
			groomName: couples.groomName,
			partner1: couples.partner1UserId
		})
		.from(couples)
		.where(and(eq(couples.slug, slug), isNull(couples.deletedAt)))
		.limit(1);
	if (!couple) return null;

	const card = await getCard(couple.id);
	const isOwner = viewerCoupleId === couple.id;
	if (!card?.published && !isOwner) return null;

	const [plan, events] = await Promise.all([
		db
			.select({ weddingDate: weddingPlans.weddingDate, city: weddingPlans.city })
			.from(weddingPlans)
			.where(and(eq(weddingPlans.coupleId, couple.id), isNull(weddingPlans.deletedAt)))
			.limit(1)
			.then((r) => r[0] ?? null),
		db
			.select({
				id: weddingEvents.id,
				eventType: weddingEvents.eventType,
				eventName: weddingEvents.eventName,
				eventDate: weddingEvents.eventDate,
				venueName: weddingEvents.venueName,
				venueAddress: weddingEvents.venueAddress,
				city: weddingEvents.city
			})
			.from(weddingEvents)
			.where(and(eq(weddingEvents.coupleId, couple.id), isNull(weddingEvents.deletedAt)))
			.orderBy(asc(weddingEvents.eventDate), asc(weddingEvents.sortOrder))
	]);

	const ceremony = events.find((e) => e.eventType === 'ceremony') ?? null;
	// The countdown runs to the ceremony, else the plan's date (4 pm Addis Ababa).
	const countdownTo =
		ceremony?.eventDate ??
		(plan?.weddingDate ? new Date(`${plan.weddingDate}T16:00:00+03:00`) : null);

	return {
		couple: {
			id: couple.id,
			brideName: couple.brideName,
			groomName: couple.groomName,
			partner1: couple.partner1
		},
		card: {
			theme: (card?.theme ?? 'habesha') as CardTheme,
			headline: card?.headline ?? null,
			message: card?.message ?? null,
			coverImage: card?.coverImage ?? null,
			rsvpDeadline: card?.rsvpDeadline ?? null,
			mapUrl: card?.mapUrl ?? null,
			published: card?.published ?? false
		},
		weddingDate: plan?.weddingDate ?? null,
		city: ceremony?.city ?? plan?.city ?? null,
		countdownTo,
		ceremony,
		events,
		isPreview: !card?.published
	};
}

export type CardPage = NonNullable<Awaited<ReturnType<typeof cardBySlug>>>;

/** A guest by their personal token, on that couple's card only. */
export async function guestByToken(coupleId: number, token: string) {
	if (!/^[A-Za-z0-9_-]{8,32}$/.test(token)) return null;
	const [g] = await db
		.select({
			id: guestLists.id,
			fullName: guestLists.fullName,
			plusOnes: guestLists.plusOnes,
			rsvpStatus: guestLists.rsvpStatus,
			rsvpPartySize: guestLists.rsvpPartySize,
			rsvpNote: guestLists.rsvpNote,
			mealPreference: guestLists.mealPreference,
			rsvpAt: guestLists.rsvpAt,
			checkedInAt: guestLists.checkedInAt,
			inviteToken: guestLists.inviteToken
		})
		.from(guestLists)
		.where(
			and(
				eq(guestLists.coupleId, coupleId),
				eq(guestLists.inviteToken, token),
				isNull(guestLists.deletedAt)
			)
		)
		.limit(1);
	return g ?? null;
}

export type RsvpInput = {
	attending: boolean;
	partySize: number;
	mealPreference: string | null;
	note: string | null;
};

/** Records a guest's answer. Party size is capped at the plus-ones the couple allowed. */
export async function submitRsvp(page: CardPage, token: string, input: RsvpInput) {
	if (page.isPreview) throw new CardRefused('This card is not published yet.');
	const guest = await guestByToken(page.couple.id, token);
	if (!guest) throw new CardRefused('This invitation link is not valid.');

	const deadline = page.card.rsvpDeadline;
	if (deadline && new Date(`${deadline}T23:59:59+03:00`) < new Date()) {
		throw new CardRefused(
			'RSVPs for this wedding have closed. Please contact the couple directly.'
		);
	}
	const maxParty = 1 + guest.plusOnes;
	const partySize = input.attending ? Math.min(Math.max(1, input.partySize), maxParty) : 0;

	await db
		.update(guestLists)
		.set({
			rsvpStatus: input.attending ? 'confirmed' : 'declined',
			rsvpPartySize: partySize,
			mealPreference: input.mealPreference,
			rsvpNote: input.note,
			rsvpAt: new Date()
		})
		.where(eq(guestLists.id, guest.id));

	await notify(page.couple.partner1, {
		type: 'rsvp',
		title: input.attending ? `${guest.fullName} is coming` : `${guest.fullName} can't make it`,
		body: input.attending
			? `${guest.fullName} accepted your invitation (party of ${partySize}).`
			: `${guest.fullName} declined your invitation.${input.note ? ` "${input.note}"` : ''}`,
		link: '/wedding/guests',
		email: false
	});
	return { partySize };
}

/** Check-in at the door, by token (from the QR code) or guest id (from the list). */
export async function checkIn(
	coupleId: number,
	who: { token?: string; guestId?: number },
	userId: string
): Promise<{ name: string; alreadyAt: Date | null; partySize: number | null; status: string }> {
	const [g] = await db
		.select({
			id: guestLists.id,
			fullName: guestLists.fullName,
			checkedInAt: guestLists.checkedInAt,
			rsvpPartySize: guestLists.rsvpPartySize,
			rsvpStatus: guestLists.rsvpStatus
		})
		.from(guestLists)
		.where(
			and(
				eq(guestLists.coupleId, coupleId),
				isNull(guestLists.deletedAt),
				who.token ? eq(guestLists.inviteToken, who.token) : eq(guestLists.id, who.guestId ?? 0)
			)
		)
		.limit(1);
	if (!g) throw new CardRefused('This guest is not on your list.');
	if (!g.checkedInAt) {
		await db
			.update(guestLists)
			.set({ checkedInAt: new Date(), checkedInBy: userId })
			.where(eq(guestLists.id, g.id));
	}
	return {
		name: g.fullName,
		alreadyAt: g.checkedInAt,
		partySize: g.rsvpPartySize,
		status: g.rsvpStatus
	};
}

/** The door list: who is expected and who has arrived. */
export function checkInList(coupleId: number) {
	return db
		.select({
			id: guestLists.id,
			fullName: guestLists.fullName,
			side: guestLists.side,
			rsvpStatus: guestLists.rsvpStatus,
			rsvpPartySize: guestLists.rsvpPartySize,
			plusOnes: guestLists.plusOnes,
			checkedInAt: guestLists.checkedInAt
		})
		.from(guestLists)
		.where(
			and(
				eq(guestLists.coupleId, coupleId),
				isNull(guestLists.deletedAt),
				or(eq(guestLists.rsvpStatus, 'confirmed'), eq(guestLists.rsvpStatus, 'pending'))
			)
		)
		.orderBy(desc(sql`${guestLists.checkedInAt} is null`), asc(guestLists.fullName));
}

/** Guests with their personal links, for sharing from the guest list. */
export function inviteList(coupleId: number) {
	return db
		.select({
			id: guestLists.id,
			fullName: guestLists.fullName,
			phone: guestLists.phone,
			inviteToken: guestLists.inviteToken,
			rsvpStatus: guestLists.rsvpStatus,
			rsvpPartySize: guestLists.rsvpPartySize,
			rsvpAt: guestLists.rsvpAt,
			plusOnes: guestLists.plusOnes
		})
		.from(guestLists)
		.where(and(eq(guestLists.coupleId, coupleId), isNull(guestLists.deletedAt)))
		.orderBy(asc(guestLists.fullName));
}
