<script lang="ts">
	import ServiceDetail from '$lib/components/product-detail.svelte';
	import Gallery from '$lib/components/gallery.svelte';
	import { assetUrl } from '$lib/assetUrl';

	let { data } = $props();

	const jsonLd = {
		'@context': 'https://schema.org/',
		'@type': 'Service',
		name: data?.service.serviceName,
		image: [data?.service.image, ...(data?.images ?? [])],
		description: data?.service.description,
		provider: {
			'@type': 'LocalBusiness',
			name: data?.service.vendor
		},
		offers: {
			'@type': 'AggregateOffer',
			lowPrice: data?.service.price,
			priceCurrency: 'ETB',
			offerCount: data?.priceList?.length
		}
	};
</script>

<svelte:head>
	<title>{data?.service.serviceName} · Leora Events</title>
	<meta name="description" content={data?.service.description?.substring(0, 160)} />

	<meta property="og:type" content="product" />
	<meta property="og:title" content="{data?.service.serviceName} · {data?.service.vendor}" />
	<meta property="og:description" content={data?.service.description} />
	<meta property="og:image" content={assetUrl(data?.service.image)} />
	<meta property="product:price:amount" content={String(data?.service.price ?? '')} />
	<meta property="product:price:currency" content="ETB" />

	<meta property="twitter:card" content="summary_large_image" />
	<meta property="twitter:title" content={data?.service.serviceName} />
	<meta property="twitter:image" content={assetUrl(data?.service.image)} />

	<!-- {@html `<script type="application/ld+json">${JSON.stringify(jsonLd)}<\/script>`} -->
</svelte:head>

<div class="min-h-screen w-full bg-background text-foreground">
	<section class="border-b bg-card shadow-sm">
		<ServiceDetail
			{...data?.service}
			priceList={data?.priceList}
			subs={data?.subs}
			images={data?.images}
			vendorRating={data?.vendor.avgRating}
			vendorReviewCount={data?.vendor.reviewCount}
			vendorCity={data?.vendor.cityName ?? data?.vendor.city}
			isFavorite={data?.isFavorite}
		/>
	</section>
	{#if data?.images?.length}
		<div class="mx-auto mt-12 w-full max-w-7xl px-4 sm:px-6 lg:px-8">
			<div class="mb-8 flex items-end justify-between border-b pb-4">
				<div>
					<h2 class="text-3xl font-bold tracking-tight text-foreground">Gallery</h2>
					<p class="mt-2 text-sm text-muted-foreground">
						A detailed look at {data?.service?.serviceName || 'this service'}.
					</p>
				</div>
				<span class="text-muted-foreground text-xs font-medium tracking-widest uppercase">
					{data?.images?.length || 0} Images
				</span>
			</div>

			<div class="bg-card ring-border rounded-xl p-2 shadow-sm ring-1">
				<Gallery images={data?.images} title={data?.service?.serviceName} />
			</div>
		</div>
	{/if}
</div>
