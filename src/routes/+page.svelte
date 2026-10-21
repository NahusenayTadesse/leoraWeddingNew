<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
	import { formatPriceRange } from '$lib/price';
	import { assetUrl } from '$lib/assetUrl';
	import { Button } from '@nahu/admin-kit/components/ui/button/index.js';
	import * as Card from '@nahu/admin-kit/components/ui/card/index.js';
	import * as Accordion from '$lib/components/ui/accordion';
	import { Badge } from '@nahu/admin-kit/components/ui/badge/index.js';
	import { ArrowRight, Check, Star, ShieldCheck } from '@lucide/svelte';
	import { inview, animateCount } from '$lib/actions/inview';

	let { data } = $props();

	// ---- Hero counter + bar, from the PHP homepage ----
	// ETB 0 -> 480,000 over 1400ms, and the bar fills to 64%, both triggered the
	// first time the card scrolls into view.
	let heroBudget = $state(0);
	let heroBarWidth = $state(0);

	function startHero() {
		animateCount(480_000, 1400, (v) => (heroBudget = v));
		heroBarWidth = 64;
	}

	// ---- Dashboard progress ring ----
	// 2πr for r=38 is 238.7; the offset animates from full to 32% of the
	// circumference, leaving 68% drawn.
	const RING_CIRCUMFERENCE = 238.7;
	const RING_PROGRESS = 0.68;
	let ringOffset = $state(RING_CIRCUMFERENCE);

	const startRing = () => (ringOffset = RING_CIRCUMFERENCE * (1 - RING_PROGRESS));

	// ---- Budget estimator (Mode 1), ported from the PHP homepage widget ----
	const tierMultiplier = { traditional: 700, outdoor: 1150, luxury: 1900 } as const;
	type Tier = keyof typeof tierMultiplier;

	const categorySplit: [string, number][] = [
		[m.home_cat_venue(), 0.38],
		[m.home_cat_photo(), 0.16],
		[m.home_cat_decor(), 0.18],
		[m.home_cat_clothing(), 0.1],
		[m.home_cat_entertainment(), 0.09],
		[m.home_cat_other(), 0.09]
	];

	let guests = $state(300);
	let tier = $state<Tier>('outdoor');

	const estimateTotal = $derived(guests * tierMultiplier[tier]);
	const breakdown = $derived(
		categorySplit.map(([name, pct]) => ({ name, pct, amount: Math.round(estimateTotal * pct) }))
	);

	const tiers: { key: Tier; label: string }[] = [
		{ key: 'traditional', label: m.home_tier_traditional() },
		{ key: 'outdoor', label: m.home_tier_outdoor() },
		{ key: 'luxury', label: m.home_tier_luxury() }
	];

	// ---- Editorial content carried over from the PHP page ----
	const events = [
		['01', m.event_type_engagement()],
		['02', m.event_type_shimgelegna()],
		['03', m.home_ev_gebez()],
		['04', m.home_ev_ceremony()],
		['05', m.event_type_melse()],
		['06', m.event_type_kilikil()]
	];

	const timeline = [
		[m.event_type_engagement(), m.home_tl_12()],
		[m.home_tl_book(), m.home_tl_9()],
		[m.home_tl_invites(), m.home_tl_4()],
		[m.event_type_melse(), m.home_tl_1()],
		[m.home_tl_day(), m.home_tl_big()]
	];

	const cardFeatures = [
		['01', m.home_card_f1_title(), m.home_card_f1_body()],
		['02', m.home_card_f2_title(), m.home_card_f2_body()],
		['03', m.home_card_f3_title(), m.home_card_f3_body()]
	];

	const faqs = [
		[m.home_faq_q1(), m.home_faq_a1()],
		[m.home_faq_q2(), m.home_faq_a2()],
		[m.home_faq_q3(), m.home_faq_a3()],
		[m.home_faq_q4(), m.home_faq_a4()]
	];

	const initials = (name: string) =>
		name
			.split(/[\s&]+/)
			.filter(Boolean)
			.slice(0, 2)
			.map((w) => w[0]?.toUpperCase() ?? '')
			.join('');
</script>

<svelte:head>
	<title>Leora Events — {m.site_tagline()}</title>
	<meta name="description" content={m.home_meta_description()} />
	<meta property="og:title" content="Leora Events — {m.site_tagline()}" />
	<meta property="og:description" content={m.home_meta_description()} />
</svelte:head>

<!-- ============================ HERO ============================ -->
<section class="relative overflow-hidden">
	<div class="pointer-events-none absolute inset-0 bg-(image:--hero-glow)"></div>
	<div class="relative mx-auto max-w-[1180px] px-5 pt-16 pb-20 sm:px-8 lg:pt-24">
		<div class="grid items-center gap-14 lg:grid-cols-[1.05fr_0.95fr]">
			<div>
				<Badge variant="secondary" class="mb-5 gap-1.5 text-accent-foreground">
					<span class="size-1.5 rounded-full bg-primary"></span>
					{m.site_tagline()}
				</Badge>

				<h1
					class="font-display text-4xl font-extrabold text-balance sm:text-5xl lg:text-[54px] lg:leading-[1.06]"
				>
					{m.home_hero_title()}
				</h1>

				<p class="mt-5 max-w-xl text-[15.5px] leading-relaxed text-muted-foreground">
					{m.home_hero_lead()}
				</p>

				<div class="mt-7 flex flex-wrap gap-3">
					<Button href="/signup" size="lg">{m.nav_start()}</Button>
					<Button href="/vendors" variant="outline" size="lg">{m.home_explore_vendors()}</Button>
				</div>

				<dl class="mt-10 flex flex-wrap gap-x-10 gap-y-4">
					<div>
						<dt class="font-display text-2xl font-extrabold">
							{data.stats.vendorCount.toLocaleString()}
						</dt>
						<dd class="text-[13px] text-muted-foreground">{m.home_stat_vendors()}</dd>
					</div>
					<div>
						<dt class="font-display text-2xl font-extrabold">{data.stats.regionCount}</dt>
						<dd class="text-[13px] text-muted-foreground">{m.home_stat_cities()}</dd>
					</div>
					<div>
						<dt class="font-display text-2xl font-extrabold">
							{data.vendors.length ? `${Number(data.vendors[0].ratingAvg).toFixed(1)}/5` : '—'}
						</dt>
						<dd class="text-[13px] text-muted-foreground">{m.home_stat_top()}</dd>
					</div>
				</dl>
			</div>

			<!--
				Floating layered cards, as in the PHP hero: absolutely positioned,
				each with its own rotation and animation-delay so they drift out of
				phase with one another.
			-->
			<div class="hero-visual" use:inview={startHero}>
				<img
					class="hero-photo"
					src="/demo/couples/1.webp"
					alt=""
					width="1200"
					height="900"
					fetchpriority="high"
				/>
				<div class="floatcard fc-budget">
					<div class="fc-label">{m.home_fc_budget()}</div>
					<div class="fc-value">ETB {heroBudget.toLocaleString()}</div>
					<div class="fc-bar"><i style="width:{heroBarWidth}%"></i></div>
					<div class="fc-mini-row">
						<span>{m.home_fc_spent()}</span>
						<span class="font-semibold text-(--color-success)">{m.home_fc_on_track()}</span>
					</div>
				</div>

				<div class="floatcard fc-vendor">
					<div class="fc-label">{m.home_fc_vendor()}</div>
					{#if data.vendors.length}
						{@const v = data.vendors[0]}
						<div class="fc-value">{v.businessName}</div>
						<div class="fc-mini-row">
							<span><span class="fc-dot"></span>{v.categoryName}</span>
							<span class="inline-flex items-center gap-0.5 text-primary">
								<Star class="size-3 fill-current" />{Number(v.ratingAvg).toFixed(1)}
							</span>
						</div>
					{:else}
						<div class="mt-2 text-[12.5px] text-muted-foreground">
							{m.home_fc_no_vendors()}
						</div>
					{/if}
				</div>

				<div class="floatcard fc-timeline">
					<div class="fc-label">{m.home_fc_timeline()}</div>
					<div class="mt-2.5 flex flex-col gap-2 text-[13px]">
						<div class="flex items-center gap-1.5">
							<Check class="size-3.5 text-(--color-success)" />
							{m.home_fc_venue_booked()}
						</div>
						<div class="flex items-center gap-1.5">
							<Check class="size-3.5 text-(--color-success)" />
							{m.home_fc_melse_set()}
						</div>
						<div class="flex items-center gap-1.5 font-bold text-accent-foreground">
							<ArrowRight class="size-3.5" />
							{m.home_fc_send_invites()}
						</div>
					</div>
				</div>

				<div class="floatcard fc-guest">
					<div class="fc-label">{m.home_fc_guests()}</div>
					<div class="fc-value">318</div>
					<div class="fc-mini-row"><span>{m.home_fc_rsvpd()}</span></div>
				</div>
			</div>
		</div>
	</div>
</section>

{#if data.vendors.length}
	<section class="mx-auto max-w-[1180px] px-5 py-16 sm:px-8">
		<div class="flex flex-wrap items-end justify-between gap-4">
			<div>
				<p class="text-[12.5px] font-bold tracking-[0.08em] text-accent-foreground uppercase">
					{m.home_top_eyebrow()}
				</p>
				<h2 class="mt-2 font-display text-3xl font-extrabold text-balance sm:text-4xl">
					{m.home_top_title()}
				</h2>
			</div>
			<Button href="/vendors" variant="outline"
				>{m.home_top_all()}<ArrowRight class="ml-1.5 size-4" /></Button
			>
		</div>
		<div class="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{#each data.vendors as v (v.id)}
				<a href="/vendors/{v.id}" class="group">
					<Card.Root
						class="h-full overflow-hidden p-0 transition-colors group-hover:border-primary"
					>
						<div class="aspect-[4/3] overflow-hidden bg-muted">
							{#if v.cover}
								<img
									src={assetUrl(v.cover)}
									alt={v.businessName}
									loading="lazy"
									class="size-full object-cover transition-transform duration-500 group-hover:scale-105"
								/>
							{/if}
						</div>
						<div class="space-y-1 p-4">
							<div class="flex items-center justify-between gap-2">
								<h3 class="truncate font-semibold">{v.businessName}</h3>
								{#if Number(v.ratingAvg) > 0}
									<span class="inline-flex items-center gap-1 text-sm text-primary">
										<Star class="size-3.5 fill-current" />{Number(v.ratingAvg).toFixed(1)}
										<span class="text-muted-foreground">({v.reviewCount})</span>
									</span>
								{/if}
							</div>
							<p class="flex items-center gap-1.5 text-[13px] text-muted-foreground">
								{v.categoryName} · {v.city}
								{#if v.isVerified}<ShieldCheck class="size-3.5 text-primary" />{/if}
							</p>
							{#if formatPriceRange(v.priceMin, v.priceMax)}
								<p class="text-[13px] font-medium">{formatPriceRange(v.priceMin, v.priceMax)}</p>
							{/if}
						</div>
					</Card.Root>
				</a>
			{/each}
		</div>
	</section>
{/if}

<!-- ========================= MARKETPLACE ========================= -->
<section class="mx-auto max-w-[1180px] px-5 py-16 sm:px-8">
	<p class="text-[12.5px] font-bold tracking-[0.08em] text-accent-foreground uppercase">
		{m.home_mkt_eyebrow()}
	</p>
	<h2 class="mt-2 font-display text-3xl font-extrabold text-balance sm:text-4xl">
		{m.home_mkt_title()}
	</h2>
	<p class="mt-3 max-w-2xl text-[15px] text-muted-foreground">
		{m.home_mkt_lead()}
	</p>

	{#if data.categories.length}
		<div class="mt-9 grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
			{#each data.categories as category (category.id)}
				<a href="/vendors?category={category.id}">
					<Card.Root class="cat-card h-full hover:border-primary">
						<Card.Content class="flex items-center gap-3.5">
							<span class="grid size-11 shrink-0 place-items-center rounded-xl bg-accent text-xl">
								{category.icon ?? '💍'}
							</span>
							<span>
								<span class="block text-sm font-bold">{category.name}</span>
								<span class="block text-[12.5px] text-muted-foreground">
									{category.count === 1
										? m.home_vendor_count_one()
										: m.home_vendor_count({ count: category.count })}
								</span>
							</span>
						</Card.Content>
					</Card.Root>
				</a>
			{/each}
		</div>
	{:else}
		<Card.Root class="mt-9">
			<Card.Content class="py-12 text-center text-sm text-muted-foreground">
				{m.home_no_categories()}
			</Card.Content>
		</Card.Root>
	{/if}
</section>

<!-- ====================== BUDGET ESTIMATOR ====================== -->
<section class="border-y bg-card">
	<div class="mx-auto max-w-[1180px] px-5 py-16 sm:px-8">
		<p class="text-[12.5px] font-bold tracking-[0.08em] text-accent-foreground uppercase">
			{m.home_est_eyebrow()}
		</p>
		<h2 class="mt-2 font-display text-3xl font-extrabold text-balance sm:text-4xl">
			{m.home_est_title()}
		</h2>
		<p class="mt-3 max-w-2xl text-[15px] text-muted-foreground">
			{m.home_est_lead()}
		</p>

		<div class="mt-9 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
			<Card.Root>
				<Card.Content class="space-y-6">
					<div>
						<label for="guestSlider" class="mb-2.5 flex items-baseline justify-between">
							<span class="text-[12.5px] font-bold text-muted-foreground"
								>{m.home_est_guest_count()}</span
							>
							<span class="font-display text-lg font-extrabold"
								>{m.home_est_guests({ count: guests })}</span
							>
						</label>
						<input
							id="guestSlider"
							class="leora-range"
							type="range"
							min="50"
							max="1500"
							step="10"
							bind:value={guests}
						/>
					</div>

					<div>
						<span class="mb-2.5 block text-[12.5px] font-bold text-muted-foreground">
							{m.home_est_tier()}
						</span>
						<div class="flex flex-wrap gap-2">
							{#each tiers as t (t.key)}
								<Button
									variant={tier === t.key ? 'default' : 'outline'}
									size="sm"
									onclick={() => (tier = t.key)}
								>
									{t.label}
								</Button>
							{/each}
						</div>
					</div>

					<div class="border-t pt-5">
						<p class="text-[12.5px] font-bold text-muted-foreground">{m.home_est_total()}</p>
						<p class="mt-1 font-display text-4xl font-extrabold">
							{estimateTotal.toLocaleString()}
							<span class="text-lg font-bold text-muted-foreground">ETB</span>
						</p>
					</div>
				</Card.Content>
			</Card.Root>

			<Card.Root>
				<Card.Content class="space-y-3.5">
					{#each breakdown as line (line.name)}
						<div class="grid grid-cols-[1fr_auto] items-center gap-3 sm:grid-cols-[9rem_1fr_4rem]">
							<span class="text-[13px] font-medium">{line.name}</span>
							<div class="col-span-2 h-1.5 overflow-hidden rounded-full bg-muted sm:col-span-1">
								<div
									class="est-bar h-full rounded-full bg-primary"
									style="width:{line.pct * 100}%"
								></div>
							</div>
							<b class="text-right text-[13px] font-bold tabular-nums">
								{Math.round(line.amount / 1000)}k
							</b>
						</div>
					{/each}
					<Button href="/budget-estimator" variant="outline" class="mt-3 w-full">
						{m.home_est_open()}
						<ArrowRight class="size-4" />
					</Button>
				</Card.Content>
			</Card.Root>
		</div>
	</div>
</section>

<!-- ====================== PLANNING DASHBOARD ====================== -->
<section class="mx-auto max-w-[1180px] px-5 py-16 sm:px-8">
	<p class="text-[12.5px] font-bold tracking-[0.08em] text-accent-foreground uppercase">
		{m.home_dash_eyebrow()}
	</p>
	<h2 class="mt-2 font-display text-3xl font-extrabold text-balance sm:text-4xl">
		{m.home_dash_title()}
	</h2>
	<p class="mt-3 max-w-2xl text-[15px] text-muted-foreground">
		{m.home_dash_lead()}
	</p>

	<div class="mt-9 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
		<Card.Root>
			<Card.Content class="space-y-3">
				<p class="text-[11.5px] font-bold tracking-[0.08em] text-muted-foreground uppercase">
					{m.home_dash_todo()}
				</p>
				{#each [[m.home_dash_task1(), m.home_dash_due5()], [m.home_dash_task2(), m.home_dash_due9()]] as [title, due] (title)}
					<div class="rounded-xl bg-muted/50 px-4 py-3">
						<b class="block text-[13.5px]">{title}</b>
						<span class="text-[12.5px] text-muted-foreground">{due}</span>
					</div>
				{/each}
				<p class="pt-2 text-[11.5px] font-bold tracking-[0.08em] text-muted-foreground uppercase">
					{m.home_dash_in_progress()}
				</p>
				<div class="rounded-xl bg-muted/50 px-4 py-3">
					<b class="block text-[13.5px]">{m.home_fc_send_invites()}</b>
					<span class="text-[12.5px] text-muted-foreground">{m.home_dash_sent()}</span>
				</div>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Content class="flex h-full flex-col items-center justify-center gap-4 text-center">
				<div class="relative" use:inview={startRing}>
					<svg width="88" height="88" viewBox="0 0 88 88" aria-hidden="true">
						<circle cx="44" cy="44" r="38" fill="none" stroke="var(--border)" stroke-width="8" />
						<circle
							class="progress-ring"
							cx="44"
							cy="44"
							r="38"
							fill="none"
							stroke="var(--primary)"
							stroke-width="8"
							stroke-linecap="round"
							stroke-dasharray={RING_CIRCUMFERENCE}
							stroke-dashoffset={ringOffset}
							transform="rotate(-90 44 44)"
						/>
					</svg>
				</div>
				<div>
					<div class="font-display text-2xl font-extrabold">68%</div>
					<div class="text-[12.5px] text-muted-foreground">{m.home_dash_ready()}</div>
				</div>
				<div class="w-full border-t pt-4">
					<p class="flex justify-between text-[12.5px] text-muted-foreground">
						<span>{m.home_dash_invited()}</span><b class="text-foreground">318</b>
					</p>
					<p class="mt-1.5 flex justify-between text-[12.5px] text-muted-foreground">
						<span>{m.home_dash_confirmed()}</span><b class="text-foreground">240</b>
					</p>
				</div>
			</Card.Content>
		</Card.Root>
	</div>
</section>

<!-- ========================= LEORA CARD ========================= -->
<section class="mx-auto max-w-[1180px] px-5 py-16 sm:px-8">
	<p class="text-[12.5px] font-bold tracking-[0.08em] text-accent-foreground uppercase">
		{m.home_card_eyebrow()}
	</p>
	<h2 class="mt-2 font-display text-3xl font-extrabold text-balance sm:text-4xl">
		{m.home_card_title()}
	</h2>
	<p class="mt-3 max-w-2xl text-[15px] text-muted-foreground">
		{m.home_card_lead()}
	</p>

	<div class="mt-9 grid gap-4 md:grid-cols-3">
		{#each cardFeatures as [num, title, body] (num)}
			<Card.Root class="h-full">
				<Card.Content>
					<span class="font-display text-2xl font-extrabold text-primary">{num}</span>
					<h3 class="mt-2 text-base font-bold">{title}</h3>
					<p class="mt-1.5 text-[13.5px] leading-relaxed text-muted-foreground">{body}</p>
				</Card.Content>
			</Card.Root>
		{/each}
	</div>
</section>

<!-- ======================= MULTI-EVENT ========================= -->
<section class="border-y bg-card">
	<div class="mx-auto max-w-[1180px] px-5 py-16 sm:px-8">
		<p class="text-[12.5px] font-bold tracking-[0.08em] text-accent-foreground uppercase">
			{m.home_events_eyebrow()}
		</p>
		<h2 class="mt-2 font-display text-3xl font-extrabold text-balance sm:text-4xl">
			{m.home_events_title()}
		</h2>
		<p class="mt-3 max-w-2xl text-[15px] text-muted-foreground">
			{m.home_events_lead()}
		</p>

		<ol class="mt-9 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
			{#each events as [num, name] (num)}
				<li>
					<Card.Root class="event-node h-full">
						<Card.Content class="flex items-center gap-3.5">
							<span
								class="grid size-10 shrink-0 place-items-center rounded-xl bg-accent font-display text-sm font-extrabold text-accent-foreground"
							>
								{num}
							</span>
							<span class="text-sm font-bold">{name}</span>
						</Card.Content>
					</Card.Root>
				</li>
			{/each}
		</ol>

		<div class="mt-12">
			<p class="text-[12.5px] font-bold tracking-[0.08em] text-accent-foreground uppercase">
				{m.home_tl_eyebrow()}
			</p>
			<h3 class="mt-2 font-display text-2xl font-extrabold">
				{m.home_tl_title()}
			</h3>
			<ol class="mt-6 grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
				{#each timeline as [name, when] (name)}
					<li class="border-l-2 border-primary py-1 pl-3.5">
						<p class="text-[13.5px] font-bold">{name}</p>
						<p class="text-[12.5px] text-muted-foreground">{when}</p>
					</li>
				{/each}
			</ol>
		</div>
	</div>
</section>

<!-- ======================== TESTIMONIALS ======================== -->
{#if data.testimonials.length}
	<section class="mx-auto max-w-[1180px] px-5 py-16 sm:px-8">
		<p class="text-[12.5px] font-bold tracking-[0.08em] text-accent-foreground uppercase">
			{m.home_testimonials_eyebrow()}
		</p>
		<h2 class="mt-2 font-display text-3xl font-extrabold sm:text-4xl">
			{m.home_testimonials_title()}
		</h2>

		<div class="mt-9 grid gap-4 md:grid-cols-3">
			{#each data.testimonials as t (t.id)}
				<Card.Root class="h-full">
					<Card.Content class="flex h-full flex-col">
						<p class="text-[14px] leading-relaxed">"{t.message}"</p>
						<div class="mt-5 flex items-center gap-3 pt-4">
							{#if t.avatar}
								<img
									src={assetUrl(t.avatar)}
									alt=""
									class="size-10 shrink-0 rounded-full object-cover"
									loading="lazy"
								/>
							{:else}
								<span
									class="grid size-10 shrink-0 place-items-center rounded-full bg-accent text-[12.5px] font-bold text-accent-foreground"
								>
									{initials(t.name)}
								</span>
							{/if}
							<span>
								<span class="block text-[13.5px] font-bold">{t.name}</span>
								{#if t.position}
									<span class="block text-[12.5px] text-muted-foreground">{t.position}</span>
								{/if}
							</span>
						</div>
					</Card.Content>
				</Card.Root>
			{/each}
		</div>
	</section>
{/if}

<!-- ============================ FAQ ============================ -->
<section id="faq" class="mx-auto max-w-[760px] px-5 py-16 sm:px-8">
	<p class="text-[12.5px] font-bold tracking-[0.08em] text-accent-foreground uppercase">
		{m.footer_faq()}
	</p>
	<h2 class="mt-2 font-display text-3xl font-extrabold sm:text-4xl">{m.home_faq_title()}</h2>

	<Accordion.Root type="single" class="mt-7">
		{#each faqs as [q, a], i (q)}
			<Accordion.Item value={`faq-${i}`}>
				<Accordion.Trigger class="text-left text-[15px] font-semibold">{q}</Accordion.Trigger>
				<Accordion.Content class="text-[14px] leading-relaxed text-muted-foreground">
					{a}
				</Accordion.Content>
			</Accordion.Item>
		{/each}
	</Accordion.Root>
</section>

<!-- ============================ CTA ============================ -->
<section class="mx-auto max-w-[1180px] px-5 pb-8 sm:px-8">
	<Card.Root class="overflow-hidden border-0 bg-linear-160 from-leora-royal to-leora-navy">
		<Card.Content class="relative px-8 py-14 text-center">
			<div class="pointer-events-none absolute inset-0 bg-(image:--hero-glow)"></div>
			<div class="relative">
				<p class="text-[12.5px] font-bold tracking-[0.08em] text-(--leora-gold) uppercase">
					{m.home_cta_eyebrow()}
				</p>
				<h2 class="mt-2 font-display text-3xl font-extrabold text-balance text-white sm:text-4xl">
					{m.home_cta_title()}
				</h2>
				<p class="mx-auto mt-3 max-w-lg text-[15px] text-white/70">
					{m.home_cta_lead()}
				</p>
				<div class="mt-7 flex flex-wrap justify-center gap-3">
					<Button href="/signup" size="lg">{m.nav_start()}</Button>
					<Button
						href="/vendors"
						size="lg"
						variant="outline"
						class="border-white/25 bg-transparent text-white hover:bg-white/10 hover:text-white"
					>
						{m.home_explore_vendors()}
					</Button>
				</div>
				<p class="mt-6 flex items-center justify-center gap-1.5 text-[12.5px] text-white/50">
					<ShieldCheck class="size-3.5" />
					{m.home_cta_checked()}
				</p>
			</div>
		</Card.Content>
	</Card.Root>
</section>

<style>
	/* ===================== Hero: floating cards =====================
	 * Ported from the PHP homepage. Each card drifts 14px vertically on a 6s
	 * loop, keeping its own rotation, with staggered delays so they never move
	 * in unison. `--rot` is carried through the keyframes because a transform
	 * animation would otherwise wipe the card's resting rotation.
	 */
	.hero-visual {
		position: relative;
		height: 460px;
	}
	.hero-photo {
		position: absolute;
		inset: 8% 9% 10% 12%;
		width: 79%;
		height: 82%;
		object-fit: cover;
		border-radius: 28px;
		box-shadow: var(--card-shadow);
		z-index: 0;
	}

	.floatcard {
		position: absolute;
		background: var(--card);
		border: 1px solid var(--border);
		border-radius: 16px;
		box-shadow: var(--card-shadow);
		padding: 16px 18px;
		animation: floaty 6s ease-in-out infinite;
	}

	@keyframes floaty {
		0%,
		100% {
			transform: translateY(0px) rotate(var(--rot, 0deg));
		}
		50% {
			transform: translateY(-14px) rotate(var(--rot, 0deg));
		}
	}

	.fc-budget {
		top: 6%;
		left: 2%;
		width: 230px;
		--rot: -3deg;
		animation-delay: 0s;
		z-index: 3;
	}
	.fc-vendor {
		top: 34%;
		right: 0%;
		width: 210px;
		--rot: 2.5deg;
		animation-delay: 1.1s;
		z-index: 2;
	}
	.fc-timeline {
		bottom: 16%;
		left: 10%;
		width: 250px;
		--rot: -1.5deg;
		animation-delay: 2s;
		z-index: 4;
	}
	.fc-guest {
		bottom: 0%;
		right: 12%;
		width: 190px;
		--rot: 3deg;
		animation-delay: 0.6s;
		z-index: 1;
	}

	.fc-label {
		font-size: 11px;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--muted-foreground);
		font-weight: 700;
	}
	.fc-value {
		font-family: var(--font-display);
		font-size: 22px;
		font-weight: 800;
		margin-top: 4px;
	}
	.fc-bar {
		height: 6px;
		border-radius: 4px;
		background: var(--border);
		margin-top: 10px;
		overflow: hidden;
	}
	.fc-bar i {
		display: block;
		height: 100%;
		border-radius: 4px;
		background: linear-gradient(90deg, var(--leora-gold-dark), var(--leora-gold));
		/* The counter and this bar are driven by the same in-view trigger. */
		transition: width 1.4s cubic-bezier(0.2, 0.8, 0.2, 1);
	}
	.fc-mini-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-top: 8px;
		font-size: 12px;
	}
	.fc-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: var(--leora-gold);
		display: inline-block;
		margin-right: 6px;
	}

	/* On narrow screens the absolute layout has nowhere to go — stack instead. */
	@media (max-width: 1023px) {
		.hero-visual {
			height: auto;
			display: grid;
			gap: 14px;
		}
		.hero-photo {
			position: static;
			width: 100%;
			height: auto;
			aspect-ratio: 4 / 3;
		}
		.floatcard {
			position: static;
			width: 100%;
			animation: none;
			transform: none;
		}
	}

	/* ============ Hover lifts, as in the PHP marketplace/event grids ============ */
	:global(.cat-card) {
		transition:
			transform 0.35s cubic-bezier(0.2, 0.8, 0.2, 1),
			box-shadow 0.35s ease,
			border-color 0.35s ease;
	}
	:global(.cat-card:hover) {
		transform: translateY(-8px);
		box-shadow: var(--card-shadow);
	}

	:global(.event-node) {
		transition:
			transform 0.3s ease,
			border-color 0.3s ease;
	}
	:global(.event-node:hover) {
		transform: translateY(-6px);
		border-color: var(--leora-gold);
	}

	/* Estimator bars ease to their new width when the tier changes. */
	.est-bar {
		transition: width 0.6s cubic-bezier(0.2, 0.8, 0.2, 1);
	}

	/* ===================== Progress ring ===================== */
	.progress-ring {
		transition: stroke-dashoffset 1.4s cubic-bezier(0.2, 0.8, 0.2, 1);
	}

	/*
	 * The PHP page killed every animation under prefers-reduced-motion. Same
	 * here — the in-view action already jumps straight to the end state, so the
	 * final values still show.
	 */
	@media (prefers-reduced-motion: reduce) {
		.floatcard,
		.fc-bar i,
		.est-bar,
		.progress-ring,
		:global(.cat-card),
		:global(.event-node) {
			animation: none !important;
			transition: none !important;
		}
	}

	/*
	 * Range inputs are the one control here Tailwind can't fully express — the
	 * track and thumb live behind vendor pseudo-elements that utilities can't
	 * target. Everything else on this page is Tailwind.
	 */
	.leora-range {
		width: 100%;
		height: 0.375rem;
		appearance: none;
		border-radius: 9999px;
		background: var(--muted);
		outline: none;
	}
	.leora-range::-webkit-slider-thumb {
		appearance: none;
		width: 1.125rem;
		height: 1.125rem;
		border-radius: 9999px;
		background: var(--primary);
		border: 2px solid var(--card);
		box-shadow: var(--shadow-sm);
		cursor: pointer;
	}
	.leora-range::-moz-range-thumb {
		width: 1.125rem;
		height: 1.125rem;
		border-radius: 9999px;
		background: var(--primary);
		border: 2px solid var(--card);
		box-shadow: var(--shadow-sm);
		cursor: pointer;
	}
	.leora-range:focus-visible {
		box-shadow: 0 0 0 3px color-mix(in oklch, var(--ring) 45%, transparent);
	}
</style>
