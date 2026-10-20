<script lang="ts">
	import type { ColumnDef } from '@tanstack/table-core';
	import { renderSnippet } from '@nahu/admin-kit/components/ui/data-table/index.js';
	import DataTable from '@nahu/admin-kit/components/Table/data-table.svelte';
	import ConfirmAction from '@nahu/admin-kit/components/ConfirmAction.svelte';
	import ActionForm from '@nahu/admin-kit/formComponents/ActionForm.svelte';
	import { Button } from '@nahu/admin-kit/components/ui/button/index.js';
	import * as Card from '@nahu/admin-kit/components/ui/card/index.js';
	import * as Dialog from '@nahu/admin-kit/components/ui/dialog/index.js';
	import LayoutMenu from '@nahu/admin-kit/components/shell/LayoutMenu.svelte';
	import PageHeader from '$lib/components/admin/PageHeader.svelte';
	import { formatETB } from '$lib/money';
	import { date, longText, money, sortable, status, words } from '$lib/cells';

	let { data } = $props();

	type VendorRow = NonNullable<typeof data.vendor>['rows'][number];
	type PlanRow = NonNullable<typeof data.plan>['rows'][number];
	type RefundRow = NonNullable<typeof data.refunds>['rows'][number];
	type ReviewRow = (typeof data.review)[number];

	/** The receipt being rejected, for the reason dialog. */
	let rejecting = $state<ReviewRow | null>(null);
	let reason = $state('');

	const isImage = (file: string) => /\.(png|jpe?g|webp|avif)$/i.test(file);

	const tabs = $derived([
		{
			title: `To review${data.review.length ? ` (${data.review.length})` : ''}`,
			href: '/admin/payments?tab=review',
			match: () => data.tab === 'review'
		},
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
		},
		{ id: 'actions', header: '', cell: ({ row }) => renderSnippet(planActions, row.original) }
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

{#snippet rowActions(p: { status: string; method: string | null; ref: string | null; receiptFile: string | null })}
	<div class="flex justify-end gap-2">
		{#if p.receiptFile}
			<Button href="/receipts/{p.receiptFile}" target="_blank" variant="ghost" size="sm">Receipt</Button>
		{/if}
		{#if p.status === 'pending' && p.method === 'chapa' && p.ref}
			<ActionForm action="?/recheckChapa" fields={{ ref: p.ref }}>
				{#snippet children({ busy })}
					<Button type="submit" variant="outline" size="sm" disabled={!!busy}>Check with Chapa</Button>
				{/snippet}
			</ActionForm>
		{:else if p.status === 'pending'}
			<Button href="/admin/payments?tab=review" variant="outline" size="sm">Review</Button>
		{/if}
	</div>
{/snippet}

{#snippet vendorActions(p: VendorRow)}
	{@render rowActions(p)}
{/snippet}

{#snippet planActions(p: PlanRow)}
	{@render rowActions(p)}
{/snippet}

{#snippet refundActions(r: RefundRow)}
	{#if r.status === 'pending'}
		<div class="flex justify-end gap-2">
			<ConfirmAction
				action="?/approveRefund"
				fields={{ id: r.id }}
				label="Approve"
				title="Approve refund of {formatETB(r.amount)}?"
				description="Payment #{r.paymentId} is marked refunded and the vendor's share is taken back from their wallet. Send the money to the couple through Chapa or by transfer."
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

	{#if data.tab === 'review'}
		<div class="flex justify-end">
			<ActionForm action="?/reconcile">
				{#snippet children({ busy })}
					<Button type="submit" variant="outline" size="sm" disabled={!!busy}>
						Re-check open Chapa payments
					</Button>
				{/snippet}
			</ActionForm>
		</div>
		{#if data.review.length === 0}
			<Card.Root class="p-10 text-center text-sm text-muted-foreground">
				No transfer receipts are waiting. New ones appear here as couples upload them.
			</Card.Root>
		{:else}
			<div class="grid gap-4 lg:grid-cols-2">
				{#each data.review as r (`${r.kind}-${r.id}`)}
					<Card.Root class="overflow-hidden">
						<div class="grid gap-4 p-4 sm:grid-cols-[160px_1fr]">
							{#if r.receiptFile}
								<a href="/receipts/{r.receiptFile}" target="_blank" rel="noopener" class="block">
									{#if isImage(r.receiptFile)}
										<img
											src="/receipts/{r.receiptFile}"
											alt="Receipt"
											class="h-40 w-full rounded-md border object-cover"
										/>
									{:else}
										<span class="flex h-40 items-center justify-center rounded-md border text-sm">
											Open PDF
										</span>
									{/if}
								</a>
							{:else}
								<span class="flex h-40 items-center justify-center rounded-md border text-sm text-muted-foreground">
									No receipt
								</span>
							{/if}
							<div class="space-y-1 text-sm">
								<p class="text-lg font-semibold tabular-nums">{formatETB(r.amount)}</p>
								<p><span class="text-muted-foreground">From:</span> {r.payer}</p>
								{#if r.payerEmail}<p class="text-muted-foreground">{r.payerEmail}</p>{/if}
								<p><span class="text-muted-foreground">For:</span> {r.forWhat}</p>
								<p><span class="text-muted-foreground">Into:</span> {r.bank}</p>
								{#if r.note}<p class="text-muted-foreground">{r.note}</p>{/if}
								<p class="text-xs text-muted-foreground">
									{r.kind === 'booking' ? 'Booking' : 'Plan'} payment #{r.id} · {new Date(r.createdAt).toLocaleString()}
								</p>
								<div class="flex flex-wrap gap-2 pt-2">
									<ConfirmAction
										action="?/confirmTransfer"
										fields={{ kind: r.kind, id: r.id }}
										label="Confirm"
										title="Confirm {formatETB(r.amount)} arrived?"
										description={r.kind === 'booking'
											? 'Only if it is on the bank statement. This credits the vendor, less commission.'
											: 'Only if it is on the bank statement. This activates the plan.'}
									/>
									<Button
										variant="outline"
										size="sm"
										onclick={() => {
											rejecting = r;
											reason = '';
										}}>Reject</Button
									>
								</div>
							</div>
						</div>
					</Card.Root>
				{/each}
			</div>
		{/if}
	{:else if data.vendor}
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

<Dialog.Root open={!!rejecting} onOpenChange={(open) => !open && (rejecting = null)}>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>Reject this receipt?</Dialog.Title>
			<Dialog.Description>
				The payer is told the reason and can pay again. Nothing is credited.
			</Dialog.Description>
		</Dialog.Header>
		{#if rejecting}
			<ActionForm
				action="?/rejectTransfer"
				fields={{ kind: rejecting.kind, id: rejecting.id }}
				onDone={() => (rejecting = null)}
				class="space-y-4"
			>
				{#snippet children({ busy })}
					<textarea
						name="reason"
						bind:value={reason}
						required
						maxlength="500"
						rows="3"
						placeholder="e.g. Amount does not match, or not on our statement"
						class="w-full rounded-md border bg-background p-2 text-sm"
					></textarea>
					<Dialog.Footer>
						<Button type="button" variant="outline" onclick={() => (rejecting = null)}>Cancel</Button>
						<Button type="submit" variant="destructive" disabled={!!busy || !reason.trim()}>
							Reject receipt
						</Button>
					</Dialog.Footer>
				{/snippet}
			</ActionForm>
		{/if}
	</Dialog.Content>
</Dialog.Root>
