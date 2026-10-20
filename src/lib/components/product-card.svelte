<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
	import { Card, CardContent, CardFooter } from '@nahu/admin-kit/components/ui/card/index.js';
	import { Button } from '@nahu/admin-kit/components/ui/button/index.js';
	import { Badge } from '@nahu/admin-kit/components/ui/badge/index.js';
	import { CalendarPlusIcon, StoreIcon, SparklesIcon } from '@lucide/svelte';
	import { assetUrl } from '$lib/assetUrl';

	type Props = {
		productId: number;
		productName: string;
		vendorId: number;
		vendor: string | null;
		price: number | string | null;
		amount?: string | number | null;
		image?: string | null;
		priceList?: { price: number; amount: string | number }[];
		category?: string | null;
	};

	// `amount` arrives with the spread service row; the card shows the price only.
	// eslint-disable-next-line svelte/no-unused-props
	let {
		productId,
		productName,
		vendorId,
		vendor,
		price,
		image,
		category,
		priceList = []
	}: Props = $props();

	const formatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'ETB' });
	const numericPrice = $derived(
		price === null ? null : typeof price === 'string' ? parseFloat(price) : price
	);
	const formattedPrice = $derived(
		numericPrice !== null && Number.isFinite(numericPrice) ? formatter.format(numericPrice) : null
	);
</script>

<Card
	class="group overflow-hidden rounded-2xl border-border/60 py-0 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
>
	<!-- Image -->
	<div class="relative aspect-4/3 overflow-hidden bg-muted">
		<a href="/shop/single/{productId}">
			{#if image}
				<img
					src={assetUrl(image)}
					alt={productName}
					loading="lazy"
					class="size-full object-cover transition-transform duration-500 group-hover:scale-105"
				/>
			{:else}
				<div class="flex size-full items-center justify-center text-muted-foreground/40">
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
			class="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-primary"
		>
			<StoreIcon class="size-3.5 shrink-0" />
			<span class="truncate">{vendor ?? m.card_vendor()}</span>
		</a>

		<!-- Name -->
		<h3 class="line-clamp-2 min-h-[2.75rem] leading-snug font-semibold" title={productName}>
			<a href="/shop/single/{productId}" class="transition-colors hover:text-primary">
				{productName}
			</a>
		</h3>

		<!-- Price -->
		{#if formattedPrice}
			<p class="mt-auto text-sm">
				<span class="text-muted-foreground">{m.card_from()}</span>
				<span class="font-display font-semibold text-primary">{formattedPrice}</span>
				{#if priceList.length > 1}
					<span class="text-muted-foreground">· {priceList.length} packages</span>
				{/if}
			</p>
		{/if}
	</CardContent>

	<CardFooter class="p-4 pt-0">
		<Button href="/wedding/bookings?vendor={vendorId}&service={productId}" class="w-full">
			<CalendarPlusIcon class="mr-2 size-4" />
			{m.vdet_book()}
		</Button>
	</CardFooter>
</Card>
