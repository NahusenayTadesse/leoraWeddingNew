<script lang="ts">
	import type { ColumnDef } from '@tanstack/table-core';
	import { renderSnippet } from '@nahu/admin-kit/components/ui/data-table/index.js';
	import DataTable from '@nahu/admin-kit/components/Table/data-table.svelte';
	import PageHeader from '@nahu/admin-kit/components/PageHeader.svelte';
	import LayoutMenu from '@nahu/admin-kit/components/shell/LayoutMenu.svelte';
	import FormDialog from '@nahu/admin-kit/formComponents/FormDialog.svelte';
	import InputComp from '@nahu/admin-kit/formComponents/InputComp.svelte';
	import LoadingBtn from '@nahu/admin-kit/formComponents/LoadingBtn.svelte';
	import { createForm } from '@nahu/admin-kit/forms/createForm';
	import * as Dialog from '@nahu/admin-kit/components/ui/dialog/index.js';
	import * as DropdownMenu from '@nahu/admin-kit/components/ui/dropdown-menu/index.js';
	import { Badge } from '@nahu/admin-kit/components/ui/badge/index.js';
	import { Button } from '@nahu/admin-kit/components/ui/button/index.js';
	import {
		Pencil,
		Trash2,
		CalendarClock,
		MoreVertical,
		Check,
		X,
		Send,
		MessageCircle,
		TriangleAlert,
		FileText
	} from '@lucide/svelte';
	import ActionForm from '@nahu/admin-kit/formComponents/ActionForm.svelte';
	import ContractPanel from '$lib/components/ContractPanel.svelte';
	import {
		cancelSchema,
		confirmSchema,
		quoteSchema,
		replySchema,
		rescheduleSchema,
		vendorBookingAddSchema,
		vendorBookingEditSchema
	} from '$lib/schemas/vendor-bookings';
	import { idSchema } from '$lib/schemas/common';
	import { date, longText, money, sortable, status } from '$lib/cells';

	let { data } = $props();

	type Row = (typeof data.bookings)[number];

	let disputeFor = $state<Row | null>(null);
	let contractFor = $state<number | null>(null);
	const contractRow = $derived(data.bookings.find((b) => b.id === contractFor) ?? null);

	const statusItems = [
		{ value: 'pending', name: 'Pending' },
		{ value: 'confirmed', name: 'Confirmed' },
		{ value: 'cancelled', name: 'Cancelled' }
	];

	const TABS = [
		['upcoming', 'Upcoming'],
		['pending', 'Pending'],
		['confirmed', 'Confirmed'],
		['past', 'Past'],
		['cancelled', 'Cancelled'],
		['all', 'All']
	] as const;

	// A tab is a link: it starts the table afresh (page 1, no search) on that tab's bookings.
	const tabs = $derived(
		TABS.map(([tab, title]) => ({
			title,
			href: `/vendor-dashboard/bookings?tab=${tab}`,
			match: () => data.tab === tab
		}))
	);

	/* ---------------- one dialog per action, opened from a row ---------------- */

	let row = $state<Row | null>(null);
	let open = $state({
		edit: false,
		remove: false,
		confirm: false,
		cancel: false,
		quote: false,
		reschedule: false
	});

	function openFor(action: keyof typeof open, booking: Row) {
		row = booking;
		open[action] = true;
	}

	/* ---------------- reply thread ---------------- */

	let threadOpen = $state<{ coupleId: number; label: string } | null>(null);
	let thread = $state<{ id: number; senderId: string; body: string; createdAt: string }[]>([]);
	let threadLoading = $state(false);

	// svelte-ignore state_referenced_locally
	const {
		form: replyForm,
		errors: replyErrors,
		enhance: replyEnhance,
		delayed: replying
	} = createForm(data.replyForm, replySchema, {
		id: 'reply',
		resetForm: false,
		onUpdated: ({ form }) => {
			if (form.valid && form.message?.type === 'success') {
				$replyForm.body = '';
				if (threadOpen) loadThread(threadOpen.coupleId);
			}
		}
	});

	async function loadThread(coupleId: number) {
		threadLoading = true;
		try {
			const res = await fetch(`/vendor-dashboard/bookings/conversation?coupleId=${coupleId}`);
			thread = res.ok ? await res.json() : [];
		} finally {
			threadLoading = false;
		}
	}

	function openThread(booking: Row) {
		threadOpen = { coupleId: booking.coupleId, label: booking.coupleNames };
		$replyForm.coupleId = booking.coupleId;
		$replyForm.body = '';
		loadThread(booking.coupleId);
	}

	/* ---------------- table ---------------- */

	const columns: ColumnDef<Row>[] = [
		{
			id: 'couple',
			accessorKey: 'coupleNames',
			header: sortable('Couple'),
			cell: ({ row }) => renderSnippet(coupleCell, row.original)
		},
		{
			id: 'serviceId',
			accessorKey: 'serviceTitle',
			header: 'Service',
			cell: ({ row }) => row.original.serviceTitle ?? '—'
		},
		{
			id: 'eventDate',
			accessorKey: 'eventDate',
			header: sortable('Event date'),
			cell: ({ row }) => date(row.original.eventDate)
		},
		{
			id: 'status',
			accessorKey: 'status',
			header: 'Status',
			cell: ({ row }) => status(row.original.status)
		},
		{
			id: 'agreedPrice',
			accessorKey: 'agreedPrice',
			header: sortable('Price'),
			meta: { align: 'right' },
			cell: ({ row }) => money(row.original.agreedPrice)
		},
		{
			id: 'quote',
			header: 'Latest quote',
			cell: ({ row }) =>
				row.original.quote
					? `${money(row.original.quote.proposedPrice)} (${row.original.quote.status})`
					: '—'
		},
		{
			id: 'note',
			header: 'Note',
			cell: ({ row }) =>
				row.original.status === 'cancelled' ? longText(row.original.cancellationReason) : ''
		},
		{ id: 'actions', header: '', cell: ({ row }) => renderSnippet(actionsCell, row.original) }
	];

	const coupleItems = $derived(data.couples.map((c) => ({ value: c.value, name: c.name })));
</script>

{#snippet coupleCell(b: Row)}
	<div class="flex items-center gap-2">
		<span class="font-medium">{b.coupleNames}</span>
		{#if b.unread > 0}
			<Badge variant="destructive">{b.unread}</Badge>
		{/if}
	</div>
	{#if b.coupleEmail || b.couplePhone}
		<span class="text-xs text-muted-foreground">
			{[b.coupleEmail, b.couplePhone].filter(Boolean).join(' · ')}
		</span>
	{/if}
{/snippet}

{#snippet actionsCell(b: Row)}
	<div class="flex justify-end gap-1">
		<Button variant="ghost" size="icon" onclick={() => openThread(b)} title="Message thread">
			<MessageCircle class="size-4" />
		</Button>
		<DropdownMenu.Root>
			<DropdownMenu.Trigger>
				{#snippet child({ props })}
					<Button variant="ghost" size="icon" {...props} aria-label="Booking actions">
						<MoreVertical class="size-4" />
					</Button>
				{/snippet}
			</DropdownMenu.Trigger>
			<DropdownMenu.Content align="end">
				{#if b.status === 'pending'}
					<DropdownMenu.Item onclick={() => openFor('confirm', b)}>
						<Check class="size-4" /> Confirm
					</DropdownMenu.Item>
				{/if}
				<DropdownMenu.Item onclick={() => openFor('quote', b)}>
					<Send class="size-4" /> Send quote
				</DropdownMenu.Item>
				<DropdownMenu.Item onclick={() => openFor('reschedule', b)}>
					<CalendarClock class="size-4" /> Reschedule
				</DropdownMenu.Item>
				{#if b.status !== 'cancelled'}
					<DropdownMenu.Item onclick={() => openFor('cancel', b)}>
						<X class="size-4" /> Cancel
					</DropdownMenu.Item>
				{/if}
				<DropdownMenu.Item onclick={() => (contractFor = b.id)}>
					<FileText class="size-4" /> Contract{b.contract?.hasDocument
						? b.contract.signedByCouple && b.contract.signedByVendor
							? ' (signed)'
							: ' (awaiting signature)'
						: ''}
				</DropdownMenu.Item>
				{#if b.status !== 'pending'}
					<DropdownMenu.Item onclick={() => (disputeFor = b)}>
						<TriangleAlert class="size-4" /> Report a problem
					</DropdownMenu.Item>
				{/if}
				<DropdownMenu.Separator />
				<DropdownMenu.Item onclick={() => openFor('edit', b)}>
					<Pencil class="size-4" /> Edit
				</DropdownMenu.Item>
				<DropdownMenu.Item class="text-destructive" onclick={() => openFor('remove', b)}>
					<Trash2 class="size-4" /> Delete
				</DropdownMenu.Item>
			</DropdownMenu.Content>
		</DropdownMenu.Root>
	</div>
{/snippet}

<div class="space-y-6">
	<PageHeader
		title="Bookings"
		tabTitle="Bookings — Vendor Portal"
		description="Couples who've requested or booked your services."
	>
		{#snippet actions()}
			<FormDialog
				title="Add booking"
				action="?/add"
				data={data.addForm}
				schema={vendorBookingAddSchema}
				triggerLabel="Add booking"
				submitLabel="Add booking"
				resetOnSuccess
			>
				{#snippet fields({ form, errors })}
					<InputComp
						{form}
						{errors}
						name="weddingPlanId"
						label="Couple"
						type="select"
						items={coupleItems}
					/>
					<InputComp
						{form}
						{errors}
						name="serviceId"
						label="Service"
						type="select"
						items={data.services}
					/>
					<InputComp
						{form}
						{errors}
						name="status"
						label="Status"
						type="select"
						items={statusItems}
					/>
					<InputComp
						{form}
						{errors}
						name="agreedPrice"
						label="Agreed price (ETB)"
						type="number"
						min={0}
					/>
					<InputComp {form} {errors} name="eventDate" label="Event date" type="date" futureDays />
				{/snippet}
			</FormDialog>
		{/snippet}
	</PageHeader>

	<LayoutMenu items={tabs} />

	<DataTable
		{columns}
		data={data.bookings}
		server={data.server}
		facetKeys={['serviceId']}
		facetLabels={{ serviceId: 'Service' }}
		dateFilter="Event date"
		fileName="Bookings"
	/>
</div>

<FormDialog
	title="Edit booking"
	description={row?.coupleNames}
	action="?/edit"
	data={data.editForm}
	schema={vendorBookingEditSchema}
	bind:open={open.edit}
	seed={row
		? {
				id: row.id,
				weddingPlanId: row.weddingPlanId,
				serviceId: row.serviceId ?? undefined,
				status: row.status,
				agreedPrice: row.agreedPrice ?? undefined,
				eventDate: row.eventDate ?? ''
			}
		: {}}
	hideTrigger
>
	{#snippet fields({ form, errors })}
		<InputComp {form} {errors} name="id" type="hidden" />
		<InputComp
			{form}
			{errors}
			name="weddingPlanId"
			label="Couple"
			type="select"
			items={coupleItems}
		/>
		<InputComp
			{form}
			{errors}
			name="serviceId"
			label="Service"
			type="select"
			items={data.services}
		/>
		<InputComp {form} {errors} name="status" label="Status" type="select" items={statusItems} />
		<InputComp
			{form}
			{errors}
			name="agreedPrice"
			label="Agreed price (ETB)"
			type="number"
			min={0}
		/>
		<InputComp {form} {errors} name="eventDate" label="Event date" type="date" futureDays />
	{/snippet}
</FormDialog>

<FormDialog
	title="Remove this booking?"
	description="The booking with {row?.coupleNames ??
		''} will be removed. This can't be undone from here."
	action="?/delete"
	data={data.deleteForm}
	schema={idSchema}
	bind:open={open.remove}
	seed={{ id: row?.id }}
	hideTrigger
	submitLabel="Remove"
>
	{#snippet fields({ form, errors })}
		<InputComp {form} {errors} name="id" type="hidden" />
	{/snippet}
</FormDialog>

<FormDialog
	title="Confirm booking"
	description={row?.coupleNames}
	action="?/confirm"
	data={data.confirmForm}
	schema={confirmSchema}
	bind:open={open.confirm}
	seed={{ id: row?.id, agreedPrice: row?.agreedPrice ?? undefined, allowOverlap: false }}
	hideTrigger
	submitLabel="Confirm"
>
	{#snippet fields({ form, errors })}
		<InputComp {form} {errors} name="id" type="hidden" />
		<InputComp
			{form}
			{errors}
			name="agreedPrice"
			label="Agreed price (ETB, optional)"
			type="number"
			min={0}
		/>
		<InputComp
			{form}
			{errors}
			name="allowOverlap"
			label="Overlap"
			hideLabel
			type="checkboxSingle"
			placeholder="Allow even if I already have a confirmed booking that day"
		/>
	{/snippet}
</FormDialog>

<FormDialog
	title="Cancel booking"
	description={row?.coupleNames}
	action="?/cancel"
	data={data.cancelForm}
	schema={cancelSchema}
	bind:open={open.cancel}
	seed={{ id: row?.id, reason: '' }}
	hideTrigger
	submitLabel="Cancel booking"
>
	{#snippet fields({ form, errors })}
		<InputComp {form} {errors} name="id" type="hidden" />
		<InputComp
			{form}
			{errors}
			name="reason"
			label="Reason for the couple"
			type="textarea"
			rows={4}
			required
		/>
	{/snippet}
</FormDialog>

<FormDialog
	title="Send a price quote"
	description={row?.coupleNames}
	action="?/quote"
	data={data.quoteForm}
	schema={quoteSchema}
	bind:open={open.quote}
	seed={{ id: row?.id, proposedPrice: row?.agreedPrice ?? 0, notes: '' }}
	hideTrigger
	submitLabel="Send quote"
>
	{#snippet fields({ form, errors })}
		<InputComp {form} {errors} name="id" type="hidden" />
		<InputComp
			{form}
			{errors}
			name="proposedPrice"
			label="Proposed price (ETB)"
			type="number"
			min={0}
			required
		/>
		<InputComp {form} {errors} name="notes" label="Notes (optional)" type="textarea" rows={3} />
	{/snippet}
</FormDialog>

<FormDialog
	title="Reschedule booking"
	description={row?.coupleNames}
	action="?/reschedule"
	data={data.rescheduleForm}
	schema={rescheduleSchema}
	bind:open={open.reschedule}
	seed={{ id: row?.id, eventDate: row?.eventDate ?? '', allowOverlap: false }}
	hideTrigger
	submitLabel="Reschedule"
>
	{#snippet fields({ form, errors })}
		<InputComp {form} {errors} name="id" type="hidden" />
		<InputComp {form} {errors} name="eventDate" label="New event date" type="date" futureDays />
		<InputComp
			{form}
			{errors}
			name="allowOverlap"
			label="Overlap"
			hideLabel
			type="checkboxSingle"
			placeholder="Allow even if I already have a confirmed booking that day"
		/>
	{/snippet}
</FormDialog>

<!-- Message thread / reply -->
<Dialog.Root open={threadOpen !== null} onOpenChange={(v) => !v && (threadOpen = null)}>
	<Dialog.Content class="sm:max-w-lg">
		<Dialog.Header>
			<Dialog.Title>Messages with {threadOpen?.label}</Dialog.Title>
		</Dialog.Header>

		<div class="max-h-72 space-y-2 overflow-y-auto rounded-md border p-3">
			{#if threadLoading}
				<p class="text-sm text-muted-foreground">Loading…</p>
			{:else if thread.length === 0}
				<p class="text-sm text-muted-foreground">No messages yet.</p>
			{:else}
				{#each thread as m (m.id)}
					<div
						class="rounded-md {m.senderId === data.vendorUserId
							? 'ml-8 bg-primary/10'
							: 'mr-8 bg-muted'} p-2 text-sm"
					>
						<p>{m.body}</p>
						<p class="mt-1 text-xs text-muted-foreground">
							{new Date(m.createdAt).toLocaleString()}
						</p>
					</div>
				{/each}
			{/if}
		</div>

		<form method="POST" action="?/reply" use:replyEnhance class="space-y-2 pt-2">
			<InputComp form={replyForm} errors={replyErrors} name="coupleId" type="hidden" />
			<InputComp
				form={replyForm}
				errors={replyErrors}
				name="body"
				label="Reply"
				hideLabel
				type="textarea"
				rows={3}
				placeholder="Write a reply…"
			/>
			<div class="flex justify-end">
				<Button type="submit" disabled={$replying}>
					{#if $replying}<LoadingBtn name="Sending" />{:else}<Send class="size-4" /> Reply{/if}
				</Button>
			</div>
		</form>
	</Dialog.Content>
</Dialog.Root>

<Dialog.Root open={!!disputeFor} onOpenChange={(open) => !open && (disputeFor = null)}>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>Report a problem</Dialog.Title>
			<Dialog.Description>
				Tell us what happened with this booking. Our team will contact you and the couple.
			</Dialog.Description>
		</Dialog.Header>
		{#if disputeFor}
			<ActionForm
				action="?/dispute"
				fields={{ id: disputeFor.id }}
				onDone={() => (disputeFor = null)}
				class="space-y-4"
			>
				{#snippet children({ busy })}
					<textarea
						name="reason"
						required
						minlength="10"
						maxlength="2000"
						rows="5"
						aria-label="What happened"
						class="w-full rounded-md border bg-background p-2 text-sm"
					></textarea>
					<Dialog.Footer>
						<Button type="button" variant="outline" onclick={() => (disputeFor = null)}
							>Cancel</Button
						>
						<Button type="submit" disabled={!!busy}>Send</Button>
					</Dialog.Footer>
				{/snippet}
			</ActionForm>
		{/if}
	</Dialog.Content>
</Dialog.Root>

<Dialog.Root open={!!contractRow} onOpenChange={(open) => !open && (contractFor = null)}>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>Contract</Dialog.Title>
			<Dialog.Description>
				Share a PDF with the couple. Both sides sign by typing their name; replacing the PDF clears
				both signatures.
			</Dialog.Description>
		</Dialog.Header>
		{#if contractRow}
			<ContractPanel
				contract={contractRow.contract}
				side="vendor"
				fields={{ id: contractRow.id }}
			/>
		{/if}
	</Dialog.Content>
</Dialog.Root>
