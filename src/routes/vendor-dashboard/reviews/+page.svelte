<script lang="ts">
	import PageHeader from '@nahu/admin-kit/components/PageHeader.svelte';
	import ActionForm from '@nahu/admin-kit/formComponents/ActionForm.svelte';
	import * as Card from '@nahu/admin-kit/components/ui/card/index.js';
	import { Button } from '@nahu/admin-kit/components/ui/button/index.js';
	import { Star } from '@lucide/svelte';

	let { data } = $props();

	/** Which review has its reply box open. */
	let editing = $state<number | null>(null);

	const average = $derived(
		data.reviews.length
			? data.reviews.reduce((s, r) => s + (r.rating ?? 0), 0) / data.reviews.length
			: 0
	);
	const fmt = (d: Date | string) =>
		new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
</script>

<div class="space-y-6">
	<PageHeader
		title="Reviews"
		tabTitle="Reviews — Vendor Dashboard"
		description="What couples say about you. A short, polite reply shows future couples you care, especially on a bad review."
	/>

	{#if data.reviews.length === 0}
		<Card.Root>
			<Card.Content class="py-10 text-center text-sm text-muted-foreground">
				No reviews yet. Couples are asked for one after their event.
			</Card.Content>
		</Card.Root>
	{:else}
		<p class="text-sm text-muted-foreground">
			<span class="font-semibold text-foreground">{average.toFixed(1)} ★</span>
			from {data.reviews.length}
			{data.reviews.length === 1 ? 'review' : 'reviews'} ·
			<a class="underline" href="/vendors/{data.vendorId}">See your public page</a>
		</p>

		<div class="grid gap-4">
			{#each data.reviews as review (review.id)}
				<Card.Root class="p-5">
					<div class="flex flex-wrap items-center justify-between gap-2">
						<div class="flex items-center gap-2">
							<span class="font-medium">{review.authorName ?? 'A couple'}</span>
							<span class="flex" aria-label="{review.rating} out of 5">
								{#each [1, 2, 3, 4, 5] as s (s)}
									<Star
										class="size-3.5 {s <= (review.rating ?? 0)
											? 'fill-amber-400 text-amber-400'
											: 'text-muted-foreground/30'}"
									/>
								{/each}
							</span>
						</div>
						<span class="text-xs text-muted-foreground">{fmt(review.createdAt)}</span>
					</div>
					{#if review.title}<p class="mt-2 font-medium">{review.title}</p>{/if}
					{#if review.comment}
						<p class="mt-1 text-sm leading-relaxed whitespace-pre-line">{review.comment}</p>
					{/if}

					{#if editing === review.id}
						<ActionForm
							action="?/reply"
							fields={{ id: review.id }}
							onDone={() => (editing = null)}
							class="mt-4 space-y-2"
						>
							{#snippet children({ busy })}
								<textarea
									name="reply"
									rows="3"
									maxlength="1000"
									aria-label="Your reply"
									class="w-full rounded-md border bg-background p-2 text-sm"
									>{review.vendorReply ?? ''}</textarea
								>
								<div class="flex justify-end gap-2">
									<Button type="button" variant="ghost" size="sm" onclick={() => (editing = null)}>
										Cancel
									</Button>
									<Button type="submit" size="sm" disabled={!!busy}>Post reply</Button>
								</div>
							{/snippet}
						</ActionForm>
					{:else if review.vendorReply}
						<div class="mt-3 border-l-2 border-primary/40 pl-3 text-sm">
							<p class="text-xs font-medium text-muted-foreground">Your reply</p>
							<p class="mt-1 whitespace-pre-line">{review.vendorReply}</p>
							<Button
								variant="link"
								size="sm"
								class="h-auto px-0"
								onclick={() => (editing = review.id)}>Edit reply</Button
							>
						</div>
					{:else}
						<Button variant="outline" size="sm" class="mt-3" onclick={() => (editing = review.id)}
							>Reply</Button
						>
					{/if}
				</Card.Root>
			{/each}
		</div>
	{/if}
</div>
