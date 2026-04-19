<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { ShareIcon, PlusIcon, CheckIcon, StoreIcon } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';
	import { useCart } from '$lib/hooks/cart.svelte.js';

	type PriceOption = { price: number | string; amount: number | string };
	type SubCategory = { id: number; name: string; description?: string | null };

	type Props = {
		productId: number;
		productName: string;
		vendorId: number;
		vendor: string;
		price: number | string;
		description: string;
		image?: string | null;
		category?: string | null;
		images?: string[];
		priceList?: PriceOption[];
		subs?: SubCategory[];
	};

	const {
		productId,
		productName,
		vendorId,
		vendor,
		price,
		description,
		image,
		category,
		images = [],
		priceList = [],
		subs = []
	}: Props = $props();

	const cart = useCart();

	let justAdded = $state(false);
	let displayImage = $state(image);
	let quantity = $state(1);

	let currentPrice = $state(typeof price === 'string' ? parseFloat(price) : price);
	let currentAmount = $state<number | string>(priceList?.[0]?.amount ?? 1);

	const formatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'ETB' });

	const numericPrice = $derived(
		typeof currentPrice === 'string' ? parseFloat(currentPrice) : currentPrice
	);
	const formattedPrice = $derived(formatter.format(numericPrice));
	const quantityInCart = $derived(cart.items.find((i) => i.productId === productId)?.quantity ?? 0);

	function changePrice(product: PriceOption) {
		currentPrice = typeof product.price === 'string' ? parseFloat(product.price) : product.price;
		currentAmount = product.amount;
	}

	function addToCart() {
		if (justAdded) return;
		cart.addItem(
			{
				productId,
				productName,
				vendorId,
				vendor,
				price: numericPrice,
				amount: typeof currentAmount === 'string' ? parseFloat(currentAmount) : currentAmount,
				image,
				category
			},
			quantity
		);
		justAdded = true;
		toast.success(`${productName} added to cart`, {
			description: `Sold by ${vendor} · ${quantityInCart + quantity} in cart`
		});
		setTimeout(() => (justAdded = false), 1500);
	}

	const handleShare = () => {
		navigator.clipboard.writeText(window.location.href);
		toast.success('Link copied to clipboard');
	};
</script>

<div class="min-h-dvh bg-linear-to-b from-background via-background to-muted/20">
	<div class="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
		<div class="grid gap-8 lg:grid-cols-2 lg:gap-12">
			<!-- Image Section -->
			<div class="flex flex-col gap-4">
				<div class="relative overflow-hidden rounded-2xl bg-muted/50 shadow-lg">
					{#if displayImage}
						<img
							src="/files/{displayImage}"
							alt={productName}
							class="aspect-square w-full object-cover transition-transform duration-300 hover:scale-105"
						/>
					{:else}
						<div
							class="flex aspect-square w-full items-center justify-center text-muted-foreground/30"
						>
							<StoreIcon class="size-16" />
						</div>
					{/if}
					{#if category}
						<Badge class="absolute top-4 left-4 bg-primary/90 backdrop-blur-sm">
							{category}
						</Badge>
					{/if}
				</div>

				<!-- Thumbnails -->
				{#if images.length > 0}
					<div class="flex flex-wrap gap-2">
						{#each images as img, i (i)}
							<button
								class="aspect-square w-20 overflow-hidden rounded-lg border-2 bg-muted/50 transition-all duration-200
									{displayImage === img ? 'border-primary' : 'border-transparent hover:border-primary/50'}"
								aria-label="View image {i + 1}"
								onclick={() => (displayImage = img)}
							>
								<img
									src="/files/{img}"
									alt="Thumbnail {i + 1}"
									class="h-full w-full object-cover"
								/>
							</button>
						{/each}
					</div>
				{/if}
			</div>

			<!-- Info Section -->
			<div class="flex flex-col gap-6">
				<!-- Title + vendor + price -->
				<div class="space-y-3">
					<div class="flex items-start justify-between gap-2">
						<h1 class="text-4xl font-bold tracking-tight text-foreground">{productName}</h1>
					</div>

					<a
						href="/shop/vendor/{vendorId}"
						class="flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-primary"
					>
						<StoreIcon class="size-4" />
						<span>{vendor}</span>
					</a>

					<div class="flex items-baseline gap-2">
						<span class="text-3xl font-bold text-primary">{formattedPrice}</span>
						{#if currentAmount && currentAmount !== 1}
							<span class="text-sm text-muted-foreground">/ {currentAmount} units</span>
						{/if}
					</div>
				</div>

				<!-- Description -->
				<p class="text-base leading-relaxed text-muted-foreground">{description}</p>

				<!-- Subcategories -->
				{#if subs.length > 0}
					<div class="space-y-3">
						<h3 class="text-sm font-semibold tracking-wider text-muted-foreground uppercase">
							Includes
						</h3>
						<div class="flex flex-wrap gap-2">
							{#each subs as sub (sub.id)}
								<div class="rounded-xl border border-border/60 bg-muted/40 px-3 py-2">
									<p class="text-sm font-medium">{sub.name}</p>
									{#if sub.description}
										<p class="mt-0.5 text-xs text-muted-foreground">{sub.description}</p>
									{/if}
								</div>
							{/each}
						</div>
					</div>
				{/if}

				<!-- Package / price selector -->
				{#if priceList.length > 0}
					<div class="space-y-3">
						<h3 class="text-sm font-semibold tracking-wider text-muted-foreground uppercase">
							Select Package
						</h3>
						<div class="grid grid-cols-2 gap-3 sm:grid-cols-3">
							{#each priceList as product (product)}
								{@const np =
									typeof product.price === 'string' ? parseFloat(product.price) : product.price}
								{@const isActive = currentPrice === np}
								<button
									onclick={() => changePrice(product)}
									class="group relative flex flex-col items-center justify-center rounded-2xl border-2 p-5 transition-all duration-200 ease-out
										{isActive
										? 'scale-[1.02] border-primary shadow-md'
										: 'border-foreground/20 hover:border-primary/50 hover:shadow-sm'}"
								>
									<span class="text-xl font-black tracking-tight">
										{product.amount}
									</span>
									<span class="text-xs font-medium tracking-wider text-muted-foreground uppercase">
										{formatter.format(np)}
									</span>
									{#if isActive}
										<Badge
											class="absolute -top-2 px-3 text-[10px] font-bold tracking-widest uppercase"
										>
											Selected
										</Badge>
									{/if}
								</button>
							{/each}
						</div>
					</div>
				{/if}

				<!-- Quantity + actions -->
				<div class="mt-auto flex flex-col gap-4">
					<div class="flex items-center gap-4">
						<span class="text-sm font-medium text-muted-foreground">Quantity</span>
						<div class="flex items-center gap-2 rounded-lg border border-input bg-background p-1">
							<button
								onclick={() => quantity > 1 && quantity--}
								class="flex size-8 items-center justify-center rounded transition-colors hover:bg-muted"
								aria-label="Decrease quantity">−</button
							>
							<span class="w-8 text-center font-semibold">{quantity}</span>
							<button
								onclick={() => quantity++}
								class="flex size-8 items-center justify-center rounded transition-colors hover:bg-muted"
								aria-label="Increase quantity">+</button
							>
						</div>
						{#if quantityInCart > 0}
							<Badge variant="secondary">{quantityInCart} already in cart</Badge>
						{/if}
					</div>

					<Button
						class="w-full transition-all active:scale-95"
						onclick={addToCart}
						variant={justAdded ? 'outline' : 'default'}
						disabled={justAdded}
					>
						{#if justAdded}
							<CheckIcon class="mr-2 size-4 text-green-500" />
							Added to Cart
						{:else}
							<PlusIcon class="mr-2 size-4" />
							Add to Cart
						{/if}
					</Button>

					<Button variant="outline" class="w-full gap-2" onclick={handleShare}>
						<ShareIcon size={18} />
						Share Product
					</Button>
				</div>
			</div>
		</div>
	</div>
</div>
