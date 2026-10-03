<script lang="ts">
	import PageHeader from '$lib/components/admin/PageHeader.svelte';
	import ActionForm from '$lib/components/admin/ActionForm.svelte';
	import Filter from '$lib/components/admin/Filter.svelte';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Star } from '@lucide/svelte';

	let { data } = $props();
	let q = $state('');
	let max = $state(5);
	const rows = $derived(
		data.rows.filter((r) => r.rating <= max && `${r.vendor} ${r.title ?? ''} ${r.comment ?? ''}`.toLowerCase().includes(q.toLowerCase()))
	);
</script>

<div class="space-y-6">
	<PageHeader title="Reviews" description="Moderate vendor reviews. Removing one recalculates the vendor's rating." />
	<div class="flex flex-wrap items-center gap-3">
		<Filter bind:value={q} placeholder="Search reviews" />
		<select bind:value={max} class="border-input bg-background h-9 rounded-md border px-3 text-sm" aria-label="Maximum rating">
			<option value={5}>All ratings</option>
			<option value={2}>2 stars and below</option>
			<option value={3}>3 stars and below</option>
		</select>
	</div>

	{#each rows as r (r.id)}
		<Card.Root>
			<Card.Content class="flex items-start justify-between gap-4 py-4">
				<div class="space-y-1">
					<div class="flex items-center gap-2 text-sm font-medium">
						{r.vendor}
						<span class="flex" aria-label="{r.rating} of 5 stars">
							{#each [1, 2, 3, 4, 5] as n (n)}
								<Star class="size-3.5 {n <= r.rating ? 'fill-leora-gold text-leora-gold' : 'text-muted-foreground'}" />
							{/each}
						</span>
					</div>
					{#if r.title}<p class="text-sm font-medium">{r.title}</p>{/if}
					<p class="text-muted-foreground text-sm">{r.comment ?? 'No comment'}</p>
					<p class="text-muted-foreground text-xs">{new Date(r.createdAt).toLocaleDateString()}</p>
				</div>
				<ActionForm action="?/remove" fields={{ id: r.id }} label="Remove" variant="destructive" confirmText="Remove this review?" />
			</Card.Content>
		</Card.Root>
	{:else}
		<p class="text-muted-foreground text-sm">No reviews.</p>
	{/each}
</div>
