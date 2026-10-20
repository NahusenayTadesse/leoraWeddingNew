<script lang="ts">
	import type { Snippet } from 'svelte';
	import { CalendarHeartIcon, MapPinIcon, NavigationIcon } from '@lucide/svelte';
	import { assetUrl } from '$lib/assetUrl';
	import { m } from '$lib/paraglide/messages.js';
	import { getLocale } from '$lib/paraglide/runtime';

	type Event = {
		id: number;
		eventType: string;
		eventName: string;
		eventDate: Date | string | null;
		venueName: string | null;
		venueAddress: string | null;
		city: string | null;
	};

	/**
	 * The invitation as guests see it, in one of three themes. Shared by the public card, the
	 * guest's personal copy (which passes `children` for the RSVP and entry pass) and the
	 * couple's preview in the editor.
	 */
	type Props = {
		theme: 'habesha' | 'royal' | 'garden';
		brideName: string | null;
		groomName: string | null;
		headline: string | null;
		message: string | null;
		coverImage: string | null;
		countdownTo: Date | string | null;
		city: string | null;
		mapUrl: string | null;
		events: Event[];
		guestName?: string | null;
		children?: Snippet;
	};

	let {
		theme,
		brideName,
		groomName,
		headline,
		message,
		coverImage,
		countdownTo,
		city,
		mapUrl,
		events,
		guestName = null,
		children
	}: Props = $props();

	const locale = getLocale() === 'am' ? 'am-ET' : 'en-GB';
	const TZ = 'Africa/Addis_Ababa';

	let now = $state(Date.now());
	$effect(() => {
		if (!countdownTo) return;
		const id = setInterval(() => (now = Date.now()), 1000);
		return () => clearInterval(id);
	});

	const target = $derived(countdownTo ? new Date(countdownTo).getTime() : null);
	const left = $derived.by(() => {
		if (target === null) return null;
		const diff = target - now;
		if (diff <= 0) return { passed: true, today: diff > -24 * 3600_000 };
		return {
			passed: false,
			days: Math.floor(diff / 86_400_000),
			hours: Math.floor(diff / 3_600_000) % 24,
			minutes: Math.floor(diff / 60_000) % 60,
			seconds: Math.floor(diff / 1000) % 60
		};
	});

	const longDate = $derived(
		target
			? new Date(target).toLocaleDateString(locale, {
					weekday: 'long',
					day: 'numeric',
					month: 'long',
					year: 'numeric',
					timeZone: TZ
				})
			: null
	);
	const when = (d: Date | string | null) =>
		d
			? new Date(d).toLocaleString(locale, {
					weekday: 'short',
					day: 'numeric',
					month: 'short',
					hour: '2-digit',
					minute: '2-digit',
					timeZone: TZ
				})
			: '';

	const names = $derived([brideName, groomName].filter(Boolean));
	const venue = $derived(events.find((e) => e.eventType === 'ceremony') ?? events[0] ?? null);
	const mapsLink = $derived(
		mapUrl ||
			(venue?.venueName || venue?.venueAddress
				? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
						[venue.venueName, venue.venueAddress, venue.city].filter(Boolean).join(', ')
					)}`
				: null)
	);
</script>

<article class="invite theme-{theme}">
	<div class="band" aria-hidden="true"></div>

	{#if coverImage}
		<img class="cover" src={assetUrl(coverImage)} alt="" />
	{/if}

	<header class="hero">
		{#if guestName}
			<p class="dear">{m.inv_dear({ name: guestName })}</p>
		{/if}
		<h1 class="names">
			{#if names.length === 2}
				<span>{names[0]}</span>
				<span class="amp">&amp;</span>
				<span>{names[1]}</span>
			{:else}
				{names[0] ?? ''}
			{/if}
		</h1>
		<p class="headline">{headline || m.inv_default_headline()}</p>

		{#if longDate}
			<p class="date"><CalendarHeartIcon class="size-4" aria-hidden="true" />{longDate}</p>
		{/if}
		{#if city}
			<p class="city"><MapPinIcon class="size-4" aria-hidden="true" />{city}</p>
		{/if}
	</header>

	{#if left}
		{#if left.passed}
			<p class="countdown-done">{left.today ? m.inv_today() : m.inv_celebrated()}</p>
		{:else}
			<div class="countdown" role="timer" aria-live="off">
				{#each [[left.days, m.inv_days()], [left.hours, m.inv_hours()], [left.minutes, m.inv_minutes()], [left.seconds, m.inv_seconds()]] as [value, label] (label)}
					<div class="unit">
						<span class="value">{value}</span>
						<span class="label">{label}</span>
					</div>
				{/each}
			</div>
		{/if}
	{/if}

	{#if message}
		<p class="message">{message}</p>
	{/if}

	{#if events.length}
		<section class="schedule">
			<h2>{m.inv_schedule()}</h2>
			<ol>
				{#each events as e (e.id)}
					<li>
						<span class="ev-name">{e.eventName}</span>
						{#if e.eventDate}<span class="ev-when">{when(e.eventDate)}</span>{/if}
						{#if e.venueName || e.city}
							<span class="ev-where"
								>{[e.venueName, e.venueAddress, e.city].filter(Boolean).join(', ')}</span
							>
						{/if}
					</li>
				{/each}
			</ol>
		</section>
	{/if}

	{#if mapsLink}
		<a class="directions" href={mapsLink} target="_blank" rel="noopener noreferrer">
			<NavigationIcon class="size-4" aria-hidden="true" />{m.inv_directions()}
		</a>
	{/if}

	{#if children}
		<div class="slot">{@render children()}</div>
	{/if}

	<p class="made-with"><a href="/">{m.inv_made_with()}</a></p>
	<div class="band" aria-hidden="true"></div>
</article>

<style>
	.invite {
		--bg: #faf7f2;
		--ink: #2b1d0e;
		--muted: #6b5b45;
		--accent: #b8860b;
		--panel: rgb(255 255 255 / 0.7);
		max-width: 560px;
		margin: 0 auto;
		background: var(--bg);
		color: var(--ink);
		border-radius: 24px;
		overflow: hidden;
		box-shadow: 0 20px 60px rgb(0 0 0 / 0.18);
		text-align: center;
	}
	/* Woven tibeb-style border: the green, yellow and red bands of a habesha kemis hem. */
	.theme-habesha .band {
		height: 14px;
		background: repeating-linear-gradient(
			90deg,
			#1f6f43 0 14px,
			#d4af37 14px 20px,
			#b3261e 20px 34px,
			#d4af37 34px 40px
		);
	}
	.theme-royal {
		--bg: #0b1f3a;
		--ink: #f6efe1;
		--muted: #c9bfa8;
		--accent: #d4af37;
		--panel: rgb(255 255 255 / 0.06);
	}
	.theme-royal .band {
		height: 6px;
		background: linear-gradient(90deg, transparent, #d4af37, transparent);
	}
	.theme-garden {
		--bg: #f4f7f1;
		--ink: #24331f;
		--muted: #5b6b55;
		--accent: #5b7f5a;
		--panel: rgb(255 255 255 / 0.75);
	}
	.theme-garden .band {
		height: 10px;
		background: linear-gradient(90deg, #e8b4b8, #a8c69f, #e8b4b8);
	}

	.cover {
		width: 100%;
		max-height: 320px;
		object-fit: cover;
	}
	.hero {
		padding: 36px 28px 12px;
	}
	.dear {
		font-style: italic;
		color: var(--muted);
		margin-bottom: 12px;
	}
	.names {
		font-family: var(--font-display);
		font-size: clamp(2rem, 8vw, 3rem);
		font-weight: 800;
		line-height: 1.1;
		display: flex;
		flex-direction: column;
		gap: 4px;
	}
	.amp {
		color: var(--accent);
		font-size: 0.7em;
	}
	.headline {
		margin: 16px auto 0;
		max-width: 26rem;
		color: var(--muted);
		font-size: 0.95rem;
	}
	.date,
	.city {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 6px;
		margin-top: 14px;
		font-weight: 600;
	}
	.city {
		margin-top: 4px;
		font-weight: 500;
		color: var(--muted);
	}
	.countdown {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 8px;
		padding: 16px 24px;
	}
	.unit {
		background: var(--panel);
		border: 1px solid color-mix(in srgb, var(--accent) 30%, transparent);
		border-radius: 14px;
		padding: 10px 0;
	}
	.value {
		display: block;
		font-family: var(--font-display);
		font-size: 1.5rem;
		font-weight: 800;
		font-variant-numeric: tabular-nums;
	}
	.label {
		font-size: 0.65rem;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--muted);
	}
	.countdown-done {
		padding: 16px;
		font-weight: 600;
		color: var(--accent);
	}
	.message {
		padding: 8px 32px 0;
		white-space: pre-line;
		line-height: 1.6;
	}
	.schedule {
		margin: 24px 24px 0;
		padding: 18px;
		background: var(--panel);
		border-radius: 16px;
		text-align: left;
	}
	.schedule h2 {
		font-size: 0.75rem;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--accent);
		margin-bottom: 10px;
		text-align: center;
	}
	.schedule li {
		display: grid;
		gap: 2px;
		padding: 10px 0;
		border-top: 1px solid color-mix(in srgb, var(--ink) 12%, transparent);
	}
	.schedule li:first-child {
		border-top: 0;
	}
	.ev-name {
		font-weight: 700;
	}
	.ev-when,
	.ev-where {
		font-size: 0.85rem;
		color: var(--muted);
	}
	.directions {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		margin-top: 20px;
		padding: 10px 18px;
		border-radius: 999px;
		border: 1px solid var(--accent);
		color: var(--accent);
		font-weight: 600;
	}
	.slot {
		margin: 24px;
		text-align: left;
	}
	.made-with {
		padding: 18px 0;
		font-size: 0.75rem;
		color: var(--muted);
	}
</style>
