<script lang="ts">
	import type { ColumnDef } from '@tanstack/table-core';
	import { renderSnippet } from '@nahu/admin-kit/components/ui/data-table/index.js';
	import DataTable from '@nahu/admin-kit/components/Table/data-table.svelte';
	import FormDialog from '@nahu/admin-kit/formComponents/FormDialog.svelte';
	import InputComp from '@nahu/admin-kit/formComponents/InputComp.svelte';
	import { Button } from '@nahu/admin-kit/components/ui/button/index.js';
	import PageHeader from '$lib/components/admin/PageHeader.svelte';
	import { bookingCancelSchema } from '$lib/schemas/admin';
	import { date, longText, money, sortable, status } from '$lib/cells';

	let { data } = $props();

	type Row = (typeof data.rows)[number];

	let cancelling = $state<Row | null>(null);
	let cancelOpen = $state(false);

	function openCancel(row: Row) {
		cancelling = row;
		cancelOpen = true;
	}

	const columns: ColumnDef<Row>[] = [
		{ id: 'id', accessorKey: 'id', header: sortable('#') },
		{ id: 'couple', accessorKey: 'couple', header: sortable('Couple') },
		{ id: 'vendor', accessorKey: 'vendor', header: sortable('Vendor') },
		{
			id: 'eventDate',
			accessorKey: 'eventDate',
			header: sortable('Event date'),
			cell: ({ row }) => date(row.original.eventDate)
		},
		{
			id: 'price',
			accessorKey: 'price',
			header: sortable('Price'),
			meta: { align: 'right' },
			cell: ({ row }) => money(row.original.price)
		},
		{
			id: 'status',
			accessorKey: 'status',
			header: 'Status',
			cell: ({ row }) => status(row.original.status)
		},
		{
			id: 'note',
			header: 'Note',
			cell: ({ row }) =>
				row.original.cancelledBy
					? longText(
							`By ${row.original.cancelledBy}${row.original.reason ? `: ${row.original.reason}` : ''}`
						)
					: ''
		},
		{ id: 'actions', header: '', cell: ({ row }) => renderSnippet(actionsCell, row.original) }
	];
</script>

{#snippet actionsCell(row: Row)}
	{#if row.status === 'pending'}
		<Button size="sm" variant="destructive" onclick={() => openCancel(row)}>Cancel</Button>
	{/if}
{/snippet}

<div class="space-y-6">
	<PageHeader title="Bookings" description="Every vendor booking across the marketplace." />

	<DataTable
		{columns}
		data={data.rows}
		server={data.server}
		facetKeys={['status']}
		facetLabels={{ status: 'Status' }}
		dateFilter="Event date"
		fileName="Bookings"
	/>
</div>

<FormDialog
	title="Cancel booking #{cancelling?.id ?? ''}"
	description="{cancelling?.couple ?? ''} with {cancelling?.vendor ?? ''}. The couple and the vendor both see the reason."
	action="?/cancel"
	data={data.cancelForm}
	schema={bookingCancelSchema}
	bind:open={cancelOpen}
	seed={{ id: cancelling?.id }}
	hideTrigger
	resetOnSuccess
	submitLabel="Cancel booking"
>
	{#snippet fields({ form, errors })}
		<InputComp {form} {errors} name="id" type="hidden" />
		<InputComp {form} {errors} name="reason" label="Reason" type="textarea" rows={3} required />
	{/snippet}
</FormDialog>
