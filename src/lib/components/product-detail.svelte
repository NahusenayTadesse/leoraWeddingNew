<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { enhance as formEnhance } from '$app/forms';
	import {
		ShareIcon,
		CalendarPlusIcon,
		StoreIcon,
		BadgeCheckIcon,
		StarIcon,
		MapPinIcon,
		HeartIcon,
		MessageSquareIcon
	} from '@lucide/svelte';
	import { toast } from 'svelte-sonner';
	import { assetUrl } from '$lib/assetUrl';

	type PackageOption = { price: number | string; amount: number | string };
	type SubCategory = { id: number; name: string; description?: string | null };

	type Props = {
		serviceId: number;
		serviceName: string;
		vendorId: number;
		vendor: string;
		vendorVerified?: boolean | null;
		vendorRating?: number | null;
		vendorReviewCount?: number;
		vendorCity?: string | null;
		isFavorite?: boolean;
		price: number | string;
		description?: string | null;
		image?: string | null;
		category?: string | null;
		images?: string[];
		priceList?: PackageOption[];
		subs?: SubCategory[];
	};

	const {
		serviceId,
		serviceName,
		vendorId,
		vendor,
		vendorVerified,
		vendorRating,
		vendorReviewCount = 0,
		vendorCity,
		isFavorite = false,
		price,
		description,
		image,
		category,
		images = [],
		priceList = [],
		subs = []
	}: Props = $props();

	let displayImage = $state(image);

	let currentPrice = $state(typeof price === 'string' ? parseFloat(price) : price);
	let currentAmount = $state<number | string>(priceList?.[0]?.amount ?? 1);

	const formatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'ETB' });

	const numericPrice = $derived(
		typeof currentPrice === 'string' ? parseFloat(currentPrice) : currentPrice
	);
	const formattedPrice = $derived(formatter.format(numericPrice));

	function selectPackage(pkg: PackageOption) {
		currentPrice = typeof pkg.price === 'string' ? parseFloat(pkg.price) : pkg.price;
		currentAmount = pkg.amount;
	}

	const handleShare = () => {
		navigator.clipboard.writeText(window.location.href);
		toast.success('Link copied to clipboard');
	};
</script>

<div class="min-h-dvh bg-linear-to-b from-background via-background to-muted/20">
	<div class="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
		<!-- Vendor details -->
		<div
			class="bg-card mb-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl border p-4 shadow-sm"
		>
			<a href="/vendors/{vendorId}" class="group flex min-w-0 items-center gap-3">
				<div
					class="bg-muted text-muted-foreground flex size-12 shrink-0 items-center justify-center rounded-full"
				>
					<StoreIcon class="size-6" />
				</div>
				<div class="min-w-0">
					<div class="flex items-center gap-1.5 font-semibold group-hover:underline">
						<span class="truncate">{vendor}</span>
						{#if vendorVerified}
							<BadgeCheckIcon class="text-primary size-4 shrink-0" />
						{/if}
					</div>
					<div class="text-muted-foreground mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
						{#if vendorReviewCount > 0}
							<span class="flex items-center gap-1">
								<StarIcon class="size-3.5 fill-amber-400 text-amber-400" />
								{vendorRating?.toFixed(1)} ({vendorReviewCount})
							</span>
						{/if}
						{#if vendorCity}
							<span class="flex items-center gap-1">
								<MapPinIcon class="size-3.5" />{vendorCity}
							</span>
						{/if}
					</div>
				</div>
			</a>

			<div class="flex shrink-0 gap-2">
				<form method="POST" action="?/favorite" use:formEnhance>
					<input type="hidden" name="vendorId" value={vendorId} />
					<Button type="submit" variant="outline">
						<HeartIcon class="mr-2 size-4 {isFavorite ? 'fill-red-500 text-red-500' : ''}" />
						{isFavorite ? 'Saved' : 'Save'}
					</Button>
				</form>

				<Button href="/wedding/messages?vendor={vendorId}" variant="outline">
					<MessageSquareIcon class="mr-2 size-4" /> Message
				</Button>
			</div>
		</div>

		<div class="grid gap-8 lg:grid-cols-2 lg:gap-12">
			<!-- Image Section -->
			<div class="flex flex-col gap-4">
				<div class="relative overflow-hidden rounded-2xl bg-muted/50 shadow-lg">
					{#if displayImage}
						<img
							src={assetUrl(displayImage)}
							alt={serviceName}
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
									src={assetUrl(img)}
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
						<h1 class="text-4xl font-bold tracking-tight text-foreground">{serviceName}</h1>
					</div>

					<div class="flex items-baseline gap-2">
						<span class="text-3xl font-bold text-primary">{formattedPrice}</span>
						{#if currentAmount && currentAmount !== 1}
							<span class="text-sm text-muted-foreground">/ {currentAmount}</span>
						{/if}
					</div>
				</div>

				<!-- Description -->
				{#if description}
					<p class="text-base leading-relaxed text-muted-foreground">{description}</p>
				{/if}

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
							Select package
						</h3>
						<div class="grid grid-cols-2 gap-3 sm:grid-cols-3">
							{#each priceList as pkg (pkg)}
								{@const np = typeof pkg.price === 'string' ? parseFloat(pkg.price) : pkg.price}
								{@const isActive = currentPrice === np}
								<button
									onclick={() => selectPackage(pkg)}
									class="group relative flex flex-col items-center justify-center rounded-2xl border-2 p-5 transition-all duration-200 ease-out
										{isActive
										? 'scale-[1.02] border-primary shadow-md'
										: 'border-foreground/20 hover:border-primary/50 hover:shadow-sm'}"
								>
									<span class="text-xl font-black tracking-tight">
										{pkg.amount}
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

				<!-- Actions -->
				<div class="mt-auto flex flex-col gap-4">
					<Button
						href="/wedding/bookings?vendor={vendorId}&service={serviceId}"
						class="w-full transition-all active:scale-95"
					>
						<CalendarPlusIcon class="mr-2 size-4" />
						Book this service
					</Button>

					<Button variant="outline" class="w-full gap-2" onclick={handleShare}>
						<ShareIcon size={18} />
						Share
					</Button>
				</div>
			</div>
		</div>
	</div>
</div>
