<script lang="ts">
	import { formatPriceRange } from '$lib/price';
	import { assetUrl } from '$lib/assetUrl';
	import { goto } from '$app/navigation';
	import { page as pageState } from '$app/state';
	import { enhance as formEnhance } from '$app/forms';
	import * as Card from '$lib/components/ui/card';
	import * as Select from '$lib/components/ui/select';
	import { Input } from '$lib/components/ui/input';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Separator } from '$lib/components/ui/separator';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { Slider } from '$lib/components/ui/slider';
	import { SvelteSet } from 'svelte/reactivity';
	import {
		Search,
		BadgeCheck,
		MapPin,
		Heart,
		Store,
		Sparkles,
		X,
		ChevronLeft,
		ChevronRight
	} from '@lucide/svelte';

	let { data } = $props();

	const SORT_ITEMS = [
		{ value: 'recommended', name: 'Recommended' },
		{ value: 'rating', name: 'Highest rated' },
		{ value: 'newest', name: 'Newest' },
		{ value: 'name', name: 'A–Z' }
	];

	/** Cycles the app's chart palette so placeholder tiles read as distinct categories. */
	const MEDIA_GRADIENTS = [
		'from-primary/30 to-primary/5',
		'from-chart-2/30 to-chart-2/5',
		'from-chart-3/30 to-chart-3/5',
		'from-chart-4/30 to-chart-4/5',
		'from-chart-5/30 to-chart-5/5'
	];
	const mediaGradient = (categoryId: number) => MEDIA_GRADIENTS[categoryId % MEDIA_GRADIENTS.length];

	let query = $state(data.applied.q);
	let debounce: ReturnType<typeof setTimeout>;

	const selectedCategories = new SvelteSet(data.applied.categoryIds.map(String));
	let minRating = $state(data.applied.minRating);

	const favorites = $derived(new Set(data.favoriteIds));

	function apply(patch: Record<string, string | number | null>, resetPage = true) {
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
		apply({ q: null, category: null, city: null, minRating: null });
	}

	const hasFilters = $derived(
		!!data.applied.q ||
			data.applied.categoryIds.length > 0 ||
			!!data.applied.city ||
			data.applied.minRating > 0
	);

	const sortLabel = $derived(
		SORT_ITEMS.find((s) => s.value === data.applied.sort)?.name ?? 'Recommended'
	);
</script>

<svelte:head>
	<title>Wedding vendors · Leora Events</title>
	<meta
		name="description"
		content="Browse photographers, venues, caterers and more for your wedding in Ethiopia."
	/>
</svelte:head>

<div class="mx-auto max-w-7xl px-4 py-10 lg:px-6">
	<div class="max-w-xl">
		<span
			class="text-accent-foreground before:bg-primary inline-flex items-center gap-2 text-xs font-bold tracking-widest uppercase before:h-px before:w-3.5"
		>
			Vendor Marketplace
		</span>
		<h1 class="font-display mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
			Find every vendor for your wedding
		</h1>
		<p class="text-muted-foreground mt-3 text-[15px]">
			Verified photographers, venues, decorators, caterers and more — filter by category, region
			and rating.
		</p>
	</div>

	<div class="mt-7 flex flex-wrap gap-3">
		<div class="relative min-w-0 flex-1 sm:max-w-sm">
			<Search class="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
			<Input
				bind:value={query}
				oninput={onSearchInput}
				placeholder="Search vendors, e.g. 'photographer' or 'decor'"
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
					<h3 class="text-muted-foreground mb-3 text-xs font-bold tracking-wide uppercase">
						Category
					</h3>
					<div class="space-y-1">
						{#each data.filters.categoryItems as item (item.value)}
							<label class="flex cursor-pointer items-center gap-2.5 py-1 text-sm select-none">
								<Checkbox
									checked={selectedCategories.has(item.value)}
									onCheckedChange={() => toggleCategory(item.value)}
								/>
								<span class="flex-1 truncate">{item.name}</span>
								<span class="text-muted-foreground text-xs">{item.count}</span>
							</label>
						{/each}
					</div>
				</div>

				<Separator class="my-6" />

				<div>
					<h3 class="text-muted-foreground mb-3 text-xs font-bold tracking-wide uppercase">
						Region
					</h3>
					<Select.Root
						type="single"
						value={data.applied.city || 'all'}
						onValueChange={(v) => apply({ city: v })}
					>
						<Select.Trigger class="w-full">{data.applied.city || 'All regions'}</Select.Trigger>
						<Select.Content>
							<Select.Item value="all">All regions</Select.Item>
							{#each data.filters.cityItems as item (item.value)}
								<Select.Item value={item.value}>{item.name}</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
				</div>

				<Separator class="my-6" />

				<div>
					<h3 class="text-muted-foreground mb-3 text-xs font-bold tracking-wide uppercase">
						Minimum rating
					</h3>
					<Slider
						type="single"
						bind:value={minRating}
						min={0}
						max={5}
						step={0.5}
						onValueCommit={(v) => apply({ minRating: v || null })}
					/>
					<p class="mt-2 text-sm font-semibold">{minRating}★ and up</p>
				</div>

				{#if hasFilters}
					<Separator class="my-6" />
					<button
						type="button"
						class="text-accent-foreground text-sm font-medium hover:underline"
						onclick={clearAllFilters}
					>
						Clear all filters
					</button>
				{/if}
			</Card.Root>
		</aside>

		<!-- Results -->
		<div>
			<p class="text-muted-foreground mb-4 text-sm">
				Showing {data.total} vendor{data.total === 1 ? '' : 's'}
			</p>

			{#if data.vendors.length === 0}
				<Card.Root class="p-14 text-center">
					<Store class="text-muted-foreground mx-auto size-10" />
					<p class="mt-4 font-medium">No vendors match your filters</p>
					<p class="text-muted-foreground mt-1 text-sm">
						Try widening your region, category or rating filters.
					</p>
				</Card.Root>
			{:else}
				<div class="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
					{#each data.vendors as vendor (vendor.id)}
						<Card.Root class="group overflow-hidden p-0 transition-shadow hover:shadow-md">
							<div class="relative">
								<a href="/vendors/{vendor.id}" class="block">
									<div class="bg-muted relative aspect-4/3 overflow-hidden">
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

								<form
									method="POST"
									action="?/favorite"
									use:formEnhance
									class="absolute top-3 right-3"
								>
									<input type="hidden" name="vendorId" value={vendor.id} />
									<button
										type="submit"
										class="bg-background/90 flex size-8 items-center justify-center rounded-full shadow-sm"
										aria-label={favorites.has(vendor.id) ? 'Remove from favourites' : 'Save vendor'}
									>
										<Heart
											class="size-4 {favorites.has(vendor.id)
												? 'fill-red-500 text-red-500'
												: 'text-foreground'}"
										/>
									</button>
								</form>
							</div>

							<div class="p-4">
								<div class="flex items-start justify-between gap-2">
									<div class="min-w-0">
										<a href="/vendors/{vendor.id}" class="hover:underline">
											<h2 class="flex items-center gap-1.5 truncate font-semibold">
												{vendor.businessName}
												{#if vendor.isVerified}
													<BadgeCheck class="text-primary size-4 shrink-0" />
												{/if}
											</h2>
										</a>
										{#if vendor.categoryName}
											<p class="text-muted-foreground mt-0.5 text-xs">{vendor.categoryName}</p>
										{/if}
									</div>

									{#if vendor.reviewCount > 0}
										<span class="text-accent-foreground shrink-0 text-xs font-bold whitespace-nowrap">
											★ {vendor.avgRating?.toFixed(1)}
										</span>
									{/if}
								</div>

								<p class="text-muted-foreground mt-2 flex items-center gap-1 text-xs">
									{#if vendor.city}
										<MapPin class="size-3.5" />{vendor.city} ·
									{/if}
									{vendor.reviewCount} review{vendor.reviewCount === 1 ? '' : 's'}
								</p>

								{#if formatPriceRange(vendor.priceMin, vendor.priceMax)}
									<Separator class="my-3" />
									<p class="text-sm font-semibold">
										{formatPriceRange(vendor.priceMin, vendor.priceMax)}
										<span class="text-muted-foreground text-xs font-normal">ETB from</span>
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

						<span class="text-muted-foreground px-3 text-sm">
							Page {data.page} of {data.pages}
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
