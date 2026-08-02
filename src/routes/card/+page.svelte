<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { MapPin, QrCode, CalendarCheck, Sparkles } from '@lucide/svelte';

	let { data } = $props();

	// The ceremony date drives the countdown; fall back to the plan's date.
	const weddingDate = $derived(
		data.ceremony?.eventDate ?? (data.plan?.weddingDate ? `${data.plan.weddingDate}T16:00:00` : null)
	);

	let now = $state(Date.now());
	$effect(() => {
		if (!weddingDate) return;
		const id = setInterval(() => (now = Date.now()), 1000);
		return () => clearInterval(id);
	});

	const countdown = $derived.by(() => {
		if (!weddingDate) return null;
		const diff = new Date(weddingDate).getTime() - now;
		if (Number.isNaN(diff)) return null;
		const clamped = Math.max(0, diff);
		return {
			days: Math.floor(clamped / 86_400_000),
			hours: Math.floor((clamped / 3_600_000) % 24),
			mins: Math.floor((clamped / 60_000) % 60),
			secs: Math.floor((clamped / 1000) % 60),
			passed: diff <= 0
		};
	});

	const coupleNames = $derived(
		data.couple?.brideName && data.couple?.groomName
			? `${data.couple.brideName} & ${data.couple.groomName}`
			: null
	);

	const longDate = $derived(
		weddingDate
			? new Date(weddingDate).toLocaleDateString('en-GB', {
					day: 'numeric',
					month: 'long',
					year: 'numeric'
				})
			: null
	);

	// Typed as objects rather than tuples — a mixed [Component, string, string]
	// tuple widens to a union and the icon is no longer callable as a component.
	const highlights = [
		{
			icon: CalendarCheck,
			title: 'One-tap RSVP',
			body: 'Guests reply from the card. Replies land straight in your guest list.'
		},
		{
			icon: QrCode,
			title: 'QR check-in',
			body: 'Every guest gets a code. Scan at the door to check them in.'
		},
		{
			icon: Sparkles,
			title: 'Ethiopian motifs',
			body: 'Designs drawn from traditional patterns, built for the screen.'
		}
	];

	const features = [
		[
			'01',
			'Elegant themes',
			'Choose from designs built around Ethiopian motifs, reimagined for the screen.'
		],
		[
			'02',
			'Live RSVP & check-in',
			'Guests respond in one tap; check them in at the door with a scan.'
		],
		[
			'03',
			'Interactive map & directions',
			'Venue location, parking notes and timing, all in the card itself.'
		]
	];
</script>

<svelte:head>
	<title>The Leora Card — Leora Events</title>
	<meta
		name="description"
		content="A digital wedding invitation with a live countdown, interactive map, guest RSVP and QR check-in."
	/>
</svelte:head>

<section class="mx-auto max-w-[1180px] px-5 pt-14 pb-10 sm:px-8">
	<div class="grid items-center gap-12 lg:grid-cols-[1fr_0.85fr]">
		<div>
			<p class="text-accent-foreground text-[12.5px] font-bold tracking-[0.08em] uppercase">
				The Leora Card
			</p>
			<h1 class="font-display mt-2 text-4xl font-extrabold text-balance sm:text-5xl">
				An invitation worth sharing
			</h1>
			<p class="text-muted-foreground mt-4 max-w-xl text-[15.5px] leading-relaxed">
				Every Leora Card comes with a live countdown, interactive map, guest RSVP flow and a
				personal QR check-in — wrapped in a design your guests will want to screenshot.
			</p>
			<div class="mt-7 flex flex-wrap gap-3">
				{#if data.couple}
					<Button href="/wedding/guests" size="lg">Manage guests &amp; RSVPs</Button>
					<Button href="/wedding/wedding" variant="outline" size="lg">Edit wedding details</Button>
				{:else}
					<Button href="/signup" size="lg">Create your card</Button>
					<Button href="/pricing" variant="outline" size="lg">See what's included</Button>
				{/if}
			</div>
		</div>

		<!-- ---------------- The card preview ---------------- -->
		<Card.Root class="from-leora-royal to-leora-navy overflow-hidden border-0 bg-linear-160">
			<Card.Content class="relative px-7 py-12 text-center">
				<div class="pointer-events-none absolute inset-0 bg-(image:--hero-glow)"></div>
				<div class="relative">
					<p class="text-[11.5px] font-bold tracking-[0.14em] text-(--leora-gold) uppercase">
						You're Invited
					</p>

					<p class="font-display mt-4 text-3xl font-extrabold text-white sm:text-4xl">
						{coupleNames ?? 'Your names here'}
					</p>

					<p class="mt-3 text-[13.5px] text-white/70">
						{#if longDate}
							{longDate}
							{#if data.ceremony?.city}
								· {data.ceremony.city}
							{:else if data.plan?.city}
								· {data.plan.city}
							{/if}
						{:else}
							Set your wedding date to start the countdown
						{/if}
					</p>

					<div class="mt-7 grid grid-cols-4 gap-2">
						{#each [['Days', countdown?.days], ['Hrs', countdown?.hours], ['Min', countdown?.mins], ['Sec', countdown?.secs]] as [label, value] (label)}
							<div class="rounded-xl border border-white/10 bg-white/5 py-3">
								<span class="font-display block text-xl font-extrabold text-white tabular-nums">
									{value ?? '--'}
								</span>
								<span class="mt-0.5 block text-[10px] tracking-wider text-white/50 uppercase">
									{label}
								</span>
							</div>
						{/each}
					</div>

					{#if countdown?.passed}
						<p class="mt-5 text-[13px] text-(--leora-gold)">Congratulations! 🎉</p>
					{/if}

					{#if data.ceremony?.venueName}
						<p class="mt-6 flex items-center justify-center gap-1.5 text-[12.5px] text-white/60">
							<MapPin class="size-3.5" />
							{data.ceremony.venueName}
						</p>
					{/if}
				</div>
			</Card.Content>
		</Card.Root>
	</div>
</section>

{#if data.couple && !weddingDate}
	<section class="mx-auto max-w-[1180px] px-5 pb-4 sm:px-8">
		<Card.Root class="border-primary">
			<Card.Content class="flex flex-wrap items-center justify-between gap-4">
				<span class="text-[13.5px]">
					Your card is ready — add your wedding date and venue and it fills in automatically.
				</span>
				<Button href="/wedding/wedding" size="sm">Add wedding details</Button>
			</Card.Content>
		</Card.Root>
	</section>
{/if}

<section class="mx-auto max-w-[1180px] px-5 py-14 sm:px-8">
	<div class="grid gap-4 md:grid-cols-3">
		{#each features as [num, title, body] (num)}
			<Card.Root class="h-full">
				<Card.Content>
					<span class="font-display text-primary text-2xl font-extrabold">{num}</span>
					<h2 class="mt-2 text-base font-bold">{title}</h2>
					<p class="text-muted-foreground mt-1.5 text-[13.5px] leading-relaxed">{body}</p>
				</Card.Content>
			</Card.Root>
		{/each}
	</div>

	<div class="mt-10 grid gap-4 sm:grid-cols-3">
		{#each highlights as { icon: Icon, title, body } (title)}
			<div class="flex gap-3.5">
				<span
					class="bg-accent text-accent-foreground grid size-10 shrink-0 place-items-center rounded-xl"
				>
					<Icon class="size-4.5" />
				</span>
				<span>
					<span class="block text-[13.5px] font-bold">{title}</span>
					<span class="text-muted-foreground mt-1 block text-[12.5px] leading-relaxed">{body}</span>
				</span>
			</div>
		{/each}
	</div>

	{#if !data.couple}
		<div class="mt-12 text-center">
			<Badge variant="secondary" class="text-accent-foreground mb-4">Included with Golden</Badge>
			<p class="text-muted-foreground mx-auto max-w-md text-[14px]">
				The Leora Card comes with the Golden plan, or as a custom design on Platinum.
			</p>
			<Button href="/pricing" class="mt-5">See plans</Button>
		</div>
	{/if}
</section>
