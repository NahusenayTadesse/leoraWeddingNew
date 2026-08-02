<script lang="ts">
	import { superForm } from 'sveltekit-superforms/client';
	import { toast } from 'svelte-sonner';
	import InputComp from '$lib/formComponents/InputComp.svelte';
	import LoadingBtn from '$lib/formComponents/LoadingBtn.svelte';
	import Errors from '$lib/formComponents/Errors.svelte';
	import DialogComp from '$lib/formComponents/DialogComp.svelte';
	import Signup from '$lib/forms/Signup.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input';
	import { Save, ArrowRight, RotateCcw, Scale, TriangleAlert } from '@lucide/svelte';

	let { data } = $props();

	// dataType: 'json' is required for the `allocations` array to survive the
	// round trip. It makes the form JS-only, which is fine for a planner behind
	// a sign-in prompt.
	const { form, errors, enhance, delayed, message, allErrors } = superForm(data.form, {
		dataType: 'json',
		resetForm: false
	});

	$effect(() => {
		if (!$message) return;
		if ($message.type === 'error') toast.error($message.text);
		else toast.success($message.text);
	});

	// ── Palette ──────────────────────────────────────────────────────────────
	// budget_categories has no colour column yet, so segments are coloured by
	// position from a fixed on-brand ramp. Deterministic, and it works for any
	// number of categories. Move these into the table when you get the chance.
	const PALETTE = [
		'oklch(0.74 0.13 85)',
		'oklch(0.55 0.09 30)',
		'oklch(0.64 0.07 155)',
		'oklch(0.48 0.10 300)',
		'oklch(0.70 0.11 60)',
		'oklch(0.58 0.08 230)',
		'oklch(0.66 0.12 20)',
		'oklch(0.52 0.06 120)'
	];
	const colorFor = (i: number) => PALETTE[i % PALETTE.length];

	// ── Derived money ────────────────────────────────────────────────────────
	const totalBudget = $derived(Number($form.totalBudget) || 0);
	const guestCount = $derived(Number($form.expectedGuests) || 0);

	const rows = $derived(
		data.categories.map((category, i) => {
			const allocation = $form.allocations.find((a) => a.categoryId === category.id);
			const percent = allocation?.percent ?? 0;
			return {
				...category,
				index: i,
				percent,
				amount: Math.round((totalBudget * percent) / 100),
				color: colorFor(i),
				// Deep-links into the shop with this category pre-filtered and the
				// allocation as a ceiling. Falls back to a text search when the
				// budget category has no matching service category.
				href: category.serviceCategoryId
					? `/shop?cat=${category.serviceCategoryId}&max=${Math.round((totalBudget * percent) / 100)}&sort=price_desc`
					: `/shop?q=${encodeURIComponent(category.name)}`
			};
		})
	);

	const allocatedPercent = $derived(rows.reduce((sum, r) => sum + r.percent, 0));
	const allocated = $derived(rows.reduce((sum, r) => sum + r.amount, 0));
	const unassigned = $derived(Math.max(0, totalBudget - allocated));
	const overAllocated = $derived(allocatedPercent > 100.001);

	const perGuest = $derived(guestCount > 0 ? Math.round(totalBudget / guestCount) : 0);

	const shopAllHref = $derived(
		unassigned > 0 ? `/shop?max=${Math.round(unassigned)}&sort=price_desc` : '/shop'
	);

	const etb = (n: number) => 'ETB ' + Math.round(n).toLocaleString();

	// ── Allocation editing ───────────────────────────────────────────────────
	function setPercent(categoryId: number, value: number) {
		const clamped = Math.max(0, Math.min(100, Math.round(value) || 0));
		$form.allocations = $form.allocations.map((a) =>
			a.categoryId === categoryId ? { ...a, percent: clamped } : a
		);
	}

	function splitEvenly() {
		const n = $form.allocations.length;
		if (!n) return;
		const base = Math.floor(100 / n);
		$form.allocations = $form.allocations.map((a, i) => ({
			...a,
			// Give the remainder to the first few so it lands on exactly 100.
			percent: base + (i < 100 - base * n ? 1 : 0)
		}));
	}

	function scaleTo100() {
		if (allocatedPercent === 0) return splitEvenly();
		const factor = 100 / allocatedPercent;
		let running = 0;
		$form.allocations = $form.allocations.map((a, i, arr) => {
			if (i === arr.length - 1) return { ...a, percent: Math.max(0, 100 - running) };
			const next = Math.round(a.percent * factor);
			running += next;
			return { ...a, percent: next };
		});
	}
</script>

<svelte:head>
	<title>Budget planner — Leora Events</title>
	<meta
		name="description"
		content="Set your wedding budget, split it across categories, and browse vendors that fit."
	/>
</svelte:head>

<div class="min-h-dvh bg-background pb-24 text-foreground">
	<div class="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
		<!-- Header. Copy is deliberately plain: nothing on this page is AI, and
		     naming it so was setting an expectation the page can't meet. -->
		<header class="mb-10 max-w-2xl">
			<h1 class="font-display text-4xl font-semibold tracking-tight md:text-5xl">
				Budget planner
			</h1>
			<p class="mt-3 text-muted-foreground">
				Set your total, split it across the parts of the day, and jump straight to vendors who fit
				each slice.
			</p>
		</header>

		<div class="grid gap-8 lg:grid-cols-3">
			<!-- ── Inputs ── -->
			<div class="lg:col-span-1">
				<form
					use:enhance
					method="POST"
					action="?/budget"
					id="budget-form"
					class="sticky top-24 space-y-6 rounded-2xl border bg-card p-6 shadow-sm"
				>
					<Errors allErrors={$allErrors} />

					<h2 class="font-display text-xl font-semibold">Your wedding</h2>

					<InputComp
						type="number"
						name="totalBudget"
						{form}
						{errors}
						label="Total budget"
						placeholder="How much are you working with, in ETB?"
					/>

					<InputComp
						type="date"
						name="weddingDate"
						year
						oldDays={false}
						{form}
						{errors}
						label="Wedding date"
						placeholder="Pick your date"
					/>

					<InputComp
						type="number"
						name="expectedGuests"
						{form}
						{errors}
						label="Expected guests"
						placeholder="How many people are coming?"
					/>

					<InputComp
						{form}
						{errors}
						label="Wedding style"
						type="select"
						name="weddingStyle"
						items={[
							{ value: 'Traditional Ethiopian', name: 'Traditional Ethiopian' },
							{ value: 'Modern Western', name: 'Modern Western' },
							{ value: 'Mixed Cultural', name: 'Mixed Cultural' },
							{ value: 'Destination Wedding', name: 'Destination Wedding' }
						]}
					/>

					{#if data.user}
						<Button type="submit" class="w-full" size="lg" form="budget-form" disabled={$delayed}>
							{#if $delayed}
								<LoadingBtn name="Saving" />
							{:else}
								<Save class="mr-2 size-4" />
								Save budget
							{/if}
						</Button>
						{#if !data.hasCouple}
							<p class="text-xs text-muted-foreground">
								Saving needs a couple profile. You can still plan and browse without one.
							</p>
						{/if}
					{:else}
						<DialogComp class="w-full!" variant="default" title="Save budget" IconComp={Save}>
							<Signup data={data.signupForm} action="/signup/?/signup" />
						</DialogComp>
					{/if}

					<!-- Money summary. "Allocated" used to be a percentage of the budget
					     compared against the budget, so it always read ~100%. These are
					     two genuinely different numbers. -->
					<dl class="space-y-3 border-t pt-5 text-sm">
						<div class="flex items-baseline justify-between gap-2">
							<dt class="text-muted-foreground">Planned across categories</dt>
							<dd class="font-semibold tabular-nums">{etb(allocated)}</dd>
						</div>
						<div class="flex items-baseline justify-between gap-2">
							<dt class="text-muted-foreground">Left to spend</dt>
							<dd
								class="font-semibold tabular-nums {overAllocated
									? 'text-destructive'
									: 'text-foreground'}"
							>
								{overAllocated ? `${etb(allocated - totalBudget)} over` : etb(unassigned)}
							</dd>
						</div>

						<div
							class="h-2 overflow-hidden rounded-full bg-muted"
							role="progressbar"
							aria-valuenow={Math.round(Math.min(100, allocatedPercent))}
							aria-valuemin={0}
							aria-valuemax={100}
							aria-label="Share of budget planned across categories"
						>
							<div
								class="h-full rounded-full transition-[width] duration-500 motion-reduce:transition-none {overAllocated
									? 'bg-destructive'
									: 'bg-primary'}"
								style="width: {Math.min(100, allocatedPercent)}%"
							></div>
						</div>

						{#if guestCount > 0 && totalBudget > 0}
							<p class="pt-1 text-xs text-muted-foreground">
								That's {etb(perGuest)} per guest across {guestCount.toLocaleString()} people.
							</p>
						{/if}
					</dl>
				</form>
			</div>

			<!-- ── Allocation ── -->
			<div class="space-y-6 lg:col-span-2">
				<section class="rounded-2xl border bg-card p-6 shadow-sm">
					<div class="mb-5 flex flex-wrap items-center justify-between gap-3">
						<div>
							<h2 class="font-display text-xl font-semibold">How it splits</h2>
							<p class="text-sm text-muted-foreground">
								Drag any slider to move money between categories.
							</p>
						</div>
						<div class="flex gap-2">
							<Button variant="outline" size="sm" onclick={splitEvenly} type="button">
								<RotateCcw class="mr-1.5 size-3.5" />
								Split evenly
							</Button>
							<Button
								variant="outline"
								size="sm"
								onclick={scaleTo100}
								type="button"
								disabled={allocatedPercent === 100}
							>
								<Scale class="mr-1.5 size-3.5" />
								Balance to 100%
							</Button>
						</div>
					</div>

					<!-- Signature element: one continuous ribbon of the whole budget.
					     Replaces the Chart.js bar chart, which needed a MutationObserver
					     on <html class="dark"> to re-theme itself. CSS variables do that
					     for free. -->
					<div
						class="flex h-14 w-full overflow-hidden rounded-xl border bg-muted"
						role="img"
						aria-label={rows
							.filter((r) => r.percent > 0)
							.map((r) => `${r.name} ${r.percent}%`)
							.join(', ') || 'Nothing allocated yet'}
					>
						{#each rows.filter((r) => r.percent > 0) as row (row.id)}
							<div
								class="relative min-w-0 transition-[flex-grow] duration-300 motion-reduce:transition-none"
								style="flex: {row.percent} 0 0%; background-color: {row.color}"
								title="{row.name} — {row.percent}% · {etb(row.amount)}"
							>
								<span
									class="absolute inset-0 flex items-center justify-center truncate px-1 text-xs font-medium text-white/95 mix-blend-luminosity"
								>
									{row.percent >= 8 ? row.percent + '%' : ''}
								</span>
							</div>
						{/each}
						{#if allocatedPercent < 100}
							<div
								class="flex min-w-0 items-center justify-center text-xs text-muted-foreground"
								style="flex: {100 - allocatedPercent} 0 0%"
							>
								{100 - allocatedPercent >= 8 ? 'unassigned' : ''}
							</div>
						{/if}
					</div>

					<div class="mt-3 flex items-center justify-between text-sm">
						<span class="text-muted-foreground">
							{allocatedPercent}% assigned
							{#if unassigned > 0}
								· {etb(unassigned)} still free
							{/if}
						</span>
						{#if overAllocated}
							<span class="flex items-center gap-1.5 font-medium text-destructive">
								<TriangleAlert class="size-4" />
								Over by {allocatedPercent - 100}%
							</span>
						{/if}
					</div>
				</section>

				<!-- Category rows -->
				<section class="divide-y overflow-hidden rounded-2xl border bg-card shadow-sm">
					{#each rows as row (row.id)}
						<div class="flex flex-wrap items-center gap-x-4 gap-y-3 p-4 sm:flex-nowrap">
							<span
								class="size-3 shrink-0 rounded-full"
								style="background-color: {row.color}"
								aria-hidden="true"
							></span>

							<div class="min-w-0 flex-1">
								<p class="truncate font-medium">{row.name}</p>
								<p class="truncate text-xs text-muted-foreground">
									{#if row.serviceCategoryId}
										{row.vendorCount}
										{row.vendorCount === 1 ? 'listing' : 'listings'} available
									{:else}
										{row.description ?? 'No matching vendor category yet'}
									{/if}
								</p>
							</div>

							<div class="flex w-full items-center gap-3 sm:w-auto">
								<input
									type="range"
									min="0"
									max="100"
									step="1"
									value={row.percent}
									oninput={(e) => setPercent(row.id, Number(e.currentTarget.value))}
									class="h-2 w-full cursor-pointer appearance-none rounded-lg bg-muted accent-primary sm:w-32"
									aria-label={`${row.name} share of budget`}
								/>
								<Input
									type="number"
									min="0"
									max="100"
									value={row.percent}
									oninput={(e) => setPercent(row.id, Number(e.currentTarget.value))}
									class="h-9 w-16 text-center text-sm tabular-nums"
									aria-label={`${row.name} percent`}
								/>
							</div>

							<p class="w-28 shrink-0 text-right font-semibold tabular-nums">
								{etb(row.amount)}
							</p>

							<Button variant="ghost" size="sm" href={row.href} class="shrink-0">
								Browse
								<ArrowRight class="ml-1 size-3.5" />
							</Button>
						</div>
					{/each}

					{#if rows.length === 0}
						<div class="p-10 text-center">
							<p class="font-medium">No budget categories set up yet</p>
							<p class="mt-1 text-sm text-muted-foreground">
								Add rows to the budget_categories table and they'll appear here.
							</p>
						</div>
					{/if}
				</section>

				<!-- CTA -->
				<section
					class="flex flex-col items-start justify-between gap-4 rounded-2xl border bg-card p-6 shadow-sm sm:flex-row sm:items-center"
				>
					<div>
						<h2 class="font-display text-lg font-semibold">Ready to find vendors?</h2>
						<p class="text-sm text-muted-foreground">
							{#if totalBudget > 0}
								We'll show listings priced under {etb(unassigned > 0 ? unassigned : totalBudget)}.
							{:else}
								Set a budget above and we'll filter the marketplace to match.
							{/if}
						</p>
					</div>
					<Button href={shopAllHref} size="lg" class="shrink-0">
						Browse vendors
						<ArrowRight class="ml-2 size-4" />
					</Button>
				</section>
			</div>
		</div>
	</div>
</div>