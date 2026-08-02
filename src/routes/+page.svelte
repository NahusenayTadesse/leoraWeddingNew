<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import * as Accordion from '$lib/components/ui/accordion';
	import { Badge } from '$lib/components/ui/badge';
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
		['Venue & Catering', 0.38],
		['Photo & Video', 0.16],
		['Decor', 0.18],
		['Clothing', 0.1],
		['Entertainment', 0.09],
		['Other', 0.09]
	];

	let guests = $state(300);
	let tier = $state<Tier>('outdoor');

	const estimateTotal = $derived(guests * tierMultiplier[tier]);
	const breakdown = $derived(
		categorySplit.map(([name, pct]) => ({ name, pct, amount: Math.round(estimateTotal * pct) }))
	);

	const tiers: { key: Tier; label: string }[] = [
		{ key: 'traditional', label: 'Traditional' },
		{ key: 'outdoor', label: 'Outdoor' },
		{ key: 'luxury', label: 'Luxury' }
	];

	// ---- Editorial content carried over from the PHP page ----
	const events = [
		['01', 'Engagement'],
		['02', 'Shimgelegna'],
		['03', 'Gebez / Enshoshela'],
		['04', 'Wedding Ceremony'],
		['05', 'Melse'],
		['06', 'Kilikil']
	];

	const timeline = [
		['Engagement', '12 months out'],
		['Book vendors', '9 months out'],
		['Send invitations', '4 months out'],
		['Melse', '1 month out'],
		['Wedding day', 'The big day']
	];

	const cardFeatures = [
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

	const faqs = [
		[
			'Is Leora free to use for couples?',
			'Yes. Browsing the marketplace, planning your budget and building your guest list are all free for couples.'
		],
		[
			'How are vendors verified?',
			'Every vendor goes through an identity and business check before they can list packages on Leora.'
		],
		[
			'Can I plan multiple events under one wedding?',
			'Yes — engagement, Melse, ceremony and reception can all live under a single budget and guest list.'
		],
		[
			'Does Leora work outside Addis Ababa?',
			'Leora currently covers eight regions across Ethiopia, with more being added as vendors join.'
		]
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
	<title>Leora Events — Ethiopia's First Wedding Platform</title>
	<meta
		name="description"
		content="Plan your dream Ethiopian wedding, all in one place. Vendors, budgeting, planning, invitations and guests in a single workspace."
	/>
</svelte:head>

<!-- ============================ HERO ============================ -->
<section class="relative overflow-hidden">
	<div class="pointer-events-none absolute inset-0 bg-(image:--hero-glow)"></div>
	<div class="relative mx-auto max-w-[1180px] px-5 pt-16 pb-20 sm:px-8 lg:pt-24">
		<div class="grid items-center gap-14 lg:grid-cols-[1.05fr_0.95fr]">
			<div>
				<Badge variant="secondary" class="text-accent-foreground mb-5 gap-1.5">
					<span class="bg-primary size-1.5 rounded-full"></span>
					Ethiopia's First Wedding Platform
				</Badge>

				<h1
					class="font-display text-4xl font-extrabold text-balance sm:text-5xl lg:text-[54px] lg:leading-[1.06]"
				>
					Plan your dream Ethiopian wedding, all in one place
				</h1>

				<p class="text-muted-foreground mt-5 max-w-xl text-[15.5px] leading-relaxed">
					Vendors, budgeting, planning, invitations and guests — Leora brings every part of your
					wedding into a single, beautifully designed workspace.
				</p>

				<div class="mt-7 flex flex-wrap gap-3">
					<Button href="/signup" size="lg">Start Planning</Button>
					<Button href="/vendors" variant="outline" size="lg">Explore Vendors</Button>
				</div>

				<dl class="mt-10 flex flex-wrap gap-x-10 gap-y-4">
					<div>
						<dt class="font-display text-2xl font-extrabold">
							{data.stats.vendorCount.toLocaleString()}
						</dt>
						<dd class="text-muted-foreground text-[13px]">Vendors listed</dd>
					</div>
					<div>
						<dt class="font-display text-2xl font-extrabold">{data.stats.regionCount}</dt>
						<dd class="text-muted-foreground text-[13px]">Cities covered</dd>
					</div>
					<div>
						<dt class="font-display text-2xl font-extrabold">
							{data.vendors.length ? `${Number(data.vendors[0].ratingAvg).toFixed(1)}/5` : '—'}
						</dt>
						<dd class="text-muted-foreground text-[13px]">Top rated vendor</dd>
					</div>
				</dl>
			</div>

			<!--
				Floating layered cards, as in the PHP hero: absolutely positioned,
				each with its own rotation and animation-delay so they drift out of
				phase with one another.
			-->
			<div class="hero-visual" use:inview={startHero}>
				<div class="floatcard fc-budget">
					<div class="fc-label">Budget Tracker</div>
					<div class="fc-value">ETB {heroBudget.toLocaleString()}</div>
					<div class="fc-bar"><i style="width:{heroBarWidth}%"></i></div>
					<div class="fc-mini-row">
						<span>Spent: 64%</span>
						<span class="font-semibold text-(--color-success)">On track</span>
					</div>
				</div>

				<div class="floatcard fc-vendor">
					<div class="fc-label">Vendor Match</div>
					{#if data.vendors.length}
						{@const v = data.vendors[0]}
						<div class="fc-value">{v.businessName}</div>
						<div class="fc-mini-row">
							<span><span class="fc-dot"></span>{v.categoryName}</span>
							<span class="text-primary inline-flex items-center gap-0.5">
								<Star class="size-3 fill-current" />{Number(v.ratingAvg).toFixed(1)}
							</span>
						</div>
					{:else}
						<div class="text-muted-foreground mt-2 text-[12.5px]">
							No vendors listed yet — they appear here as they're approved.
						</div>
					{/if}
				</div>

				<div class="floatcard fc-timeline">
					<div class="fc-label">Wedding Timeline</div>
					<div class="mt-2.5 flex flex-col gap-2 text-[13px]">
						<div class="flex items-center gap-1.5">
							<Check class="size-3.5 text-(--color-success)" /> Venue booked
						</div>
						<div class="flex items-center gap-1.5">
							<Check class="size-3.5 text-(--color-success)" /> Melse date set
						</div>
						<div class="text-accent-foreground flex items-center gap-1.5 font-bold">
							<ArrowRight class="size-3.5" /> Send invitations
						</div>
					</div>
				</div>

				<div class="floatcard fc-guest">
					<div class="fc-label">Guests</div>
					<div class="fc-value">318</div>
					<div class="fc-mini-row"><span>RSVP'd: 240</span></div>
				</div>
			</div>
		</div>
	</div>
</section>

<!-- ========================= MARKETPLACE ========================= -->
<section class="mx-auto max-w-[1180px] px-5 py-16 sm:px-8">
	<p class="text-accent-foreground text-[12.5px] font-bold tracking-[0.08em] uppercase">
		Marketplace
	</p>
	<h2 class="font-display mt-2 text-3xl font-extrabold text-balance sm:text-4xl">
		Every vendor your wedding needs
	</h2>
	<p class="text-muted-foreground mt-3 max-w-2xl text-[15px]">
		Browse verified photographers, venues, decorators and more — with real reviews, real pricing, and
		real availability.
	</p>

	{#if data.categories.length}
		<div class="mt-9 grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
			{#each data.categories as category (category.id)}
				<a href="/vendors?category={category.slug}">
					<Card.Root class="cat-card hover:border-primary h-full">
						<Card.Content class="flex items-center gap-3.5">
							<span class="bg-accent grid size-11 shrink-0 place-items-center rounded-xl text-xl">
								{category.icon ?? '💍'}
							</span>
							<span>
								<span class="block text-sm font-bold">{category.name}</span>
								<span class="text-muted-foreground block text-[12.5px]">
									{category.count}
									{category.count === 1 ? 'vendor' : 'vendors'}
								</span>
							</span>
						</Card.Content>
					</Card.Root>
				</a>
			{/each}
		</div>
	{:else}
		<Card.Root class="mt-9">
			<Card.Content class="text-muted-foreground py-12 text-center text-sm">
				No vendor categories yet.
			</Card.Content>
		</Card.Root>
	{/if}
</section>

<!-- ====================== BUDGET ESTIMATOR ====================== -->
<section class="bg-card border-y">
	<div class="mx-auto max-w-[1180px] px-5 py-16 sm:px-8">
		<p class="text-accent-foreground text-[12.5px] font-bold tracking-[0.08em] uppercase">
			Budget Estimator
		</p>
		<h2 class="font-display mt-2 text-3xl font-extrabold text-balance sm:text-4xl">
			Know your number before you book anything
		</h2>
		<p class="text-muted-foreground mt-3 max-w-2xl text-[15px]">
			Adjust guest count and venue tier to see a live estimate, broken down by category.
		</p>

		<div class="mt-9 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
			<Card.Root>
				<Card.Content class="space-y-6">
					<div>
						<label
							for="guestSlider"
							class="mb-2.5 flex items-baseline justify-between"
						>
							<span class="text-muted-foreground text-[12.5px] font-bold">Guest count</span>
							<span class="font-display text-lg font-extrabold">{guests} guests</span>
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
						<span class="text-muted-foreground mb-2.5 block text-[12.5px] font-bold">
							Venue tier
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
						<p class="text-muted-foreground text-[12.5px] font-bold">Estimated Total</p>
						<p class="font-display mt-1 text-4xl font-extrabold">
							{estimateTotal.toLocaleString()}
							<span class="text-muted-foreground text-lg font-bold">ETB</span>
						</p>
					</div>
				</Card.Content>
			</Card.Root>

			<Card.Root>
				<Card.Content class="space-y-3.5">
					{#each breakdown as line (line.name)}
						<div class="grid grid-cols-[1fr_auto] items-center gap-3 sm:grid-cols-[9rem_1fr_4rem]">
							<span class="text-[13px] font-medium">{line.name}</span>
							<div class="bg-muted col-span-2 h-1.5 overflow-hidden rounded-full sm:col-span-1">
								<div class="est-bar bg-primary h-full rounded-full" style="width:{line.pct * 100}%"></div>
							</div>
							<b class="text-right text-[13px] font-bold tabular-nums">
								{Math.round(line.amount / 1000)}k
							</b>
						</div>
					{/each}
					<Button href="/budget-estimator" variant="outline" class="mt-3 w-full">
						Open the full Budget Estimator
						<ArrowRight class="size-4" />
					</Button>
				</Card.Content>
			</Card.Root>
		</div>
	</div>
</section>

<!-- ====================== PLANNING DASHBOARD ====================== -->
<section class="mx-auto max-w-[1180px] px-5 py-16 sm:px-8">
	<p class="text-accent-foreground text-[12.5px] font-bold tracking-[0.08em] uppercase">
		Planning Dashboard
	</p>
	<h2 class="font-display mt-2 text-3xl font-extrabold text-balance sm:text-4xl">
		One workspace for the whole wedding
	</h2>
	<p class="text-muted-foreground mt-3 max-w-2xl text-[15px]">
		Track budget, tasks, vendors and guests — all updating live as you plan.
	</p>

	<div class="mt-9 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
		<Card.Root>
			<Card.Content class="space-y-3">
				<p class="text-muted-foreground text-[11.5px] font-bold tracking-[0.08em] uppercase">
					To do
				</p>
				{#each [['Finalize decor theme', 'Due in 5 days'], ['Confirm catering count', 'Due in 9 days']] as [title, due] (title)}
					<div class="bg-muted/50 rounded-xl px-4 py-3">
						<b class="block text-[13.5px]">{title}</b>
						<span class="text-muted-foreground text-[12.5px]">{due}</span>
					</div>
				{/each}
				<p class="text-muted-foreground pt-2 text-[11.5px] font-bold tracking-[0.08em] uppercase">
					In progress
				</p>
				<div class="bg-muted/50 rounded-xl px-4 py-3">
					<b class="block text-[13.5px]">Send invitations</b>
					<span class="text-muted-foreground text-[12.5px]">62% sent</span>
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
					<div class="text-muted-foreground text-[12.5px]">Wedding ready</div>
				</div>
				<div class="w-full border-t pt-4">
					<p class="text-muted-foreground flex justify-between text-[12.5px]">
						<span>Guests invited</span><b class="text-foreground">318</b>
					</p>
					<p class="text-muted-foreground mt-1.5 flex justify-between text-[12.5px]">
						<span>Confirmed</span><b class="text-foreground">240</b>
					</p>
				</div>
			</Card.Content>
		</Card.Root>
	</div>
</section>

<!-- ========================= LEORA CARD ========================= -->
<section class="mx-auto max-w-[1180px] px-5 py-16 sm:px-8">
	<p class="text-accent-foreground text-[12.5px] font-bold tracking-[0.08em] uppercase">
		The Leora Card
	</p>
	<h2 class="font-display mt-2 text-3xl font-extrabold text-balance sm:text-4xl">
		An invitation worth sharing
	</h2>
	<p class="text-muted-foreground mt-3 max-w-2xl text-[15px]">
		Every Leora Card comes with a live countdown, interactive map, guest RSVP flow and a personal QR
		check-in — wrapped in a design your guests will want to screenshot.
	</p>

	<div class="mt-9 grid gap-4 md:grid-cols-3">
		{#each cardFeatures as [num, title, body] (num)}
			<Card.Root class="h-full">
				<Card.Content>
					<span class="font-display text-primary text-2xl font-extrabold">{num}</span>
					<h3 class="mt-2 text-base font-bold">{title}</h3>
					<p class="text-muted-foreground mt-1.5 text-[13.5px] leading-relaxed">{body}</p>
				</Card.Content>
			</Card.Root>
		{/each}
	</div>
</section>

<!-- ======================= MULTI-EVENT ========================= -->
<section class="bg-card border-y">
	<div class="mx-auto max-w-[1180px] px-5 py-16 sm:px-8">
		<p class="text-accent-foreground text-[12.5px] font-bold tracking-[0.08em] uppercase">
			Multi-Event Support
		</p>
		<h2 class="font-display mt-2 text-3xl font-extrabold text-balance sm:text-4xl">
			Ethiopian weddings are more than one day
		</h2>
		<p class="text-muted-foreground mt-3 max-w-2xl text-[15px]">
			Plan every event in the celebration under a single guest list and budget.
		</p>

		<ol class="mt-9 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
			{#each events as [num, name] (num)}
				<li>
					<Card.Root class="event-node h-full">
						<Card.Content class="flex items-center gap-3.5">
							<span
								class="bg-accent text-accent-foreground font-display grid size-10 shrink-0 place-items-center rounded-xl text-sm font-extrabold"
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
			<p class="text-accent-foreground text-[12.5px] font-bold tracking-[0.08em] uppercase">
				Wedding Timeline
			</p>
			<h3 class="font-display mt-2 text-2xl font-extrabold">
				From engagement to reception, mapped out
			</h3>
			<ol class="mt-6 grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
				{#each timeline as [name, when] (name)}
					<li class="border-primary border-l-2 py-1 pl-3.5">
						<p class="text-[13.5px] font-bold">{name}</p>
						<p class="text-muted-foreground text-[12.5px]">{when}</p>
					</li>
				{/each}
			</ol>
		</div>
	</div>
</section>

<!-- ======================== TESTIMONIALS ======================== -->
{#if data.testimonials.length}
	<section class="mx-auto max-w-[1180px] px-5 py-16 sm:px-8">
		<p class="text-accent-foreground text-[12.5px] font-bold tracking-[0.08em] uppercase">
			Testimonials
		</p>
		<h2 class="font-display mt-2 text-3xl font-extrabold sm:text-4xl">
			Couples planning with Leora
		</h2>

		<div class="mt-9 grid gap-4 md:grid-cols-3">
			{#each data.testimonials as t (t.id)}
				<Card.Root class="h-full">
					<Card.Content class="flex h-full flex-col">
						<p class="text-[14px] leading-relaxed">"{t.message}"</p>
						<div class="mt-5 flex items-center gap-3 pt-4">
							<span
								class="bg-accent text-accent-foreground grid size-10 shrink-0 place-items-center rounded-full text-[12.5px] font-bold"
							>
								{initials(t.name)}
							</span>
							<span>
								<span class="block text-[13.5px] font-bold">{t.name}</span>
								{#if t.position}
									<span class="text-muted-foreground block text-[12.5px]">{t.position}</span>
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
	<p class="text-accent-foreground text-[12.5px] font-bold tracking-[0.08em] uppercase">FAQ</p>
	<h2 class="font-display mt-2 text-3xl font-extrabold sm:text-4xl">Common questions</h2>

	<Accordion.Root type="single" class="mt-7">
		{#each faqs as [q, a], i (q)}
			<Accordion.Item value={`faq-${i}`}>
				<Accordion.Trigger class="text-left text-[15px] font-semibold">{q}</Accordion.Trigger>
				<Accordion.Content class="text-muted-foreground text-[14px] leading-relaxed">
					{a}
				</Accordion.Content>
			</Accordion.Item>
		{/each}
	</Accordion.Root>
</section>

<!-- ============================ CTA ============================ -->
<section class="mx-auto max-w-[1180px] px-5 pb-8 sm:px-8">
	<Card.Root class="from-leora-royal to-leora-navy overflow-hidden border-0 bg-linear-160">
		<Card.Content class="relative px-8 py-14 text-center">
			<div class="pointer-events-none absolute inset-0 bg-(image:--hero-glow)"></div>
			<div class="relative">
				<p class="text-[12.5px] font-bold tracking-[0.08em] text-(--leora-gold) uppercase">
					Get Started
				</p>
				<h2 class="font-display mt-2 text-3xl font-extrabold text-balance text-white sm:text-4xl">
					Your wedding, planned properly
				</h2>
				<p class="mx-auto mt-3 max-w-lg text-[15px] text-white/70">
					Join couples across Ethiopia planning smarter, from first vendor call to final RSVP.
				</p>
				<div class="mt-7 flex flex-wrap justify-center gap-3">
					<Button href="/signup" size="lg">Start Planning</Button>
					<Button
						href="/vendors"
						size="lg"
						variant="outline"
						class="border-white/25 bg-transparent text-white hover:bg-white/10 hover:text-white"
					>
						Explore Vendors
					</Button>
				</div>
				<p class="mt-6 flex items-center justify-center gap-1.5 text-[12.5px] text-white/50">
					<ShieldCheck class="size-3.5" />
					Every vendor is identity and business checked
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
