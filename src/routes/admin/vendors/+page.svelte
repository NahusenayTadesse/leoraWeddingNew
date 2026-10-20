<script lang="ts">
	import type { ColumnDef } from '@tanstack/table-core';
	import { renderSnippet } from '@nahu/admin-kit/components/ui/data-table/index.js';
	import DataTable from '@nahu/admin-kit/components/Table/data-table.svelte';
	import ConfirmAction from '@nahu/admin-kit/components/ConfirmAction.svelte';
	import { ShieldCheck } from '@lucide/svelte';
	import PageHeader from '$lib/components/admin/PageHeader.svelte';
	import { date, sortable, status } from '$lib/cells';

	let { data } = $props();

	type Row = (typeof data.rows)[number];
	type Status = Row['status'];

	/** The moves each status allows, as on the old row menu. */
	const moves = (s: Status) =>
		(
			[
				{ to: 'approved', label: 'Approve', when: s !== 'approved', variant: 'default' },
				{ to: 'rejected', label: 'Reject', when: s !== 'rejected', variant: 'destructive' },
				{ to: 'suspended', label: 'Suspend', when: s === 'approved', variant: 'destructive' },
				{
					to: 'pending',
					label: 'Reset to pending',
					when: s === 'suspended' || s === 'rejected',
					variant: 'outline'
				}
			] as const
		).filter((m) => m.when);

	const consequence = {
		approved: 'Their listing goes live in the marketplace.',
		rejected: 'Their listing is hidden from couples.',
		suspended: 'Their listing is hidden from couples.',
		pending: 'They go back into the approval queue.'
	} as const;

	const columns: ColumnDef<Row>[] = [
		{
			id: 'businessName',
			accessorKey: 'businessName',
			header: sortable('Business'),
			cell: ({ row }) => renderSnippet(businessCell, row.original)
		},
		{
			id: 'categoryId',
			accessorKey: 'category',
			header: 'Category',
			cell: ({ row }) => row.original.category ?? '—'
		},
		{
			id: 'city',
			accessorKey: 'city',
			header: sortable('City'),
			cell: ({ row }) => row.original.city ?? '—'
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
			header: sortable('Joined'),
			cell: ({ row }) => date(row.original.createdAt)
		},
		{ id: 'actions', header: '', cell: ({ row }) => renderSnippet(actionsCell, row.original) }
	];
</script>

{#snippet businessCell(row: Row)}
	<div class="flex items-center gap-2">
		<span class="font-medium">{row.businessName}</span>
		{#if row.isVerified}
			<ShieldCheck class="size-3.5 text-success" aria-label="Verified" />
		{/if}
	</div>
	{#if row.email || row.phone}
		<span class="text-xs text-muted-foreground"
			>{[row.email, row.phone].filter(Boolean).join(' · ')}</span
		>
	{/if}
{/snippet}

{#snippet actionsCell(row: Row)}
	<div class="flex justify-end gap-2">
		{#each moves(row.status) as move (move.to)}
			<ConfirmAction
				action="?/updateStatus"
				fields={{ id: row.id, status: move.to }}
				label={move.label}
				variant={move.variant}
				title="{move.label}: {row.businessName}?"
				description={consequence[move.to]}
			/>
		{/each}
	</div>
{/snippet}

<div class="space-y-6">
	<PageHeader title="Vendors" description="Approve, reject or suspend vendor listings." />

	<DataTable
		{columns}
		data={data.rows}
		server={data.server}
		facetKeys={['status', 'categoryId']}
		facetLabels={{ status: 'Status', categoryId: 'Category' }}
		dateFilter="Joined"
		fileName="Vendors"
	/>
</div>
