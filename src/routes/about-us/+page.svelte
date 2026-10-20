<script lang="ts">
	import { Button } from '@nahu/admin-kit/components/ui/button/index.js';
	import { ShieldCheckIcon, MapPinIcon, SproutIcon } from '@lucide/svelte';
	import { m } from '$lib/paraglide/messages.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const values = [
		{ icon: ShieldCheckIcon, title: m.about_value1_title(), body: m.about_value1_body() },
		{ icon: MapPinIcon, title: m.about_value2_title(), body: m.about_value2_body() },
		{ icon: SproutIcon, title: m.about_value3_title(), body: m.about_value3_body() }
	];

	const stats = $derived(
		[
			{ value: data.stats.couples, label: m.about_stat_couples() },
			{ value: data.stats.vendors, label: m.about_stat_vendors() },
			{ value: data.stats.cities, label: m.about_stat_cities() }
		].filter((s) => s.value > 0)
	);
</script>

<svelte:head>
	<title>{m.about_meta_title()}</title>
	<meta name="description" content={m.about_meta_description()} />
	<meta property="og:title" content={m.about_meta_title()} />
	<meta property="og:description" content={m.about_meta_description()} />
</svelte:head>

<section
	class="bg-linear-to-br from-(--leora-gold-soft) via-background to-background px-4 py-20 sm:py-28"
>
	<div class="mx-auto max-w-4xl space-y-6 text-center">
		<p class="text-sm font-semibold tracking-wide text-(--leora-gold-dark) uppercase">
			{m.about_eyebrow()}
		</p>
		<h1 class="text-4xl font-bold tracking-tight sm:text-5xl">{m.about_title()}</h1>
		<p class="mx-auto max-w-2xl text-lg text-muted-foreground">{m.about_lead()}</p>
	</div>

	{#if stats.length}
		<dl class="mx-auto mt-14 grid max-w-3xl gap-6 sm:grid-cols-3">
			{#each stats as stat (stat.label)}
				<div class="rounded-2xl border bg-card p-6 text-center shadow-sm">
					<dt class="text-sm text-muted-foreground">{stat.label}</dt>
					<dd class="mt-1 text-3xl font-bold">{stat.value.toLocaleString()}</dd>
				</div>
			{/each}
		</dl>
	{/if}
</section>

<section class="mx-auto max-w-3xl px-4 py-16">
	<h2 class="mb-4 text-2xl font-bold sm:text-3xl">{m.about_why_title()}</h2>
	<p class="text-lg leading-relaxed text-muted-foreground">{m.about_why_body()}</p>
</section>

<section class="bg-muted/40 px-4 py-16">
	<div class="mx-auto max-w-5xl">
		<h2 class="mb-10 text-center text-2xl font-bold sm:text-3xl">{m.about_values_title()}</h2>
		<div class="grid gap-6 md:grid-cols-3">
			{#each values as value (value.title)}
				<div class="rounded-2xl border bg-card p-6 shadow-sm">
					<div
						class="mb-4 flex size-11 items-center justify-center rounded-xl bg-(--leora-gold-soft) text-(--leora-gold-dark)"
					>
						<value.icon class="size-5" />
					</div>
					<h3 class="mb-2 font-semibold">{value.title}</h3>
					<p class="text-sm text-muted-foreground">{value.body}</p>
				</div>
			{/each}
		</div>
	</div>
</section>

<section class="px-4 py-16 text-center">
	<h2 class="mb-6 text-2xl font-bold sm:text-3xl">{m.about_cta_title()}</h2>
	<div class="flex flex-wrap justify-center gap-3">
		<Button href="/signup" size="lg">{m.about_cta_couple()}</Button>
		<Button href="/signup?role=vendor" size="lg" variant="outline">{m.about_cta_vendor()}</Button>
	</div>
</section>
