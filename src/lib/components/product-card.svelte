<script lang="ts">
	import { Card, CardContent, CardFooter } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { CalendarPlusIcon, StoreIcon, SparklesIcon } from '@lucide/svelte';
	import { assetUrl } from '$lib/assetUrl';

	type Props = {
		productId: number;
		productName: string;
		vendorId: number;
		vendor: string;
		price: number | string;
		amount?: string | number;
		image?: string | null;
		priceList?: { price: number; amount: string | number }[];
		category?: string | null;
	};

	let { productId, productName, vendorId, vendor, price, image, category, priceList = [] }: Props =
		$props();

	const formatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'ETB' });
	const numericPrice = $derived(typeof price === 'string' ? parseFloat(price) : price);
	const formattedPrice = $derived(
		Number.isFinite(numericPrice) ? formatter.format(numericPrice) : null
	);
</script>

<Card
	class="group border-border/60 overflow-hidden rounded-2xl py-0 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
>
	<!-- Image -->
	<div class="bg-muted relative aspect-4/3 overflow-hidden">
		<a href="/shop/single/{productId}">
			{#if image}
				<img
					src={assetUrl(image)}
					alt={productName}
					loading="lazy"
					class="size-full object-cover transition-transform duration-500 group-hover:scale-105"
				/>
			{:else}
				<div class="text-muted-foreground/40 flex size-full items-center justify-center">
					<SparklesIcon class="size-10" />
				</div>
			{/if}
		</a>

		{#if category}
			<Badge class="absolute top-3 left-3 gap-1 shadow-sm">
				{category}
			</Badge>
		{/if}
	</div>

	<CardContent class="flex flex-1 flex-col gap-2 p-4">
		<!-- Vendor -->
		<a
			href="/vendors/{vendorId}"
			class="text-muted-foreground hover:text-primary flex min-w-0 items-center gap-1.5 text-xs transition-colors"
		>
			<StoreIcon class="size-3.5 shrink-0" />
			<span class="truncate">{vendor}</span>
		</a>

		<!-- Name -->
		<h3 class="line-clamp-2 min-h-[2.75rem] leading-snug font-semibold" title={productName}>
			<a href="/shop/single/{productId}" class="hover:text-primary transition-colors">
				{productName}
			</a>
		</h3>

		<!-- Price -->
		{#if formattedPrice}
			<p class="mt-auto text-sm">
				<span class="text-muted-foreground">From</span>
				<span class="text-primary font-display font-semibold">{formattedPrice}</span>
				{#if priceList.length > 1}
					<span class="text-muted-foreground">· {priceList.length} packages</span>
				{/if}
			</p>
		{/if}
	</CardContent>

	<CardFooter class="p-4 pt-0">
		<Button href="/wedding/bookings?vendor={vendorId}&service={productId}" class="w-full">
			<CalendarPlusIcon class="mr-2 size-4" />
			Book
		</Button>
	</CardFooter>
</Card>
