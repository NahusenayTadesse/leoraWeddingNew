<script lang="ts">
	import { superForm } from 'sveltekit-superforms';
	import { zod4Client } from 'sveltekit-superforms/adapters';
	import { enhance as formEnhance } from '$app/forms';
	import { reviewSchema } from '$lib/schemas/review';
	import InputComp from '$lib/formComponents/InputComp.svelte';
	import * as Card from '$lib/components/ui/card';
	import * as Tabs from '$lib/components/ui/tabs';
	import * as Avatar from '$lib/components/ui/avatar';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Separator } from '$lib/components/ui/separator';
	import { Progress } from '$lib/components/ui/progress';
	import { toast } from 'svelte-sonner';
	import {
		Star,
		BadgeCheck,
		MapPin,
		Phone,
		Heart,
		Store,
		Loader2,
		CalendarPlus,
		ExternalLink,
		MessageSquare
	} from '@lucide/svelte';

	let { data } = $props();

	let tab = $state('services');

	const sf = superForm(data.form, {
		id: 'review',
		validators: zod4Client(reviewSchema),
		resetForm: false,
		onUpdated: ({ form }) => {
			if (form.valid && form.message) toast.success(form.message);
		}
	});
	const { form, errors, enhance, submitting } = sf;

	const stars = (rating: number | null) => Math.round(rating ?? 0);

	const fullAddress = $derived(
		[
			data.vendor.street,
			data.vendor.kebele ? `Kebele ${data.vendor.kebele}` : null,
			data.vendor.subcityName,
			data.vendor.cityName ?? data.vendor.city
		]
			.filter(Boolean)
			.join(', ')
	);

	const etb = (n: number) =>
		new Intl.NumberFormat('en-ET', { maximumFractionDigits: 0 }).format(n);

	function priceLabel(service: (typeof data.services)[number]) {
		if (service.prices.length === 0) return null;
		const values = service.prices.map((p) => p.price);
		const min = Math.min(...values);
		const max = Math.max(...values);
		const cur = service.currency ?? 'ETB';
		return min === max ? `${etb(min)} ${cur}` : `${etb(min)} – ${etb(max)} ${cur}`;
	}

	function reviewDate(value: unknown) {
		if (!value) return '';
		return new Date(value as string).toLocaleDateString('en-GB', {
			month: 'short',
			year: 'numeric'
		});
	}
</script>

<svelte:head>
	<title>{data.vendor.businessName} · Leora Events</title>
	<meta name="description" content={data.vendor.description ?? data.vendor.businessName} />
</svelte:head>

<div class="mx-auto max-w-6xl px-4 py-8 lg:px-6">
	<a href="/vendors" class="text-muted-foreground hover:text-foreground mb-6 inline-block text-sm">
		← Back to vendors
	</a>

	<!-- Header -->
	<div class="flex flex-wrap items-start justify-between gap-6">
		<div class="min-w-0">
			<div class="flex flex-wrap items-center gap-2">
				<h1 class="text-3xl font-semibold tracking-tight">{data.vendor.businessName}</h1>
				{#if data.vendor.isVerified}
					<Badge class="gap-1"><BadgeCheck class="size-3.5" /> Verified</Badge>
				{/if}
			</div>

			<div class="text-muted-foreground mt-3 flex flex-wrap items-center gap-4 text-sm">
				{#if data.vendor.categoryName}
					<span>{data.vendor.categoryName}</span>
				{/if}

				{#if data.vendor.reviewCount > 0}
					<span class="flex items-center gap-1.5">
						<span class="flex">
							{#each [1, 2, 3, 4, 5] as s (s)}
								<Star
									class="size-4 {s <= stars(data.vendor.avgRating)
										? 'fill-amber-400 text-amber-400'
										: 'text-muted-foreground/30'}"
								/>
							{/each}
						</span>
						{data.vendor.avgRating?.toFixed(1)} · {data.vendor.reviewCount} review{data.vendor
							.reviewCount === 1
							? ''
							: 's'}
					</span>
				{/if}

				{#if fullAddress}
					<span class="flex items-center gap-1.5"><MapPin class="size-4" />{fullAddress}</span>
				{/if}
			</div>
		</div>

		<div class="flex gap-2">
			<form method="POST" action="?/favorite" use:formEnhance>
				<input type="hidden" name="vendorId" value={data.vendor.id} />
				<Button type="submit" variant="outline">
					<Heart class="mr-2 size-4 {data.isFavorite ? 'fill-red-500 text-red-500' : ''}" />
					{data.isFavorite ? 'Saved' : 'Save'}
				</Button>
			</form>

			<Button href="/wedding/bookings?vendor={data.vendor.id}">
				<CalendarPlus class="mr-2 size-4" /> Request booking
			</Button>
		</div>
	</div>

	<Separator class="my-8" />

	<div class="grid gap-8 lg:grid-cols-3">
		<!-- Main column -->
		<div class="lg:col-span-2">
			<Tabs.Root bind:value={tab}>
				<Tabs.List>
					<Tabs.Trigger value="services">Services ({data.services.length})</Tabs.Trigger>
					<Tabs.Trigger value="about">About</Tabs.Trigger>
					<Tabs.Trigger value="reviews">Reviews ({data.vendor.reviewCount})</Tabs.Trigger>
				</Tabs.List>

				<!-- Services -->
				<Tabs.Content value="services" class="mt-6">
					{#if data.services.length === 0}
						<Card.Root class="p-10 text-center">
							<Store class="text-muted-foreground mx-auto size-8" />
							<p class="text-muted-foreground mt-3 text-sm">
								This vendor hasn't listed individual services yet. Get in touch for a quote.
							</p>
						</Card.Root>
					{:else}
						<div class="grid gap-4 sm:grid-cols-2">
							{#each data.services as service (service.id)}
								{@const cover = service.featuredImage || service.images[0]}
								<Card.Root class="overflow-hidden p-0">
									<div class="bg-muted aspect-video">
										{#if cover}
											<img
												src="/files/{cover}"
												alt={service.title}
												loading="lazy"
												class="size-full object-cover"
											/>
										{:else}
											<div class="text-muted-foreground flex size-full items-center justify-center">
												<Store class="size-8" />
											</div>
										{/if}
									</div>
									<div class="p-4">
										<h3 class="font-medium">{service.title}</h3>
										{#if service.description}
											<p class="text-muted-foreground mt-1 line-clamp-3 text-sm">
												{service.description}
											</p>
										{/if}
										{#if priceLabel(service)}
											<p class="mt-3 font-semibold">{priceLabel(service)}</p>
											{#if service.prices.length > 1}
												<p class="text-muted-foreground text-xs">
													{service.prices.length} package options
												</p>
											{/if}
										{/if}
									</div>
								</Card.Root>
							{/each}
						</div>
					{/if}
				</Tabs.Content>

				<!-- About -->
				<Tabs.Content value="about" class="mt-6">
					<Card.Root class="p-6">
						{#if data.vendor.description}
							<p class="whitespace-pre-line leading-relaxed">{data.vendor.description}</p>
						{:else}
							<p class="text-muted-foreground text-sm">
								This vendor hasn't added a description yet.
							</p>
						{/if}

						{#if data.vendor.priceRange}
							<Separator class="my-6" />
							<div>
								<p class="text-muted-foreground text-xs">Typical price range</p>
								<p class="mt-1 font-medium">{data.vendor.priceRange}</p>
							</div>
						{/if}
					</Card.Root>
				</Tabs.Content>

				<!-- Reviews -->
				<Tabs.Content value="reviews" class="mt-6 space-y-6">
					{#if data.vendor.reviewCount > 0}
						<Card.Root class="p-6">
							<div class="flex flex-wrap items-center gap-8">
								<div class="text-center">
									<p class="text-4xl font-semibold">{data.vendor.avgRating?.toFixed(1)}</p>
									<div class="mt-1 flex justify-center">
										{#each [1, 2, 3, 4, 5] as s (s)}
											<Star
												class="size-4 {s <= stars(data.vendor.avgRating)
													? 'fill-amber-400 text-amber-400'
													: 'text-muted-foreground/30'}"
											/>
										{/each}
									</div>
									<p class="text-muted-foreground mt-1 text-xs">
										{data.vendor.reviewCount} review{data.vendor.reviewCount === 1 ? '' : 's'}
									</p>
								</div>

								<div class="min-w-0 flex-1 space-y-1.5">
									{#each data.buckets as bucket (bucket.star)}
										<div class="flex items-center gap-3 text-xs">
											<span class="text-muted-foreground w-3">{bucket.star}</span>
											<Star class="size-3 fill-amber-400 text-amber-400" />
											<Progress
												value={data.reviews.length
													? (bucket.count / data.reviews.length) * 100
													: 0}
												class="h-1.5 flex-1"
											/>
											<span class="text-muted-foreground w-6 text-right">{bucket.count}</span>
										</div>
									{/each}
								</div>
							</div>
						</Card.Root>
					{/if}

					<!-- Review form -->
					{#if data.isLoggedIn}
						<Card.Root>
							<Card.Header>
								<Card.Title>{data.hasReviewed ? 'Your review' : 'Leave a review'}</Card.Title>
								<Card.Description>
									{data.hasReviewed
										? 'Update your rating or comment below.'
										: 'Share your experience to help other couples.'}
								</Card.Description>
							</Card.Header>
							<Card.Content>
								<form method="POST" action="?/review" use:enhance class="space-y-1">
									<div class="p-1">
										<p class="mb-2 text-sm font-medium capitalize">rating</p>
										<div class="flex gap-1">
											{#each [1, 2, 3, 4, 5] as s (s)}
												<button
													type="button"
													onclick={() => ($form.rating = s)}
													aria-label="{s} star{s === 1 ? '' : 's'}"
												>
													<Star
														class="size-7 transition-transform hover:scale-110 {s <=
														($form.rating ?? 0)
															? 'fill-amber-400 text-amber-400'
															: 'text-muted-foreground/30'}"
													/>
												</button>
											{/each}
										</div>
										<input type="hidden" name="rating" bind:value={$form.rating} />
										{#if $errors.rating}
											<p class="mt-2 text-sm text-red-500">{$errors.rating}</p>
										{/if}
									</div>

									<InputComp
										label="comment (optional)"
										{form}
										{errors}
										name="comment"
										type="textarea"
										rows={4}
										placeholder="How was working with them?"
									/>

									<div class="flex justify-end pt-3">
										<Button type="submit" disabled={$submitting}>
											{#if $submitting}<Loader2 class="mr-2 size-4 animate-spin" />{/if}
											{data.hasReviewed ? 'Update review' : 'Post review'}
										</Button>
									</div>
								</form>
							</Card.Content>
						</Card.Root>
					{:else}
						<Card.Root class="p-6 text-center">
							<MessageSquare class="text-muted-foreground mx-auto size-7" />
							<p class="text-muted-foreground mt-3 text-sm">
								<a href="/login" class="text-foreground font-medium underline">Sign in</a> to leave a
								review.
							</p>
						</Card.Root>
					{/if}

					<!-- Review list -->
					{#if data.reviews.length === 0}
						<p class="text-muted-foreground py-6 text-center text-sm">
							No reviews yet. Be the first.
						</p>
					{:else}
						<div class="space-y-4">
							{#each data.reviews as review (review.id)}
								<Card.Root class="p-5">
									<div class="flex items-start gap-3">
										<Avatar.Root class="size-9">
											<Avatar.Image src={review.authorImage} alt={review.authorName} />
											<Avatar.Fallback>
												{review.authorName?.[0]?.toUpperCase() ?? '?'}
											</Avatar.Fallback>
										</Avatar.Root>

										<div class="min-w-0 flex-1">
											<div class="flex flex-wrap items-center gap-2">
												<p class="text-sm font-medium">{review.authorName}</p>
												<span class="text-muted-foreground text-xs">
													{reviewDate(review.createdAt)}
												</span>
											</div>
											<div class="mt-1 flex">
												{#each [1, 2, 3, 4, 5] as s (s)}
													<Star
														class="size-3.5 {s <= (review.rating ?? 0)
															? 'fill-amber-400 text-amber-400'
															: 'text-muted-foreground/30'}"
													/>
												{/each}
											</div>
											{#if review.comment}
												<p class="mt-2 text-sm leading-relaxed">{review.comment}</p>
											{/if}
										</div>
									</div>
								</Card.Root>
							{/each}
						</div>
					{/if}
				</Tabs.Content>
			</Tabs.Root>
		</div>

		<!-- Sidebar -->
		<aside class="lg:col-span-1">
			<Card.Root class="sticky top-6 p-5">
				<h2 class="font-medium">Get in touch</h2>

				<div class="mt-4 space-y-3 text-sm">
					<a
						href="tel:{data.vendor.phone}"
						class="text-muted-foreground hover:text-foreground flex items-center gap-2"
					>
						<Phone class="size-4" />{data.vendor.phone}
					</a>

					{#if fullAddress}
						<p class="text-muted-foreground flex items-start gap-2">
							<MapPin class="mt-0.5 size-4 shrink-0" />{fullAddress}
						</p>
					{/if}

					{#if data.vendor.googleMapsUrl}
						<a
							href={data.vendor.googleMapsUrl}
							target="_blank"
							rel="noopener noreferrer"
							class="text-primary flex items-center gap-2 hover:underline"
						>
							<ExternalLink class="size-4" /> Open in Google Maps
						</a>
					{/if}
				</div>

				<Separator class="my-5" />

				<Button class="w-full" href="/wedding/bookings?vendor={data.vendor.id}">
					<CalendarPlus class="mr-2 size-4" /> Request booking
				</Button>
				<p class="text-muted-foreground mt-3 text-center text-xs">
					You'll confirm the date and price in your dashboard.
				</p>
			</Card.Root>
		</aside>
	</div>
</div>