<script lang="ts">
	import type { ColumnDef } from '@tanstack/table-core';
	import { renderSnippet } from '@nahu/admin-kit/components/ui/data-table/index.js';
	import DataTable from '@nahu/admin-kit/components/Table/data-table.svelte';
	import ConfirmAction from '@nahu/admin-kit/components/ConfirmAction.svelte';
	import LayoutMenu from '@nahu/admin-kit/components/shell/LayoutMenu.svelte';
	import PageHeader from '$lib/components/admin/PageHeader.svelte';
	import { formatETB } from '$lib/money';
	import { date, longText, money, sortable, status, words } from '$lib/cells';

	let { data } = $props();

	type VendorRow = NonNullable<typeof data.vendor>['rows'][number];
	type PlanRow = NonNullable<typeof data.plan>['rows'][number];
	type RefundRow = NonNullable<typeof data.refunds>['rows'][number];

	const tabs = $derived([
		{ title: 'Booking payments', href: '/admin/payments?tab=vendor', match: () => data.tab === 'vendor' },
		{ title: 'Plan payments', href: '/admin/payments?tab=plan', match: () => data.tab === 'plan' },
		{
			title: `Refunds${data.pendingRefunds ? ` (${data.pendingRefunds})` : ''}`,
			href: '/admin/payments?tab=refunds',
			match: () => data.tab === 'refunds'
		}
	]);

	const vendorColumns: ColumnDef<VendorRow>[] = [
		{ id: 'id', accessorKey: 'id', header: sortable('#') },
		{ id: 'vendor', accessorKey: 'vendor', header: sortable('Vendor'), cell: ({ row }) => row.original.vendor ?? '—' },
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
			id: 'commission',
			accessorKey: 'commission',
			header: 'Commission',
			meta: { align: 'right' },
			cell: ({ row }) => money(row.original.commission)
		},
		{ id: 'status', accessorKey: 'status', header: 'Status', cell: ({ row }) => status(row.original.status) },
		{
			id: 'date',
			accessorKey: 'createdAt',
			header: sortable('Date'),
			cell: ({ row }) => date(row.original.paidAt ?? row.original.createdAt)
		},
		{ id: 'actions', header: '', cell: ({ row }) => renderSnippet(vendorActions, row.original) }
	];

	const planColumns: ColumnDef<PlanRow>[] = [
		{ id: 'id', accessorKey: 'id', header: sortable('#') },
		{ id: 'couple', accessorKey: 'couple', header: sortable('Couple') },
		{ id: 'method', accessorKey: 'method', header: 'Method', cell: ({ row }) => words(row.original.method) },
		{
			id: 'amount',
			accessorKey: 'amount',
			header: sortable('Amount'),
			meta: { align: 'right' },
			cell: ({ row }) => money(row.original.amount)
		},
		{ id: 'ref', accessorKey: 'ref', header: 'Reference', cell: ({ row }) => row.original.ref ?? '—' },
		{ id: 'status', accessorKey: 'status', header: 'Status', cell: ({ row }) => status(row.original.status) },
		{
			id: 'date',
			accessorKey: 'createdAt',
			header: sortable('Date'),
			cell: ({ row }) => date(row.original.paidAt ?? row.original.createdAt)
		}
	];

	const refundColumns: ColumnDef<RefundRow>[] = [
		{ id: 'id', accessorKey: 'id', header: sortable('#') },
		{ id: 'paymentId', accessorKey: 'paymentId', header: 'Payment', cell: ({ row }) => `#${row.original.paymentId}` },
		{
			id: 'amount',
			accessorKey: 'amount',
			header: sortable('Amount'),
			meta: { align: 'right' },
			cell: ({ row }) => money(row.original.amount)
		},
		{ id: 'reason', accessorKey: 'reason', header: 'Reason', cell: ({ row }) => longText(row.original.reason) },
		{ id: 'status', accessorKey: 'status', header: 'Status', cell: ({ row }) => status(row.original.status) },
		{ id: 'date', accessorKey: 'createdAt', header: sortable('Requested'), cell: ({ row }) => date(row.original.createdAt) },
		{ id: 'actions', header: '', cell: ({ row }) => renderSnippet(refundActions, row.original) }
	];
</script>

{#snippet vendorActions(p: VendorRow)}
	{#if p.status === 'pending'}
		<div class="flex justify-end gap-2">
			<ConfirmAction
				action="?/confirmPayment"
				fields={{ id: p.id }}
				label="Confirm"
				title="Confirm receipt of {formatETB(p.amount)}?"
				description="This credits {p.vendor ?? 'the vendor'}'s wallet, less commission."
			/>
			<ConfirmAction
				action="?/failPayment"
				fields={{ id: p.id }}
				label="Not received"
				variant="outline"
				title="Mark payment #{p.id} as not received?"
			/>
		</div>
	{/if}
{/snippet}

{#snippet refundActions(r: RefundRow)}
	{#if r.status === 'pending'}
		<div class="flex justify-end gap-2">
			<ConfirmAction
				action="?/approveRefund"
				fields={{ id: r.id }}
				label="Approve"
				title="Approve refund of {formatETB(r.amount)}?"
				description="Payment #{r.paymentId} is marked refunded. Send the money back through the gateway."
			/>
			<ConfirmAction
				action="?/rejectRefund"
				fields={{ id: r.id }}
				label="Reject"
				variant="outline"
				title="Reject this refund request?"
			/>
		</div>
	{/if}
{/snippet}

<div class="space-y-6">
	<PageHeader
		title="Payments"
		description="Subscription payments, vendor booking payments and refund requests."
	/>

	<LayoutMenu items={tabs} />

	{#if data.vendor}
		<DataTable
			columns={vendorColumns}
			data={data.vendor.rows}
			server={data.vendor.server}
			facetKeys={['status', 'method', 'type']}
			facetLabels={{ status: 'Status', method: 'Method', type: 'Type' }}
			dateFilter="Created"
			fileName="Booking payments"
		/>
	{:else if data.plan}
		<DataTable
			columns={planColumns}
			data={data.plan.rows}
			server={data.plan.server}
			facetKeys={['status', 'method']}
			facetLabels={{ status: 'Status', method: 'Method' }}
			dateFilter="Created"
			fileName="Plan payments"
		/>
	{:else if data.refunds}
		<DataTable
			columns={refundColumns}
			data={data.refunds.rows}
			server={data.refunds.server}
			facetKeys={['status']}
			facetLabels={{ status: 'Status' }}
			dateFilter="Requested"
			fileName="Refunds"
		/>
	{/if}
</div>
