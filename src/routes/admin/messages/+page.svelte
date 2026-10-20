<script lang="ts">
	import type { ColumnDef } from '@tanstack/table-core';
	import { renderSnippet } from '@nahu/admin-kit/components/ui/data-table/index.js';
	import DataTable from '@nahu/admin-kit/components/Table/data-table.svelte';
	import ConfirmAction from '@nahu/admin-kit/components/ConfirmAction.svelte';
	import ActionForm from '@nahu/admin-kit/formComponents/ActionForm.svelte';
	import { Button } from '@nahu/admin-kit/components/ui/button/index.js';
	import { Mail } from '@lucide/svelte';
	import PageHeader from '$lib/components/admin/PageHeader.svelte';
	import { dateTime, longText, sortable, status } from '$lib/cells';

	let { data } = $props();

	type Row = (typeof data.rows)[number];

	const columns: ColumnDef<Row>[] = [
		{
			id: 'createdAt',
			accessorKey: 'createdAt',
			header: sortable('Received'),
			cell: ({ row }) => dateTime(row.original.createdAt)
		},
		{ id: 'status', accessorKey: 'status', header: 'Status', cell: ({ row }) => status(row.original.status) },
		{ id: 'name', accessorKey: 'name', header: sortable('From') },
		{ id: 'email', accessorKey: 'email', header: 'Email' },
		{ id: 'phone', accessorKey: 'phone', header: 'Phone', cell: ({ row }) => row.original.phone ?? '—' },
		{ id: 'subject', accessorKey: 'subject', header: sortable('Subject') },
		{
			id: 'message',
			accessorKey: 'message',
			header: 'Message',
			cell: ({ row }) => longText(row.original.message, 60)
		},
		{ id: 'actions', header: '', cell: ({ row }) => renderSnippet(actionsCell, row.original) }
	];
</script>

{#snippet actionsCell(m: Row)}
	<div class="flex justify-end gap-2">
		{#if m.status !== 'replied'}
			<ActionForm action="?/setStatus" fields={{ id: m.id, status: m.status === 'new' ? 'read' : 'replied' }}>
				{#snippet children({ busy })}
					<Button type="submit" size="sm" variant="ghost" disabled={!!busy}>
						{m.status === 'new' ? 'Mark read' : 'Mark replied'}
					</Button>
				{/snippet}
			</ActionForm>
		{/if}
		<Button
			size="sm"
			variant="outline"
			href="mailto:{m.email}?subject={encodeURIComponent('Re: ' + m.subject)}"
			><Mail class="size-4" /> Reply</Button
		>
		<ConfirmAction
			action="?/remove"
			fields={{ id: m.id }}
			label="Delete"
			variant="destructive"
			title="Delete this message?"
			description="From {m.name}: {m.subject}"
		/>
	</div>
{/snippet}

<div class="space-y-6">
	<PageHeader title="Contact messages" description="Enquiries from the public contact form." />

	<DataTable
		{columns}
		data={data.rows}
		server={data.server}
		facetKeys={['status']}
		facetLabels={{ status: 'Status' }}
		dateFilter="Received"
		fileName="Contact messages"
	/>
</div>
