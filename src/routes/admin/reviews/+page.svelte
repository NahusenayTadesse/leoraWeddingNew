<script lang="ts">
	import type { ColumnDef } from '@tanstack/table-core';
	import { renderSnippet } from '@nahu/admin-kit/components/ui/data-table/index.js';
	import DataTable from '@nahu/admin-kit/components/Table/data-table.svelte';
	import ConfirmAction from '@nahu/admin-kit/components/ConfirmAction.svelte';
	import PageHeader from '$lib/components/admin/PageHeader.svelte';
	import { date, longText, sortable } from '$lib/cells';

	let { data } = $props();

	type Row = (typeof data.rows)[number];

	const columns: ColumnDef<Row>[] = [
		{ id: 'vendor', accessorKey: 'vendor', header: sortable('Vendor') },
		{
			id: 'rating',
			accessorKey: 'rating',
			header: sortable('Rating'),
			cell: ({ row }) => renderSnippet(stars, row.original.rating)
		},
		{
			id: 'title',
			accessorKey: 'title',
			header: 'Title',
			cell: ({ row }) => row.original.title ?? '—'
		},
		{
			id: 'comment',
			accessorKey: 'comment',
			header: 'Comment',
			cell: ({ row }) => longText(row.original.comment)
		},
		{
			id: 'createdAt',
			accessorKey: 'createdAt',
			header: sortable('Posted'),
			cell: ({ row }) => date(row.original.createdAt)
		},
		{ id: 'actions', header: '', cell: ({ row }) => renderSnippet(actionsCell, row.original) }
	];
</script>

{#snippet stars(rating: number)}
	<span class="whitespace-nowrap text-primary" aria-label="{rating} of 5 stars"
		>{'★'.repeat(rating)}<span class="text-muted-foreground">{'★'.repeat(5 - rating)}</span></span
	>
{/snippet}

{#snippet actionsCell(r: Row)}
	<ConfirmAction
		action="?/remove"
		fields={{ id: r.id }}
		label="Remove"
		variant="destructive"
		title="Remove this review?"
		description="{r.vendor}'s rating is recalculated without it."
	/>
{/snippet}

<div class="space-y-6">
	<PageHeader
		title="Reviews"
		description="Moderate vendor reviews. Removing one recalculates the vendor's rating."
	/>

	<DataTable
		{columns}
		data={data.rows}
		server={data.server}
		facetKeys={['rating']}
		facetLabels={{ rating: 'Rating' }}
		dateFilter="Posted"
		fileName="Reviews"
	/>
</div>
