<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
	import { Button } from '@nahu/admin-kit/components/ui/button/index.js';
	import * as Card from '@nahu/admin-kit/components/ui/card/index.js';
	import { Badge } from '@nahu/admin-kit/components/ui/badge/index.js';
	import { MapPin, QrCode, CalendarCheck, Sparkles } from '@lucide/svelte';

	let { data } = $props();

	// The ceremony date drives the countdown; fall back to the plan's date.
	const weddingDate = $derived(
		data.ceremony?.eventDate ??
			(data.plan?.weddingDate ? `${data.plan.weddingDate}T16:00:00` : null)
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
			title: m.cardp_h1_title(),
			body: m.cardp_h1_body()
		},
		{
			icon: QrCode,
			title: m.cardp_h2_title(),
			body: m.cardp_h2_body()
		},
		{
			icon: Sparkles,
			title: m.cardp_h3_title(),
			body: m.cardp_h3_body()
		}
	];

	const features = [
		['01', m.home_card_f1_title(), m.home_card_f1_body()],
		['02', m.home_card_f2_title(), m.home_card_f2_body()],
		['03', m.home_card_f3_title(), m.home_card_f3_body()]
	];
</script>

<svelte:head>
	<title>{m.cardp_meta_title()}</title>
	<meta
		name="description"
		content="A digital wedding invitation with a live countdown, interactive map, guest RSVP and QR check-in."
	/>
</svelte:head>

<section class="mx-auto max-w-[1180px] px-5 pt-14 pb-10 sm:px-8">
	<div class="grid items-center gap-12 lg:grid-cols-[1fr_0.85fr]">
		<div>
			<p class="text-[12.5px] font-bold tracking-[0.08em] text-accent-foreground uppercase">
				{m.home_card_eyebrow()}
			</p>
			<h1 class="mt-2 font-display text-4xl font-extrabold text-balance sm:text-5xl">
				{m.home_card_title()}
			</h1>
			<p class="mt-4 max-w-xl text-[15.5px] leading-relaxed text-muted-foreground">
				{m.home_card_lead()}
			</p>
			<div class="mt-7 flex flex-wrap gap-3">
				{#if data.couple}
					<Button href="/wedding/guests" size="lg">{m.cardp_manage()}</Button>
					<Button href="/wedding/wedding" variant="outline" size="lg">{m.cardp_edit()}</Button>
				{:else}
					<Button href="/signup" size="lg">{m.cardp_create()}</Button>
					<Button href="/pricing" variant="outline" size="lg">{m.cardp_included()}</Button>
				{/if}
			</div>
		</div>

		<!-- ---------------- The card preview ---------------- -->
		<Card.Root class="overflow-hidden border-0 bg-linear-160 from-leora-royal to-leora-navy">
			<Card.Content class="relative px-7 py-12 text-center">
				<div class="pointer-events-none absolute inset-0 bg-(image:--hero-glow)"></div>
				<div class="relative">
					<p class="text-[11.5px] font-bold tracking-[0.14em] text-(--leora-gold) uppercase">
						{m.cardp_invited()}
					</p>

					<p class="mt-4 font-display text-3xl font-extrabold text-white sm:text-4xl">
						{coupleNames ?? m.cardp_names()}
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
							{m.cardp_set_date()}
						{/if}
					</p>

					<div class="mt-7 grid grid-cols-4 gap-2">
						{#each [[m.cardp_days(), countdown?.days], [m.cardp_hrs(), countdown?.hours], [m.cardp_min(), countdown?.mins], [m.cardp_sec(), countdown?.secs]] as [label, value] (label)}
							<div class="rounded-xl border border-white/10 bg-white/5 py-3">
								<span class="block font-display text-xl font-extrabold text-white tabular-nums">
									{value ?? '--'}
								</span>
								<span class="mt-0.5 block text-[10px] tracking-wider text-white/50 uppercase">
									{label}
								</span>
							</div>
						{/each}
					</div>

					{#if countdown?.passed}
						<p class="mt-5 text-[13px] text-(--leora-gold)">{m.cardp_congrats()}</p>
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
					{m.cardp_ready()}
				</span>
				<Button href="/wedding/wedding" size="sm">{m.cardp_add_details()}</Button>
			</Card.Content>
		</Card.Root>
	</section>
{/if}

<section class="mx-auto max-w-[1180px] px-5 py-14 sm:px-8">
	<div class="grid gap-4 md:grid-cols-3">
		{#each features as [num, title, body] (num)}
			<Card.Root class="h-full">
				<Card.Content>
					<span class="font-display text-2xl font-extrabold text-primary">{num}</span>
					<h2 class="mt-2 text-base font-bold">{title}</h2>
					<p class="mt-1.5 text-[13.5px] leading-relaxed text-muted-foreground">{body}</p>
				</Card.Content>
			</Card.Root>
		{/each}
	</div>

	<div class="mt-10 grid gap-4 sm:grid-cols-3">
		{#each highlights as { icon: Icon, title, body } (title)}
			<div class="flex gap-3.5">
				<span
					class="grid size-10 shrink-0 place-items-center rounded-xl bg-accent text-accent-foreground"
				>
					<Icon class="size-4.5" />
				</span>
				<span>
					<span class="block text-[13.5px] font-bold">{title}</span>
					<span class="mt-1 block text-[12.5px] leading-relaxed text-muted-foreground">{body}</span>
				</span>
			</div>
		{/each}
	</div>

	{#if !data.couple}
		<div class="mt-12 text-center">
			<Badge variant="secondary" class="mb-4 text-accent-foreground">{m.cardp_golden()}</Badge>
			<p class="mx-auto max-w-md text-[14px] text-muted-foreground">
				{m.cardp_golden_body()}
			</p>
			<Button href="/pricing" class="mt-5">{m.cardp_see_plans()}</Button>
		</div>
	{/if}
</section>
