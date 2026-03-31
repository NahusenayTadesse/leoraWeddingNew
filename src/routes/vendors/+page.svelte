<script lang="ts">
	import { Search } from '@lucide/svelte';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Select } from '$lib/components/ui/select/index.js';
	import VendorCard from '$lib/components/VendorCard.svelte';
	import { vendors as allVendors } from '$lib/data.js';

	let searchTerm = $state('');
	let filterCategory = $state('');
	let filterPrice = $state('');
	let filterRating = $state('');
	let sortBy = $state('recommended');

	let filteredVendors = $derived(() => {
		let result = allVendors.filter((v) => {
			const matchSearch =
				!searchTerm ||
				v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
				v.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
				v.location.toLowerCase().includes(searchTerm.toLowerCase());

			const matchCategory = !filterCategory || v.category === filterCategory;

			const matchRating = !filterRating || v.rating >= parseFloat(filterRating);

			let matchPrice = true;
			if (filterPrice === '0-50000') matchPrice = v.price < 50000;
			else if (filterPrice === '50000-100000') matchPrice = v.price >= 50000 && v.price < 100000;
			else if (filterPrice === '100000-200000') matchPrice = v.price >= 100000 && v.price < 200000;
			else if (filterPrice === '200000+') matchPrice = v.price >= 200000;

			return matchSearch && matchCategory && matchRating && matchPrice;
		});

		if (sortBy === 'price-asc') result = [...result].sort((a, b) => a.price - b.price);
		else if (sortBy === 'price-desc') result = [...result].sort((a, b) => b.price - a.price);
		else if (sortBy === 'rating') result = [...result].sort((a, b) => b.rating - a.rating);

		return result;
	});

	function addToPlan(id: number) {
		alert('Vendor added to your wedding plan! View in your dashboard.');
	}
</script>

<svelte:head>
	<title>Vendor Marketplace — Leora Events</title>
</svelte:head>

<div class="bg-leora-ivory min-h-screen pb-24">
	<!-- Sticky Header & Filters -->
	<div class="border-leora-gold/10 sticky top-20 z-40 border-b bg-white">
		<div class="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
			<div class="flex flex-col justify-between gap-4 md:flex-row md:items-center">
				<h1 class="font-display text-leora-charcoal text-3xl font-semibold">Vendor Marketplace</h1>

				<!-- Search -->
				<div class="max-w-2xl flex-1">
					<div class="relative">
						<Search class="absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 text-gray-400" />
						<Input
							bind:value={searchTerm}
							placeholder="Search vendors, categories, or locations..."
							class="rounded-full pl-12"
						/>
					</div>
				</div>
			</div>

			<!-- Filters -->
			<div class="mt-4 flex flex-wrap gap-3">
				<Select bind:value={filterCategory}>
					<option value="">All Categories</option>
					<option value="venue">Venue & Hotel</option>
					<option value="photo">Photography</option>
					<option value="catering">Catering</option>
					<option value="decor">Decor</option>
					<option value="music">Music & Band</option>
					<option value="dress">Dress & Suit</option>
				</Select>

				<Select bind:value={filterPrice}>
					<option value="">Price Range</option>
					<option value="0-50000">Under 50,000 ETB</option>
					<option value="50000-100000">50,000 – 100,000 ETB</option>
					<option value="100000-200000">100,000 – 200,000 ETB</option>
					<option value="200000+">200,000+ ETB</option>
				</Select>

				<Select bind:value={filterRating}>
					<option value="">Rating</option>
					<option value="5">5 Stars</option>
					<option value="4">4+ Stars</option>
					<option value="3">3+ Stars</option>
				</Select>

				<Select class="w-40">
					<option value="">Location</option>
					<option value="addis">Addis Ababa</option>
					<option value="bahirdar">Bahir Dar</option>
					<option value="hawassa">Hawassa</option>
					<option value="dire">Dire Dawa</option>
				</Select>
			</div>
		</div>
	</div>

	<!-- Results -->
	<div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
		<div class="mb-6 flex items-center justify-between">
			<p class="text-gray-600">
				<span class="text-leora-charcoal font-semibold">{filteredVendors().length}</span> vendors found
			</p>
			<div class="flex items-center gap-2">
				<span class="text-sm text-gray-600">Sort by:</span>
				<select
					bind:value={sortBy}
					class="text-leora-charcoal cursor-pointer border-none bg-transparent text-sm font-medium focus:outline-none"
				>
					<option value="recommended">Recommended</option>
					<option value="price-asc">Price: Low to High</option>
					<option value="price-desc">Price: High to Low</option>
					<option value="rating">Rating</option>
				</select>
			</div>
		</div>

		{#if filteredVendors().length === 0}
			<div class="py-24 text-center text-gray-500">
				<Search class="mx-auto mb-4 h-12 w-12 opacity-30" />
				<p class="text-lg font-medium">No vendors found</p>
				<p class="text-sm">Try adjusting your filters or search term</p>
			</div>
		{:else}
			<div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
				{#each filteredVendors() as vendor (vendor.id)}
					<VendorCard {vendor} onAddToPlan={addToPlan} />
				{/each}
			</div>
		{/if}
	</div>
</div>
