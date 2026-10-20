<script lang="ts">
	import type { ColumnDef } from '@tanstack/table-core';
	import { renderSnippet } from '@nahu/admin-kit/components/ui/data-table/index.js';
	import DataTable from '@nahu/admin-kit/components/Table/data-table.svelte';
	import ConfirmAction from '@nahu/admin-kit/components/ConfirmAction.svelte';
	import FormDialog from '@nahu/admin-kit/formComponents/FormDialog.svelte';
	import InputComp from '@nahu/admin-kit/formComponents/InputComp.svelte';
	import PageHeader from '$lib/components/admin/PageHeader.svelte';
	import { couponCreateSchema } from '$lib/schemas/admin';
	import { formatETB } from '$lib/money';
	import { date, sortable, status } from '$lib/cells';

	let { data } = $props();

	type Row = (typeof data.rows)[number];

	const typeItems = [
		{ value: 'percent', name: 'Percent off' },
		{ value: 'flat', name: 'Flat ETB off' }
	];

	const columns: ColumnDef<Row>[] = [
		{ id: 'code', accessorKey: 'code', header: sortable('Code'), meta: { class: 'font-mono font-medium' } },
		{
			id: 'type',
			accessorKey: 'type',
			header: 'Discount',
			cell: ({ row }) =>
				row.original.type === 'percent' ? `${row.original.value}%` : formatETB(row.original.value)
		},
		{
			id: 'usesCount',
			accessorKey: 'usesCount',
			header: sortable('Used'),
			cell: ({ row }) =>
				`${row.original.usesCount}${row.original.maxUses ? ` / ${row.original.maxUses}` : ''}`
		},
		{
			id: 'expiresAt',
			accessorKey: 'expiresAt',
			header: sortable('Expires'),
			cell: ({ row }) => (row.original.expiresAt ? date(row.original.expiresAt) : 'Never')
		},
		{
			id: 'state',
			accessorKey: 'state',
			header: 'Status',
			cell: ({ row }) => status(row.original.state)
		},
		{ id: 'actions', header: '', cell: ({ row }) => renderSnippet(actionsCell, row.original) }
	];
</script>

{#snippet actionsCell(c: Row)}
	<div class="flex justify-end gap-2">
		<ConfirmAction
			action="?/toggle"
			fields={{ id: c.id }}
			label={c.isActive ? 'Pause' : 'Activate'}
			variant="outline"
			title="{c.isActive ? 'Pause' : 'Activate'} coupon {c.code}?"
			description={c.isActive
				? 'Couples can no longer apply it until it is activated again.'
				: 'Couples can apply it at checkout again.'}
		/>
		<ConfirmAction
			action="?/remove"
			fields={{ id: c.id }}
			label="Delete"
			variant="destructive"
			title="Delete coupon {c.code}?"
		/>
	</div>
{/snippet}

<div class="space-y-6">
	<PageHeader title="Coupons" description="Discount codes couples can apply at checkout.">
		<FormDialog
			title="New coupon"
			action="?/create"
			data={data.createForm}
			schema={couponCreateSchema}
			triggerLabel="New coupon"
			submitLabel="Create"
			resetOnSuccess
		>
			{#snippet fields({ form, errors })}
				<InputComp {form} {errors} name="code" label="Code" placeholder="WELCOME20" required />
				<InputComp {form} {errors} name="type" label="Type" type="select" items={typeItems} />
				<InputComp {form} {errors} name="value" label="Value" type="number" min={0} required />
				<InputComp {form} {errors} name="maxUses" label="Max uses (empty for unlimited)" type="number" min={1} />
				<InputComp
					{form}
					{errors}
					name="expiresAt"
					label="Expires (optional)"
					type="date"
					oldDays={false}
					futureDays
				/>
			{/snippet}
		</FormDialog>
	</PageHeader>

	<DataTable
		{columns}
		data={data.rows}
		facetKeys={['type', 'state']}
		facetLabels={{ type: 'Type', state: 'Status' }}
		fileName="Coupons"
	/>
</div>
