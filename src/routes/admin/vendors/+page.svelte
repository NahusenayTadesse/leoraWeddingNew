<script lang="ts">
	import type { ColumnDef } from '@tanstack/table-core';
	import { renderSnippet } from '@nahu/admin-kit/components/ui/data-table/index.js';
	import DataTable from '@nahu/admin-kit/components/Table/data-table.svelte';
	import ConfirmAction from '@nahu/admin-kit/components/ConfirmAction.svelte';
	import { Checkbox } from '@nahu/admin-kit/components/ui/checkbox/index.js';
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

	/** Rows ticked for a bulk decision (the kit table fills this through `bind:selected`). */
	let selected = $state<Row[]>([]);
	const selectedIds = $derived(selected.map((r) => r.id).join(','));

	const columns: ColumnDef<Row>[] = [
		{
			id: 'select',
			header: ({ table }) => renderSnippet(selectAllCell, table),
			cell: ({ row }) => renderSnippet(selectCell, row),
			enableSorting: false,
			meta: { class: 'w-8' }
		},
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

{#snippet selectAllCell(table: import('@tanstack/table-core').Table<Row>)}
	<Checkbox
		checked={table.getIsAllPageRowsSelected()}
		indeterminate={table.getIsSomePageRowsSelected()}
		onCheckedChange={(v) => table.toggleAllPageRowsSelected(!!v)}
		aria-label="Select all on this page"
	/>
{/snippet}

{#snippet selectCell(row: import('@tanstack/table-core').Row<Row>)}
	<Checkbox
		checked={row.getIsSelected()}
		onCheckedChange={(v) => row.toggleSelected(!!v)}
		aria-label="Select {row.original.businessName}"
	/>
{/snippet}

{#snippet businessCell(row: Row)}
	<div class="flex items-center gap-2">
		<a href="/admin/vendors/{row.id}" class="font-medium hover:underline">{row.businessName}</a>
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

	{#if selected.length}
		<div class="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/40 p-3 text-sm">
			<span class="mr-2 font-medium">{selected.length} selected</span>
			<ConfirmAction
				action="?/bulkStatus"
				fields={{ ids: selectedIds, status: 'approved' }}
				label="Approve selected"
				title="Approve {selected.length} vendors?"
				description="Their listings go live and each vendor is emailed."
			/>
			<ConfirmAction
				action="?/bulkStatus"
				fields={{ ids: selectedIds, status: 'rejected' }}
				label="Reject selected"
				variant="destructive"
				title="Reject {selected.length} vendors?"
				description="Their listings are hidden and each vendor is emailed."
			/>
		</div>
	{/if}

	<DataTable
		{columns}
		data={data.rows}
		server={data.server}
		facetKeys={['status', 'categoryId']}
		facetLabels={{ status: 'Status', categoryId: 'Category' }}
		dateFilter="Joined"
		fileName="Vendors"
		bind:selected
	/>
</div>
