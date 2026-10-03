<script lang="ts">
	import PageHeader from '$lib/components/admin/PageHeader.svelte';
	import ActionForm from '$lib/components/admin/ActionForm.svelte';
	import StatusBadge from '$lib/components/admin/StatusBadge.svelte';
	import Filter from '$lib/components/admin/Filter.svelte';
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Table from '$lib/components/ui/table/index.js';
	import { formatETB } from '$lib/money';

	let { data } = $props();
	let q = $state('');
	let status = $state('all');

	const rows = $derived(
		data.rows.filter(
			(r) =>
				(status === 'all' || r.status === status) &&
				`${r.vendor} ${r.couple}`.toLowerCase().includes(q.toLowerCase())
		)
	);
</script>

<div class="space-y-6">
	<PageHeader title="Bookings" description="Every vendor booking across the marketplace." />
	<div class="flex flex-wrap items-center gap-3">
		<Filter bind:value={q} placeholder="Search vendor or couple" />
		<select bind:value={status} class="border-input bg-background h-9 rounded-md border px-3 text-sm" aria-label="Status">
			<option value="all">All statuses</option>
			<option value="pending">Pending</option>
			<option value="confirmed">Confirmed</option>
			<option value="cancelled">Cancelled</option>
		</select>
		<span class="text-muted-foreground text-sm">{rows.length} shown</span>
	</div>

	<Card.Root>
		<Card.Content class="overflow-x-auto p-0">
			<Table.Root>
				<Table.Header>
					<Table.Row>
						<Table.Head>#</Table.Head>
						<Table.Head>Couple</Table.Head>
						<Table.Head>Vendor</Table.Head>
						<Table.Head>Event date</Table.Head>
						<Table.Head class="text-right">Price</Table.Head>
						<Table.Head>Status</Table.Head>
						<Table.Head class="text-right">Actions</Table.Head>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{#each rows as r (r.id)}
						<Table.Row>
							<Table.Cell>{r.id}</Table.Cell>
							<Table.Cell class="font-medium">{r.couple}</Table.Cell>
							<Table.Cell>{r.vendor}</Table.Cell>
							<Table.Cell>{r.eventDate ?? '—'}</Table.Cell>
							<Table.Cell class="text-right">{r.price === null ? '—' : formatETB(r.price)}</Table.Cell>
							<Table.Cell>
								<StatusBadge status={r.status} />
								{#if r.cancelledBy}<div class="text-muted-foreground mt-1 text-xs">by {r.cancelledBy}{r.reason ? `: ${r.reason}` : ''}</div>{/if}
							</Table.Cell>
							<Table.Cell class="text-right">
								{#if r.status === 'pending'}
									<ActionForm action="?/cancel" fields={{ id: r.id }} label="Cancel" variant="destructive" confirmText="Cancel booking #{r.id}?">
										<input name="reason" required placeholder="Reason" class="border-input bg-background h-8 w-36 rounded-md border px-2 text-sm" />
									</ActionForm>
								{/if}
							</Table.Cell>
						</Table.Row>
					{:else}
						<Table.Row><Table.Cell colspan={7} class="text-muted-foreground py-8 text-center">No bookings.</Table.Cell></Table.Row>
					{/each}
				</Table.Body>
			</Table.Root>
		</Card.Content>
	</Card.Root>
</div>
