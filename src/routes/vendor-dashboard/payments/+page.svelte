<script lang="ts">
	import type { ColumnDef } from '@tanstack/table-core';
	import DataTable from '@nahu/admin-kit/components/Table/data-table.svelte';
	import ActionForm from '@nahu/admin-kit/formComponents/ActionForm.svelte';
	import PageHeader from '@nahu/admin-kit/components/PageHeader.svelte';
	import * as Card from '@nahu/admin-kit/components/ui/card/index.js';
	import { Button } from '@nahu/admin-kit/components/ui/button/index.js';
	import { formatETB } from '$lib/money';
	import { date, money, sortable, status, words } from '$lib/cells';

	let { data } = $props();

	type Row = (typeof data.rows)[number];
	type Payout = (typeof data.payouts)[number];

	let payoutMethod = $state<'bank_transfer' | 'mobile_money'>('bank_transfer');

	const columns: ColumnDef<Row>[] = [
		{ id: 'couple', accessorKey: 'couple', header: sortable('Couple') },
		{
			id: 'type',
			accessorKey: 'type',
			header: 'Type',
			cell: ({ row }) => words(row.original.type)
		},
		{
			id: 'method',
			accessorKey: 'method',
			header: 'Method',
			cell: ({ row }) => words(row.original.method)
		},
		{
			id: 'amount',
			accessorKey: 'amount',
			header: sortable('Amount'),
			meta: { align: 'right' },
			cell: ({ row }) => money(row.original.amount)
		},
		{
			id: 'status',
			accessorKey: 'status',
			header: 'Status',
			cell: ({ row }) => status(row.original.status)
		},
		{
			id: 'createdAt',
			accessorKey: 'createdAt',
			header: sortable('Date'),
			cell: ({ row }) => date(row.original.createdAt)
		}
	];

	const payoutColumns: ColumnDef<Payout>[] = [
		{
			id: 'amount',
			accessorKey: 'amount',
			header: 'Amount',
			meta: { align: 'right' },
			cell: ({ row }) => money(row.original.amount)
		},
		{
			id: 'destination',
			accessorKey: 'destination',
			header: 'To',
			cell: ({ row }) => row.original.destination ?? '—'
		},
		{
			id: 'status',
			accessorKey: 'status',
			header: 'Status',
			cell: ({ row }) => status(row.original.status)
		},
		{
			id: 'reference',
			accessorKey: 'reference',
			header: 'Reference',
			cell: ({ row }) => row.original.reference ?? '—'
		},
		{
			id: 'createdAt',
			accessorKey: 'createdAt',
			header: 'Requested',
			cell: ({ row }) => date(row.original.createdAt)
		}
	];
</script>

<div class="space-y-6">
	<PageHeader
		title="Payments"
		tabTitle="Payments — Vendor Dashboard"
		description="Couples pay through Leora by Chapa or bank transfer. Confirmed payments, less commission, are held by Leora until the service is delivered: when the couple confirms it, or 3 days after the event with no problem reported. Then they are yours to withdraw."
	/>

	<div class="grid gap-4 md:grid-cols-3">
		<Card.Root>
			<Card.Content class="py-5">
				<p class="text-xs font-medium tracking-wide text-muted-foreground uppercase">
					On hold until delivery
				</p>
				<p class="mt-1 text-2xl font-bold">{formatETB(data.held)}</p>
			</Card.Content>
		</Card.Root>
		<Card.Root>
			<Card.Content class="py-5">
				<p class="text-xs font-medium tracking-wide text-muted-foreground uppercase">
					Available for payout
				</p>
				<p class="mt-1 text-2xl font-bold">{formatETB(data.available)}</p>
			</Card.Content>
		</Card.Root>
		<Card.Root>
			<Card.Content class="py-5">
				<p class="text-xs font-medium tracking-wide text-muted-foreground uppercase">
					Waiting for review
				</p>
				<p class="mt-1 text-2xl font-bold">
					{data.rows.filter((r) => r.status === 'pending').length}
				</p>
			</Card.Content>
		</Card.Root>
	</div>

	{#if data.available > 0}
		<Card.Root>
			<Card.Header>
				<Card.Title>Request a payout</Card.Title>
			</Card.Header>
			<Card.Content>
				<ActionForm action="?/requestPayout" class="grid gap-3 sm:grid-cols-[160px_180px_1fr_auto]">
					{#snippet children({ busy })}
						<input
							name="amount"
							type="number"
							min="1"
							step="0.01"
							max={data.available}
							value={data.available}
							required
							aria-label="Amount"
							class="h-10 rounded-md border bg-background px-3"
						/>
						<select
							name="payoutMethod"
							bind:value={payoutMethod}
							aria-label="Payout method"
							class="h-10 rounded-md border bg-background px-3"
						>
							<option value="bank_transfer">Bank transfer</option>
							<option value="mobile_money">Mobile money</option>
						</select>
						<input
							name="destination"
							required
							minlength="5"
							maxlength="255"
							placeholder={payoutMethod === 'bank_transfer'
								? 'Bank, account number, account name'
								: 'telebirr number and name'}
							aria-label="Where to send it"
							class="h-10 rounded-md border bg-background px-3"
						/>
						<Button type="submit" disabled={!!busy}>Request</Button>
					{/snippet}
				</ActionForm>
			</Card.Content>
		</Card.Root>
	{/if}

	<DataTable
		{columns}
		data={data.rows}
		facetKeys={['status', 'type', 'method']}
		facetLabels={{ status: 'Status', type: 'Type', method: 'Method' }}
		fileName="Payments"
	/>

	{#if data.payouts.length}
		<h2 class="text-lg font-semibold">Payouts</h2>
		<DataTable columns={payoutColumns} data={data.payouts} variant="compact" />
	{/if}
</div>
