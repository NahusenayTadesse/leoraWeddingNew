<script lang="ts">
	import { goto } from '$app/navigation';
	import { page as pageState } from '$app/state';
	import { enhance as formEnhance } from '$app/forms';
	import * as Card from '$lib/components/ui/card';
	import * as Select from '$lib/components/ui/select';
	import { Input } from '$lib/components/ui/input';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Separator } from '$lib/components/ui/separator';
	import {
		Search,
		Star,
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

	let query = $state(data.applied.q);
	let debounce: ReturnType<typeof setTimeout>;

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

	const hasFilters = $derived(
		!!data.applied.q || !!data.applied.categoryId || !!data.applied.city
	);

	const categoryLabel = $derived(
		data.filters.categoryItems.find((c) => c.value === String(data.applied.categoryId))?.name ??
			'All categories'
	);

	const sortLabel = $derived(
		SORT_ITEMS.find((s) => s.value === data.applied.sort)?.name ?? 'Recommended'
	);

	const stars = (rating: number | null) => Math.round(rating ?? 0);
</script>

<svelte:head>
	<title>Wedding vendors · Leora Events</title>
	<meta
		name="description"
		content="Browse photographers, venues, caterers and more for your wedding in Ethiopia."
	/>
</svelte:head>

<div class="mx-auto max-w-7xl px-4 py-8 lg:px-6">
	<div class="mb-8">
		<h1 class="text-3xl font-semibold tracking-tight">Find your vendors</h1>
		<p class="text-muted-foreground mt-1">
			{data.total} vendor{data.total === 1 ? '' : 's'} ready to help with your wedding.
		</p>
	</div>

	<!-- Filters -->
	<div class="mb-6 flex flex-wrap items-center gap-3">
		<div class="relative min-w-0 flex-1 sm:max-w-sm">
			<Search class="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
			<Input
				bind:value={query}
				oninput={onSearchInput}
				placeholder="Search vendors"
				class="pl-9"
			/>
		</div>

		<Select.Root
			type="single"
			value={data.applied.categoryId ? String(data.applied.categoryId) : 'all'}
			onValueChange={(v) => apply({ category: v })}
		>
			<Select.Trigger class="w-44">{categoryLabel}</Select.Trigger>
			<Select.Content>
				<Select.Item value="all">All categories</Select.Item>
				{#each data.filters.categoryItems as item (item.value)}
					<Select.Item value={item.value}>{item.name}</Select.Item>
				{/each}
			</Select.Content>
		</Select.Root>

		<Select.Root
			type="single"
			value={data.applied.city || 'all'}
			onValueChange={(v) => apply({ city: v })}
		>
			<Select.Trigger class="w-40">{data.applied.city || 'All cities'}</Select.Trigger>
			<Select.Content>
				<Select.Item value="all">All cities</Select.Item>
				{#each data.filters.cityItems as item (item.value)}
					<Select.Item value={item.value}>{item.name}</Select.Item>
				{/each}
			</Select.Content>
		</Select.Root>

		<Select.Root
			type="single"
			value={data.applied.sort}
			onValueChange={(v) => apply({ sort: v })}
		>
			<Select.Trigger class="w-40">{sortLabel}</Select.Trigger>
			<Select.Content>
				{#each SORT_ITEMS as item (item.value)}
					<Select.Item value={item.value}>{item.name}</Select.Item>
				{/each}
			</Select.Content>
		</Select.Root>

		{#if hasFilters}
			<Button
				variant="ghost"
				size="sm"
				onclick={() => {
					query = '';
					apply({ q: null, category: null, city: null });
				}}
			>
				<X class="mr-1.5 size-4" /> Clear
			</Button>
		{/if}
	</div>

	<!-- Results -->
	{#if data.vendors.length === 0}
		<Card.Root class="p-14 text-center">
			<Store class="text-muted-foreground mx-auto size-10" />
			<p class="mt-4 font-medium">No vendors match your filters</p>
			<p class="text-muted-foreground mt-1 text-sm">
				Try a different category or clear your search.
			</p>
		</Card.Root>
	{:else}
		<div class="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
			{#each data.vendors as vendor (vendor.id)}
				<Card.Root class="group overflow-hidden p-0 transition-shadow hover:shadow-md">
					<a href="/vendors/{vendor.id}" class="block">
						<div class="bg-muted relative aspect-4/3 overflow-hidden">
							{#if vendor.cover}
								<img
									src="/files/{vendor.cover}"
									alt={vendor.businessName}
									loading="lazy"
									class="size-full object-cover transition-transform duration-300 group-hover:scale-105"
								/>
							{:else}
								<div class="text-muted-foreground flex size-full items-center justify-center">
									<Store class="size-10" />
								</div>
							{/if}

							{#if vendor.isFeatured}
								<Badge class="absolute top-3 left-3 gap-1">
									<Sparkles class="size-3" /> Featured
								</Badge>
							{/if}
						</div>
					</a>

					<div class="p-4">
						<div class="flex items-start justify-between gap-2">
							<div class="min-w-0">
								<a href="/vendors/{vendor.id}" class="hover:underline">
									<h2 class="flex items-center gap-1.5 truncate font-medium">
										{vendor.businessName}
										{#if vendor.isVerified}
											<BadgeCheck class="text-primary size-4 shrink-0" />
										{/if}
									</h2>
								</a>
								{#if vendor.categoryName}
									<p class="text-muted-foreground text-xs">{vendor.categoryName}</p>
								{/if}
							</div>

							<form method="POST" action="?/favorite" use:formEnhance>
								<input type="hidden" name="vendorId" value={vendor.id} />
								<button
									type="submit"
									class="text-muted-foreground hover:text-foreground p-1"
									aria-label={favorites.has(vendor.id) ? 'Remove from favourites' : 'Save vendor'}
								>
									<Heart
										class="size-5 {favorites.has(vendor.id)
											? 'fill-red-500 text-red-500'
											: ''}"
									/>
								</button>
							</form>
						</div>

						{#if vendor.description}
							<p class="text-muted-foreground mt-2 line-clamp-2 text-sm">
								{vendor.description}
							</p>
						{/if}

						<div class="mt-3 flex flex-wrap items-center gap-3 text-xs">
							{#if vendor.reviewCount > 0}
								<span class="flex items-center gap-1">
									<span class="flex">
										{#each [1, 2, 3, 4, 5] as s (s)}
											<Star
												class="size-3.5 {s <= stars(vendor.avgRating)
													? 'fill-amber-400 text-amber-400'
													: 'text-muted-foreground/30'}"
											/>
										{/each}
									</span>
									<span class="text-muted-foreground">
										{vendor.avgRating?.toFixed(1)} ({vendor.reviewCount})
									</span>
								</span>
							{:else}
								<span class="text-muted-foreground">No reviews yet</span>
							{/if}

							{#if vendor.city}
								<span class="text-muted-foreground flex items-center gap-1">
									<MapPin class="size-3.5" />{vendor.city}
								</span>
							{/if}
						</div>

						{#if vendor.priceRange}
							<div>
								<Separator class="my-3" />
								<p class="text-sm font-medium">{vendor.priceRange}</p>
							</div>
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