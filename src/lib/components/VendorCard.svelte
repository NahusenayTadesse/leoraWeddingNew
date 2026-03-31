<script lang="ts">
	import { Star, MapPin } from '@lucide/svelte';
	import { Badge } from '$lib/components/ui/badge/index.js';

	type Vendor = {
		id: number;
		name: string;
		category: string;
		price: number;
		rating: number;
		location: string;
		image: string;
		tags: string[];
	};

	let { vendor, onAddToPlan }: { vendor: Vendor; onAddToPlan?: (id: number) => void } = $props();
</script>

<div
	class="vendor-card shadow-soft border-leora-gold/5 overflow-hidden rounded-2xl border bg-white"
>
	<div class="relative h-48 overflow-hidden">
		<img src={vendor.image} alt={vendor.name} class="h-full w-full object-cover" />
		<div
			class="absolute top-3 right-3 flex items-center gap-1 rounded-full bg-white/90 px-2 py-1 text-xs font-medium backdrop-blur"
		>
			<Star class="text-leora-gold fill-leora-gold h-3 w-3" />
			{vendor.rating}
		</div>
	</div>

	<div class="p-5">
		<h3 class="font-display mb-1 text-lg font-semibold">{vendor.name}</h3>
		<p class="mb-3 flex items-center gap-1 text-sm text-gray-500">
			<MapPin class="h-3 w-3 shrink-0" />
			{vendor.location}
		</p>

		<div class="mb-4 flex flex-wrap gap-2">
			{#each vendor.tags as tag}
				<Badge>{tag}</Badge>
			{/each}
		</div>

		<div class="border-leora-gold/10 flex items-center justify-between border-t pt-3">
			<div>
				<p class="text-xs text-gray-500">Starting from</p>
				<p class="text-leora-gold font-bold">ETB {vendor.price.toLocaleString()}</p>
			</div>
			<button
				onclick={() => onAddToPlan?.(vendor.id)}
				class="bg-leora-charcoal hover:bg-leora-gold rounded-full px-4 py-2 text-sm text-white transition-colors duration-200"
			>
				Add to Plan
			</button>
		</div>
	</div>
</div>
