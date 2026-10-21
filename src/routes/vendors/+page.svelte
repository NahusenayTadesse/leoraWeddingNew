<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
	import ActionForm from '@nahu/admin-kit/formComponents/ActionForm.svelte';
	import HiddenField from '@nahu/admin-kit/formComponents/HiddenField.svelte';
	import { formatPriceRange } from '$lib/price';
	import { assetUrl } from '$lib/assetUrl';
	import { goto } from '$app/navigation';
	import { page as pageState } from '$app/state';
	import * as Card from '@nahu/admin-kit/components/ui/card/index.js';
	import * as Select from '@nahu/admin-kit/components/ui/select/index.js';
	import { Input } from '@nahu/admin-kit/components/ui/input/index.js';
	import { Button } from '@nahu/admin-kit/components/ui/button/index.js';
	import { Badge } from '@nahu/admin-kit/components/ui/badge/index.js';
	import { Separator } from '@nahu/admin-kit/components/ui/separator/index.js';
	import { Checkbox } from '@nahu/admin-kit/components/ui/checkbox/index.js';
	import { Slider } from '@nahu/admin-kit/components/ui/slider/index.js';
	import { SvelteSet } from 'svelte/reactivity';
	import DateInput from '@nahu/admin-kit/formComponents/DateInput.svelte';
	import {
		Search,
		BadgeCheck,
		MapPin,
		Heart,
		Store,
		Sparkles,
		ChevronLeft,
		ChevronRight
	} from '@lucide/svelte';

	let { data } = $props();

	const SORT_ITEMS = [
		{ value: 'recommended', name: m.vdir_sort_recommended() },
		{ value: 'rating', name: m.vdir_sort_rating() },
		{ value: 'newest', name: m.vdir_sort_newest() },
		{ value: 'name', name: m.vdir_sort_name() }
	];

	/** Cycles the app's chart palette so placeholder tiles read as distinct categories. */
	const MEDIA_GRADIENTS = [
		'from-primary/30 to-primary/5',
		'from-chart-2/30 to-chart-2/5',
		'from-chart-3/30 to-chart-3/5',
		'from-chart-4/30 to-chart-4/5',
		'from-chart-5/30 to-chart-5/5'
	];
	const mediaGradient = (categoryId: number) =>
		MEDIA_GRADIENTS[categoryId % MEDIA_GRADIENTS.length];

	// Seeded from the URL, then re-synced below when it changes elsewhere (back/forward, links).
	// svelte-ignore state_referenced_locally
	let query = $state(data.applied.q);
	let debounce: ReturnType<typeof setTimeout>;

	// svelte-ignore state_referenced_locally
	const selectedCategories = new SvelteSet(data.applied.categoryIds.map(String));
	// svelte-ignore state_referenced_locally
	let minRating = $state(data.applied.minRating);

	// svelte-ignore state_referenced_locally
	let lastApplied = $state.snapshot(data.applied);
	$effect(() => {
		const applied = data.applied;
		if (JSON.stringify(applied) === JSON.stringify(lastApplied)) return;
		lastApplied = $state.snapshot(applied);
		// Don't overwrite what someone is still typing.
		if (document.activeElement?.id !== 'vendor-search') query = applied.q;
		selectedCategories.clear();
		for (const id of applied.categoryIds) selectedCategories.add(String(id));
		minRating = applied.minRating;
	});

	const favorites = $derived(new Set(data.favoriteIds));

	function apply(patch: Record<string, string | number | null>, resetPage = true) {
		// eslint-disable-next-line svelte/prefer-svelte-reactivity -- a local copy, not state
		const params = new URLSearchParams(pageState.url.searchParams);
		for (const [key, value] of Object.entries(patch)) {
			if (value === null || value === '' || value === 'all') params.delete(key);
			else params.set(key, String(value));
		}
		if (resetPage) params.delete('page');
		goto(`?${params.toString()}`, { keepFocus: true, noScroll: true });
	}

	function onSearchInput() {
		clearTimeout(debounce);
		debounce = setTimeout(() => apply({ q: query }), 350);
	}

	function toggleCategory(value: string) {
		if (selectedCategories.has(value)) selectedCategories.delete(value);
		else selectedCategories.add(value);
		apply({ category: selectedCategories.size ? [...selectedCategories].join(',') : null });
	}

	function clearAllFilters() {
		query = '';
		selectedCategories.clear();
		minRating = 0;
		apply({
			q: null,
			category: null,
			city: null,
			minRating: null,
			date: null,
			guests: null,
			budget: null
		});
	}

	const hasFilters = $derived(
		!!data.applied.q ||
			data.applied.categoryIds.length > 0 ||
			!!data.applied.city ||
			data.applied.minRating > 0 ||
			!!data.applied.date ||
			!!data.applied.guests ||
			!!data.applied.budget
	);

	const sortLabel = $derived(
		SORT_ITEMS.find((s) => s.value === data.applied.sort)?.name ?? m.vdir_sort_recommended()
	);
</script>

<svelte:head>
	<title>{m.vdir_meta_title()}</title>
	<meta name="description" content={m.vdir_meta_description()} />
	<meta property="og:title" content={m.vdir_meta_title()} />
	<meta property="og:description" content={m.vdir_meta_description()} />
</svelte:head>

<div class="mx-auto max-w-7xl px-4 py-10 lg:px-6">
	<div class="max-w-xl">
		<span
			class="inline-flex items-center gap-2 text-xs font-bold tracking-widest text-accent-foreground uppercase before:h-px before:w-3.5 before:bg-primary"
		>
			{m.vdir_eyebrow()}
		</span>
		<h1 class="mt-3 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
			{m.vdir_title()}
		</h1>
		<p class="mt-3 text-[15px] text-muted-foreground">
			{m.vdir_lead()}
		</p>
	</div>

	<div class="mt-7 flex flex-wrap gap-3">
		<div class="relative min-w-0 flex-1 sm:max-w-sm">
			<Search class="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
			<Input
				id="vendor-search"
				bind:value={query}
				oninput={onSearchInput}
				placeholder={m.vdir_search()}
				class="pl-9"
			/>
		</div>

		<Select.Root type="single" value={data.applied.sort} onValueChange={(v) => apply({ sort: v })}>
			<Select.Trigger class="w-44">Sort: {sortLabel}</Select.Trigger>
			<Select.Content>
				{#each SORT_ITEMS as item (item.value)}
					<Select.Item value={item.value}>{item.name}</Select.Item>
				{/each}
			</Select.Content>
		</Select.Root>
	</div>

	<div class="mt-8 grid items-start gap-9 lg:grid-cols-[250px_1fr]">
		<!-- Filters -->
		<aside class="lg:sticky lg:top-20">
			<Card.Root class="gap-0 p-5">
				<div>
					<h3 class="mb-3 text-xs font-bold tracking-wide text-muted-foreground uppercase">
						{m.vdir_category()}
					</h3>
					<div class="space-y-1">
						{#each data.filters.categoryItems as item (item.value)}
							<label class="flex cursor-pointer items-center gap-2.5 py-1 text-sm select-none">
								<Checkbox
									checked={selectedCategories.has(item.value)}
									onCheckedChange={() => toggleCategory(item.value)}
								/>
								<span class="flex-1 truncate">{item.name}</span>
								<span class="text-xs text-muted-foreground">{item.count}</span>
							</label>
						{/each}
					</div>
				</div>

				<Separator class="my-6" />

				<div>
					<h3 class="mb-3 text-xs font-bold tracking-wide text-muted-foreground uppercase">
						{m.vdir_region()}
					</h3>
					<Select.Root
						type="single"
						value={data.applied.city || 'all'}
						onValueChange={(v) => apply({ city: v })}
					>
						<Select.Trigger class="w-full"
							>{data.applied.city || m.vdir_all_regions()}</Select.Trigger
						>
						<Select.Content>
							<Select.Item value="all">{m.vdir_all_regions()}</Select.Item>
							{#each data.filters.cityItems as item (item.value)}
								<Select.Item value={item.value}>{item.name}</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
				</div>

				<Separator class="my-6" />

				<div class="space-y-3">
					<h3 class="text-xs font-bold tracking-wide text-muted-foreground uppercase">
						{m.vdir_your_wedding()}
					</h3>
					<label class="block space-y-1 text-sm">
						<span>{m.vdir_date()}</span>
						<DateInput
							name="date"
							oldDays={false}
							futureDays
							bind:value={() => data.applied.date, (v) => apply({ date: v || null })}
						/>
					</label>
					<label class="block space-y-1 text-sm">
						<span>{m.vdir_guests()}</span>
						<Input
							type="number"
							min="1"
							inputmode="numeric"
							placeholder="300"
							value={data.applied.guests ?? ''}
							onchange={(e) => apply({ guests: e.currentTarget.value })}
						/>
					</label>
					<label class="block space-y-1 text-sm">
						<span>{m.vdir_budget()}</span>
						<Input
							type="number"
							min="1"
							step="1000"
							inputmode="numeric"
							placeholder="100000"
							value={data.applied.budget ?? ''}
							onchange={(e) => apply({ budget: e.currentTarget.value })}
						/>
					</label>
					{#if data.mine}
						<button
							type="button"
							class="text-sm font-medium text-accent-foreground hover:underline"
							onclick={() =>
								apply({ date: data.mine?.date ?? null, guests: data.mine?.guests ?? null })}
						>
							{m.vdir_use_mine()}
						</button>
					{/if}
				</div>

				<Separator class="my-6" />

				<div>
					<h3 class="mb-3 text-xs font-bold tracking-wide text-muted-foreground uppercase">
						{m.vdir_min_rating()}
					</h3>
					<Slider
						type="single"
						bind:value={minRating}
						min={0}
						max={5}
						step={0.5}
						onValueCommit={(v) => apply({ minRating: v || null })}
					/>
					<p class="mt-2 text-sm font-semibold">{m.vdir_rating_up({ rating: minRating })}</p>
				</div>

				{#if hasFilters}
					<Separator class="my-6" />
					<button
						type="button"
						class="text-sm font-medium text-accent-foreground hover:underline"
						onclick={clearAllFilters}
					>
						{m.vdir_clear()}
					</button>
				{/if}
			</Card.Root>
		</aside>

		<!-- Results -->
		<div>
			<p class="mb-4 text-sm text-muted-foreground">
				{m.vdir_showing({ count: data.total })}
			</p>

			{#if data.vendors.length === 0}
				<Card.Root class="p-14 text-center">
					<Store class="mx-auto size-10 text-muted-foreground" />
					<p class="mt-4 font-medium">{m.vdir_none()}</p>
					<p class="mt-1 text-sm text-muted-foreground">
						{m.vdir_none_hint()}
					</p>
				</Card.Root>
			{:else}
				<div class="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
					{#each data.vendors as vendor (vendor.id)}
						<Card.Root class="group overflow-hidden p-0 transition-shadow hover:shadow-md">
							<div class="relative">
								<a href="/vendors/{vendor.id}" class="block">
									<div class="relative aspect-4/3 overflow-hidden bg-muted">
										{#if vendor.cover}
											<img
												src={assetUrl(vendor.cover)}
												alt={vendor.businessName}
												loading="lazy"
												class="size-full object-cover transition-transform duration-300 group-hover:scale-105"
											/>
										{:else}
											<div
												class="flex size-full items-center justify-center bg-gradient-to-br text-5xl {mediaGradient(
													vendor.categoryId
												)}"
											>
												{vendor.categoryIcon ?? '🏪'}
											</div>
										{/if}
									</div>
								</a>

								{#if vendor.isFeatured}
									<Badge class="absolute top-3 left-3 gap-1">
										<Sparkles class="size-3" /> Featured
									</Badge>
								{/if}

								<ActionForm action="?/favorite" class="absolute top-3 right-3">
									<HiddenField name="vendorId" value={vendor.id} />
									<button
										type="submit"
										class="flex size-8 items-center justify-center rounded-full bg-background/90 shadow-sm"
										aria-label={favorites.has(vendor.id) ? m.vdir_unsave() : m.vdir_save()}
									>
										<Heart
											class="size-4 {favorites.has(vendor.id)
												? 'fill-red-500 text-red-500'
												: 'text-foreground'}"
										/>
									</button>
								</ActionForm>
							</div>

							<div class="p-4">
								<div class="flex items-start justify-between gap-2">
									<div class="min-w-0">
										<a href="/vendors/{vendor.id}" class="hover:underline">
											<h2 class="flex items-center gap-1.5 truncate font-semibold">
												{vendor.businessName}
												{#if vendor.isVerified}
													<BadgeCheck class="size-4 shrink-0 text-primary" />
												{/if}
											</h2>
										</a>
										{#if vendor.categoryName}
											<p class="mt-0.5 text-xs text-muted-foreground">{vendor.categoryName}</p>
										{/if}
									</div>

									{#if vendor.reviewCount > 0}
										<span
											class="shrink-0 text-xs font-bold whitespace-nowrap text-accent-foreground"
										>
											★ {vendor.avgRating?.toFixed(1)}
										</span>
									{/if}
								</div>

								<p class="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
									{#if vendor.city}
										<MapPin class="size-3.5" />{vendor.city} ·
									{/if}
									{m.vdir_reviews({ count: vendor.reviewCount })}
								</p>

								{#if formatPriceRange(vendor.priceMin, vendor.priceMax)}
									<Separator class="my-3" />
									<p class="text-sm font-semibold">
										{formatPriceRange(vendor.priceMin, vendor.priceMax)}
									</p>
								{/if}
							</div>
						</Card.Root>
					{/each}
				</div>

				<!-- Pagination -->
				{#if data.pages > 1}
					<div class="mt-10 flex items-center justify-center gap-2">
						<Button
							variant="outline"
							size="sm"
							disabled={data.page <= 1}
							onclick={() => apply({ page: data.page - 1 }, false)}
						>
							<ChevronLeft class="size-4" />
						</Button>

						<span class="px-3 text-sm text-muted-foreground">
							{m.vdir_page({ page: data.page, pages: data.pages })}
						</span>

						<Button
							variant="outline"
							size="sm"
							disabled={data.page >= data.pages}
							onclick={() => apply({ page: data.page + 1 }, false)}
						>
							<ChevronRight class="size-4" />
						</Button>
					</div>
				{/if}
			{/if}
		</div>
	</div>
</div>
