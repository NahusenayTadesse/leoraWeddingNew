<script lang="ts">
	import { useCart } from '$lib/hooks/cart.svelte.js';
	import { Button } from '$lib/components/ui/button';
	import { MinusIcon, PlusIcon, TrashIcon } from '@lucide/svelte';
	import type { CartItem } from '$lib/hooks/cart.svelte.js';

	const { item }: { item: CartItem } = $props();
	const cart = useCart();

	const formatPrice = (price: number) =>
		new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(price);

	const decreaseQuantity = () => cart.updateQuantity(item.productId, item.quantity - 1);
	const increaseQuantity = () => cart.updateQuantity(item.productId, item.quantity + 1);
	const removeItem = () => cart.removeItem(item.productId);
</script>

<div class="flex flex-col gap-2 rounded-lg border border-border/50 bg-muted/50 p-3">
	<!-- Top row: image + info + delete -->
	<div class="flex items-start gap-3">
		{#if item.image}
			<img
				src="/files/{item.image}"
				alt={item.productName}
				class="size-14 shrink-0 rounded-md border border-border/50 object-cover"
			/>
		{:else}
			<div
				class="flex size-14 shrink-0 items-center justify-center rounded-md border border-border/50 bg-muted text-xs text-muted-foreground"
			>
				No img
			</div>
		{/if}

		<div class="min-w-0 flex-1">
			<h4 class="truncate text-sm leading-tight font-medium">{item.productName}</h4>
			{#if item.category}
				<span
					class="mt-0.5 inline-block rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary"
				>
					{item.category}
				</span>
			{/if}
			<p class="mt-1 truncate text-xs text-muted-foreground">
				by <span class="font-medium text-foreground">{item.vendor}</span>
			</p>
		</div>

		<Button
			size="icon"
			variant="ghost"
			class="size-7 shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
			onclick={removeItem}
		>
			<TrashIcon class="size-4" />
		</Button>
	</div>

	<!-- Price + quantity row -->
	<div class="flex items-center justify-between gap-2">
		<div class="flex flex-col">
			<span class="text-sm font-semibold text-primary">{formatPrice(item.price)}</span>
			{#if item.amount && item.amount > 1}
				<span class="text-[10px] text-muted-foreground">per {item.amount} units</span>
			{/if}
		</div>

		<div class="flex items-center gap-1">
			<Button size="icon" variant="outline" class="size-7" onclick={decreaseQuantity}>
				<MinusIcon class="size-3" />
			</Button>
			<span class="w-8 text-center text-sm font-medium">{item.quantity}</span>
			<Button size="icon" variant="outline" class="size-7" onclick={increaseQuantity}>
				<PlusIcon class="size-3" />
			</Button>
		</div>
	</div>

	<!-- Subtotal row -->
	<div class="flex items-center justify-between border-t border-border/50 pt-1">
		<span class="text-xs text-muted-foreground">Subtotal</span>
		<span class="text-sm font-semibold">{formatPrice(item.price * item.quantity)}</span>
	</div>
</div>
