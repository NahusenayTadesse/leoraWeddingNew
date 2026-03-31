<script lang="ts">
	import { onMount } from 'svelte';
	import {
		RefreshCw,
		Building2,
		Utensils,
		Camera,
		Flower2,
		Music,
		MoreHorizontal
	} from '@lucide/svelte';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { budgetCategories } from '$lib/data.js';
	import {
		Chart,
		BarElement,
		BarController,
		CategoryScale,
		LinearScale,
		Tooltip,
		Legend
	} from 'chart.js';

	Chart.register(BarElement, BarController, CategoryScale, LinearScale, Tooltip, Legend);

	const iconMap: Record<string, any> = {
		'building-2': Building2,
		utensils: Utensils,
		camera: Camera,
		'flower-2': Flower2,
		music: Music,
		'more-horizontal': MoreHorizontal
	};

	let totalBudget = $state(500000);
	let guestCount = $state(300);
	let weddingStyle = $state('Traditional Ethiopian');
	let selectedCategories = $state<Set<number>>(new Set());

	let budgetChartCanvas: HTMLCanvasElement;
	let budgetChart: Chart | null = null;

	let breakdown = $derived(
		budgetCategories.map((cat) => ({
			...cat,
			amount: Math.round(totalBudget * (cat.percent / 100))
		}))
	);

	let allocated = $derived(breakdown.reduce((sum, c) => sum + c.amount, 0));
	let remaining = $derived(totalBudget - allocated);
	let progressPct = $derived(Math.min(100, (allocated / totalBudget) * 100));

	function toggleCategory(idx: number) {
		const next = new Set(selectedCategories);
		if (next.has(idx)) next.delete(idx);
		else next.add(idx);
		selectedCategories = next;
	}

	function updateChart() {
		if (budgetChart) {
			budgetChart.data.datasets[0].data = breakdown.map((c) => c.amount);
			budgetChart.update();
		}
	}

	$effect(() => {
		// react to totalBudget changes
		totalBudget;
		updateChart();
	});

	onMount(() => {
		budgetChart = new Chart(budgetChartCanvas, {
			type: 'bar',
			data: {
				labels: budgetCategories.map((c) => c.name),
				datasets: [
					{
						label: 'Amount (ETB)',
						data: breakdown.map((c) => c.amount),
						backgroundColor: budgetCategories.map((c) => c.color),
						borderRadius: 8
					}
				]
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				plugins: { legend: { display: false } },
				scales: {
					y: {
						beginAtZero: true,
						grid: { color: 'rgba(201,162,39,0.1)' },
						ticks: {
							callback: (v) => 'ETB ' + Number(v).toLocaleString()
						}
					},
					x: { grid: { display: false } }
				}
			}
		});

		return () => budgetChart?.destroy();
	});

	import SelectComp from '$lib/formComponents/SelectComp.svelte';
</script>

<svelte:head>
	<title>AI Budget Planner — Leora Events</title>
</svelte:head>

<div class="min-h-screen bg-leora-ivory pb-24">
	<div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
		<!-- Page Header -->
		<div class="mb-12 text-center">
			<h1 class="font-display mb-4 text-4xl font-semibold text-leora-charcoal md:text-5xl">
				AI Budget Planner
			</h1>
			<p class="mx-auto max-w-2xl text-gray-600">
				Enter your total budget and let our intelligent system recommend the perfect vendor
				combination for your dream wedding.
			</p>
		</div>

		<div class="grid gap-8 lg:grid-cols-3">
			<!-- ── Input Panel ── -->
			<div class="lg:col-span-1">
				<div class="glass-card shadow-soft sticky top-32 rounded-2xl p-6">
					<h3 class="font-display mb-6 text-xl font-semibold">Your Wedding Budget</h3>

					<div class="mb-6">
						<label class="mb-2 block text-sm font-medium text-gray-700">Total Budget (ETB)</label>
						<div class="relative">
							<span class="absolute top-1/2 left-4 -translate-y-1/2 text-sm text-gray-500">ETB</span
							>
							<Input bind:value={totalBudget} type="number" class="pl-14 text-lg font-semibold" />
						</div>
					</div>

					<div class="mb-6">
						<label class="mb-2 block text-sm font-medium text-gray-700">Expected Guests</label>
						<Input bind:value={guestCount} type="number" />
					</div>

					<div class="mb-6">
						<label class="mb-2 block text-sm font-medium text-gray-700">Wedding Style</label>
						<SelectComp
							bind:value={weddingStyle}
							name="weddingStyle"
							items={[
								{ value: 'Traditional Ethiopian', name: 'Traditional Ethiopian' },
								{ value: 'Modern Western', name: 'Modern Western' },
								{ value: 'Mixed Cultural', name: 'Mixed Cultural' },
								{ value: 'Destination Wedding', name: 'Destination Wedding' }
							]}
						/>
						<!-- <select
							bind:value={weddingStyle}
							class="w-full rounded-xl border border-leora-gold/20 bg-white px-4 py-3 text-sm focus:border-leora-gold focus:outline-none"
						>
							<option>Traditional Ethiopian</option>
							<option>Modern Western</option>
							<option>Mixed Cultural</option>
							<option>Destination Wedding</option>
						</select> -->
					</div>

					<Button class="mb-4 w-full" size="lg">
						<RefreshCw class="mr-2 h-4 w-4" />
						Recalculate
					</Button>

					<div class="space-y-2 border-t border-leora-gold/10 pt-4">
						<div class="flex items-center justify-between">
							<span class="text-sm text-gray-600">Allocated</span>
							<span class="font-semibold text-leora-gold">ETB {allocated.toLocaleString()}</span>
						</div>
						<div class="flex items-center justify-between">
							<span class="text-sm text-gray-600">Remaining</span>
							<span class="font-semibold text-green-600">ETB {remaining.toLocaleString()}</span>
						</div>
						<div class="mt-3 h-2 overflow-hidden rounded-full bg-gray-200">
							<div
								class="h-full rounded-full bg-leora-gold transition-all duration-500"
								style="width: {progressPct}%"
							></div>
						</div>
					</div>
				</div>
			</div>

			<!-- ── Breakdown Panel ── -->
			<div class="space-y-6 lg:col-span-2">
				<!-- Bar Chart -->
				<div class="glass-card shadow-soft rounded-2xl p-6">
					<h3 class="font-display mb-4 text-xl font-semibold">Budget Distribution</h3>
					<div class="h-64">
						<canvas bind:this={budgetChartCanvas}></canvas>
					</div>
				</div>

				<!-- Category Pills -->
				<div class="grid gap-4 md:grid-cols-2">
					{#each breakdown as cat, i}
						{@const Icon = iconMap[cat.icon]}
						<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
						<div
							class="budget-pill glass-card flex cursor-pointer items-center justify-between rounded-xl p-4 transition-all hover:border-leora-gold/30"
							class:ring-2={selectedCategories.has(i)}
							class:ring-leora-gold={selectedCategories.has(i)}
							onclick={() => toggleCategory(i)}
						>
							<div class="flex items-center gap-3">
								<div
									class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
									style="background-color: {cat.color}20"
								>
									{#if Icon}
										<Icon class="h-5 w-5" style="color: {cat.color}" />
									{/if}
								</div>
								<div>
									<p class="text-sm font-medium">{cat.name}</p>
									<p class="text-xs text-gray-500">{cat.percent}% of budget</p>
								</div>
							</div>
							<div class="text-right">
								<p class="font-bold text-leora-charcoal">ETB {cat.amount.toLocaleString()}</p>
								<p class="text-xs text-leora-gold">3 vendors</p>
							</div>
						</div>
					{/each}
				</div>

				<!-- CTA -->
				<div
					class="glass-card shadow-soft flex flex-col items-center justify-between gap-4 rounded-2xl p-6 sm:flex-row"
				>
					<div>
						<h3 class="font-display text-lg font-semibold">Ready to find vendors?</h3>
						<p class="text-sm text-gray-600">Browse vendors that fit your budget categories</p>
					</div>
					<Button href="/vendors" size="lg">Browse Vendors</Button>
				</div>
			</div>
		</div>
	</div>
</div>
