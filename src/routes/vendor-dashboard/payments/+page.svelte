<script lang="ts">
	import type { ColumnDef } from '@tanstack/table-core';
	import { renderSnippet } from '@nahu/admin-kit/components/ui/data-table/index.js';
	import DataTable from '@nahu/admin-kit/components/Table/data-table.svelte';
	import ConfirmAction from '@nahu/admin-kit/components/ConfirmAction.svelte';
	import PageHeader from '@nahu/admin-kit/components/PageHeader.svelte';
	import * as Card from '@nahu/admin-kit/components/ui/card/index.js';
	import { formatETB } from '$lib/money';
	import { date, money, sortable, status, words } from '$lib/cells';

	let { data } = $props();

	type Row = (typeof data.rows)[number];

	const pending = $derived(data.rows.filter((r) => r.status === 'pending').length);

	const columns: ColumnDef<Row>[] = [
		{ id: 'couple', accessorKey: 'couple', header: sortable('Couple') },
		{ id: 'type', accessorKey: 'type', header: 'Type', cell: ({ row }) => words(row.original.type) },
		{ id: 'method', accessorKey: 'method', header: 'Method', cell: ({ row }) => words(row.original.method) },
		{
			id: 'amount',
			accessorKey: 'amount',
			header: sortable('Amount'),
			meta: { align: 'right' },
			cell: ({ row }) => money(row.original.amount)
		},
		{
			id: 'reference',
			accessorKey: 'reference',
			header: 'Reference',
			cell: ({ row }) => row.original.reference ?? '—'
		},
		{ id: 'status', accessorKey: 'status', header: 'Status', cell: ({ row }) => status(row.original.status) },
		{
			id: 'createdAt',
			accessorKey: 'createdAt',
			header: sortable('Date'),
			cell: ({ row }) => date(row.original.createdAt)
		},
		{ id: 'actions', header: '', cell: ({ row }) => renderSnippet(actionsCell, row.original) }
	];
</script>

{#snippet actionsCell(r: Row)}
	{#if r.status === 'pending'}
		<div class="flex justify-end gap-2">
			<ConfirmAction
				action="?/confirm"
				fields={{ id: r.id }}
				label="Confirm"
				title="Confirm you received {formatETB(r.amount)}?"
				description="From {r.couple}. It is added to your wallet, less the marketplace commission."
			/>
			<ConfirmAction
				action="?/reject"
				fields={{ id: r.id }}
				label="Not received"
				variant="outline"
				title="Mark this payment as not received?"
				description="{r.couple} is told the payment did not arrive."
			/>
		</div>
	{/if}
{/snippet}

<div class="space-y-6">
	<PageHeader
		title="Payments"
		tabTitle="Payments — Vendor Dashboard"
		description="Couples log the payments they make to you. Confirm each one once the money has reached you."
	/>

	<div class="grid gap-4 sm:grid-cols-2">
		<Card.Root>
			<Card.Content class="py-5">
				<p class="text-muted-foreground text-xs font-medium tracking-wide uppercase">Wallet balance</p>
				<p class="mt-1 text-2xl font-bold">{formatETB(data.balance)}</p>
			</Card.Content>
		</Card.Root>
		<Card.Root>
			<Card.Content class="py-5">
				<p class="text-muted-foreground text-xs font-medium tracking-wide uppercase">
					Awaiting your confirmation
				</p>
				<p class="mt-1 text-2xl font-bold">{pending}</p>
			</Card.Content>
		</Card.Root>
	</div>

	<DataTable
		{columns}
		data={data.rows}
		facetKeys={['status', 'type', 'method']}
		facetLabels={{ status: 'Status', type: 'Type', method: 'Method' }}
		fileName="Payments"
	/>
</div>
