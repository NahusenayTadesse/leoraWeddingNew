<script lang="ts">
	import PageHeader from '$lib/components/admin/PageHeader.svelte';
	import ActionForm from '$lib/components/admin/ActionForm.svelte';
	import StatusBadge from '$lib/components/admin/StatusBadge.svelte';
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Table from '$lib/components/ui/table/index.js';
	import { formatETB } from '$lib/money';

	let { data } = $props();
</script>

<div class="space-y-6">
	<PageHeader title="Vendor payouts" description="Completing a payout debits the vendor's wallet and writes a ledger entry." />
	<Card.Root><Card.Content class="overflow-x-auto p-0">
		<Table.Root>
			<Table.Header><Table.Row>
				<Table.Head>#</Table.Head><Table.Head>Vendor</Table.Head><Table.Head class="text-right">Amount</Table.Head><Table.Head class="text-right">Wallet</Table.Head>
				<Table.Head>Method</Table.Head><Table.Head>Status</Table.Head><Table.Head>Requested</Table.Head><Table.Head class="text-right">Actions</Table.Head>
			</Table.Row></Table.Header>
			<Table.Body>
				{#each data.rows as r (r.id)}
					<Table.Row>
						<Table.Cell>{r.id}</Table.Cell>
						<Table.Cell class="font-medium">{r.vendor}</Table.Cell>
						<Table.Cell class="text-right">{formatETB(r.amount)}</Table.Cell>
						<Table.Cell class="text-right {r.balance < r.amount && r.status !== 'completed' ? 'text-destructive' : ''}">{formatETB(r.balance)}</Table.Cell>
						<Table.Cell>{r.method?.replace('_', ' ') ?? '—'}</Table.Cell>
						<Table.Cell><StatusBadge status={r.status} />{#if r.reference}<div class="text-muted-foreground mt-1 text-xs">{r.reference}</div>{/if}</Table.Cell>
						<Table.Cell>{new Date(r.createdAt).toLocaleDateString()}</Table.Cell>
						<Table.Cell class="space-x-2 text-right">
							{#if r.status === 'requested'}
								<ActionForm action="?/process" fields={{ id: r.id }} label="Start" />
							{/if}
							{#if r.status === 'requested' || r.status === 'processing'}
								<ActionForm action="?/complete" fields={{ id: r.id }} label="Complete" variant="default" confirmText="Complete payout of {formatETB(r.amount)} to {r.vendor}?">
									<input name="reference" placeholder="Bank / txn ref" class="border-input bg-background h-8 w-32 rounded-md border px-2 text-sm" />
								</ActionForm>
								<ActionForm action="?/reject" fields={{ id: r.id }} label="Reject" variant="destructive" confirmText="Reject this payout?" />
							{/if}
						</Table.Cell>
					</Table.Row>
				{:else}
					<Table.Row><Table.Cell colspan={8} class="text-muted-foreground py-8 text-center">No payout requests.</Table.Cell></Table.Row>
				{/each}
			</Table.Body>
		</Table.Root>
	</Card.Content></Card.Root>
</div>
