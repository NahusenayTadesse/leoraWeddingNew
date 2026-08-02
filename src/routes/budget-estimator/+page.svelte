<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import * as Tabs from '$lib/components/ui/tabs';
	import { Badge } from '$lib/components/ui/badge';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { Label } from '$lib/components/ui/label';
	import { Input } from '$lib/components/ui/input';
	import { formatPriceRange } from '$lib/price';
	import { Star, Lock, ArrowRight } from '@lucide/svelte';

	let { data } = $props();

	// ---------------- Mode 1: build your own estimate ----------------
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

	const tiers: { key: Tier; label: string; blurb: string }[] = [
		{ key: 'traditional', label: 'Traditional', blurb: 'Community hall, family catering' },
		{ key: 'outdoor', label: 'Outdoor', blurb: 'Garden or resort, full service' },
		{ key: 'luxury', label: 'Luxury', blurb: 'Five-star hotel ballroom' }
	];

	// ---------------- Mode 2: compare real vendors ----------------
	let selected = $state<number[]>([]);
	let budgetInput = $state('');

	const maxCompare = data.limits.maxCompare;
	const atLimit = $derived(selected.length >= maxCompare);

	function toggle(id: number, checked: boolean) {
		if (checked) {
			if (selected.length < maxCompare) selected = [...selected, id];
		} else {
			selected = selected.filter((v) => v !== id);
		}
	}

	const chosen = $derived(data.vendors.filter((v) => selected.includes(v.id)));

	/**
	 * The same transparent value score as api/vendors/compare.php: half rating,
	 * half price relative to the group average. Computed from real vendor rows.
	 */
	const scored = $derived.by(() => {
		if (chosen.length === 0) return [];
		const mid = (v: (typeof chosen)[number]) =>
			(Number(v.priceMin ?? 0) + Number(v.priceMax ?? 0)) / 2;
		const avg = chosen.reduce((t, v) => t + mid(v), 0) / chosen.length;
		return chosen
			.map((v) => {
				const priceScore = avg > 0 ? Math.max(0, 1 - (mid(v) - avg) / Math.max(avg, 1)) : 0.5;
				const ratingScore = Number(v.ratingAvg) / 5;
				return { ...v, valueScore: Math.round((priceScore * 0.5 + ratingScore * 0.5) * 100) };
			})
			.sort((a, b) => b.valueScore - a.valueScore);
	});

	const budgetNum = $derived(Number(budgetInput.replace(/[^\d.]/g, '')) || 0);
	const withinBudget = $derived(
		budgetNum > 0
			? data.vendors.filter((v) => Number(v.priceMin ?? 0) <= budgetNum).slice(0, 8)
			: []
	);
</script>

<svelte:head>
	<title>Budget Estimator — Leora Events</title>
	<meta
		name="description"
		content="Estimate your Ethiopian wedding budget by guest count and venue tier, or compare real vendors side by side."
	/>
</svelte:head>

<section class="mx-auto max-w-[1080px] px-5 pt-14 pb-8 text-center sm:px-8">
	<p class="text-accent-foreground text-[12.5px] font-bold tracking-[0.08em] uppercase">
		Budget Estimator
	</p>
	<h1 class="font-display mx-auto mt-2 max-w-2xl text-3xl font-extrabold text-balance sm:text-4xl">
		Know your number before you book anything
	</h1>
	<p class="text-muted-foreground mx-auto mt-3 max-w-xl text-[15px]">
		Build an estimate from guest count and venue tier, or compare real vendors on price and rating.
	</p>
</section>

<section class="mx-auto max-w-[1080px] px-5 pb-20 sm:px-8">
	<Tabs.Root value="build">
		<Tabs.List class="mx-auto">
			<Tabs.Trigger value="build">Build your own</Tabs.Trigger>
			<Tabs.Trigger value="compare">Compare vendors</Tabs.Trigger>
		</Tabs.List>

		<!-- ================= MODE 1 ================= -->
		<Tabs.Content value="build" class="mt-8">
			<div class="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
				<Card.Root>
					<Card.Content class="space-y-6">
						<div>
							<label for="guests" class="mb-2.5 flex items-baseline justify-between">
								<span class="text-muted-foreground text-[12.5px] font-bold">Guest count</span>
								<span class="font-display text-lg font-extrabold">{guests} guests</span>
							</label>
							<input
								id="guests"
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
							<div class="grid gap-2">
								{#each tiers as t (t.key)}
									<button
										type="button"
										onclick={() => (tier = t.key)}
										class="rounded-xl border px-4 py-3 text-left transition-colors
											{tier === t.key ? 'border-primary bg-accent' : 'hover:border-primary/50'}"
									>
										<span class="block text-[13.5px] font-bold">{t.label}</span>
										<span class="text-muted-foreground block text-[12.5px]">{t.blurb}</span>
										<span class="text-muted-foreground block text-[12px]">
											~ETB {tierMultiplier[t.key].toLocaleString()} per guest
										</span>
									</button>
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
					<Card.Header>
						<Card.Title class="font-display text-base font-extrabold">
							Where the money goes
						</Card.Title>
					</Card.Header>
					<Card.Content class="space-y-3.5">
						{#each breakdown as line (line.name)}
							<div class="grid grid-cols-[1fr_auto] items-center gap-3 sm:grid-cols-[9rem_1fr_5rem]">
								<span class="text-[13px] font-medium">{line.name}</span>
								<div class="bg-muted col-span-2 h-1.5 overflow-hidden rounded-full sm:col-span-1">
									<div class="bg-primary h-full rounded-full" style="width:{line.pct * 100}%"></div>
								</div>
								<b class="text-right text-[13px] font-bold tabular-nums">
									{line.amount.toLocaleString()}
								</b>
							</div>
						{/each}

						{#if data.hasCouple}
							<Button href="/wedding/budget" class="mt-4 w-full">
								Save this into my budget planner
								<ArrowRight class="size-4" />
							</Button>
						{:else}
							<Button href="/signup" class="mt-4 w-full">
								Create an account to save this
								<ArrowRight class="size-4" />
							</Button>
						{/if}
					</Card.Content>
				</Card.Root>
			</div>
		</Tabs.Content>

		<!-- ================= MODE 2 ================= -->
		<Tabs.Content value="compare" class="mt-8">
			{#if data.limits.exhausted}
				<Card.Root class="border-primary mb-6">
					<Card.Content class="flex flex-wrap items-center justify-between gap-4">
						<span class="flex items-center gap-2.5">
							<Lock class="text-accent-foreground size-4 shrink-0" />
							<span class="text-[13.5px]">
								You've used all {data.limits.maxRuns} free comparison runs. Upgrade to Golden for unlimited
								access.
							</span>
						</span>
						<Button href="/pricing" size="sm">Upgrade</Button>
					</Card.Content>
				</Card.Root>
			{:else if data.planSlug === 'free'}
				<Card.Root class="mb-6">
					<Card.Content class="flex flex-wrap items-center justify-between gap-4">
						<span class="text-muted-foreground text-[13.5px]">
							Free plan: compare up to {maxCompare} vendors, {data.limits.maxRuns! -
								data.limits.runsUsed} of {data.limits.maxRuns} runs left.
						</span>
						<Button href="/pricing" variant="outline" size="sm">Compare 5 with Golden</Button>
					</Card.Content>
				</Card.Root>
			{/if}

			<div class="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
				<Card.Root>
					<Card.Header>
						<Card.Title class="font-display text-base font-extrabold">
							Pick vendors
							<span class="text-muted-foreground text-[12.5px] font-medium">
								({selected.length}/{maxCompare})
							</span>
						</Card.Title>
					</Card.Header>
					<Card.Content>
						{#if data.vendors.length}
							<ul class="max-h-[26rem] divide-y overflow-y-auto">
								{#each data.vendors as v (v.id)}
									{@const isSel = selected.includes(v.id)}
									<li class="flex items-center gap-3 py-2.5">
										<Checkbox
											id="v{v.id}"
											checked={isSel}
											disabled={!isSel && atLimit}
											onCheckedChange={(c) => toggle(v.id, c === true)}
										/>
										<Label for="v{v.id}" class="flex-1 cursor-pointer font-normal">
											<span class="block text-[13.5px] font-semibold">{v.businessName}</span>
											<span class="text-muted-foreground block text-[12px]">
												{v.categoryName}{v.city ? ` · ${v.city}` : ''}
											</span>
										</Label>
										<span class="text-primary flex items-center gap-0.5 text-[12.5px]">
											<Star class="size-3 fill-current" />
											{Number(v.ratingAvg).toFixed(1)}
										</span>
									</li>
								{/each}
							</ul>
						{:else}
							<p class="text-muted-foreground py-10 text-center text-sm">
								No approved vendors to compare yet.
							</p>
						{/if}
					</Card.Content>
				</Card.Root>

				<div class="space-y-6">
					<Card.Root>
						<Card.Header>
							<Card.Title class="font-display text-base font-extrabold">Comparison</Card.Title>
						</Card.Header>
						<Card.Content>
							{#if scored.length}
								<div class="overflow-x-auto">
									<table class="w-full text-[13px]">
										<thead>
											<tr class="text-muted-foreground border-b text-left">
												<th class="pb-2 font-semibold">Vendor</th>
												<th class="pb-2 font-semibold">Price</th>
												<th class="pb-2 font-semibold">Rating</th>
												<th class="pb-2 text-right font-semibold">Value</th>
											</tr>
										</thead>
										<tbody>
											{#each scored as v, i (v.id)}
												<tr class="border-b last:border-0">
													<td class="py-2.5">
														<span class="font-semibold">{v.businessName}</span>
														{#if i === 0}
															<Badge class="ml-1.5">Best value</Badge>
														{/if}
													</td>
													<td class="text-muted-foreground py-2.5">
														{formatPriceRange(v.priceMin, v.priceMax) ?? '—'}
													</td>
													<td class="py-2.5">
														{Number(v.ratingAvg).toFixed(1)}
														<span class="text-muted-foreground">({v.reviewCount})</span>
													</td>
													<td class="py-2.5 text-right font-bold tabular-nums">{v.valueScore}</td>
												</tr>
											{/each}
										</tbody>
									</table>
								</div>
							{:else}
								<p class="text-muted-foreground py-10 text-center text-sm">
									Select up to {maxCompare} vendors to compare them side by side.
								</p>
							{/if}
						</Card.Content>
					</Card.Root>

					<Card.Root>
						<Card.Header>
							<Card.Title class="font-display text-base font-extrabold">
								I have a budget — what fits?
							</Card.Title>
						</Card.Header>
						<Card.Content class="space-y-3">
							<Label for="budget" class="text-muted-foreground text-[12.5px] font-bold">
								Your total budget (ETB)
							</Label>
							<Input id="budget" inputmode="numeric" placeholder="500000" bind:value={budgetInput} />

							{#if budgetNum > 0}
								{#if withinBudget.length}
									<ul class="divide-y pt-1">
										{#each withinBudget as v (v.id)}
											<li class="flex items-center justify-between gap-3 py-2">
												<a href="/vendors/{v.id}" class="text-[13px] font-medium hover:underline">
													{v.businessName}
												</a>
												<span class="text-muted-foreground text-[12.5px]">
													{formatPriceRange(v.priceMin, v.priceMax) ?? '—'}
												</span>
											</li>
										{/each}
									</ul>
								{:else}
									<p class="text-muted-foreground pt-1 text-[13px]">
										Nothing starts below ETB {budgetNum.toLocaleString()} yet. Try a higher figure, or
										browse the <a href="/vendors" class="underline">full marketplace</a>.
									</p>
								{/if}
							{/if}
						</Card.Content>
					</Card.Root>
				</div>
			</div>
		</Tabs.Content>
	</Tabs.Root>
</section>

<style>
	/* Range inputs need vendor pseudo-elements Tailwind cannot target. */
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
