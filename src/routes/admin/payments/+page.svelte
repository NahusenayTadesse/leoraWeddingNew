<script lang="ts">
	import PageHeader from '$lib/components/admin/PageHeader.svelte';
	import ActionForm from '$lib/components/admin/ActionForm.svelte';
	import StatusBadge from '$lib/components/admin/StatusBadge.svelte';
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Table from '$lib/components/ui/table/index.js';
	import * as Tabs from '$lib/components/ui/tabs/index.js';
	import { formatETB } from '$lib/money';

	let { data } = $props();
	const date = (d: Date | string | null) => (d ? new Date(d).toLocaleDateString() : '—');
	const pendingRefunds = $derived(data.refunds.filter((r) => r.status === 'pending').length);
</script>

<div class="space-y-6">
	<PageHeader title="Payments" description="Subscription payments, vendor booking payments and refund requests." />

	<Tabs.Root value="vendor">
		<Tabs.List>
			<Tabs.Trigger value="vendor">Booking payments</Tabs.Trigger>
			<Tabs.Trigger value="plan">Plan payments</Tabs.Trigger>
			<Tabs.Trigger value="refunds">Refunds{pendingRefunds ? ` (${pendingRefunds})` : ''}</Tabs.Trigger>
		</Tabs.List>

		<Tabs.Content value="vendor">
			<Card.Root><Card.Content class="overflow-x-auto p-0">
				<Table.Root>
					<Table.Header><Table.Row>
						<Table.Head>#</Table.Head><Table.Head>Vendor</Table.Head><Table.Head>Type</Table.Head><Table.Head>Method</Table.Head>
						<Table.Head class="text-right">Amount</Table.Head><Table.Head class="text-right">Commission</Table.Head><Table.Head>Status</Table.Head><Table.Head>Date</Table.Head>
					</Table.Row></Table.Header>
					<Table.Body>
						{#each data.vendor as p (p.id)}
							<Table.Row>
								<Table.Cell>{p.id}</Table.Cell>
								<Table.Cell class="font-medium">{p.vendor ?? '—'}</Table.Cell>
								<Table.Cell class="capitalize">{p.type}</Table.Cell>
								<Table.Cell>{p.method.replace('_', ' ')}</Table.Cell>
								<Table.Cell class="text-right">{formatETB(p.amount)}</Table.Cell>
								<Table.Cell class="text-right">{p.commission === null ? '—' : formatETB(p.commission)}</Table.Cell>
								<Table.Cell><StatusBadge status={p.status} /></Table.Cell>
								<Table.Cell>{date(p.paidAt ?? p.createdAt)}</Table.Cell>
							</Table.Row>
						{:else}
							<Table.Row><Table.Cell colspan={8} class="text-muted-foreground py-8 text-center">No payments yet.</Table.Cell></Table.Row>
						{/each}
					</Table.Body>
				</Table.Root>
			</Card.Content></Card.Root>
		</Tabs.Content>

		<Tabs.Content value="plan">
			<Card.Root><Card.Content class="overflow-x-auto p-0">
				<Table.Root>
					<Table.Header><Table.Row>
						<Table.Head>#</Table.Head><Table.Head>Couple</Table.Head><Table.Head>Method</Table.Head><Table.Head class="text-right">Amount</Table.Head>
						<Table.Head>Reference</Table.Head><Table.Head>Status</Table.Head><Table.Head>Date</Table.Head>
					</Table.Row></Table.Header>
					<Table.Body>
						{#each data.plan as p (p.id)}
							<Table.Row>
								<Table.Cell>{p.id}</Table.Cell>
								<Table.Cell class="font-medium">{p.couple}</Table.Cell>
								<Table.Cell>{p.method?.replace('_', ' ') ?? '—'}</Table.Cell>
								<Table.Cell class="text-right">{formatETB(p.amount)}</Table.Cell>
								<Table.Cell class="text-muted-foreground text-xs">{p.ref ?? '—'}</Table.Cell>
								<Table.Cell><StatusBadge status={p.status} /></Table.Cell>
								<Table.Cell>{date(p.paidAt ?? p.createdAt)}</Table.Cell>
							</Table.Row>
						{:else}
							<Table.Row><Table.Cell colspan={7} class="text-muted-foreground py-8 text-center">No payments yet.</Table.Cell></Table.Row>
						{/each}
					</Table.Body>
				</Table.Root>
			</Card.Content></Card.Root>
		</Tabs.Content>

		<Tabs.Content value="refunds">
			<Card.Root><Card.Content class="overflow-x-auto p-0">
				<Table.Root>
					<Table.Header><Table.Row>
						<Table.Head>#</Table.Head><Table.Head>Payment</Table.Head><Table.Head class="text-right">Amount</Table.Head><Table.Head>Reason</Table.Head>
						<Table.Head>Status</Table.Head><Table.Head class="text-right">Actions</Table.Head>
					</Table.Row></Table.Header>
					<Table.Body>
						{#each data.refunds as r (r.id)}
							<Table.Row>
								<Table.Cell>{r.id}</Table.Cell>
								<Table.Cell>#{r.paymentId}</Table.Cell>
								<Table.Cell class="text-right">{formatETB(r.amount)}</Table.Cell>
								<Table.Cell class="max-w-xs truncate">{r.reason ?? '—'}</Table.Cell>
								<Table.Cell><StatusBadge status={r.status} /></Table.Cell>
								<Table.Cell class="space-x-2 text-right">
									{#if r.status === 'pending'}
										<ActionForm action="?/approveRefund" fields={{ id: r.id }} label="Approve" variant="default" confirmText="Approve refund of {formatETB(r.amount)}?" />
										<ActionForm action="?/rejectRefund" fields={{ id: r.id }} label="Reject" />
									{/if}
								</Table.Cell>
							</Table.Row>
						{:else}
							<Table.Row><Table.Cell colspan={6} class="text-muted-foreground py-8 text-center">No refund requests.</Table.Cell></Table.Row>
						{/each}
					</Table.Body>
				</Table.Root>
			</Card.Content></Card.Root>
		</Tabs.Content>
	</Tabs.Root>
</div>
