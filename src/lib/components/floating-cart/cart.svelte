<script lang="ts">
	import { useCart } from '$lib/hooks/cart.svelte.js';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { ScrollArea } from '$lib/components/ui/scroll-area';
	import { ShoppingCartIcon, TrashIcon, StoreIcon } from '@lucide/svelte';
	import CartItem from './cart-item.svelte';
	import * as Sheet from '$lib/components/ui/sheet/index.js';

	import * as Label from '$lib/components/ui/label';

	const cart = useCart();

	let { budget }: { budget?: number } = $props();

	const userBudget = $derived(budget ?? 0);

	const formatPrice = (price: number) =>
		new Intl.NumberFormat('en-US', { style: 'currency', currency: 'ETB' }).format(price);

	const remaining = $derived(userBudget - cart.totalPrice);
	const isOverBudget = $derived(remaining < 0);
	const progressPercent = $derived(Math.min((cart.totalPrice / (userBudget || 1)) * 100, 100));
</script>

<svelte:body style:overflow={cart.isOpen ? 'hidden' : 'auto'} />

<Sheet.Root>
	<!-- Floating trigger button -->
	<Sheet.Trigger
		class="fixed right-6 bottom-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105 active:scale-95"
	>
		<div class="relative">
			<ShoppingCartIcon class="size-6" />
			{#if cart.totalItems > 0}
				<Badge
					variant="destructive"
					class="absolute -top-5 -right-5 flex h-5 w-5 items-center justify-center rounded-full p-0 text-[12px]"
				>
					{cart.totalItems > 99 ? '99+' : cart.totalItems}
				</Badge>
			{/if}
		</div>
	</Sheet.Trigger>

	<Sheet.Content side="right" class="flex w-full flex-col gap-0 p-0 sm:max-w-md">
		<!-- Header -->
		<Sheet.Header
			class="flex flex-row items-center justify-between border-b border-border bg-muted/30 px-4 py-3"
		>
			<div class="flex items-center gap-2">
				<ShoppingCartIcon class="size-5 text-primary" />
				<Sheet.Title class="font-semibold">Your Cart</Sheet.Title>
				{#if cart.vendorCount > 0}
					<Badge variant="secondary" class="gap-1 text-xs">
						<StoreIcon class="size-3" />
						{cart.vendorCount}
						{cart.vendorCount === 1 ? 'vendor' : 'vendors'}
					</Badge>
				{/if}
			</div>
		</Sheet.Header>

		<!-- Cart items grouped by vendor -->
		{#if cart.items.length > 0}
			<ScrollArea class="min-h-0 flex-1 overscroll-contain">
				<div class="flex flex-col gap-4 p-3">
					{#each Object.values(cart.itemsByVendor) as group (group.vendorId)}
						<div class="flex flex-col gap-2">
							<!-- Vendor header -->
							<div class="flex items-center justify-between">
								<div class="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
									<StoreIcon class="size-3.5" />
									<span>{group.vendor}</span>
								</div>
								<div class="flex items-center gap-2">
									<span class="text-xs text-muted-foreground">
										{formatPrice(group.subtotal)}
									</span>
									<Button
										size="icon"
										variant="ghost"
										class="size-6 text-destructive hover:bg-destructive/10 hover:text-destructive"
										onclick={() => cart.removeVendor(group.vendorId)}
									>
										<TrashIcon class="size-3" />
									</Button>
								</div>
							</div>

							<!-- Vendor's items -->
							<div class="flex flex-col gap-2 rounded-lg border border-border/40 p-2">
								{#each group.items as item (item.productId)}
									<CartItem {item} />
								{/each}
							</div>
						</div>
					{/each}
				</div>
			</ScrollArea>

			<!-- Footer -->
			<div class="space-y-3 border-t border-border bg-muted/50 p-4">
				<!-- Budget row -->
				{#if budget}
					<div class="flex items-center justify-between text-sm">
						<span class="text-muted-foreground">Budget</span>
						<span class="font-semibold">{formatPrice(budget)}</span>
					</div>
				{/if}

				<!-- Total -->
				<div class="flex items-center justify-between text-sm">
					<span class="text-muted-foreground">
						Total
						<span class="text-xs"
							>({cart.totalItems} {cart.totalItems === 1 ? 'item' : 'items'})</span
						>
					</span>
					<span class="text-lg font-bold text-primary">{formatPrice(cart.totalPrice)}</span>
				</div>

				<!-- Remaining / over budget -->
				{#if budget}
					<div
						class="flex items-center justify-between rounded-md border border-border/50 bg-background px-3 py-2 text-sm"
					>
						<span class="text-muted-foreground">
							{isOverBudget ? 'Over budget by' : 'Remaining'}
						</span>
						<span class="font-bold {isOverBudget ? 'text-destructive' : 'text-green-600'}">
							{isOverBudget ? formatPrice(Math.abs(remaining!)) : formatPrice(remaining!)}
						</span>
					</div>
				{/if}

				<!-- Actions -->
				<div class="flex gap-2 pt-1">
					<Button variant="outline" size="sm" class="flex-1 gap-2" onclick={() => cart.clearCart()}>
						<TrashIcon class="size-4" />
						Clear all
					</Button>
					<Button size="sm" class="flex-1" href="/checkout">Checkout</Button>
				</div>
			</div>
		{:else}
			<div class="flex flex-1 flex-col items-center justify-center p-8 text-center">
				<ShoppingCartIcon class="mb-3 size-12 text-muted-foreground/40" />
				<p class="text-sm font-medium text-muted-foreground">Your cart is empty</p>
				<p class="mt-1 text-xs text-muted-foreground/60">Add some products to get started</p>
			</div>
		{/if}

		<div class="space-y-4 border-t border-border bg-muted/50 p-4">
			<div class="space-y-2">
				<div class="flex items-center justify-between">
					<Label.Root class="text-xs font-medium text-muted-foreground"
						>Set Spending Limit</Label.Root
					>
					<span class="font-mono text-xs">{formatPrice(userBudget)}</span>
				</div>

				<div class="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
					<div
						class="h-full transition-all duration-300 {isOverBudget
							? 'bg-destructive'
							: 'bg-primary'}"
						style="width: {progressPercent}%"
					></div>
				</div>
			</div>

			<div class="space-y-2">
				<div class="flex items-center justify-between text-sm">
					<span class="text-muted-foreground">Total ({cart.totalItems} items)</span>
					<span class="font-bold text-primary">{formatPrice(cart.totalPrice)}</span>
				</div>

				<div
					class="flex items-center justify-between rounded-md border border-border/50 bg-background px-3 py-2 text-sm shadow-sm"
				>
					<span class="text-muted-foreground">
						{isOverBudget ? 'Over budget by' : 'Remaining Funds'}
					</span>
					<span class="font-bold {isOverBudget ? 'text-destructive' : 'text-green-600'}">
						{formatPrice(Math.abs(remaining))}
					</span>
				</div>
			</div>

			<div class="flex gap-2 pt-2">
				<Button variant="outline" size="sm" class="flex-1 gap-2" onclick={() => cart.clearCart()}>
					<TrashIcon class="size-4" />
					Clear
				</Button>
				<Button size="sm" class="flex-1" href="/checkout" disabled={isOverBudget}>
					{isOverBudget ? 'Budget Exceeded' : 'Checkout'}
				</Button>
			</div>
		</div>
	</Sheet.Content>
</Sheet.Root>
