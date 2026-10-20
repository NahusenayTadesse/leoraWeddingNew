<script lang="ts">
	import type { ColumnDef } from '@tanstack/table-core';
	import { renderSnippet } from '@nahu/admin-kit/components/ui/data-table/index.js';
	import DataTable from '@nahu/admin-kit/components/Table/data-table.svelte';
	import FormDialog from '@nahu/admin-kit/formComponents/FormDialog.svelte';
	import InputComp from '@nahu/admin-kit/formComponents/InputComp.svelte';
	import { Button } from '@nahu/admin-kit/components/ui/button/index.js';
	import PageHeader from '$lib/components/admin/PageHeader.svelte';
	import { disputeUpdateSchema } from '$lib/schemas/admin';
	import { statusLabel } from '$lib/status';
	import { dateTime, longText, sortable, status, words } from '$lib/cells';

	let { data } = $props();

	type Row = (typeof data.rows)[number];

	let editing = $state<Row | null>(null);
	let editOpen = $state(false);

	const statusItems = (['open', 'under_review', 'resolved', 'refunded'] as const).map((s) => ({
		value: s,
		name: statusLabel(s)
	}));

	const columns: ColumnDef<Row>[] = [
		{
			id: 'bookingId',
			accessorKey: 'bookingId',
			header: sortable('Booking'),
			cell: ({ row }) => `#${row.original.bookingId}`
		},
		{ id: 'vendor', accessorKey: 'vendor', header: sortable('Vendor') },
		{
			id: 'raisedBy',
			accessorKey: 'raisedBy',
			header: 'Raised by',
			cell: ({ row }) => words(row.original.raisedBy)
		},
		{ id: 'reason', accessorKey: 'reason', header: 'Reason', cell: ({ row }) => longText(row.original.reason) },
		{ id: 'status', accessorKey: 'status', header: 'Status', cell: ({ row }) => status(row.original.status) },
		{ id: 'notes', accessorKey: 'notes', header: 'Resolution notes', cell: ({ row }) => longText(row.original.notes) },
		{
			id: 'createdAt',
			accessorKey: 'createdAt',
			header: sortable('Raised'),
			cell: ({ row }) => dateTime(row.original.createdAt)
		},
		{ id: 'actions', header: '', cell: ({ row }) => renderSnippet(actionsCell, row.original) }
	];
</script>

{#snippet actionsCell(r: Row)}
	<Button
		size="sm"
		variant="outline"
		onclick={() => {
			editing = r;
			editOpen = true;
		}}>Update</Button
	>
{/snippet}

<div class="space-y-6">
	<PageHeader
		title="Disputes"
		description="Issues raised on bookings by couples or vendors. Open and under-review disputes are listed first."
	/>

	<DataTable
		{columns}
		data={data.rows}
		server={data.server}
		facetKeys={['status', 'raisedBy']}
		facetLabels={{ status: 'Status', raisedBy: 'Raised by' }}
		dateFilter="Raised"
		fileName="Disputes"
	/>
</div>

<FormDialog
	title="Dispute on booking #{editing?.bookingId ?? ''}"
	description={editing?.reason ?? ''}
	action="?/update"
	data={data.updateForm}
	schema={disputeUpdateSchema}
	bind:open={editOpen}
	seed={{ id: editing?.id, status: editing?.status, notes: editing?.notes ?? '' }}
	hideTrigger
	submitLabel="Save"
>
	{#snippet fields({ form, errors })}
		<InputComp {form} {errors} name="id" type="hidden" />
		<InputComp {form} {errors} name="status" label="Status" type="select" items={statusItems} />
		<InputComp {form} {errors} name="notes" label="Resolution notes" type="textarea" rows={4} />
	{/snippet}
</FormDialog>
