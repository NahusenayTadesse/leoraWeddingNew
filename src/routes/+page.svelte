<script lang="ts">
	import { onMount } from 'svelte';
	import {
		Calculator,
		Search,
		Brain,
		PieChart,
		RefreshCw,
		CheckCircle,
		Sparkles,
		Building2,
		Camera,
		Utensils,
		Flower2,
		Music,
		Car,
		Shirt,
		Cake,
		Mail,
		Gem,
		Wine
	} from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import VendorCard from '$lib/components/VendorCard.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import { vendors, categories, testimonials } from '$lib/data.js';
	import { Chart, ArcElement, Tooltip, Legend, DoughnutController } from 'chart.js';

	Chart.register(ArcElement, Tooltip, Legend, DoughnutController);

	let heroChartCanvas: HTMLCanvasElement;

	const iconMap: Record<string, any> = {
		'building-2': Building2,
		camera: Camera,
		utensils: Utensils,
		'flower-2': Flower2,
		music: Music,
		car: Car,
		sparkles: Sparkles,
		shirt: Shirt,
		cake: Cake,
		mail: Mail,
		gem: Gem,
		wine: Wine
	};

	onMount(() => {
		if (heroChartCanvas) {
			new Chart(heroChartCanvas, {
				type: 'doughnut',
				data: {
					labels: ['Venue', 'Catering', 'Photo', 'Decor', 'Music', 'Other'],
					datasets: [
						{
							data: [35, 25, 12, 15, 8, 5],
							backgroundColor: ['#C9A227', '#D4A574', '#9CAF88', '#E8B4B8', '#B8A9C9', '#D4C4B0'],
							borderWidth: 0
						}
					]
				},
				options: {
					responsive: true,
					maintainAspectRatio: false,
					plugins: { legend: { display: false } },
					cutout: '70%'
				}
			});
		}
	});

	const budgetSample = [
		{ label: 'Venue & Hotel', amount: '180,000', color: 'bg-leora-gold' },
		{ label: 'Photography', amount: '60,000', color: 'bg-leora-champagne' },
		{ label: 'Catering', amount: '125,000', color: 'bg-leora-sage' },
		{ label: 'Decor', amount: '75,000', color: 'bg-leora-blush' }
	];
</script>

<svelte:head>
	<title>Leora Events | Ethiopia's #1 Luxury Wedding Platform</title>
</svelte:head>

<!-- ── HERO ── -->
<section class="relative flex min-h-screen items-center overflow-hidden">
	<div
		class="from-leora-ivory to-leora-champagne/30 absolute inset-0 bg-gradient-to-br via-white"
	></div>
	<div class="pointer-events-none absolute top-0 right-0 h-full w-1/2 opacity-10">
		<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" class="h-full w-full">
			<path
				fill="#C9A227"
				d="M44.7,-76.4C58.9,-69.2,71.8,-59.1,81.6,-46.6C91.4,-34.1,98.1,-19.2,95.8,-5.3C93.5,8.6,82.2,21.5,71.1,32.6C60,43.7,49.1,53,37.2,60.7C25.3,68.4,12.4,74.5,-1.1,76.3C-14.6,78.1,-29.2,75.6,-42.2,69.1C-55.2,62.6,-66.6,52.1,-74.7,39.4C-82.8,26.7,-87.6,11.8,-85.8,-2.3C-84,-16.4,-75.6,-29.7,-65.3,-40.8C-55,-51.9,-42.8,-60.8,-30.1,-68.8C-17.4,-76.8,-4.2,-83.9,9.2,-83.8C22.6,-83.7,35.2,-76.4,44.7,-76.4Z"
				transform="translate(100 100)"
			/>
		</svg>
	</div>

	<div
		class="relative z-10 mx-auto grid max-w-7xl items-center gap-12 px-4 py-24 sm:px-6 lg:grid-cols-2 lg:px-8"
	>
		<div class="space-y-8">
			<div
				class="bg-leora-gold/10 border-leora-gold/20 inline-flex items-center gap-2 rounded-full border px-4 py-2"
			>
				<Sparkles class="text-leora-gold h-4 w-4" />
				<span class="text-leora-gold text-sm font-medium">Ethiopia's #1 Wedding Platform</span>
			</div>

			<h1 class="font-display text-leora-charcoal text-5xl leading-tight font-semibold md:text-7xl">
				Plan Your <span class="text-gradient italic">Perfect</span> Wedding With Confidence
			</h1>

			<p class="max-w-lg text-lg leading-relaxed text-gray-600">
				Find the best wedding vendors, manage your budget with AI-powered recommendations, and
				organize your dream Ethiopian wedding all in one elegant platform.
			</p>

			<div class="flex flex-col gap-4 sm:flex-row">
				<Button href="/budget" size="lg" class="flex items-center gap-2">
					<Calculator class="h-5 w-5" />
					Plan My Wedding
				</Button>
				<Button href="/vendors" variant="secondary" size="lg" class="flex items-center gap-2">
					<Search class="h-5 w-5" />
					Browse Vendors
				</Button>
			</div>

			<div class="flex items-center gap-6 pt-4">
				{#each [['500+', 'Vendors'], ['2,000+', 'Happy Couples'], ['98%', 'Satisfaction']] as [num, label]}
					<div class="text-center">
						<div class="font-display text-leora-gold text-3xl font-bold">{num}</div>
						<div class="text-sm text-gray-500">{label}</div>
					</div>
					{#if label !== 'Satisfaction'}
						<div class="bg-leora-gold/20 h-12 w-px"></div>
					{/if}
				{/each}
			</div>
		</div>

		<!-- Hero Images Grid -->
		<div class="relative hidden lg:block">
			<div
				class="from-leora-gold/20 to-leora-champagne/20 absolute inset-0 rounded-3xl bg-gradient-to-r blur-3xl"
			></div>
			<div class="relative grid grid-cols-2 gap-4">
				<div class="mt-8 space-y-4">
					<div class="shadow-elevated h-64 overflow-hidden rounded-2xl">
						<img
							src="https://images.unsplash.com/photo-1519741497674-611481863552?w=400&h=600&fit=crop"
							alt="Wedding ceremony"
							class="h-full w-full object-cover"
						/>
					</div>
					<div class="shadow-elevated h-48 overflow-hidden rounded-2xl">
						<img
							src="https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=400&h=400&fit=crop"
							alt="Wedding decor"
							class="h-full w-full object-cover"
						/>
					</div>
				</div>
				<div class="space-y-4">
					<div class="shadow-elevated h-48 overflow-hidden rounded-2xl">
						<img
							src="https://images.unsplash.com/photo-1606216794074-735e91aa2c92?w=400&h=400&fit=crop"
							alt="Couple"
							class="h-full w-full object-cover"
						/>
					</div>
					<div class="shadow-elevated h-64 overflow-hidden rounded-2xl">
						<img
							src="https://images.unsplash.com/photo-1510076857177-4ba7a1a5b5f3?w=400&h=600&fit=crop"
							alt="Venue"
							class="h-full w-full object-cover"
						/>
					</div>
				</div>
			</div>
		</div>
	</div>
</section>

<!-- ── HOW IT WORKS ── -->
<section class="bg-white py-24">
	<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
		<div class="mb-16 text-center">
			<h2 class="font-display text-leora-charcoal mb-4 text-4xl font-semibold md:text-5xl">
				How It Works
			</h2>
			<p class="mx-auto max-w-2xl text-gray-600">
				Your journey to the perfect wedding in three simple steps
			</p>
		</div>

		<div class="grid gap-8 md:grid-cols-3">
			{#each [{ num: '01', title: 'Set Your Budget', desc: 'Enter your total wedding budget and let our AI recommend the perfect vendor combination within your range.' }, { num: '02', title: 'Discover Vendors', desc: 'Browse curated vendors by category, compare prices, view portfolios, and read authentic reviews.' }, { num: '03', title: 'Plan & Book', desc: 'Organize your wedding timeline, track payments, and book your dream team all in one dashboard.' }] as step}
				<div class="group relative text-center">
					<div
						class="bg-leora-gold/10 group-hover:bg-leora-gold/20 mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full transition-colors"
					>
						<span class="font-display text-leora-gold text-3xl font-bold">{step.num}</span>
					</div>
					<h3 class="font-display mb-3 text-2xl font-semibold">{step.title}</h3>
					<p class="text-gray-600">{step.desc}</p>
				</div>
			{/each}
		</div>
	</div>
</section>

<!-- ── AI BUDGET DEMO ── -->
<section class="bg-leora-ivory py-24">
	<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
		<div class="grid items-center gap-16 lg:grid-cols-2">
			<div>
				<h2 class="font-display text-leora-charcoal mb-6 text-4xl font-semibold md:text-5xl">
					AI-Powered Budget Planning
				</h2>
				<p class="mb-8 text-lg text-gray-600">
					Our intelligent system analyzes thousands of weddings to recommend the optimal vendor
					allocation for your budget.
				</p>

				<div class="space-y-4">
					{#each [[Brain, 'Smart Recommendations', 'AI suggests best vendor combinations'], [PieChart, 'Visual Breakdown', 'See exactly where your money goes'], [RefreshCw, 'Flexible Adjustments', 'Swap vendors and see real-time updates']] as [Icon, title, desc]}
						<div class="flex items-center gap-4">
							<div
								class="bg-leora-gold/10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full"
							>
								<Icon class="text-leora-gold h-6 w-6" />
							</div>
							<div>
								<h4 class="font-semibold">{title}</h4>
								<p class="text-sm text-gray-600">{desc}</p>
							</div>
						</div>
					{/each}
				</div>

				<Button href="/budget" size="lg" class="mt-8">Try Budget Planner</Button>
			</div>

			<!-- Demo Chart Card -->
			<div class="glass-card shadow-elevated rounded-3xl p-8">
				<div class="mb-6 flex items-center justify-between">
					<h3 class="font-display text-xl font-semibold">Budget Breakdown</h3>
					<span class="text-sm text-gray-500">Sample: 500,000 ETB</span>
				</div>

				<div class="relative mb-6 h-64">
					<canvas bind:this={heroChartCanvas}></canvas>
				</div>

				<div class="space-y-3">
					{#each budgetSample as item}
						<div class="flex items-center justify-between rounded-lg bg-white p-3">
							<div class="flex items-center gap-3">
								<div class="h-3 w-3 rounded-full {item.color}"></div>
								<span class="text-sm">{item.label}</span>
							</div>
							<span class="text-leora-gold font-semibold">{item.amount} ETB</span>
						</div>
					{/each}
				</div>
			</div>
		</div>
	</div>
</section>

<!-- ── VENDOR CATEGORIES ── -->
<section class="bg-white py-24">
	<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
		<div class="mb-12 text-center">
			<h2 class="font-display text-leora-charcoal mb-4 text-4xl font-semibold md:text-5xl">
				Browse by Category
			</h2>
			<p class="text-gray-600">Find the perfect vendor for every aspect of your wedding</p>
		</div>

		<div class="grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-6">
			{#each categories as cat}
				{@const Icon = iconMap[cat.icon]}
				<a
					href="/vendors"
					class="category-card glass-card hover:border-leora-gold/30 cursor-pointer rounded-xl p-4 text-center"
				>
					<div
						class="bg-leora-gold/10 mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full"
					>
						{#if Icon}
							<Icon class="text-leora-gold h-6 w-6" />
						{/if}
					</div>
					<h4 class="text-leora-charcoal text-xs leading-tight font-medium">{cat.name}</h4>
					<p class="text-xs text-gray-500">{cat.count} vendors</p>
				</a>
			{/each}
		</div>
	</div>
</section>

<!-- ── FEATURED VENDORS ── -->
<section class="bg-leora-ivory py-24">
	<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
		<div class="mb-12 flex items-center justify-between">
			<div>
				<h2 class="font-display text-leora-charcoal mb-2 text-4xl font-semibold md:text-5xl">
					Featured Vendors
				</h2>
				<p class="text-gray-600">Handpicked top-rated vendors for your dream wedding</p>
			</div>
			<Button href="/vendors" variant="secondary">View All</Button>
		</div>

		<div class="grid gap-6 md:grid-cols-3">
			{#each vendors.slice(0, 3) as vendor}
				<VendorCard {vendor} onAddToPlan={(id) => alert(`Vendor ${id} added to your plan!`)} />
			{/each}
		</div>
	</div>
</section>

<!-- ── TESTIMONIALS ── -->
<section class="bg-white py-24">
	<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
		<div class="mb-16 text-center">
			<h2 class="font-display text-leora-charcoal mb-4 text-4xl font-semibold md:text-5xl">
				Happy Couples
			</h2>
			<p class="text-gray-600">Real stories from real weddings planned with Leora</p>
		</div>

		<div class="grid gap-8 md:grid-cols-3">
			{#each testimonials as t}
				<div class="glass-card hover-lift rounded-2xl p-8">
					<div class="mb-4 flex items-center gap-1">
						{#each { length: 5 } as _}
							<span class="text-leora-gold text-lg">★</span>
						{/each}
					</div>
					<p class="mb-6 text-gray-600 italic">"{t.quote}"</p>
					<div class="flex items-center gap-3">
						<img
							src={t.image}
							alt={t.name}
							class="border-leora-gold/30 h-12 w-12 rounded-full border-2 object-cover"
						/>
						<div>
							<p class="text-leora-charcoal font-semibold">{t.name}</p>
							<p class="text-xs text-gray-500">{t.date}</p>
						</div>
					</div>
				</div>
			{/each}
		</div>
	</div>
</section>

<!-- ── VENDOR CTA ── -->
<section class="bg-leora-charcoal relative overflow-hidden py-24 text-white">
	<div class="pointer-events-none absolute inset-0 opacity-10">
		<svg viewBox="0 0 100 100" preserveAspectRatio="none" class="h-full w-full">
			<path d="M0,50 Q25,30 50,50 T100,50 L100,100 L0,100 Z" fill="#C9A227" />
		</svg>
	</div>
	<div class="relative z-10 mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
		<h2 class="font-display mb-6 text-4xl font-semibold md:text-5xl">Are You a Wedding Vendor?</h2>
		<p class="mx-auto mb-8 max-w-2xl text-lg text-gray-300">
			Join Ethiopia's premier wedding platform. Start free, pay only when you get bookings.
		</p>

		<div class="flex flex-col justify-center gap-4 sm:flex-row">
			<Button href="/vendor-dashboard" size="lg">Join as Vendor</Button>
			<button
				class="rounded-full border-2 border-white/30 px-8 py-4 text-lg font-medium transition-colors hover:bg-white/10"
			>
				Learn More
			</button>
		</div>

		<div class="mt-12 flex flex-wrap justify-center gap-6 text-sm text-gray-400">
			{#each ['Free for first 2 bookings', 'No monthly fees to start', 'Instant exposure'] as perk}
				<span class="flex items-center gap-2">
					<CheckCircle class="text-leora-gold h-4 w-4" />
					{perk}
				</span>
			{/each}
		</div>
	</div>
</section>

<Footer />
