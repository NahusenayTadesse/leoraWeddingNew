<script lang="ts">
	import ProductCard from '$lib/components/product-card.svelte';
	import { Input } from '$lib/components/ui/input';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import Label from '$lib/components/ui/label/label.svelte';
	import { SearchIcon, XIcon, SlidersHorizontalIcon, BadgeCheckIcon } from '@lucide/svelte';
	import { goto } from '$app/navigation';
	import { page, navigating } from '$app/state';

	let { data } = $props();

	// ── URL is the single source of truth ────────────────────────────────────
	// Every filter lives in the query string, so the server re-runs on each
	// change. Nothing here holds a filtered copy of the product list, and a
	// filtered view is shareable, bookmarkable and back-button-safe for free.

	let searchValue = $state(data.filters.q);
	let mobileFiltersOpen = $state(false);
	let debounce: ReturnType<typeof setTimeout>;

	// Re-sync the box when the URL changes from elsewhere: back button, the
	// reset action, or a category link somewhere else on the site.
	let lastServerQuery = data.filters.q;
	$effect(() => {
		if (data.filters.q !== lastServerQuery) {
			lastServerQuery = data.filters.q;
			searchValue = data.filters.q;
		}
	});

	/** Writes a partial filter change to the URL. Any change resets to page 1. */
	function apply(changes: Record<string, string | number | null>) {
		const params = new URLSearchParams(page.url.searchParams);

		for (const [key, value] of Object.entries(changes)) {
			if (value === null || value === '') params.delete(key);
			else params.set(key, String(value));
		}
		params.delete('page');

		const query = params.toString();
		goto(query ? '?' + query : page.url.pathname, {
			replaceState: true,
			keepFocus: true,
			noScroll: true
		});
	}

	function toggleId(key: 'cat' | 'sub', id: number) {
		const current = key === 'cat' ? data.filters.catIds : data.filters.subIds;
		const next = current.includes(id) ? current.filter((n) => n !== id) : [...current, id];
		apply({ [key]: next.length ? next.join(',') : null });
	}

	function onSearchInput(event: Event) {
		const value = (event.currentTarget as HTMLInputElement).value;
		searchValue = value;
		clearTimeout(debounce);
		debounce = setTimeout(() => apply({ q: value.trim() || null }), 300);
	}

	function resetAll() {
		searchValue = '';
		goto(page.url.pathname, { replaceState: true, noScroll: true });
	}

	/** Pagination hrefs carry every active filter forward. */
	function pageHref(n: number) {
		const params = new URLSearchParams(page.url.searchParams);
		if (n <= 1) params.delete('page');
		else params.set('page', String(n));
		const query = params.toString();
		return query ? '?' + query : page.url.pathname;
	}

	// ── Derived view state ───────────────────────────────────────────────────
	const products = $derived(data.products);
	const facets = $derived(data.facets);
	const bounds = $derived(data.bounds);
	const pagination = $derived(data.pagination);
	const filters = $derived(data.filters);

	const activeFilters = $derived([
		...(filters.q ? [{ key: 'q', label: '"' + filters.q + '"', clear: () => apply({ q: null }) }] : []),
		...filters.catIds.map((id) => ({
			key: 'cat-' + id,
			label: facets.categories.find((c) => c.id === id)?.name ?? 'Category ' + id,
			clear: () => toggleId('cat', id)
		})),
		...filters.subIds.map((id) => ({
			key: 'sub-' + id,
			label: facets.subCategories.find((s) => s.id === id)?.name ?? 'Type ' + id,
			clear: () => toggleId('sub', id)
		})),
		...(filters.minPrice !== null || filters.maxPrice !== null
			? [
					{
						key: 'price',
						label: (filters.minPrice ?? bounds.floor) + ' – ' + (filters.maxPrice ?? bounds.ceiling) + ' ETB',
						clear: () => apply({ min: null, max: null })
					}
				]
			: []),
		...(filters.verifiedOnly
			? [{ key: 'verified', label: 'Verified vendors', clear: () => apply({ verified: null }) }]
			: [])
	]);

	const hasActiveFilters = $derived(activeFilters.length > 0);
	const isLoading = $derived(Boolean(navigating.to));

	const rangeStart = $derived((pagination.page - 1) * pagination.perPage + 1);
	const rangeEnd = $derived(Math.min(pagination.page * pagination.perPage, pagination.total));

	/** A short window of page numbers around the current one. */
	const pageWindow = $derived.by(() => {
		const current = pagination.page;
		const count = pagination.pageCount;
		const start = Math.max(1, Math.min(current - 2, count - 4));
		const end = Math.min(count, start + 4);
		return Array.from({ length: end - start + 1 }, (_, i) => start + i);
	});
</script>

<svelte:head>
	<title>{filters.q ? filters.q + ' — Marketplace' : 'Wedding services and products'}</title>
	<meta
		name="description"
		content="Browse photographers, venues, caterers and more from verified wedding vendors."
	/>
</svelte:head>

<div class="min-h-dvh bg-background pb-16 text-foreground">
	<header class="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
		<div class="mx-auto max-w-7xl space-y-4 px-4 py-5 sm:px-6 lg:px-8">
			<div class="flex flex-wrap items-baseline justify-between gap-3">
				<h1 class="font-display text-2xl font-semibold sm:text-3xl">Vendor marketplace</h1>
				<p class="text-sm text-muted-foreground">
					{pagination.total.toLocaleString()}
					{pagination.total === 1 ? 'listing' : 'listings'}
				</p>
			</div>

			<div class="flex gap-2">
				<div class="relative flex-1">
					<SearchIcon
						class="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted-foreground"
					/>
					<Input
						type="search"
						placeholder="Search services, categories or vendors"
						value={searchValue}
						oninput={onSearchInput}
						class="h-11 rounded-lg pl-10"
					/>
				</div>

				<select
					value={filters.sort}
					onchange={(e) => apply({ sort: e.currentTarget.value })}
					class="h-11 rounded-lg border bg-background px-3 text-sm"
					aria-label="Sort results"
				>
					<option value="newest">Newest</option>
					<option value="price_asc">Price: low to high</option>
					<option value="price_desc">Price: high to low</option>
					<option value="name">Name A–Z</option>
				</select>

				<Button
					variant="outline"
					class="h-11 lg:hidden"
					onclick={() => (mobileFiltersOpen = !mobileFiltersOpen)}
				>
					<SlidersHorizontalIcon size={16} />
					Filters
					{#if hasActiveFilters}
						<span class="ml-1 rounded-full bg-primary px-1.5 text-xs text-primary-foreground">
							{activeFilters.length}
						</span>
					{/if}
				</Button>
			</div>

			{#if hasActiveFilters}
				<div class="flex flex-wrap items-center gap-2">
					{#each activeFilters as filter (filter.key)}
						<Badge variant="secondary" class="gap-1 pr-1">
							{filter.label}
							<button
								type="button"
								onclick={filter.clear}
								class="rounded-sm p-0.5 hover:bg-background"
								aria-label={'Remove filter: ' + filter.label}
							>
								<XIcon size={12} />
							</button>
						</Badge>
					{/each}
					<Button variant="ghost" size="sm" onclick={resetAll} class="h-7 text-xs">
						Clear all
					</Button>
				</div>
			{/if}
		</div>
	</header>

	<main class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
		<div class="grid grid-cols-1 gap-8 lg:grid-cols-4">
			<aside class="lg:col-span-1 {mobileFiltersOpen ? 'block' : 'hidden lg:block'}">
				<div class="sticky top-36 max-h-[calc(100dvh-11rem)] space-y-6 overflow-y-auto pr-2">
					<section class="space-y-3 border-b pb-6">
						<h2 class="text-sm font-medium">Price range</h2>
						<div class="flex items-end gap-2">
							<div class="flex-1">
								<Label for="min-price" class="mb-1 block text-xs text-muted-foreground">Min</Label>
								<Input
									id="min-price"
									type="number"
									inputmode="numeric"
									min={bounds.floor}
									max={bounds.ceiling}
									placeholder={String(bounds.floor)}
									value={filters.minPrice ?? ''}
									onchange={(e) => apply({ min: e.currentTarget.value || null })}
									class="h-9 text-sm"
								/>
							</div>
							<div class="flex-1">
								<Label for="max-price" class="mb-1 block text-xs text-muted-foreground">Max</Label>
								<Input
									id="max-price"
									type="number"
									inputmode="numeric"
									min={bounds.floor}
									max={bounds.ceiling}
									placeholder={String(bounds.ceiling)}
									value={filters.maxPrice ?? ''}
									onchange={(e) => apply({ max: e.currentTarget.value || null })}
									class="h-9 text-sm"
								/>
							</div>
						</div>
						<p class="text-xs text-muted-foreground">
							Listings run from {bounds.floor.toLocaleString()} to {bounds.ceiling.toLocaleString()} ETB.
						</p>
					</section>

					<section class="border-b pb-6">
						<div class="flex items-center gap-3">
							<Checkbox
								id="verified"
								checked={filters.verifiedOnly}
								onCheckedChange={(checked) => apply({ verified: checked ? '1' : null })}
							/>
							<Label for="verified" class="flex cursor-pointer items-center gap-1.5 text-sm">
								<BadgeCheckIcon size={14} class="text-primary" />
								Verified vendors only
							</Label>
						</div>
					</section>

					{#if facets.categories.length > 0}
						<section class="space-y-3 border-b pb-6">
							<h2 class="text-sm font-medium">Categories</h2>
							{#each facets.categories as category (category.id)}
								<div class="flex items-center gap-3">
									<Checkbox
										id={'cat-' + category.id}
										checked={filters.catIds.includes(category.id)}
										onCheckedChange={() => toggleId('cat', category.id)}
									/>
									<Label for={'cat-' + category.id} class="flex-1 cursor-pointer text-sm font-normal">
										{category.name}
									</Label>
									<span class="text-xs tabular-nums text-muted-foreground">{category.count}</span>
								</div>
							{/each}
						</section>
					{/if}

					{#if facets.subCategories.length > 0}
						<section class="space-y-3">
							<h2 class="text-sm font-medium">Service type</h2>
							{#each facets.subCategories as sub (sub.id)}
								<div class="flex items-center gap-3">
									<Checkbox
										id={'sub-' + sub.id}
										checked={filters.subIds.includes(sub.id)}
										onCheckedChange={() => toggleId('sub', sub.id)}
									/>
									<Label for={'sub-' + sub.id} class="flex-1 cursor-pointer text-sm font-normal">
										{sub.name}
									</Label>
									<span class="text-xs tabular-nums text-muted-foreground">{sub.count}</span>
								</div>
							{/each}
						</section>
					{/if}
				</div>
			</aside>

			<div class="lg:col-span-3">
				<p class="mb-6 text-sm text-muted-foreground" aria-live="polite">
					{#if pagination.total > 0}
						Showing <span class="font-medium text-foreground">{rangeStart}–{rangeEnd}</span>
						of {pagination.total.toLocaleString()}
					{:else}
						No results
					{/if}
				</p>

				{#if isLoading}
					<div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
						{#each Array(pagination.perPage) as _, i (i)}
							<div class="space-y-3">
								<Skeleton class="aspect-[4/3] w-full rounded-lg" />
								<Skeleton class="h-4 w-3/4" />
								<Skeleton class="h-4 w-1/2" />
							</div>
						{/each}
					</div>
				{:else if products.length > 0}
					<div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
						{#each products as product (product.productId)}
							<ProductCard {...product} />
						{/each}
					</div>

					{#if pagination.pageCount > 1}
						<nav class="mt-12 flex items-center justify-center gap-1" aria-label="Pagination">
							<Button
								variant="outline"
								size="sm"
								href={pageHref(pagination.page - 1)}
								disabled={pagination.page === 1}
								data-sveltekit-noscroll
							>
								Previous
							</Button>

							{#each pageWindow as n (n)}
								<Button
									variant={n === pagination.page ? 'default' : 'ghost'}
									size="sm"
									href={pageHref(n)}
									class="w-9 tabular-nums"
									aria-current={n === pagination.page ? 'page' : undefined}
									data-sveltekit-noscroll
								>
									{n}
								</Button>
							{/each}

							<Button
								variant="outline"
								size="sm"
								href={pageHref(pagination.page + 1)}
								disabled={pagination.page === pagination.pageCount}
								data-sveltekit-noscroll
							>
								Next
							</Button>
						</nav>
					{/if}
				{:else}
					<div class="flex flex-col items-center justify-center rounded-lg border border-dashed py-20">
						<SearchIcon class="mb-4 size-12 text-muted-foreground/30" />
						<h2 class="mb-1 text-lg font-semibold">Nothing matches these filters</h2>
						<p class="max-w-sm text-center text-sm text-muted-foreground">
							Try a wider price range, or clear a category to see more vendors.
						</p>
						{#if hasActiveFilters}
							<Button variant="outline" size="sm" onclick={resetAll} class="mt-5">
								Clear all filters
							</Button>
						{/if}
					</div>
				{/if}
			</div>
		</div>
	</main>
</div>