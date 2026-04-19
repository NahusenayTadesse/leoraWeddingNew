<script lang="ts">
	import ProductCard from '$lib/components/product-card.svelte';
	import { Input } from '$lib/components/ui/input';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { Button } from '$lib/components/ui/button';
	import { SearchIcon, XIcon } from '@lucide/svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import { page } from '$app/state';
	import { Scrollbar } from '$lib/components/ui/scroll-area/index.js';
	import ScrollArea from '$lib/components/ui/scroll-area/scroll-area.svelte';

	let { data } = $props();

	// ── Helpers ──────────────────────────────────────────────────────────────
	const toNum = (v: number | string | null | undefined) =>
		typeof v === 'number' ? v : parseFloat(v as string) || 0;

	// ── Derive max price from ALL price-list entries across ALL products ──────
	const maxProductPrice = $derived.by(() => {
		// 1. Handle URL Hash
		const hash = page.url.hash && page.url.hash !== '#0';
		if (hash) return Number(page.url.hash.substring(1));

		// 2. Fallback to data list
		// Use .by if you have complex logic or multiple lines
		const prices =
			data?.productList?.flatMap((p) => p.priceList.map((pr) => toNum(pr.price))) ?? [];

		return prices.length > 0 ? Math.max(...prices) : 0;
	});

	// ── Filter state ──────────────────────────────────────────────────────────
	let searchQuery = $state('');
	let minPrice = $state(0);
	let maxPrice = $derived(maxProductPrice);
	let selectedCategories = $state<string[]>([]);
	let selectedSubCategories = $state<string[]>([]);

	// ── Sync maxPrice when hash changes ──────────────────────────────────────
	$effect(() => {
		maxPrice = maxProductPrice;
	});

	// ── Available filter options ──────────────────────────────────────────────
	const categories = $derived(
		Array.from(new Set(data?.productList.map((p) => p.category).filter(Boolean))).sort() as string[]
	);

	const allSubCategories = $derived(
		Array.from(
			new Set(data?.productList.flatMap((p) => p.subs.map((s) => s.name)).filter(Boolean))
		).sort() as string[]
	);

	// ── Filtered products ─────────────────────────────────────────────────────
	const filteredProducts = $derived(
		data?.productList.filter((product) => {
			// Search
			const matchesSearch =
				product.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
				(product.category?.toLowerCase() ?? '').includes(searchQuery.toLowerCase()) ||
				product.subs.some((s) => s.name?.toLowerCase().includes(searchQuery.toLowerCase()));

			// Price — a product matches if its cheapest tier falls within the range.
			// Falls back to the min(price) field from SQL if priceList is empty.
			const prices =
				product.priceList.length > 0
					? product.priceList.map((pr) => toNum(pr.price))
					: [toNum(product.price)];
			const cheapest = Math.min(...prices);
			const matchesPrice = cheapest >= minPrice && cheapest <= maxPrice;

			// Category
			const matchesCategory =
				selectedCategories.length === 0 || selectedCategories.includes(product.category ?? '');

			// Subcategory
			const matchesSubCategory =
				selectedSubCategories.length === 0 ||
				product.subs.some((s) => selectedSubCategories.includes(s.name ?? ''));

			return matchesSearch && matchesPrice && matchesCategory && matchesSubCategory;
		}) ?? []
	);

	const resultCount = $derived(filteredProducts.length);

	// ── Actions ───────────────────────────────────────────────────────────────
	const toggleCategory = (cat: string) => {
		selectedCategories = selectedCategories.includes(cat)
			? selectedCategories.filter((c) => c !== cat)
			: [...selectedCategories, cat];
	};

	const toggleSubCategory = (sub: string) => {
		selectedSubCategories = selectedSubCategories.includes(sub)
			? selectedSubCategories.filter((c) => c !== sub)
			: [...selectedSubCategories, sub];
	};

	const resetFilters = () => {
		searchQuery = '';
		minPrice = 0;
		maxPrice = maxProductPrice;
		selectedCategories = [];
		selectedSubCategories = [];
	};

	const hasActiveFilters = $derived(
		searchQuery !== '' ||
			minPrice > 0 ||
			maxPrice < maxProductPrice ||
			selectedCategories.length > 0 ||
			selectedSubCategories.length > 0
	);
</script>

<svelte:head>
	<title>Services and Products</title>
</svelte:head>

<div class="min-h-dvh bg-background pb-8 text-foreground transition-colors duration-300">
	<!-- Header -->
	<header class="sticky top-0 z-40 border-b bg-background/95 backdrop-blur-sm">
		<div class="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
			<div class="flex flex-col justify-between gap-4 md:flex-row md:items-center">
				<h1 class="font-display text-3xl font-semibold text-leora-charcoal">Vendor Marketplace</h1>
			</div>

			<div class="relative">
				<SearchIcon class="absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted-foreground" />
				<Input
					type="text"
					placeholder="Search by product name, category or sub-category..."
					bind:value={searchQuery}
					class="h-11 rounded-lg pl-10"
				/>
			</div>
		</div>
	</header>

	<!-- Main Content -->
	<main class="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
		<div class="grid grid-cols-1 gap-8 lg:grid-cols-4">
			<!-- Filters Sidebar -->
			<aside class="lg:col-span-1">
				<ScrollArea orientation="vertical" class="h-128 w-full p-2 pr-6">
					<div class="sticky top-24 space-y-6">
						<!-- Filter Header -->
						<div class="flex items-center justify-between">
							<h2 class="text-lg font-semibold">Filters</h2>
							{#if hasActiveFilters}
								<Button variant="ghost" size="sm" onclick={resetFilters} class="h-8 text-xs">
									<XIcon size={14} />
									Reset
								</Button>
							{/if}
						</div>

						<!-- Price Range Filter -->
						<div class="flex flex-col gap-4 border-b pb-6">
							<h3 class="text-sm font-medium">Price Range</h3>
							<div class="space-y-3">
								<div class="flex gap-2">
									<div class="flex-1">
										<Label class="mb-1 block text-xs text-muted-foreground">Min</Label>
										<Input
											type="number"
											bind:value={minPrice}
											min="0"
											max={maxPrice}
											class="h-9 text-sm"
										/>
									</div>
									<div class="flex-1">
										<Label class="mb-1 block text-xs text-muted-foreground">Max</Label>
										<Input
											type="number"
											bind:value={maxPrice}
											min={minPrice}
											max={maxProductPrice}
											class="h-9 text-sm"
										/>
									</div>
								</div>
								<input
									type="range"
									bind:value={minPrice}
									min="0"
									max={maxPrice}
									class="h-2 w-full cursor-pointer appearance-none rounded-lg bg-muted accent-primary"
								/>
								<input
									type="range"
									bind:value={maxPrice}
									min={minPrice}
									max={maxProductPrice}
									class="h-2 w-full cursor-pointer appearance-none rounded-lg bg-muted accent-primary"
								/>
								<p class="text-xs text-muted-foreground">
									${minPrice.toFixed(0)} – ${maxPrice.toFixed(0)}
								</p>
							</div>
						</div>

						<!-- Category Filter -->
						{#if categories.length > 0}
							<div class="flex flex-col gap-4 border-b pb-6">
								<h3 class="text-sm font-medium">Categories</h3>
								<div class="space-y-3">
									{#each categories as category (category)}
										<div class="flex items-center gap-3">
											<Checkbox
												id={`category-${category}`}
												checked={selectedCategories.includes(category)}
												onCheckedChange={(checked) => {
													if (checked) {
														selectedCategories = [...selectedCategories, category];
													} else {
														selectedCategories = selectedCategories.filter((c) => c !== category);
													}
												}}
												class="cursor-pointer"
											/>
											<Label for={`category-${category}`} class="flex-1 cursor-pointer text-sm">
												{category}
											</Label>
											<span class="text-xs text-muted-foreground">
												{filteredProducts.filter((p) => p.category === category).length}
											</span>
										</div>
									{/each}
								</div>
							</div>
						{/if}

						<!-- Sub-category Filter -->
						{#if allSubCategories.length > 0}
							<div class="flex flex-col gap-4">
								<h3 class="text-sm font-medium">Sub-categories</h3>
								<div class="space-y-3">
									{#each allSubCategories as sub (sub)}
										<div class="flex items-center gap-3">
											<Checkbox
												id={`sub-${sub}`}
												checked={selectedSubCategories.includes(sub)}
												onCheckedChange={(checked) => {
													if (checked) {
														selectedSubCategories = [...selectedSubCategories, sub];
													} else {
														selectedSubCategories = selectedSubCategories.filter((c) => c !== sub);
													}
												}}
												``
												class="cursor-pointer"
											/>
											<Label for={`sub-${sub}`} class="flex-1 cursor-pointer text-sm">
												{sub}
											</Label>
											<span class="text-xs text-muted-foreground">
												{filteredProducts.filter((p) => p.subs.some((s) => s.name === sub)).length}
											</span>
										</div>
									{/each}
								</div>
							</div>
						{/if}
					</div>
				</ScrollArea>
			</aside>

			<!-- Products Grid -->
			<div class="lg:col-span-3">
				<div class="mb-8">
					<p class="text-sm text-muted-foreground">
						Showing <span class="font-semibold text-foreground">{resultCount}</span>
						{resultCount === 1 ? 'product' : 'products'}
						{searchQuery && `for "${searchQuery}"`}
					</p>
				</div>

				{#if filteredProducts.length > 0}
					<div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
						{#each filteredProducts as product (product.productId)}
							<div class="animate-in duration-300 fade-in">
								<ProductCard {...product} />
							</div>
						{/each}
					</div>
				{:else}
					<div class="flex flex-col items-center justify-center py-20">
						<SearchIcon class="mb-4 size-16 text-muted-foreground/30" />
						<h3 class="mb-2 text-xl font-semibold">No products found</h3>
						<p class="max-w-sm text-center text-muted-foreground">
							We couldn't find any products matching your filters. Try adjusting your search terms
							or price range.
						</p>
						{#if hasActiveFilters}
							<Button variant="outline" size="sm" onclick={resetFilters} class="mt-4">
								Reset Filters
							</Button>
						{/if}
					</div>
				{/if}
			</div>
		</div>
	</main>
</div>
