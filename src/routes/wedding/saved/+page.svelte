<script lang="ts">
	import ActionForm from '@nahu/admin-kit/formComponents/ActionForm.svelte';
	import { Button } from '@nahu/admin-kit/components/ui/button/index.js';
	import { Badge } from '@nahu/admin-kit/components/ui/badge/index.js';
	import * as Card from '@nahu/admin-kit/components/ui/card/index.js';
	import { BadgeCheckIcon, StarIcon } from '@lucide/svelte';
	import { formatPriceRange } from '$lib/price';
	import { m } from '$lib/paraglide/messages.js';

	let { data } = $props();

	let picked = $state<number[]>([]);
	let comparing = $state(false);

	const chosen = $derived(data.vendors.filter((v) => picked.includes(v.id)));

	function toggle(id: number) {
		picked = picked.includes(id) ? picked.filter((p) => p !== id) : [...picked, id].slice(-4);
	}

	const rows = [
		{ label: m.saved_category(), value: (v: (typeof data.vendors)[number]) => v.category ?? '—' },
		{ label: m.saved_city(), value: (v: (typeof data.vendors)[number]) => v.city ?? '—' },
		{
			label: m.saved_price(),
			value: (v: (typeof data.vendors)[number]) => formatPriceRange(v.priceMin, v.priceMax) ?? '—'
		},
		{
			label: m.saved_rating(),
			value: (v: (typeof data.vendors)[number]) =>
				v.reviewCount
					? `${v.ratingAvg?.toFixed(1)} ★ · ${m.saved_reviews({ count: v.reviewCount })}`
					: '—'
		},
		{
			label: m.saved_verified(),
			value: (v: (typeof data.vendors)[number]) => (v.isVerified ? '✓' : '—')
		}
	];
</script>

<svelte:head>
	<title>{m.saved_title()} — Leora Events</title>
</svelte:head>

<div class="space-y-6">
	<div class="flex flex-wrap items-end justify-between gap-4">
		<div>
			<h1 class="text-2xl font-semibold tracking-tight">{m.saved_title()}</h1>
			<p class="text-sm text-muted-foreground">{m.saved_sub()}</p>
		</div>
		{#if data.vendors.length > 1}
			<Button disabled={chosen.length < 2} onclick={() => (comparing = !comparing)}>
				{m.saved_compare({ count: chosen.length })}
			</Button>
		{/if}
	</div>

	{#if data.vendors.length === 0}
		<Card.Root class="space-y-4 p-10 text-center">
			<p class="text-sm text-muted-foreground">{m.saved_empty()}</p>
			<Button href="/vendors">{m.saved_browse()}</Button>
		</Card.Root>
	{:else}
		{#if comparing && chosen.length >= 2}
			<div class="overflow-x-auto rounded-xl border">
				<table class="w-full min-w-[480px] text-sm">
					<thead>
						<tr class="border-b bg-muted/40">
							<th class="p-3 text-left"></th>
							{#each chosen as v (v.id)}
								<th class="p-3 text-left font-semibold">
									<a href="/vendors/{v.id}" class="hover:underline">{v.businessName}</a>
								</th>
							{/each}
						</tr>
					</thead>
					<tbody>
						{#each rows as row (row.label)}
							<tr class="border-b last:border-0">
								<th class="p-3 text-left font-medium text-muted-foreground">{row.label}</th>
								{#each chosen as v (v.id)}
									<td class="p-3">{row.value(v)}</td>
								{/each}
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}

		<div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
			{#each data.vendors as v (v.id)}
				<Card.Root class={['p-4', picked.includes(v.id) && 'ring-2 ring-(--leora-gold)']}>
					<div class="flex items-start gap-3">
						<input
							type="checkbox"
							checked={picked.includes(v.id)}
							onchange={() => toggle(v.id)}
							aria-label="{m.saved_compare({ count: chosen.length })}: {v.businessName}"
							class="mt-1"
						/>
						<div class="min-w-0 flex-1 space-y-1">
							<p class="flex items-center gap-1.5 font-medium">
								<span class="truncate">{v.businessName}</span>
								{#if v.isVerified}<BadgeCheckIcon class="size-4 shrink-0 text-primary" />{/if}
							</p>
							<p class="text-xs text-muted-foreground">
								{[v.category, v.city].filter(Boolean).join(' · ')}
							</p>
							<p class="text-sm">{formatPriceRange(v.priceMin, v.priceMax) ?? '—'}</p>
							{#if v.reviewCount}
								<Badge variant="secondary" class="gap-1">
									<StarIcon class="size-3" />{v.ratingAvg?.toFixed(1)} ({v.reviewCount})
								</Badge>
							{/if}
						</div>
					</div>
					<div class="mt-3 flex gap-2 border-t pt-3">
						<Button href="/vendors/{v.id}" variant="outline" size="sm">{m.saved_view()}</Button>
						<ActionForm action="?/remove" fields={{ vendorId: v.id }}>
							{#snippet children({ busy })}
								<Button type="submit" variant="ghost" size="sm" disabled={!!busy}>
									{m.saved_remove()}
								</Button>
							{/snippet}
						</ActionForm>
					</div>
				</Card.Root>
			{/each}
		</div>
	{/if}
</div>
