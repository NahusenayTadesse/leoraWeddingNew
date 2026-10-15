<script lang="ts">
	import ActionForm from '$lib/components/admin/ActionForm.svelte';
	import StatusBadge from '$lib/components/admin/StatusBadge.svelte';
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Table from '$lib/components/ui/table/index.js';
	import { formatETB } from '$lib/money';

	let { data } = $props();
	const pending = $derived(data.rows.filter((r) => r.status === 'pending').length);
</script>

<svelte:head><title>Payments — Vendor Dashboard</title></svelte:head>

<div class="space-y-6">
	<div>
		<h1 class="text-2xl font-semibold tracking-tight">Payments</h1>
		<p class="text-muted-foreground text-sm">
			Couples log the payments they make to you. Confirm each one once the money has reached you.
		</p>
	</div>

	<div class="grid gap-4 sm:grid-cols-2">
		<Card.Root>
			<Card.Content class="py-5">
				<p class="text-muted-foreground text-xs font-medium tracking-wide uppercase">Wallet balance</p>
				<p class="mt-1 text-2xl font-bold">{formatETB(data.balance)}</p>
			</Card.Content>
		</Card.Root>
		<Card.Root>
			<Card.Content class="py-5">
				<p class="text-muted-foreground text-xs font-medium tracking-wide uppercase">Awaiting your confirmation</p>
				<p class="mt-1 text-2xl font-bold">{pending}</p>
			</Card.Content>
		</Card.Root>
	</div>

	<Card.Root>
		<Card.Content class="overflow-x-auto p-0">
			<Table.Root>
				<Table.Header>
					<Table.Row>
						<Table.Head>Couple</Table.Head>
						<Table.Head>Type</Table.Head>
						<Table.Head>Method</Table.Head>
						<Table.Head class="text-right">Amount</Table.Head>
						<Table.Head>Reference</Table.Head>
						<Table.Head>Status</Table.Head>
						<Table.Head>Date</Table.Head>
						<Table.Head class="text-right">Actions</Table.Head>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{#each data.rows as r (r.id)}
						<Table.Row>
							<Table.Cell class="font-medium">{r.couple}</Table.Cell>
							<Table.Cell class="capitalize">{r.type}</Table.Cell>
							<Table.Cell>{r.method.replace('_', ' ')}</Table.Cell>
							<Table.Cell class="text-right">{formatETB(r.amount)}</Table.Cell>
							<Table.Cell class="text-muted-foreground text-xs">{r.reference ?? '—'}</Table.Cell>
							<Table.Cell><StatusBadge status={r.status} /></Table.Cell>
							<Table.Cell>{new Date(r.createdAt).toLocaleDateString()}</Table.Cell>
							<Table.Cell class="space-x-2 text-right whitespace-nowrap">
								{#if r.status === 'pending'}
									<ActionForm action="?/confirm" fields={{ id: r.id }} label="Confirm" variant="default" confirmText="Confirm you received {formatETB(r.amount)}?" />
									<ActionForm action="?/reject" fields={{ id: r.id }} label="Not received" />
								{/if}
							</Table.Cell>
						</Table.Row>
					{:else}
						<Table.Row><Table.Cell colspan={8} class="text-muted-foreground py-8 text-center">No payments yet.</Table.Cell></Table.Row>
					{/each}
				</Table.Body>
			</Table.Root>
		</Card.Content>
	</Card.Root>
</div>
