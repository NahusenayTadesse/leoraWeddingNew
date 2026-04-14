<script lang="ts">
	import { onMount } from 'svelte';

	import { superForm } from 'sveltekit-superforms/client';
	import { toast } from 'svelte-sonner';
	import InputComp from '$lib/formComponents/InputComp.svelte';
	import LoadingBtn from '$lib/formComponents/LoadingBtn.svelte';

	import { useCart } from '$lib/hooks/cart.svelte.js';

	const cart = useCart();
	let { data } = $props();
	const { form, errors, enhance, delayed, message, allErrors } = superForm(data.form, {
		resetForm: false
	});

	$form.totalBudget = Number(data?.budget?.totalBudget);
	$form.expectedGuests = Number(data?.budget?.expectedGuests);
	$form.weddingStyle = data?.budget?.weddingStyle;
	$form.weddingDate = data?.budget?.weddingDate.toLocaleDateString('en-CA');

	$effect(() => {
		if ($message) {
			if ($message.type === 'error') toast.error($message.text);
			else {
				toast.success($message.text);
			}
		}
	});

	import {
		Building2,
		Utensils,
		Camera,
		Flower2,
		Music,
		Save,
		MoreHorizontal
	} from '@lucide/svelte';
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
	import DialogComp from '$lib/formComponents/DialogComp.svelte';
	import Signup from '$lib/forms/Signup.svelte';
	import Errors from '$lib/formComponents/Errors.svelte';

	Chart.register(BarElement, BarController, CategoryScale, LinearScale, Tooltip, Legend);

	const iconMap: Record<string, any> = {
		'building-2': Building2,
		utensils: Utensils,
		camera: Camera,
		'flower-2': Flower2,
		music: Music,
		'more-horizontal': MoreHorizontal
	};

	let totalBudget = $derived($form.totalBudget);
	let guestCount = $derived($form.expectedGuests);
	let weddingStyle = $derived($form.weddingStyle ?? 'Traditional Ethiopian');
	let selectedCategories = $state<Set<number>>(new Set());

	let budgetChartCanvas: HTMLCanvasElement = $state();
	let budgetChart: Chart | null = $state(null);

	let breakdown = $derived(
		budgetCategories.map((cat) => ({
			...cat,
			amount: Math.round($form.totalBudget * (cat.percent / 100))
		}))
	);

	let allocated = $derived(breakdown.reduce((sum, c) => sum + c.amount, 0));
	let remaining = $derived(totalBudget - useCart().totalPrice);
	let progressPct = $derived(Math.min(100, (allocated / totalBudget) * 100));

	function isDark() {
		return document.documentElement.classList.contains('dark');
	}

	function getChartTheme() {
		const dark = isDark();
		return {
			gridColor: dark ? 'rgba(201,162,39,0.08)' : 'rgba(201,162,39,0.12)',
			tickColor: dark ? '#9ca3af' : '#6b7280',
			labelColor: dark ? '#d1d5db' : '#374151'
		};
	}

	// ✅ Fix: access `breakdown` directly so Svelte 5 tracks it as a dependency.
	// Previously only `totalBudget` was accessed, so the chart wouldn't update
	// when `breakdown` changed for other reasons (e.g. future percent changes).
	$effect(() => {
		if (!budgetChart) return;
		const theme = getChartTheme();
		budgetChart.data.datasets[0].data = breakdown.map((c) => c.amount);
		(budgetChart.options.scales!.y!.grid as any).color = theme.gridColor;
		(budgetChart.options.scales!.y!.ticks as any).color = theme.tickColor;
		(budgetChart.options.scales!.x!.ticks as any).color = theme.labelColor;
		budgetChart.update('none'); // 'none' skips animation on every keystroke
	});

	function toggleCategory(idx: number) {
		const next = new Set(selectedCategories);
		if (next.has(idx)) next.delete(idx);
		else next.add(idx);

		selectedCategories = next;
	}

	onMount(() => {
		const theme = getChartTheme();

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
						grid: { color: theme.gridColor },
						ticks: {
							color: theme.tickColor,
							callback: (v) => 'ETB ' + Number(v).toLocaleString()
						}
					},
					x: {
						grid: { display: false },
						ticks: { color: theme.labelColor }
					}
				}
			}
		});

		// Re-theme the chart whenever Tailwind's `dark` class is toggled on <html>
		const observer = new MutationObserver(() => {
			if (!budgetChart) return;
			const t = getChartTheme();
			(budgetChart.options.scales!.y!.grid as any).color = t.gridColor;
			(budgetChart.options.scales!.y!.ticks as any).color = t.tickColor;
			(budgetChart.options.scales!.x!.ticks as any).color = t.labelColor;
			budgetChart.update();
		});
		observer.observe(document.documentElement, {
			attributes: true,
			attributeFilter: ['class']
		});

		return () => {
			budgetChart?.destroy();
			observer.disconnect();
		};
	});
</script>

<svelte:head>
	<title>AI Budget Planner — Leora Events</title>
</svelte:head>

<div class="min-h-screen bg-leora-ivory pb-24 dark:bg-gray-950">
	<div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
		<!-- Page Header -->
		<div class="mb-12 text-center">
			<h1
				class="font-display mb-4 text-4xl font-semibold text-leora-charcoal md:text-5xl dark:text-white"
			>
				AI Budget Planner
			</h1>
			<p class="mx-auto max-w-2xl text-gray-600 dark:text-gray-400">
				Enter your total budget and let our intelligent system recommend the perfect vendor
				combination for your dream wedding.
			</p>
		</div>

		<div class="grid gap-8 lg:grid-cols-3">
			<!-- ── Input Panel ── -->
			<div class="lg:col-span-1">
				<form
					use:enhance
					method="POST"
					action="?/budget"
					id="budget-form"
					class="glass-card shadow-soft sticky top-32 rounded-2xl p-6 dark:border
					dark:border-leora-gold/10 dark:bg-gray-900"
				>
					<Errors allErrors={$allErrors} />
					<h3 class="font-display mb-6 text-xl font-semibold text-leora-charcoal dark:text-white">
						Your Wedding Budget
					</h3>

					<div class="mb-6">
						<InputComp
							type="number"
							name="totalBudget"
							{form}
							{errors}
							label="Total Budget"
							placeholder="Enter your total budget in ETB"
						/>
					</div>

					<div class="mb-6">
						<InputComp
							type="date"
							name="weddingDate"
							year
							oldDays={false}
							{form}
							{errors}
							label="Wedding Date"
							placeholder="Select your wedding date"
						/>
					</div>

					<div class="mb-6">
						<InputComp
							type="number"
							name="expectedGuests"
							{form}
							{errors}
							label="Expected Guests"
							placeholder="Enter the number of guests"
						/>
					</div>

					<div class="mb-6">
						<InputComp
							{form}
							{errors}
							label="Wedding Style"
							type="select"
							name="weddingStyle"
							items={[
								{ value: 'Traditional Ethiopian', name: 'Traditional Ethiopian' },
								{ value: 'Modern Western', name: 'Modern Western' },
								{ value: 'Mixed Cultural', name: 'Mixed Cultural' },
								{ value: 'Destination Wedding', name: 'Destination Wedding' }
							]}
						/>
					</div>
					{#if data?.user}
						<Button type="submit" class="mb-4 w-full" size="lg" form="budget-form">
							{#if $delayed}
								<LoadingBtn name="Saving Budget" />
							{:else}
								<Save class="mr-2 h-4 w-4" />
								Save Budget
							{/if}
						</Button>
					{:else}
						<DialogComp class="w-full!" variant="default" title="Save Budget" IconComp={Save}>
							<Signup data={data?.signupForm} action="/signup/?/signup" />
						</DialogComp>
					{/if}

					<div class="space-y-2 border-t border-leora-gold/10 pt-4 dark:border-leora-gold/10">
						<div class="flex items-center justify-between">
							<span class="text-sm text-gray-600 dark:text-gray-400">Allocated</span>
							<span class="font-semibold text-leora-gold">
								ETB {allocated.toLocaleString()}
							</span>
						</div>
						<div class="flex items-center justify-between">
							<span class="text-sm text-gray-600 dark:text-gray-400">Remaining</span>
							<span
								class="font-semibold {remaining > 0
									? 'text-green-600 dark:text-green-400'
									: 'text-destructive'}"
							>
								ETB {remaining.toLocaleString()}
								{remaining > 0 ? '' : ' (exceeded)'}
							</span>
						</div>
						<div class="mt-3 h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
							<div
								class="h-full rounded-full bg-leora-gold transition-all duration-500"
								style="width: {progressPct}%"
							></div>
						</div>
					</div>
				</form>
			</div>

			<!-- ── Breakdown Panel ── -->
			<div class="space-y-6 lg:col-span-2">
				<!-- Bar Chart -->
				<div
					class="glass-card shadow-soft rounded-2xl p-6 dark:border dark:border-leora-gold/10 dark:bg-gray-900"
				>
					<h3 class="font-display mb-4 text-xl font-semibold text-leora-charcoal dark:text-white">
						Budget Distribution
					</h3>
					<div class="h-64">
						<canvas bind:this={budgetChartCanvas}></canvas>
					</div>
				</div>

				<!-- Category Pills -->
				<div class="grid gap-4 md:grid-cols-2">
					``
					{#each breakdown as cat, i (cat)}
						{@const Icon = iconMap[cat.icon]}
						<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
						<div
							class="glass-card budget-pill flex cursor-pointer items-center justify-between rounded-xl p-4 transition-all hover:border-leora-gold/30 dark:border dark:border-leora-gold/10 dark:bg-gray-900 dark:hover:border-leora-gold/30"
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
									<p class="text-sm font-medium text-leora-charcoal dark:text-white">
										{cat.name}
									</p>
									<p class="text-xs text-gray-500 dark:text-gray-400">
										{cat.percent}% of budget
									</p>
								</div>
							</div>
							<div class="text-right">
								<p class="font-bold text-leora-charcoal dark:text-white">
									ETB {cat.amount.toLocaleString()}
								</p>
								<p class="text-xs text-leora-gold">3 vendors</p>
							</div>
						</div>
					{/each}
				</div>

				<!-- CTA -->
				<div
					class="glass-card shadow-soft flex flex-col items-center justify-between gap-4 rounded-2xl p-6 sm:flex-row dark:border dark:border-leora-gold/10 dark:bg-gray-900"
				>
					<div>
						<h3 class="font-display text-lg font-semibold text-leora-charcoal dark:text-white">
							Ready to find vendors?
						</h3>
						<p class="text-sm text-gray-600 dark:text-gray-400">
							Browse vendors that fit your budget categories
						</p>
					</div>
					<Button href="/shop/#{totalBudget * 0.35}" size="lg">Browse Vendors</Button>
				</div>
			</div>
		</div>
	</div>
</div>
