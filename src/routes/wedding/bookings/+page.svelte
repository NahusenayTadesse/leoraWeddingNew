<script lang="ts">
	import HiddenField from '@nahu/admin-kit/formComponents/HiddenField.svelte';
	import { createForm } from '@nahu/admin-kit/forms/createForm';
	import { bookingSchema } from '$lib/schemas/booking';
	import { bookingTransferSchema } from '$lib/schemas/payment';
	import TransferFields from '$lib/components/payments/TransferFields.svelte';
	import { m } from '$lib/paraglide/messages.js';
	import InputComp from '@nahu/admin-kit/formComponents/InputComp.svelte';
	import * as Card from '@nahu/admin-kit/components/ui/card/index.js';
	import * as Dialog from '@nahu/admin-kit/components/ui/dialog/index.js';
	import * as AlertDialog from '@nahu/admin-kit/components/ui/alert-dialog/index.js';
	import * as Tabs from '@nahu/admin-kit/components/ui/tabs/index.js';
	import { Button } from '@nahu/admin-kit/components/ui/button/index.js';
	import { Badge } from '@nahu/admin-kit/components/ui/badge/index.js';
	import { Progress } from '@nahu/admin-kit/components/ui/progress/index.js';
	import {
		Plus,
		Loader2,
		Store,
		Phone,
		CalendarClock,
		Wallet,
		Ban,
		BadgeCheck,
		CircleDollarSign
	} from '@lucide/svelte';

	let { data } = $props();

	const TYPE_ITEMS = [
		{ value: 'advance', name: m.pay_type_advance() },
		{ value: 'balance', name: m.pay_type_balance() },
		{ value: 'full', name: m.pay_type_full() }
	];

	const PAYMENT_STATUS: Record<string, string> = {
		pending: m.pay_status_pending(),
		confirmed: m.pay_status_confirmed(),
		failed: m.pay_status_failed(),
		refunded: m.pay_status_refunded()
	};

	let bookingOpen = $state(false);
	let paymentOpen = $state(false);
	let pendingCancel = $state<{ id: number; label: string } | null>(null);
	let payingFor = $state<{ id: number; label: string; balance: number } | null>(null);
	let payMode = $state<'chapa' | 'transfer'>('chapa');
	let chapaAmount = $state(0);
	let chapaType = $state<'advance' | 'full' | 'balance'>('advance');
	let serviceItems = $state<{ value: string; name: string }[]>([]);
	let loadingServices = $state(false);
	let statusTab = $state('active');
	/** Set by the `?service=` preselect; applied once that service's options finish loading. */
	let pendingServiceId = $state<number | null>(null);

	// The kit's `createForm` toasts each action's message; these only close their dialogs.
	// svelte-ignore state_referenced_locally
	const { form, errors, enhance, submitting } = createForm(data.form, bookingSchema, {
		id: 'booking',
		resetForm: true,
		onUpdated: ({ form }) => {
			if (form.message?.type === 'success') bookingOpen = false;
		}
	});

	// svelte-ignore state_referenced_locally
	const {
		form: cancelData,
		enhance: cancelEnhance,
		submitting: cancelling
	} = createForm(data.cancelForm, undefined, {
		id: 'cancel',
		onUpdated: () => {
			pendingCancel = null;
		}
	});

	// svelte-ignore state_referenced_locally
	const {
		form: transferData,
		errors: transferErrors,
		enhance: transferEnhance,
		submitting: sendingReceipt
	} = createForm(data.transferForm, bookingTransferSchema, {
		id: 'transfer',
		resetForm: true,
		onUpdated: ({ form }) => {
			if (form.message?.type === 'success') paymentOpen = false;
		}
	});

	/** superforms nests a file field's errors differently; this reads the first message of any. */
	function firstError(errors: unknown): string | undefined {
		if (Array.isArray(errors)) return errors[0];
		return (errors as { _errors?: string[] } | undefined)?._errors?.[0];
	}

	// Refresh the service list whenever the chosen vendor changes.
	$effect(() => {
		const vendorId = $form.vendorId;
		if (!vendorId) {
			serviceItems = [];
			return;
		}

		let cancelled = false;
		loadingServices = true;

		fetch(`/wedding/bookings/services?vendorId=${vendorId}`)
			.then((r) => (r.ok ? r.json() : []))
			.then((items) => {
				if (cancelled) return;
				serviceItems = items;

				if (
					pendingServiceId &&
					items.some((i: { value: string }) => i.value === String(pendingServiceId))
				) {
					$form.serviceId = pendingServiceId;
				}
				pendingServiceId = null;
			})
			.catch(() => {
				if (!cancelled) serviceItems = [];
			})
			.finally(() => {
				if (!cancelled) loadingServices = false;
			});

		return () => {
			cancelled = true;
		};
	});

	const active = $derived(data.bookings.filter((b) => b.status !== 'cancelled'));
	const totalAgreed = $derived(active.reduce((s, b) => s + b.agreedPrice, 0));
	const totalPaid = $derived(active.reduce((s, b) => s + b.paid, 0));
	const totalPending = $derived(active.reduce((s, b) => s + b.pendingPaid, 0));
	const totalBalance = $derived(active.reduce((s, b) => s + b.balance, 0));
	const paidPct = $derived(totalAgreed > 0 ? Math.min(100, (totalPaid / totalAgreed) * 100) : 0);

	const confirmedCount = $derived(data.bookings.filter((b) => b.status === 'confirmed').length);
	const pendingCount = $derived(data.bookings.filter((b) => b.status === 'pending').length);
	const cancelledCount = $derived(data.bookings.filter((b) => b.status === 'cancelled').length);

	const visible = $derived(
		data.bookings.filter((b) =>
			statusTab === 'active'
				? b.status !== 'cancelled'
				: statusTab === 'cancelled'
					? b.status === 'cancelled'
					: true
		)
	);

	const etb = (n: number) => new Intl.NumberFormat('en-ET', { maximumFractionDigits: 0 }).format(n);

	function statusVariant(status: string | null) {
		if (status === 'confirmed') return 'default';
		if (status === 'cancelled') return 'destructive';
		return 'secondary';
	}

	function eventLabel(iso: string) {
		if (!iso) return 'No date set';
		return new Date(`${iso}T00:00:00`).toLocaleDateString('en-GB', {
			day: 'numeric',
			month: 'short',
			year: 'numeric'
		});
	}

	function openBooking() {
		$form.vendorId = 0;
		$form.serviceId = undefined;
		$form.eventDate = data.weddingDate ?? '';
		$form.agreedPrice = 0;
		serviceItems = [];
		bookingOpen = true;
	}

	function openPayment(booking: (typeof data.bookings)[number]) {
		payingFor = {
			id: booking.id,
			label: booking.vendorName,
			balance: booking.balance
		};
		chapaAmount = booking.balance;
		chapaType = booking.paid > 0 ? 'balance' : 'advance';
		$transferData.bookingId = booking.id;
		$transferData.amount = booking.balance;
		$transferData.paymentType = chapaType;
		payMode = 'chapa';
		paymentOpen = true;
	}

	function confirmCancel(booking: (typeof data.bookings)[number]) {
		pendingCancel = { id: booking.id, label: booking.vendorName };
		$cancelData.id = booking.id;
	}

	import { page as pageState } from '$app/state';

	// …after openBooking is defined
	// $effect(() => {
	// 	const preselect = Number(pageState.url.searchParams.get('vendor'));
	// 	if (!preselect || bookingOpen) return;
	// 	if (!data.vendorItems.some((v) => v.value === String(preselect))) return;

	// 	openBooking();
	// 	$form.vendorId = preselect;
	// });

	import { untrack } from 'svelte';
	import { replaceState } from '$app/navigation';

	let preselectApplied = false; // plain let — not $state, so it's never a dependency

	$effect(() => {
		const preselect = Number(pageState.url.searchParams.get('vendor'));
		const preselectService = Number(pageState.url.searchParams.get('service'));
		if (!preselect || preselectApplied) return;
		if (!data.vendorItems.some((v) => v.value === String(preselect))) return;

		preselectApplied = true;

		untrack(() => {
			openBooking();
			$form.vendorId = preselect;
			if (preselectService) pendingServiceId = preselectService;
		});

		// drop the params so a refresh doesn't reopen the dialog
		const url = new URL(pageState.url);
		url.searchParams.delete('vendor');
		url.searchParams.delete('service');
		replaceState(url, pageState.state);
	});
</script>

<div class="space-y-6">
	<div class="flex flex-wrap items-start justify-between gap-4">
		<div>
			<h1 class="text-2xl font-semibold tracking-tight">Bookings</h1>
			<p class="text-sm text-muted-foreground">
				Your vendors, what you agreed to pay, and what's still outstanding.
			</p>
		</div>
		<Button onclick={openBooking} disabled={data.vendorItems.length === 0}>
			<Plus class="mr-2 size-4" /> Request a booking
		</Button>
	</div>

	<!-- Summary -->
	<Card.Root class="p-5">
		<div class="grid gap-4 sm:grid-cols-4">
			<div>
				<p class="text-xs text-muted-foreground">Agreed total</p>
				<p class="text-xl font-semibold">{etb(totalAgreed)}</p>
			</div>
			<div>
				<p class="text-xs text-muted-foreground">Paid</p>
				<p class="text-xl font-semibold">{etb(totalPaid)}</p>
			</div>
			<div>
				<p class="text-xs text-muted-foreground">Awaiting confirmation</p>
				<p class="text-xl font-semibold">{etb(totalPending)}</p>
			</div>
			<div>
				<p class="text-xs text-muted-foreground">Outstanding</p>
				<p class="text-xl font-semibold">{etb(totalBalance)}</p>
			</div>
		</div>

		{#if totalAgreed > 0}
			<div class="mt-5 space-y-2">
				<Progress value={paidPct} class="h-2" />
				<p class="text-xs text-muted-foreground">
					{etb(totalPaid)} of {etb(totalAgreed)} ETB settled ({Math.round(paidPct)}%)
				</p>
			</div>
		{/if}
	</Card.Root>

	<!-- Filters -->
	<Tabs.Root bind:value={statusTab}>
		<Tabs.List>
			<Tabs.Trigger value="active">Active ({confirmedCount + pendingCount})</Tabs.Trigger>
			<Tabs.Trigger value="cancelled">Cancelled ({cancelledCount})</Tabs.Trigger>
			<Tabs.Trigger value="all">All ({data.bookings.length})</Tabs.Trigger>
		</Tabs.List>
	</Tabs.Root>

	<!-- List -->
	{#if data.bookings.length === 0}
		<Card.Root class="p-10 text-center">
			<Store class="mx-auto size-8 text-muted-foreground" />
			<p class="mt-3 text-sm text-muted-foreground">
				{data.vendorItems.length === 0
					? 'No vendors are available to book yet.'
					: "You haven't booked any vendors yet."}
			</p>
			{#if data.vendorItems.length > 0}
				<Button class="mt-4" onclick={openBooking}>
					<Plus class="mr-2 size-4" /> Request your first booking
				</Button>
			{/if}
		</Card.Root>
	{:else if visible.length === 0}
		<Card.Root class="p-10 text-center text-sm text-muted-foreground">
			Nothing in this view.
		</Card.Root>
	{:else}
		<div class="grid gap-4">
			{#each visible as booking (booking.id)}
				{@const pct =
					booking.agreedPrice > 0 ? Math.min(100, (booking.paid / booking.agreedPrice) * 100) : 0}
				<Card.Root class="p-5 {booking.status === 'cancelled' ? 'opacity-60' : ''}">
					<div class="flex flex-wrap items-start justify-between gap-4">
						<div class="min-w-0">
							<div class="flex items-center gap-2">
								<h3 class="truncate font-medium">{booking.vendorName}</h3>
								{#if booking.vendorVerified}
									<BadgeCheck class="size-4 shrink-0 text-primary" />
								{/if}
								<Badge variant={statusVariant(booking.status)} class="capitalize">
									{booking.status}
								</Badge>
							</div>

							<p class="mt-1 text-sm text-muted-foreground">
								{booking.serviceTitle ?? 'General booking'}
							</p>

							<div class="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
								<span class="flex items-center gap-1.5">
									<CalendarClock class="size-3.5" />
									{eventLabel(booking.eventDate)}
								</span>
								{#if booking.vendorPhone}
									<a
										href="tel:{booking.vendorPhone}"
										class="flex items-center gap-1.5 hover:text-foreground"
									>
										<Phone class="size-3.5" />{booking.vendorPhone}
									</a>
								{/if}
							</div>
						</div>

						<div class="text-right">
							<p class="text-xs text-muted-foreground">Agreed</p>
							<p class="text-lg font-semibold tabular-nums">{etb(booking.agreedPrice)}</p>
							{#if booking.balance > 0 && booking.status !== 'cancelled'}
								<p class="text-xs text-muted-foreground">
									{etb(booking.balance)} outstanding
								</p>
							{:else if booking.agreedPrice > 0 && booking.balance === 0}
								<p class="text-xs font-medium text-emerald-600">Settled</p>
							{/if}
						</div>
					</div>

					{#if booking.agreedPrice > 0 && booking.status !== 'cancelled'}
						<div class="mt-4 space-y-1.5">
							<Progress value={pct} class="h-1.5" />
							<p class="text-xs text-muted-foreground">
								{etb(booking.paid)} paid
								{#if booking.pendingPaid > 0}
									· <span class="text-foreground"
										>{etb(booking.pendingPaid)} awaiting confirmation</span
									>
								{/if}
							</p>
						</div>
					{/if}

					{#if booking.status !== 'cancelled'}
						<div class="mt-4 flex flex-wrap justify-end gap-2 border-t pt-4">
							<Button
								variant="ghost"
								size="sm"
								class="text-destructive"
								onclick={() => confirmCancel(booking)}
							>
								<Ban class="mr-2 size-4" /> Cancel
							</Button>
							{#if booking.status === 'confirmed' && booking.balance > 0}
								<Button size="sm" onclick={() => openPayment(booking)}>
									<CircleDollarSign class="mr-2 size-4" />
									{m.pay_button()}
								</Button>
							{:else if booking.status === 'pending' && booking.agreedPrice > 0}
								<p class="self-center text-xs text-muted-foreground">{m.pay_wait_vendor()}</p>
							{/if}
						</div>
					{/if}

					{#if booking.payments.length}
						<details class="mt-3 text-sm">
							<summary class="cursor-pointer text-xs font-medium text-muted-foreground">
								{m.pay_history()} ({booking.payments.length})
							</summary>
							<ul class="mt-2 divide-y rounded-md border">
								{#each booking.payments as p (p.id)}
									<li class="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
										<span class="tabular-nums">{etb(p.amount)} ETB</span>
										<span class="text-xs text-muted-foreground">
											{p.method === 'chapa' ? 'Chapa' : m.pay_method_transfer()} ·
											{new Date(p.createdAt).toLocaleDateString()}
										</span>
										<Badge
											variant={p.status === 'confirmed'
												? 'default'
												: p.status === 'failed'
													? 'destructive'
													: 'secondary'}
										>
											{PAYMENT_STATUS[p.status] ?? p.status}
										</Badge>
										{#if p.receiptFile}
											<a
												class="text-xs underline"
												href="/receipts/{p.receiptFile}"
												target="_blank"
												rel="noopener">{m.pay_view_receipt()}</a
											>
										{/if}
										{#if p.rejection}
											<p class="w-full text-xs text-destructive">
												{m.pay_rejected_reason({ reason: p.rejection })}
											</p>
										{/if}
									</li>
								{/each}
							</ul>
						</details>
					{/if}
				</Card.Root>
			{/each}
		</div>
	{/if}
</div>

<!-- Request booking -->
<Dialog.Root bind:open={bookingOpen}>
	<Dialog.Content class="sm:max-w-lg">
		<Dialog.Header>
			<Dialog.Title>Request a booking</Dialog.Title>
			<Dialog.Description>
				The vendor confirms from their side. Agreed price can be left at zero until you settle on
				one.
			</Dialog.Description>
		</Dialog.Header>

		<form method="POST" action="?/request" use:enhance class="space-y-1">
			<InputComp
				label="vendor"
				{form}
				{errors}
				name="vendorId"
				type="combo"
				items={data.vendorItems}
				placeholder="Search vendors"
			/>

			{#if $form.vendorId}
				{#if loadingServices}
					<p class="px-1 py-2 text-sm text-muted-foreground">Loading services…</p>
				{:else if serviceItems.length > 0}
					<InputComp
						label="service (optional)"
						{form}
						{errors}
						name="serviceId"
						type="select"
						items={serviceItems}
						placeholder="Choose a service"
					/>
				{:else}
					<p class="px-1 py-2 text-sm text-muted-foreground">
						This vendor hasn't listed individual services — that's fine, carry on.
					</p>
				{/if}
			{/if}

			<InputComp
				label="event date"
				{form}
				{errors}
				name="eventDate"
				type="date"
				oldDays={false}
				futureDays={true}
				year={true}
			/>

			<InputComp
				label="agreed price (ETB)"
				{form}
				{errors}
				name="agreedPrice"
				type="number"
				min="0"
				placeholder="0"
			/>

			<Dialog.Footer class="pt-4">
				<Button type="button" variant="outline" onclick={() => (bookingOpen = false)}>Cancel</Button
				>
				<Button type="submit" disabled={$submitting}>
					{#if $submitting}<Loader2 class="mr-2 size-4 animate-spin" />{/if}
					Send request
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>

<!-- Pay: Chapa or bank transfer -->
<Dialog.Root bind:open={paymentOpen}>
	<Dialog.Content class="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
		<Dialog.Header>
			<Dialog.Title>{m.pay_title()}</Dialog.Title>
			<Dialog.Description>
				{#if payingFor}
					{payingFor.label} · {m.pay_due({ amount: `${etb(payingFor.balance)} ETB` })}
				{/if}
			</Dialog.Description>
		</Dialog.Header>

		<Tabs.Root bind:value={payMode}>
			<Tabs.List class="grid w-full grid-cols-2">
				<Tabs.Trigger value="chapa">{m.pay_method_chapa()}</Tabs.Trigger>
				<Tabs.Trigger value="transfer">{m.pay_method_transfer()}</Tabs.Trigger>
			</Tabs.List>

			<Tabs.Content value="chapa" class="pt-3">
				<p class="mb-4 text-sm text-muted-foreground">{m.pay_method_chapa_hint()}</p>
				<!-- A plain post: the server answers with a redirect to Chapa, no JavaScript needed. -->
				<form method="POST" action="?/payChapa" class="space-y-4">
					<input type="hidden" name="bookingId" value={payingFor?.id ?? ''} />
					<label class="block space-y-1.5 text-sm font-medium">
						<span>{m.pay_amount()}</span>
						<input
							name="amount"
							type="number"
							min="1"
							step="0.01"
							max={payingFor?.balance}
							required
							bind:value={chapaAmount}
							class="h-10 w-full rounded-md border bg-background px-3"
						/>
					</label>
					<label class="block space-y-1.5 text-sm font-medium">
						<span>{m.pay_type()}</span>
						<select
							name="paymentType"
							bind:value={chapaType}
							class="h-10 w-full rounded-md border bg-background px-3"
						>
							{#each TYPE_ITEMS as t (t.value)}
								<option value={t.value}>{t.name}</option>
							{/each}
						</select>
					</label>
					<Button type="submit" class="w-full">
						<Wallet class="mr-2 size-4" />
						{m.pay_chapa_submit()}
					</Button>
				</form>
			</Tabs.Content>

			<Tabs.Content value="transfer" class="pt-3">
				{#if data.accounts.length === 0}
					<p class="text-sm text-muted-foreground">{m.pay_no_accounts()}</p>
				{:else}
					<form
						method="POST"
						action="?/payTransfer"
						enctype="multipart/form-data"
						use:transferEnhance
						class="space-y-4"
					>
						<HiddenField name="bookingId" value={$transferData.bookingId} />
						<div class="grid gap-3 sm:grid-cols-2">
							<InputComp
								label={m.pay_amount()}
								form={transferData}
								errors={transferErrors}
								name="amount"
								type="number"
								min="1"
							/>
							<InputComp
								label={m.pay_type()}
								form={transferData}
								errors={transferErrors}
								name="paymentType"
								type="select"
								items={TYPE_ITEMS}
							/>
						</div>
						<TransferFields
							form={transferData}
							accounts={data.accounts}
							total={Number($transferData.amount) || 0}
							accountError={firstError($transferErrors.bankAccountId)}
							receiptError={firstError($transferErrors.receipt)}
						/>
						<InputComp
							label={m.pay_reference()}
							form={transferData}
							errors={transferErrors}
							name="reference"
						/>
						<Button type="submit" class="w-full" disabled={$sendingReceipt}>
							{#if $sendingReceipt}
								<Loader2 class="mr-2 size-4 animate-spin" />{m.pay_uploading()}
							{:else}
								{m.pay_transfer_submit()}
							{/if}
						</Button>
					</form>
				{/if}
			</Tabs.Content>
		</Tabs.Root>
	</Dialog.Content>
</Dialog.Root>

<!-- Cancel booking -->
<AlertDialog.Root open={!!pendingCancel} onOpenChange={(v) => !v && (pendingCancel = null)}>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title>Cancel this booking?</AlertDialog.Title>
			<AlertDialog.Description>
				Your booking with {pendingCancel?.label} will be marked cancelled and the vendor will be notified.
				Any payments already logged stay on record.
			</AlertDialog.Description>
		</AlertDialog.Header>
		<form method="POST" action="?/cancel" use:cancelEnhance>
			<HiddenField name="id" value={$cancelData.id} />
			<AlertDialog.Footer>
				<AlertDialog.Cancel type="button">Keep booking</AlertDialog.Cancel>
				<Button type="submit" variant="destructive" disabled={$cancelling}>
					{#if $cancelling}<Loader2 class="mr-2 size-4 animate-spin" />{/if}
					Cancel booking
				</Button>
			</AlertDialog.Footer>
		</form>
	</AlertDialog.Content>
</AlertDialog.Root>
