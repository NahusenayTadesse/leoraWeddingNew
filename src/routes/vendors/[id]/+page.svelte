<script lang="ts">
	import ActionForm from '@nahu/admin-kit/formComponents/ActionForm.svelte';
	import HiddenField from '@nahu/admin-kit/formComponents/HiddenField.svelte';
	import { formatPriceRange } from '$lib/price';
	import { assetUrl } from '$lib/assetUrl';
	import { createForm } from '@nahu/admin-kit/forms/createForm';
	import { reviewSchema } from '$lib/schemas/review';
	import InputComp from '@nahu/admin-kit/formComponents/InputComp.svelte';
	import * as Card from '@nahu/admin-kit/components/ui/card/index.js';
	import * as Tabs from '@nahu/admin-kit/components/ui/tabs/index.js';
	import * as Avatar from '@nahu/admin-kit/components/ui/avatar/index.js';
	import * as Select from '@nahu/admin-kit/components/ui/select/index.js';
	import { Button } from '@nahu/admin-kit/components/ui/button/index.js';
	import { Badge } from '@nahu/admin-kit/components/ui/badge/index.js';
	import { Separator } from '@nahu/admin-kit/components/ui/separator/index.js';
	import { Progress } from '@nahu/admin-kit/components/ui/progress/index.js';
	import AvailabilityCalendar from '$lib/components/AvailabilityCalendar.svelte';
	import { m } from '$lib/paraglide/messages.js';
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

	/**
	 * Structured data for search results (business, location, rating). `<` is escaped so a
	 * description can't close the script tag.
	 */
	const jsonLd = $derived(
		JSON.stringify({
			'@context': 'https://schema.org',
			'@type': 'LocalBusiness',
			name: data.vendor.businessName,
			description: data.vendor.description ?? undefined,
			telephone: data.vendor.phone ?? undefined,
			address: data.vendor.city
				? { '@type': 'PostalAddress', addressLocality: data.vendor.city, addressCountry: 'ET' }
				: undefined,
			priceRange: formatPriceRange(data.vendor.priceMin, data.vendor.priceMax) ?? undefined,
			aggregateRating:
				data.vendor.reviewCount > 0 && data.vendor.avgRating
					? {
							'@type': 'AggregateRating',
							ratingValue: data.vendor.avgRating,
							reviewCount: data.vendor.reviewCount
						}
					: undefined
		}).replace(/</g, '\\u003c')
	);

	type Calendar = { month: string; blocked: string[]; booked: string[] };
	let calendar = $state<Calendar | null>(null);

	async function loadMonth(month?: string) {
		const query = month ? `?month=${month.slice(0, 7)}` : '';
		const res = await fetch(`/vendors/${data.vendor.id}/availability${query}`);
		if (res.ok) calendar = await res.json();
	}

	let selectedPackage = $state<Record<number, string>>({});

	function packageFor(service: (typeof data.services)[number]) {
		return selectedPackage[service.id] ?? service.prices[0]?.amount ?? '';
	}

	function priceFor(service: (typeof data.services)[number]) {
		const amount = packageFor(service);
		return service.prices.find((p) => p.amount === amount) ?? service.prices[0] ?? null;
	}

	let tab = $state('services');

	// svelte-ignore state_referenced_locally
	const { form, errors, enhance, submitting } = createForm(data.form, reviewSchema, {
		id: 'review',
		resetForm: false
	});

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

	const etb = (n: number) => new Intl.NumberFormat('en-ET', { maximumFractionDigits: 0 }).format(n);

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
	<meta property="og:title" content="{data.vendor.businessName} · Leora Events" />
	<meta property="og:description" content={data.vendor.description ?? data.vendor.businessName} />
	<!-- eslint-disable-next-line svelte/no-at-html-tags -- JSON with `<` escaped -->
	{@html '<script type="application/ld+json">' + jsonLd + '</' + 'script>'}
</svelte:head>

<div class="mx-auto max-w-6xl px-4 py-8 lg:px-6">
	<a href="/vendors" class="mb-6 inline-block text-sm text-muted-foreground hover:text-foreground">
		{m.vdet_back()}
	</a>

	<!-- Header -->
	<div class="flex flex-wrap items-start justify-between gap-6">
		<div class="min-w-0">
			<div class="flex flex-wrap items-center gap-2">
				<h1 class="text-3xl font-semibold tracking-tight">{data.vendor.businessName}</h1>
				{#if data.vendor.isVerified}
					<Badge class="gap-1"><BadgeCheck class="size-3.5" /> {m.vdet_verified()}</Badge>
				{/if}
			</div>

			<div class="mt-3 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
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
						{data.vendor.avgRating?.toFixed(1)} · {m.vdir_reviews({
							count: data.vendor.reviewCount
						})}
					</span>
				{/if}

				{#if fullAddress}
					<span class="flex items-center gap-1.5"><MapPin class="size-4" />{fullAddress}</span>
				{/if}
			</div>
		</div>

		<div class="flex gap-2">
			<ActionForm action="?/favorite">
				<HiddenField name="vendorId" value={data.vendor.id} />
				<Button type="submit" variant="outline">
					<Heart class="mr-2 size-4 {data.isFavorite ? 'fill-red-500 text-red-500' : ''}" />
					{data.isFavorite ? m.vdet_saved() : m.vdet_save()}
				</Button>
			</ActionForm>

			<Button href="/wedding/messages?vendor={data.vendor.id}" variant="outline">
				<MessageSquare class="mr-2 size-4" />
				{m.vdet_message()}
			</Button>

			<Button href="/wedding/bookings?vendor={data.vendor.id}">
				<CalendarPlus class="mr-2 size-4" />
				{m.vdet_request()}
			</Button>
		</div>
	</div>

	<Separator class="my-8" />

	<div class="grid gap-8 lg:grid-cols-3">
		<!-- Main column -->
		<div class="lg:col-span-2">
			<Tabs.Root
				bind:value={tab}
				onValueChange={(v) => v === 'availability' && !calendar && loadMonth()}
			>
				<Tabs.List>
					<Tabs.Trigger value="services"
						>{m.vdet_tab_services({ count: data.services.length })}</Tabs.Trigger
					>
					<Tabs.Trigger value="about">{m.vdet_tab_about()}</Tabs.Trigger>
					<Tabs.Trigger value="reviews"
						>{m.vdet_tab_reviews({ count: data.vendor.reviewCount })}</Tabs.Trigger
					>
					<Tabs.Trigger value="availability">{m.avail_title()}</Tabs.Trigger>
				</Tabs.List>

				<!-- Services -->
				<Tabs.Content value="services" class="mt-6">
					{#if data.services.length === 0}
						<Card.Root class="p-10 text-center">
							<Store class="mx-auto size-8 text-muted-foreground" />
							<p class="mt-3 text-sm text-muted-foreground">
								{m.vdet_no_services()}
							</p>
						</Card.Root>
					{:else}
						<div class="grid gap-4 sm:grid-cols-2">
							{#each data.services as service (service.id)}
								{@const cover = service.featuredImage || service.images[0]}
								<Card.Root class="overflow-hidden p-0">
									<div class="aspect-video bg-muted">
										{#if cover}
											<img
												src={assetUrl(cover)}
												alt={service.title}
												loading="lazy"
												class="size-full object-cover"
											/>
										{:else}
											<div class="flex size-full items-center justify-center text-muted-foreground">
												<Store class="size-8" />
											</div>
										{/if}
									</div>
									<div class="p-4">
										<h2 class="font-medium">{service.title}</h2>
										{#if service.description}
											<p class="mt-1 line-clamp-3 text-sm text-muted-foreground">
												{service.description}
											</p>
										{/if}
										{#if priceLabel(service)}
											<p class="mt-3 font-semibold">{priceLabel(service)}</p>
											{#if service.prices.length > 1}
												<p class="text-xs text-muted-foreground">
													{m.vdet_package_options({ count: service.prices.length })}
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
							<p class="leading-relaxed whitespace-pre-line">{data.vendor.description}</p>
						{:else}
							<p class="text-sm text-muted-foreground">
								{m.vdet_no_description()}
							</p>
						{/if}

						{#if formatPriceRange(data.vendor.priceMin, data.vendor.priceMax)}
							<Separator class="my-6" />
							<div>
								<p class="text-xs text-muted-foreground">{m.vdet_price_range()}</p>
								<p class="mt-1 font-medium">
									{formatPriceRange(data.vendor.priceMin, data.vendor.priceMax)}
								</p>
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
									<p class="mt-1 text-xs text-muted-foreground">
										{m.vdir_reviews({ count: data.vendor.reviewCount })}
									</p>
								</div>

								<div class="min-w-0 flex-1 space-y-1.5">
									{#each data.buckets as bucket (bucket.star)}
										<div class="flex items-center gap-3 text-xs">
											<span class="w-3 text-muted-foreground">{bucket.star}</span>
											<Star class="size-3 fill-amber-400 text-amber-400" />
											<Progress
												value={data.reviews.length ? (bucket.count / data.reviews.length) * 100 : 0}
												class="h-1.5 flex-1"
											/>
											<span class="w-6 text-right text-muted-foreground">{bucket.count}</span>
										</div>
									{/each}
								</div>
							</div>
						</Card.Root>
					{/if}

					<!-- Review form: only couples who hired this vendor (see canReviewVendor) -->
					{#if data.canReview || data.hasReviewed}
						<Card.Root>
							<Card.Header>
								<Card.Title
									>{data.hasReviewed ? m.vdet_your_review() : m.vdet_leave_review()}</Card.Title
								>
								<Card.Description>
									{data.hasReviewed ? m.vdet_update_hint() : m.vdet_share_hint()}
								</Card.Description>
							</Card.Header>
							<Card.Content>
								<form method="POST" action="?/review" use:enhance class="space-y-1">
									<div class="p-1">
										<p class="mb-2 text-sm font-medium">{m.vdet_rating()}</p>
										<div class="flex gap-1">
											{#each [1, 2, 3, 4, 5] as s (s)}
												<button
													type="button"
													onclick={() => ($form.rating = s)}
													aria-label={m.vdet_stars({ count: s })}
												>
													<Star
														class="size-7 transition-transform hover:scale-110 {s <=
														Number($form.rating ?? 0)
															? 'fill-amber-400 text-amber-400'
															: 'text-muted-foreground/30'}"
													/>
												</button>
											{/each}
										</div>
										<HiddenField name="rating" value={$form.rating} />
										{#if $errors.rating}
											<p class="mt-2 text-sm text-red-500">{$errors.rating}</p>
										{/if}
									</div>

									<InputComp
										label={m.vdet_comment()}
										{form}
										{errors}
										name="comment"
										type="textarea"
										rows={4}
										placeholder={m.vdet_comment_ph()}
									/>

									<div class="flex justify-end pt-3">
										<Button type="submit" disabled={$submitting}>
											{#if $submitting}<Loader2 class="mr-2 size-4 animate-spin" />{/if}
											{data.hasReviewed ? m.vdet_update_review() : m.vdet_post_review()}
										</Button>
									</div>
								</form>
							</Card.Content>
						</Card.Root>
					{:else}
						<Card.Root class="p-6 text-center">
							<MessageSquare class="mx-auto size-7 text-muted-foreground" />
							<p class="mt-3 text-sm text-muted-foreground">
								{#if data.isLoggedIn}
									{m.vdet_review_after()}
								{:else}
									<a href="/login" class="font-medium text-foreground underline"
										>{m.vdet_sign_in()}</a
									>
									{m.vdet_to_review()}
								{/if}
							</p>
						</Card.Root>
					{/if}

					<!-- Review list -->
					{#if data.reviews.length === 0}
						<p class="py-6 text-center text-sm text-muted-foreground">
							{m.vdet_no_reviews()}
						</p>
					{:else}
						<div class="space-y-4">
							{#each data.reviews as review (review.id)}
								<Card.Root class="p-5">
									<div class="flex items-start gap-3">
										<Avatar.Root class="size-9">
											<Avatar.Image src={assetUrl(review.authorImage)} alt={review.authorName} />
											<Avatar.Fallback>
												{review.authorName?.[0]?.toUpperCase() ?? '?'}
											</Avatar.Fallback>
										</Avatar.Root>

										<div class="min-w-0 flex-1">
											<div class="flex flex-wrap items-center gap-2">
												<p class="text-sm font-medium">{review.authorName}</p>
												<span class="text-xs text-muted-foreground">
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

				<!-- Availability (loaded when the tab opens) -->
				<Tabs.Content value="availability" class="mt-6 max-w-md space-y-3">
					{#if calendar}
						<AvailabilityCalendar
							month={calendar.month}
							blocked={calendar.blocked}
							booked={calendar.booked}
							onMonth={loadMonth}
						/>
					{/if}
					<p class="text-sm text-muted-foreground">{m.avail_public_hint()}</p>
				</Tabs.Content>
			</Tabs.Root>
		</div>

		<!-- Sidebar -->
		<aside class="lg:col-span-1">
			<Card.Root class="sticky top-6 p-5">
				<h2 class="font-medium">{m.vdet_get_in_touch()}</h2>

				<div class="mt-4 space-y-3 text-sm">
					<a
						href="tel:{data.vendor.phone}"
						class="flex items-center gap-2 text-muted-foreground hover:text-foreground"
					>
						<Phone class="size-4" />{data.vendor.phone}
					</a>

					{#if fullAddress}
						<p class="flex items-start gap-2 text-muted-foreground">
							<MapPin class="mt-0.5 size-4 shrink-0" />{fullAddress}
						</p>
					{/if}

					{#if data.vendor.googleMapsUrl}
						<a
							href={data.vendor.googleMapsUrl}
							target="_blank"
							rel="noopener noreferrer"
							class="flex items-center gap-2 text-primary hover:underline"
						>
							<ExternalLink class="size-4" />
							{m.vdet_maps()}
						</a>
					{/if}
				</div>

				<Separator class="my-5" />

				<Button class="w-full" href="/wedding/bookings?vendor={data.vendor.id}">
					<CalendarPlus class="mr-2 size-4" />
					{m.vdet_request()}
				</Button>
				<p class="mt-3 text-center text-xs text-muted-foreground">
					{m.vdet_confirm_hint()}
				</p>
			</Card.Root>
		</aside>
	</div>

	<!-- Services & packages -->
	{#if data.services.length > 0}
		<Separator class="my-10" />

		<div>
			<h2 class="text-2xl font-semibold tracking-tight">{m.vdet_services_title()}</h2>
			<p class="mt-1 text-sm text-muted-foreground">
				{m.vdet_services_lead()}
			</p>

			<div class="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
				{#each data.services as service (service.id)}
					{@const cover = service.featuredImage || service.images[0]}
					{@const chosen = priceFor(service)}
					<Card.Root class="flex flex-col overflow-hidden p-0">
						<div class="aspect-video bg-muted">
							{#if cover}
								<img
									src={assetUrl(cover)}
									alt={service.title}
									loading="lazy"
									class="size-full object-cover"
								/>
							{:else}
								<div class="flex size-full items-center justify-center text-muted-foreground">
									<Store class="size-8" />
								</div>
							{/if}
						</div>

						<div class="flex flex-1 flex-col p-4">
							<h3 class="font-medium">{service.title}</h3>
							{#if service.description}
								<p class="mt-1 line-clamp-2 text-sm text-muted-foreground">
									{service.description}
								</p>
							{/if}

							{#if service.prices.length > 1}
								<Select.Root
									type="single"
									value={packageFor(service)}
									onValueChange={(v) => (selectedPackage[service.id] = v)}
								>
									<Select.Trigger class="mt-3 w-full">
										{chosen
											? `${chosen.amount} — ${etb(chosen.price)} ${service.currency}`
											: m.vdet_choose_package()}
									</Select.Trigger>
									<Select.Content>
										{#each service.prices as p (p.amount)}
											<Select.Item value={p.amount}>
												{p.amount} — {etb(p.price)}
												{service.currency}
											</Select.Item>
										{/each}
									</Select.Content>
								</Select.Root>
							{:else if chosen}
								<p class="mt-3 font-semibold">{etb(chosen.price)} {service.currency}</p>
							{:else}
								<p class="mt-3 text-sm text-muted-foreground">{m.vdet_contact_pricing()}</p>
							{/if}

							<div class="mt-auto pt-4">
								<Button
									class="w-full"
									href="/wedding/bookings?vendor={data.vendor.id}&service={service.id}"
								>
									<CalendarPlus class="mr-1.5 size-4" />
									{m.vdet_book()}
								</Button>
							</div>
						</div>
					</Card.Root>
				{/each}
			</div>
		</div>
	{/if}
</div>
