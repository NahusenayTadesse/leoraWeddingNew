<script lang="ts">
	import type { ColumnDef } from '@tanstack/table-core';
	import { renderSnippet } from '@nahu/admin-kit/components/ui/data-table/index.js';
	import DataTable from '@nahu/admin-kit/components/Table/data-table.svelte';
	import ConfirmAction from '@nahu/admin-kit/components/ConfirmAction.svelte';
	import FormDialog from '@nahu/admin-kit/formComponents/FormDialog.svelte';
	import InputComp from '@nahu/admin-kit/formComponents/InputComp.svelte';
	import { Button } from '@nahu/admin-kit/components/ui/button/index.js';
	import PageHeader from '$lib/components/admin/PageHeader.svelte';
	import { payoutCompleteSchema } from '$lib/schemas/admin';
	import { formatETB } from '$lib/money';
	import { date, money, sortable, status, words } from '$lib/cells';

	let { data } = $props();

	type Row = (typeof data.rows)[number];

	let completing = $state<Row | null>(null);
	let completeOpen = $state(false);

	const open = (r: Row) => r.status === 'requested' || r.status === 'processing';
	/** The wallet cannot cover an unsettled payout: completing it would be refused. */
	const short = (r: Row) => open(r) && r.balance < r.amount;

	const columns: ColumnDef<Row>[] = [
		{ id: 'id', accessorKey: 'id', header: sortable('#') },
		{ id: 'vendor', accessorKey: 'vendor', header: sortable('Vendor') },
		{
			id: 'amount',
			accessorKey: 'amount',
			header: sortable('Amount'),
			meta: { align: 'right' },
			cell: ({ row }) => money(row.original.amount)
		},
		{
			id: 'balance',
			accessorKey: 'balance',
			header: 'Wallet',
			meta: { align: 'right' },
			cell: ({ row }) => money(row.original.balance)
		},
		{ id: 'method', accessorKey: 'method', header: 'Method', cell: ({ row }) => words(row.original.method) },
		{ id: 'destination', accessorKey: 'destination', header: 'Send to', cell: ({ row }) => row.original.destination ?? '—' },
		{ id: 'status', accessorKey: 'status', header: 'Status', cell: ({ row }) => status(row.original.status) },
		{
			id: 'reference',
			accessorKey: 'reference',
			header: 'Reference',
			cell: ({ row }) => row.original.reference ?? '—'
		},
		{
			id: 'createdAt',
			accessorKey: 'createdAt',
			header: sortable('Requested'),
			cell: ({ row }) => date(row.original.createdAt)
		},
		{ id: 'actions', header: '', cell: ({ row }) => renderSnippet(actionsCell, row.original) }
	];
</script>

{#snippet actionsCell(r: Row)}
	<div class="flex justify-end gap-2">
		{#if r.status === 'requested'}
			<ConfirmAction
				action="?/process"
				fields={{ id: r.id }}
				label="Start"
				variant="outline"
				title="Start processing payout #{r.id}?"
				description="Marks it as being paid out, so other admins know it is in hand."
			/>
		{/if}
		{#if open(r)}
			<Button
				size="sm"
				onclick={() => {
					completing = r;
					completeOpen = true;
				}}>Complete</Button
			>
			<ConfirmAction
				action="?/reject"
				fields={{ id: r.id }}
				label="Reject"
				variant="destructive"
				title="Reject this payout?"
				description="{formatETB(r.amount)} stays in {r.vendor}'s wallet."
			/>
		{/if}
	</div>
{/snippet}

<div class="space-y-6">
	<PageHeader
		title="Vendor payouts"
		description="Completing a payout debits the vendor's wallet and writes a ledger entry. Highlighted rows are larger than the wallet."
	/>

	<DataTable
		{columns}
		data={data.rows}
		server={data.server}
		facetKeys={['status', 'method']}
		facetLabels={{ status: 'Status', method: 'Method' }}
		dateFilter="Requested"
		rowClass={(r) => (short(r) ? 'bg-destructive/10' : null)}
		fileName="Payouts"
	/>
</div>

<FormDialog
	title="Complete payout of {completing ? formatETB(completing.amount) : ''}"
	description="To {completing?.vendor ?? ''}. The vendor's wallet is debited by this amount."
	action="?/complete"
	data={data.completeForm}
	schema={payoutCompleteSchema}
	bind:open={completeOpen}
	seed={{ id: completing?.id }}
	hideTrigger
	resetOnSuccess
	submitLabel="Complete payout"
>
	{#snippet fields({ form, errors })}
		<InputComp {form} {errors} name="id" type="hidden" />
		<InputComp
			{form}
			{errors}
			name="reference"
			label="Bank or transaction reference (optional)"
			type="text"
		/>
	{/snippet}
</FormDialog>
