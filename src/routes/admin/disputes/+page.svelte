<script lang="ts">
	import PageHeader from '$lib/components/admin/PageHeader.svelte';
	import ActionForm from '$lib/components/admin/ActionForm.svelte';
	import StatusBadge from '$lib/components/admin/StatusBadge.svelte';
	import * as Card from '$lib/components/ui/card/index.js';

	let { data } = $props();
	let filter = $state('active');
	const rows = $derived(
		data.rows.filter((r) => (filter === 'all' ? true : filter === 'active' ? r.status === 'open' || r.status === 'under_review' : r.status === filter))
	);
</script>

<div class="space-y-6">
	<PageHeader title="Disputes" description="Issues raised on bookings by couples or vendors." />
	<select bind:value={filter} class="border-input bg-background h-9 rounded-md border px-3 text-sm" aria-label="Filter">
		<option value="active">Needs action</option>
		<option value="all">All</option>
		<option value="resolved">Resolved</option>
		<option value="refunded">Refunded</option>
	</select>

	{#each rows as r (r.id)}
		<Card.Root>
			<Card.Header>
				<Card.Title class="flex flex-wrap items-center gap-2 text-base">
					Booking #{r.bookingId} · {r.vendor} <StatusBadge status={r.status} />
				</Card.Title>
				<Card.Description>Raised by {r.raisedBy ?? 'unknown'} · {new Date(r.createdAt).toLocaleString()}</Card.Description>
			</Card.Header>
			<Card.Content class="space-y-3">
				<p class="text-sm">{r.reason}</p>
				<ActionForm action="?/update" fields={{ id: r.id }} label="Save" variant="default">
					<select name="status" class="border-input bg-background h-8 rounded-md border px-2 text-sm" aria-label="Status">
						{#each ['open', 'under_review', 'resolved', 'refunded'] as s (s)}
							<option value={s} selected={r.status === s}>{s.replace('_', ' ')}</option>
						{/each}
					</select>
					<input name="notes" value={r.notes ?? ''} placeholder="Resolution notes" class="border-input bg-background h-8 w-64 rounded-md border px-2 text-sm" />
				</ActionForm>
			</Card.Content>
		</Card.Root>
	{:else}
		<p class="text-muted-foreground text-sm">Nothing here.</p>
	{/each}
</div>
