<script lang="ts">
	import type { ColumnDef } from '@tanstack/table-core';
	import DataTable from '@nahu/admin-kit/components/Table/data-table.svelte';
	import PageHeader from '$lib/components/admin/PageHeader.svelte';
	import { dateTime, longText, sortable } from '$lib/cells';

	let { data } = $props();

	type Row = (typeof data.rows)[number];

	const columns: ColumnDef<Row>[] = [
		{
			id: 'createdAt',
			accessorKey: 'createdAt',
			header: sortable('When'),
			cell: ({ row }) => dateTime(row.original.createdAt)
		},
		{
			id: 'who',
			accessorKey: 'who',
			header: sortable('Who'),
			cell: ({ row }) =>
				row.original.who
					? `${row.original.who}${row.original.email ? ` (${row.original.email})` : ''}`
					: 'System'
		},
		{
			id: 'action',
			accessorKey: 'action',
			header: sortable('Action'),
			meta: { class: 'font-mono' }
		},
		{
			id: 'entityType',
			accessorKey: 'entityType',
			header: 'Target',
			cell: ({ row }) =>
				`${row.original.entityType ?? '—'}${row.original.entityId ? ` #${row.original.entityId}` : ''}`
		},
		{
			id: 'meta',
			accessorKey: 'meta',
			header: 'Details',
			cell: ({ row }) => longText(row.original.meta)
		},
		{ id: 'ip', accessorKey: 'ip', header: 'IP', cell: ({ row }) => row.original.ip ?? '' }
	];
</script>

<div class="space-y-6">
	<PageHeader title="Activity log" description="Every admin change is recorded here." />

	<DataTable
		{columns}
		data={data.rows}
		server={data.server}
		facetKeys={['entityType']}
		facetLabels={{ entityType: 'Target' }}
		dateFilter="When"
		fileName="Activity log"
	/>
</div>
