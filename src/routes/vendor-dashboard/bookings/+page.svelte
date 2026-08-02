<script lang="ts">
	import { superForm } from 'sveltekit-superforms';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import * as AlertDialog from '$lib/components/ui/alert-dialog/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Table from '$lib/components/ui/table/index.js';
	import * as Tabs from '$lib/components/ui/tabs/index.js';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import InputComp from '$lib/formComponents/InputComp.svelte';
	import Errors from '$lib/formComponents/Errors.svelte';
	import { toast } from 'svelte-sonner';
	import {
		Plus,
		Pencil,
		Trash2,
		Loader2,
		CalendarClock,
		MoreVertical,
		Check,
		X,
		Send,
		MessageCircle,
		CalendarSearch
	} from '@lucide/svelte';

	let { data } = $props();

	const statusItems = [
		{ value: 'pending', name: 'Pending' },
		{ value: 'confirmed', name: 'Confirmed' },
		{ value: 'cancelled', name: 'Cancelled' }
	];

	function statusVariant(status: string) {
		if (status === 'confirmed') return 'default';
		if (status === 'cancelled') return 'destructive';
		return 'secondary';
	}

	function formatPrice(v: number | null) {
		if (v == null) return '—';
		return new Intl.NumberFormat('en-ET', { style: 'currency', currency: 'ETB', currencyDisplay: 'code' }).format(v);
	}

	/* ---------------- filters (GET, reruns load) ---------------- */

	let q = $state(data.filters.q);
	let serviceId = $state(data.filters.serviceId ? String(data.filters.serviceId) : '');
	let sort = $state(data.filters.sort);

	function applyFilters(overrides: Record<string, string> = {}) {
		const params = new URLSearchParams(page.url.searchParams);
		const next = { tab: data.filters.tab, q, serviceId, sort, page: '1', ...overrides };
		for (const [key, value] of Object.entries(next)) {
			if (value) params.set(key, value);
			else params.delete(key);
		}
		goto(`?${params.toString()}`, { keepFocus: true, noScroll: true });
	}

	function changeTab(tab: string) {
		applyFilters({ tab });
	}

	function changePage(delta: number) {
		const params = new URLSearchParams(page.url.searchParams);
		params.set('page', String(Math.max(1, data.filters.page + delta)));
		goto(`?${params.toString()}`, { keepFocus: true, noScroll: true });
	}

	/* ---------------- add / edit ---------------- */

	let dialogOpen = $state(false);
	let editingId = $state<number | null>(null);
	let pendingDelete = $state<{ id: number; label: string } | null>(null);

	const addSf = superForm(data.addForm, {
		id: 'add',
		resetForm: true,
		onUpdated: ({ form }) => {
			if (form.valid && form.message?.type === 'success') {
				toast.success(form.message.text);
				dialogOpen = false;
			} else if (form.message?.type === 'error') {
				toast.error(form.message.text);
			}
		}
	});
	const { form: addForm, errors: addErrors, enhance: addEnhance, delayed: addDelayed, allErrors: addAllErrors } = addSf;

	const editSf = superForm(data.editForm, {
		id: 'edit',
		resetForm: false,
		onUpdated: ({ form }) => {
			if (form.valid && form.message?.type === 'success') {
				toast.success(form.message.text);
				dialogOpen = false;
				editingId = null;
			} else if (form.message?.type === 'error') {
				toast.error(form.message.text);
			}
		}
	});
	const { form: editForm, errors: editErrors, enhance: editEnhance, delayed: editDelayed, allErrors: editAllErrors } = editSf;

	const deleteSf = superForm(data.deleteForm, {
		id: 'delete',
		onUpdated: ({ form }) => {
			if (form.message) toast[form.message.type === 'error' ? 'error' : 'success'](form.message.text);
			pendingDelete = null;
		}
	});
	const { form: deleteForm, enhance: deleteEnhance, delayed: deleting } = deleteSf;

	function openCreate() {
		editingId = null;
		$addForm.weddingPlanId = 0;
		$addForm.serviceId = undefined;
		$addForm.status = 'pending';
		$addForm.agreedPrice = undefined;
		$addForm.eventDate = '';
		dialogOpen = true;
	}

	function openEdit(booking: (typeof data.bookings)[number]) {
		editingId = booking.id;
		$editForm.id = booking.id;
		$editForm.weddingPlanId = booking.weddingPlanId;
		$editForm.serviceId = booking.serviceId ?? undefined;
		$editForm.status = booking.status;
		$editForm.agreedPrice = booking.agreedPrice ?? undefined;
		$editForm.eventDate = booking.eventDate ?? '';
		dialogOpen = true;
	}

	function confirmDelete(booking: (typeof data.bookings)[number]) {
		pendingDelete = { id: booking.id, label: booking.coupleNames };
		$deleteForm.id = booking.id;
	}

	/* ---------------- confirm / cancel / quote / reschedule ---------------- */

	let confirmOpen = $state<number | null>(null);
	const confirmSf = superForm(data.confirmForm, {
		id: 'confirm',
		resetForm: false,
		onUpdated: ({ form }) => {
			if (form.message) toast[form.message.type === 'error' ? 'error' : 'success'](form.message.text);
			if (form.valid && form.message?.type === 'success') confirmOpen = null;
		}
	});
	const { form: confirmForm, enhance: confirmEnhance, delayed: confirming } = confirmSf;

	let cancelOpen = $state<number | null>(null);
	const cancelSf = superForm(data.cancelForm, {
		id: 'cancel',
		resetForm: false,
		onUpdated: ({ form }) => {
			if (form.message) toast[form.message.type === 'error' ? 'error' : 'success'](form.message.text);
			if (form.valid && form.message?.type === 'success') cancelOpen = null;
		}
	});
	const { form: cancelForm, errors: cancelErrors, enhance: cancelEnhance, delayed: cancelling } = cancelSf;

	let quoteOpen = $state<number | null>(null);
	const quoteSf = superForm(data.quoteForm, {
		id: 'quote',
		resetForm: false,
		onUpdated: ({ form }) => {
			if (form.message) toast[form.message.type === 'error' ? 'error' : 'success'](form.message.text);
			if (form.valid && form.message?.type === 'success') quoteOpen = null;
		}
	});
	const { form: quoteForm, errors: quoteErrors, enhance: quoteEnhance, delayed: quoting } = quoteSf;

	let rescheduleOpen = $state<number | null>(null);
	const rescheduleSf = superForm(data.rescheduleForm, {
		id: 'reschedule',
		resetForm: false,
		onUpdated: ({ form }) => {
			if (form.message) toast[form.message.type === 'error' ? 'error' : 'success'](form.message.text);
			if (form.valid && form.message?.type === 'success') rescheduleOpen = null;
		}
	});
	const {
		form: rescheduleForm,
		errors: rescheduleErrors,
		enhance: rescheduleEnhance,
		delayed: rescheduling
	} = rescheduleSf;

	function openConfirm(booking: (typeof data.bookings)[number]) {
		$confirmForm.id = booking.id;
		$confirmForm.agreedPrice = booking.agreedPrice ?? undefined;
		$confirmForm.allowOverlap = false;
		confirmOpen = booking.id;
	}
	function openCancel(booking: (typeof data.bookings)[number]) {
		$cancelForm.id = booking.id;
		$cancelForm.reason = '';
		cancelOpen = booking.id;
	}
	function openQuote(booking: (typeof data.bookings)[number]) {
		$quoteForm.id = booking.id;
		$quoteForm.proposedPrice = booking.agreedPrice ?? 0;
		$quoteForm.notes = '';
		quoteOpen = booking.id;
	}
	function openReschedule(booking: (typeof data.bookings)[number]) {
		$rescheduleForm.id = booking.id;
		$rescheduleForm.eventDate = booking.eventDate || '';
		$rescheduleForm.allowOverlap = false;
		rescheduleOpen = booking.id;
	}

	/* ---------------- reply thread ---------------- */

	let threadOpen = $state<{ coupleId: number; label: string } | null>(null);
	let thread = $state<
		{ id: number; senderId: string; body: string; createdAt: string }[]
	>([]);
	let threadLoading = $state(false);

	const replySf = superForm(data.replyForm, {
		id: 'reply',
		resetForm: false,
		onUpdated: ({ form }) => {
			if (form.message) toast[form.message.type === 'error' ? 'error' : 'success'](form.message.text);
			if (form.valid && form.message?.type === 'success') {
				$replyForm.body = '';
				if (threadOpen) loadThread(threadOpen.coupleId);
			}
		}
	});
	const { form: replyForm, errors: replyErrors, enhance: replyEnhance, delayed: replying } = replySf;

	async function loadThread(coupleId: number) {
		threadLoading = true;
		try {
			const res = await fetch(`/vendor-dashboard/bookings/conversation?coupleId=${coupleId}`);
			thread = res.ok ? await res.json() : [];
		} finally {
			threadLoading = false;
		}
	}

	function openThread(booking: (typeof data.bookings)[number]) {
		threadOpen = { coupleId: booking.coupleId, label: booking.coupleNames };
		$replyForm.coupleId = booking.coupleId;
		$replyForm.body = '';
		loadThread(booking.coupleId);
	}

	const totalPages = $derived(Math.max(1, Math.ceil(data.total / data.pageSize)));
</script>

<svelte:head>
	<title>Bookings — Vendor Portal</title>
</svelte:head>

<div class="space-y-6">
	<div class="flex flex-wrap items-start justify-between gap-4">
		<div>
			<h1 class="text-2xl font-semibold tracking-tight">Bookings</h1>
			<p class="text-muted-foreground text-sm">Couples who've requested or booked your services.</p>
		</div>
		<Button onclick={openCreate}>
			<Plus class="mr-2 size-4" /> Add booking
		</Button>
	</div>

	<Tabs.Root value={data.filters.tab} onValueChange={(v) => changeTab(v as string)}>
		<Tabs.List>
			<Tabs.Trigger value="upcoming">Upcoming</Tabs.Trigger>
			<Tabs.Trigger value="pending">Pending</Tabs.Trigger>
			<Tabs.Trigger value="confirmed">Confirmed</Tabs.Trigger>
			<Tabs.Trigger value="past">Past</Tabs.Trigger>
			<Tabs.Trigger value="cancelled">Cancelled</Tabs.Trigger>
			<Tabs.Trigger value="all">All</Tabs.Trigger>
		</Tabs.List>
	</Tabs.Root>

	<div class="flex flex-wrap items-center gap-2">
		<Input
			placeholder="Search couple or service…"
			class="w-56"
			bind:value={q}
			onkeydown={(e) => e.key === 'Enter' && applyFilters()}
		/>
		<select
			class="border-input h-9 rounded-md border bg-transparent px-2 text-sm"
			bind:value={serviceId}
			onchange={() => applyFilters()}
		>
			<option value="">All services</option>
			{#each data.services as s (s.value)}
				<option value={String(s.value)}>{s.name}</option>
			{/each}
		</select>
		<select
			class="border-input h-9 rounded-md border bg-transparent px-2 text-sm"
			bind:value={sort}
			onchange={() => applyFilters()}
		>
			<option value="date_asc">Event date ↑</option>
			<option value="date_desc">Event date ↓</option>
			<option value="created_desc">Newest first</option>
			<option value="price_desc">Highest price</option>
		</select>
		<Button variant="outline" size="sm" onclick={() => applyFilters()}>Apply</Button>
	</div>

	{#if data.bookings.length === 0}
		<Card.Root>
			<Card.Content class="py-16 text-center">
				<CalendarSearch class="text-muted-foreground mx-auto size-8" />
				<p class="text-muted-foreground mt-3 text-sm">No bookings match these filters.</p>
			</Card.Content>
		</Card.Root>
	{:else}
		<Card.Root class="overflow-hidden">
			<div class="overflow-x-auto">
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head>Couple</Table.Head>
							<Table.Head>Service</Table.Head>
							<Table.Head>Event date</Table.Head>
							<Table.Head>Status</Table.Head>
							<Table.Head>Price</Table.Head>
							<Table.Head>Latest quote</Table.Head>
							<Table.Head class="text-right">Actions</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each data.bookings as booking (booking.id)}
							<Table.Row>
								<Table.Cell>
									<div class="flex items-center gap-2">
										<span class="font-medium">{booking.coupleNames}</span>
										{#if booking.unread > 0}
											<Badge variant="destructive">{booking.unread}</Badge>
										{/if}
									</div>
									{#if booking.coupleEmail || booking.couplePhone}
										<p class="text-muted-foreground text-xs">
											{[booking.coupleEmail, booking.couplePhone].filter(Boolean).join(' · ')}
										</p>
									{/if}
								</Table.Cell>
								<Table.Cell>{booking.serviceTitle ?? '—'}</Table.Cell>
								<Table.Cell>{booking.eventDate || '—'}</Table.Cell>
								<Table.Cell>
									<Badge variant={statusVariant(booking.status)}>{booking.status}</Badge>
									{#if booking.status === 'cancelled' && booking.cancellationReason}
										<p class="text-muted-foreground mt-1 max-w-48 text-xs">{booking.cancellationReason}</p>
									{/if}
								</Table.Cell>
								<Table.Cell>{formatPrice(booking.agreedPrice)}</Table.Cell>
								<Table.Cell>
									{#if booking.quote}
										<span>{formatPrice(booking.quote.proposedPrice)}</span>
										<span class="text-muted-foreground text-xs">({booking.quote.status})</span>
									{:else}
										—
									{/if}
								</Table.Cell>
								<Table.Cell class="text-right">
									<div class="flex justify-end gap-1">
										<Button variant="ghost" size="icon" onclick={() => openThread(booking)} title="Message thread">
											<MessageCircle class="size-4" />
										</Button>
										<DropdownMenu.Root>
											<DropdownMenu.Trigger>
												{#snippet child({ props })}
													<Button variant="ghost" size="icon" {...props}>
														<MoreVertical class="size-4" />
													</Button>
												{/snippet}
											</DropdownMenu.Trigger>
											<DropdownMenu.Content align="end">
												{#if booking.status === 'pending'}
													<DropdownMenu.Item onclick={() => openConfirm(booking)}>
														<Check class="size-4" /> Confirm
													</DropdownMenu.Item>
												{/if}
												<DropdownMenu.Item onclick={() => openQuote(booking)}>
													<Send class="size-4" /> Send quote
												</DropdownMenu.Item>
												<DropdownMenu.Item onclick={() => openReschedule(booking)}>
													<CalendarClock class="size-4" /> Reschedule
												</DropdownMenu.Item>
												{#if booking.status !== 'cancelled'}
													<DropdownMenu.Item onclick={() => openCancel(booking)}>
														<X class="size-4" /> Cancel
													</DropdownMenu.Item>
												{/if}
												<DropdownMenu.Separator />
												<DropdownMenu.Item onclick={() => openEdit(booking)}>
													<Pencil class="size-4" /> Edit
												</DropdownMenu.Item>
												<DropdownMenu.Item class="text-destructive" onclick={() => confirmDelete(booking)}>
													<Trash2 class="size-4" /> Delete
												</DropdownMenu.Item>
											</DropdownMenu.Content>
										</DropdownMenu.Root>
									</div>
								</Table.Cell>
							</Table.Row>
						{/each}
					</Table.Body>
				</Table.Root>
			</div>
		</Card.Root>

		{#if totalPages > 1}
			<div class="flex items-center justify-end gap-2">
				<Button variant="outline" size="sm" disabled={data.filters.page <= 1} onclick={() => changePage(-1)}>
					Previous
				</Button>
				<span class="text-muted-foreground text-sm">Page {data.filters.page} of {totalPages}</span>
				<Button variant="outline" size="sm" disabled={data.filters.page >= totalPages} onclick={() => changePage(1)}>
					Next
				</Button>
			</div>
		{/if}
	{/if}
</div>

<!-- Add / edit -->
<Dialog.Root bind:open={dialogOpen}>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>{editingId ? 'Edit booking' : 'Add booking'}</Dialog.Title>
		</Dialog.Header>

		{#if editingId}
			<form method="POST" action="?/edit" use:editEnhance class="space-y-1">
				<input type="hidden" name="id" bind:value={$editForm.id} />
				<Errors allErrors={$editAllErrors} />
				<InputComp
					label="Couple"
					name="weddingPlanId"
					type="select"
					items={data.couples.map((c) => ({ value: c.value, name: c.name }))}
					form={editForm}
					errors={editErrors}
				/>
				<InputComp
					label="Service"
					name="serviceId"
					type="select"
					items={data.services}
					form={editForm}
					errors={editErrors}
				/>
				<InputComp label="Status" name="status" type="select" items={statusItems} form={editForm} errors={editErrors} />
				<InputComp label="Agreed price (ETB)" name="agreedPrice" type="number" form={editForm} errors={editErrors} />
				<InputComp label="Event date" name="eventDate" type="date" form={editForm} errors={editErrors} />
				<Dialog.Footer class="pt-4">
					<Button type="button" variant="outline" onclick={() => (dialogOpen = false)}>Cancel</Button>
					<Button type="submit" disabled={$editDelayed}>
						{#if $editDelayed}<Loader2 class="mr-2 size-4 animate-spin" />{/if}
						Save changes
					</Button>
				</Dialog.Footer>
			</form>
		{:else}
			<form method="POST" action="?/add" use:addEnhance class="space-y-1">
				<Errors allErrors={$addAllErrors} />
				<InputComp
					label="Couple"
					name="weddingPlanId"
					type="select"
					items={data.couples.map((c) => ({ value: c.value, name: c.name }))}
					form={addForm}
					errors={addErrors}
				/>
				<InputComp
					label="Service"
					name="serviceId"
					type="select"
					items={data.services}
					form={addForm}
					errors={addErrors}
				/>
				<InputComp label="Status" name="status" type="select" items={statusItems} form={addForm} errors={addErrors} />
				<InputComp label="Agreed price (ETB)" name="agreedPrice" type="number" form={addForm} errors={addErrors} />
				<InputComp label="Event date" name="eventDate" type="date" form={addForm} errors={addErrors} />
				<Dialog.Footer class="pt-4">
					<Button type="button" variant="outline" onclick={() => (dialogOpen = false)}>Cancel</Button>
					<Button type="submit" disabled={$addDelayed}>
						{#if $addDelayed}<Loader2 class="mr-2 size-4 animate-spin" />{/if}
						Add booking
					</Button>
				</Dialog.Footer>
			</form>
		{/if}
	</Dialog.Content>
</Dialog.Root>

<!-- Delete -->
<AlertDialog.Root open={!!pendingDelete} onOpenChange={(v) => !v && (pendingDelete = null)}>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title>Remove this booking?</AlertDialog.Title>
			<AlertDialog.Description>
				The booking with {pendingDelete?.label} will be removed. This can't be undone from here.
			</AlertDialog.Description>
		</AlertDialog.Header>
		<form method="POST" action="?/delete" use:deleteEnhance>
			<input type="hidden" name="id" bind:value={$deleteForm.id} />
			<AlertDialog.Footer>
				<AlertDialog.Cancel type="button">Cancel</AlertDialog.Cancel>
				<Button type="submit" variant="destructive" disabled={$deleting}>
					{#if $deleting}<Loader2 class="mr-2 size-4 animate-spin" />{/if}
					Remove
				</Button>
			</AlertDialog.Footer>
		</form>
	</AlertDialog.Content>
</AlertDialog.Root>

<!-- Confirm -->
<Dialog.Root open={confirmOpen !== null} onOpenChange={(v) => !v && (confirmOpen = null)}>
	<Dialog.Content class="sm:max-w-sm">
		<Dialog.Header>
			<Dialog.Title>Confirm booking</Dialog.Title>
		</Dialog.Header>
		<form method="POST" action="?/confirm" use:confirmEnhance class="space-y-3">
			<input type="hidden" name="id" bind:value={$confirmForm.id} />
			<div class="space-y-1">
				<label class="text-sm font-medium" for="confirm-price">Agreed price (ETB, optional)</label>
				<Input id="confirm-price" type="number" step="any" name="agreedPrice" bind:value={$confirmForm.agreedPrice} />
			</div>
			<label class="flex items-center gap-2 text-sm">
				<input type="checkbox" name="allowOverlap" bind:checked={$confirmForm.allowOverlap} />
				Allow even if I already have a confirmed booking that day
			</label>
			<Dialog.Footer>
				<Button type="button" variant="outline" onclick={() => (confirmOpen = null)}>Cancel</Button>
				<Button type="submit" disabled={$confirming}>
					{#if $confirming}<Loader2 class="mr-2 size-4 animate-spin" />{/if}
					Confirm
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>

<!-- Cancel -->
<Dialog.Root open={cancelOpen !== null} onOpenChange={(v) => !v && (cancelOpen = null)}>
	<Dialog.Content class="sm:max-w-sm">
		<Dialog.Header>
			<Dialog.Title>Cancel booking</Dialog.Title>
		</Dialog.Header>
		<form method="POST" action="?/cancel" use:cancelEnhance class="space-y-3">
			<input type="hidden" name="id" bind:value={$cancelForm.id} />
			<div class="space-y-1">
				<label class="text-sm font-medium" for="cancel-reason">Reason for the couple</label>
				<Textarea id="cancel-reason" name="reason" rows={4} bind:value={$cancelForm.reason} />
				{#if $cancelErrors.reason}<p class="text-red-500 text-sm">{$cancelErrors.reason}</p>{/if}
			</div>
			<Dialog.Footer>
				<Button type="button" variant="outline" onclick={() => (cancelOpen = null)}>Back</Button>
				<Button type="submit" variant="destructive" disabled={$cancelling}>
					{#if $cancelling}<Loader2 class="mr-2 size-4 animate-spin" />{/if}
					Cancel booking
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>

<!-- Quote -->
<Dialog.Root open={quoteOpen !== null} onOpenChange={(v) => !v && (quoteOpen = null)}>
	<Dialog.Content class="sm:max-w-sm">
		<Dialog.Header>
			<Dialog.Title>Send a price quote</Dialog.Title>
		</Dialog.Header>
		<form method="POST" action="?/quote" use:quoteEnhance class="space-y-3">
			<input type="hidden" name="id" bind:value={$quoteForm.id} />
			<div class="space-y-1">
				<label class="text-sm font-medium" for="quote-price">Proposed price (ETB)</label>
				<Input id="quote-price" type="number" step="any" name="proposedPrice" bind:value={$quoteForm.proposedPrice} />
				{#if $quoteErrors.proposedPrice}<p class="text-red-500 text-sm">{$quoteErrors.proposedPrice}</p>{/if}
			</div>
			<div class="space-y-1">
				<label class="text-sm font-medium" for="quote-notes">Notes (optional)</label>
				<Textarea id="quote-notes" name="notes" rows={3} bind:value={$quoteForm.notes} />
			</div>
			<Dialog.Footer>
				<Button type="button" variant="outline" onclick={() => (quoteOpen = null)}>Cancel</Button>
				<Button type="submit" disabled={$quoting}>
					{#if $quoting}<Loader2 class="mr-2 size-4 animate-spin" />{/if}
					Send quote
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>

<!-- Reschedule -->
<Dialog.Root open={rescheduleOpen !== null} onOpenChange={(v) => !v && (rescheduleOpen = null)}>
	<Dialog.Content class="sm:max-w-sm">
		<Dialog.Header>
			<Dialog.Title>Reschedule booking</Dialog.Title>
		</Dialog.Header>
		<form method="POST" action="?/reschedule" use:rescheduleEnhance class="space-y-3">
			<input type="hidden" name="id" bind:value={$rescheduleForm.id} />
			<InputComp label="New event date" name="eventDate" type="date" form={rescheduleForm} errors={rescheduleErrors} />
			<label class="flex items-center gap-2 text-sm">
				<input type="checkbox" name="allowOverlap" bind:checked={$rescheduleForm.allowOverlap} />
				Allow even if I already have a confirmed booking that day
			</label>
			<Dialog.Footer>
				<Button type="button" variant="outline" onclick={() => (rescheduleOpen = null)}>Cancel</Button>
				<Button type="submit" disabled={$rescheduling}>
					{#if $rescheduling}<Loader2 class="mr-2 size-4 animate-spin" />{/if}
					Reschedule
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>

<!-- Message thread / reply -->
<Dialog.Root open={threadOpen !== null} onOpenChange={(v) => !v && (threadOpen = null)}>
	<Dialog.Content class="sm:max-w-lg">
		<Dialog.Header>
			<Dialog.Title>Messages with {threadOpen?.label}</Dialog.Title>
		</Dialog.Header>

		<div class="max-h-72 space-y-2 overflow-y-auto rounded-md border p-3">
			{#if threadLoading}
				<p class="text-muted-foreground text-sm">Loading…</p>
			{:else if thread.length === 0}
				<p class="text-muted-foreground text-sm">No messages yet.</p>
			{:else}
				{#each thread as m (m.id)}
					<div class="rounded-md {m.senderId === data.vendorUserId ? 'bg-primary/10 ml-8' : 'bg-muted mr-8'} p-2 text-sm">
						<p>{m.body}</p>
						<p class="text-muted-foreground mt-1 text-xs">{new Date(m.createdAt).toLocaleString()}</p>
					</div>
				{/each}
			{/if}
		</div>

		<form method="POST" action="?/reply" use:replyEnhance class="space-y-2 pt-2">
			<input type="hidden" name="coupleId" bind:value={$replyForm.coupleId} />
			<Textarea name="body" rows={3} placeholder="Write a reply…" bind:value={$replyForm.body} />
			{#if $replyErrors.body}<p class="text-red-500 text-sm">{$replyErrors.body}</p>{/if}
			<div class="flex justify-end">
				<Button type="submit" disabled={$replying}>
					{#if $replying}<Loader2 class="mr-2 size-4 animate-spin" />{/if}
					<Send class="mr-2 size-4" /> Reply
				</Button>
			</div>
		</form>
	</Dialog.Content>
</Dialog.Root>
