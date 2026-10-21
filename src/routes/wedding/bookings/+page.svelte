<script lang="ts">
	import { useDateFormat } from '@nahu/admin-kit/dateFormat.svelte';
	import { dateLocale } from '$lib/dateLocale';
	import HiddenField from '@nahu/admin-kit/formComponents/HiddenField.svelte';
	import ActionForm from '@nahu/admin-kit/formComponents/ActionForm.svelte';
	import ContractPanel from '$lib/components/ContractPanel.svelte';
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
		CircleCheck,
		CircleDollarSign
	} from '@lucide/svelte';

	import { refundPercentFor, type CancellationPolicy } from '$lib/policy';

	const formatDay = useDateFormat(dateLocale());
	let { data } = $props();

	const TYPE_ITEMS = [
		{ value: 'advance', name: m.pay_type_advance() },
		{ value: 'balance', name: m.pay_type_balance() },
		{ value: 'full', name: m.pay_type_full() }
	];

	const BOOKING_STATUS: Record<string, string> = {
		pending: m.bk_status_pending(),
		confirmed: m.bk_status_confirmed(),
		completed: m.bk_status_completed(),
		cancelled: m.bk_status_cancelled()
	};

	const POLICY_NAME: Record<CancellationPolicy, string> = {
		flexible: m.policy_flexible(),
		moderate: m.policy_moderate(),
		strict: m.policy_strict()
	};

	const PAYMENT_STATUS: Record<string, string> = {
		pending: m.pay_status_pending(),
		confirmed: m.pay_status_confirmed(),
		failed: m.pay_status_failed(),
		refunded: m.pay_status_refunded()
	};

	let bookingOpen = $state(false);
	let paymentOpen = $state(false);
	let pendingCancel = $state<{
		id: number;
		label: string;
		paid: number;
		percent: number;
		policy: CancellationPolicy;
	} | null>(null);
	let payingFor = $state<{ id: number; label: string; balance: number } | null>(null);
	let payMode = $state<'chapa' | 'transfer'>('chapa');
	let refundFor = $state<{ paymentId: number; amount: number } | null>(null);
	let disputeFor = $state<{ bookingId: number; label: string } | null>(null);
	let deliveredFor = $state<{ bookingId: number; label: string } | null>(null);

	/** Local calendar day, to compare with `YYYY-MM-DD` event dates. */
	const today = new Date().toLocaleDateString('en-CA');
	let contractFor = $state<number | null>(null);
	const contractBooking = $derived(data.bookings.find((b) => b.id === contractFor) ?? null);
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
		if (status === 'confirmed' || status === 'completed') return 'default';
		if (status === 'cancelled') return 'destructive';
		return 'secondary';
	}

	function eventLabel(iso: string) {
		if (!iso) return m.wov_no_date_set();
		return formatDay(iso);
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
		// Suggest the deposit first; the couple can still pay more, up to the balance.
		const suggested = booking.depositDue > 0 ? booking.depositDue : booking.balance;
		chapaAmount = suggested;
		chapaType = booking.paid > 0 ? 'balance' : 'advance';
		$transferData.bookingId = booking.id;
		$transferData.amount = suggested;
		$transferData.paymentType = chapaType;
		payMode = 'chapa';
		paymentOpen = true;
	}

	function confirmCancel(booking: (typeof data.bookings)[number]) {
		pendingCancel = {
			id: booking.id,
			label: booking.vendorName,
			paid: booking.paid,
			policy: booking.policy,
			percent: refundPercentFor(booking.policy, booking.eventDate, today)
		};
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
			<h1 class="text-2xl font-semibold tracking-tight">{m.nav_bookings()}</h1>
			<p class="text-sm text-muted-foreground">
				{m.bk_sub()}
			</p>
		</div>
		<Button onclick={openBooking} disabled={data.vendorItems.length === 0}>
			<Plus class="mr-2 size-4" />
			{m.bk_request()}
		</Button>
	</div>

	<!-- Summary -->
	<Card.Root class="p-5">
		<div class="grid gap-4 sm:grid-cols-4">
			<div>
				<p class="text-xs text-muted-foreground">{m.bk_agreed_total()}</p>
				<p class="text-xl font-semibold">{etb(totalAgreed)}</p>
			</div>
			<div>
				<p class="text-xs text-muted-foreground">{m.bk_paid()}</p>
				<p class="text-xl font-semibold">{etb(totalPaid)}</p>
			</div>
			<div>
				<p class="text-xs text-muted-foreground">{m.bk_awaiting()}</p>
				<p class="text-xl font-semibold">{etb(totalPending)}</p>
			</div>
			<div>
				<p class="text-xs text-muted-foreground">{m.wov_outstanding()}</p>
				<p class="text-xl font-semibold">{etb(totalBalance)}</p>
			</div>
		</div>

		{#if totalAgreed > 0}
			<div class="mt-5 space-y-2">
				<Progress value={paidPct} class="h-2" />
				<p class="text-xs text-muted-foreground">
					{m.wov_settled({ paid: etb(totalPaid), agreed: etb(totalAgreed) })} ({Math.round(
						paidPct
					)}%)
				</p>
			</div>
		{/if}
	</Card.Root>

	<!-- Filters -->
	<Tabs.Root bind:value={statusTab}>
		<Tabs.List>
			<Tabs.Trigger value="active"
				>{m.bk_tab_active({ count: confirmedCount + pendingCount })}</Tabs.Trigger
			>
			<Tabs.Trigger value="cancelled">{m.bk_tab_cancelled({ count: cancelledCount })}</Tabs.Trigger>
			<Tabs.Trigger value="all">{m.tsk_tab_all({ count: data.bookings.length })}</Tabs.Trigger>
		</Tabs.List>
	</Tabs.Root>

	<!-- List -->
	{#if data.bookings.length === 0}
		<Card.Root class="p-10 text-center">
			<Store class="mx-auto size-8 text-muted-foreground" />
			<p class="mt-3 text-sm text-muted-foreground">
				{data.vendorItems.length === 0 ? m.bk_none_available() : m.bk_none_booked()}
			</p>
			{#if data.vendorItems.length > 0}
				<Button class="mt-4" onclick={openBooking}>
					<Plus class="mr-2 size-4" />
					{m.bk_first()}
				</Button>
			{/if}
		</Card.Root>
	{:else if visible.length === 0}
		<Card.Root class="p-10 text-center text-sm text-muted-foreground">
			{m.bk_nothing_view()}
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
								<Badge variant={statusVariant(booking.status)}>
									{BOOKING_STATUS[booking.status ?? ''] ?? booking.status}
								</Badge>
							</div>

							<p class="mt-1 text-sm text-muted-foreground">
								{booking.serviceTitle ?? m.bk_general()}
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
							<p class="text-xs text-muted-foreground">{m.bk_agreed()}</p>
							<p class="text-lg font-semibold tabular-nums">{etb(booking.agreedPrice)}</p>
							{#if booking.balance > 0 && booking.status !== 'cancelled'}
								<p class="text-xs text-muted-foreground">
									{m.bk_outstanding({ amount: etb(booking.balance) })}
								</p>
								{#if booking.status === 'confirmed' && booking.depositDue > 0}
									<p class="text-xs font-medium text-foreground">
										{m.bk_deposit_due({ amount: etb(booking.depositDue) })}
									</p>
								{:else if booking.balanceDueBy}
									<p class="text-xs text-muted-foreground">
										{m.bk_balance_due_by({ date: eventLabel(booking.balanceDueBy) })}
									</p>
								{/if}
							{:else if booking.agreedPrice > 0 && booking.balance === 0}
								<p class="text-xs font-medium text-emerald-600">{m.bk_settled()}</p>
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
							{#if booking.paid > 0 && booking.status === 'confirmed'}
								<p class="text-xs text-muted-foreground">{m.bk_held_note()}</p>
							{/if}
						</div>
					{/if}

					{#if booking.status !== 'cancelled'}
						<div class="mt-4 flex flex-wrap justify-end gap-2 border-t pt-4">
							{#if booking.contract?.hasDocument}
								<Button variant="outline" size="sm" onclick={() => (contractFor = booking.id)}>
									{m.contract_title()}
									{#if !booking.contract.signedByCouple}
										<span class="ml-1.5 size-2 rounded-full bg-(--leora-gold)"></span>
									{/if}
								</Button>
							{/if}
							<Button
								variant="ghost"
								size="sm"
								onclick={() => (disputeFor = { bookingId: booking.id, label: booking.vendorName })}
							>
								{m.bk_report()}
							</Button>
							{#if booking.status !== 'completed'}
								<Button
									variant="ghost"
									size="sm"
									class="text-destructive"
									onclick={() => confirmCancel(booking)}
								>
									<Ban class="mr-2 size-4" />
									{m.bk_cancel()}
								</Button>
							{/if}
							{#if booking.status === 'confirmed' && booking.eventDate && booking.eventDate <= today}
								<Button
									variant="outline"
									size="sm"
									onclick={() =>
										(deliveredFor = { bookingId: booking.id, label: booking.vendorName })}
								>
									<CircleCheck class="mr-2 size-4" />
									{m.bk_mark_delivered()}
								</Button>
							{/if}
							{#if (booking.status === 'confirmed' || booking.status === 'completed') && booking.balance > 0}
								<Button size="sm" onclick={() => openPayment(booking)}>
									<CircleDollarSign class="mr-2 size-4" />
									{m.pay_button()}
								</Button>
							{:else if booking.status === 'pending' && booking.agreedPrice > 0}
								<p class="self-center text-xs text-muted-foreground">{m.pay_wait_vendor()}</p>
							{/if}
						</div>
					{/if}

					{#each booking.quotes as quote (quote.id)}
						<div
							class="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-(--leora-gold) bg-(--leora-gold-soft) p-3 text-sm"
						>
							<div>
								<p class="font-medium">{m.bk_quote({ amount: etb(quote.proposedPrice) })}</p>
								{#if quote.notes}<p class="text-muted-foreground">{quote.notes}</p>{/if}
							</div>
							<div class="flex gap-2">
								<ActionForm action="?/respondQuote" fields={{ quoteId: quote.id, accept: 'no' }}>
									{#snippet children({ busy })}
										<Button type="submit" variant="ghost" size="sm" disabled={!!busy}
											>{m.bk_decline()}</Button
										>
									{/snippet}
								</ActionForm>
								<ActionForm action="?/respondQuote" fields={{ quoteId: quote.id, accept: 'yes' }}>
									{#snippet children({ busy })}
										<Button type="submit" size="sm" disabled={!!busy}>{m.bk_accept()}</Button>
									{/snippet}
								</ActionForm>
							</div>
						</div>
					{/each}

					{#if booking.payments.length}
						<details class="mt-3 text-sm">
							<summary class="cursor-pointer text-xs font-medium text-muted-foreground">
								{m.pay_history()} ({booking.payments.length})
							</summary>
							<ul class="mt-2 divide-y rounded-md border">
								{#each booking.payments as p (p.id)}
									<li class="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
										<span class="tabular-nums">{m.bk_etb({ amount: etb(p.amount) })}</span>
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
										{#if p.status === 'confirmed'}
											<button
												type="button"
												class="text-xs underline"
												onclick={() => (refundFor = { paymentId: p.id, amount: p.amount })}
											>
												{m.bk_request_refund()}
											</button>
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
			<Dialog.Title>{m.bk_request()}</Dialog.Title>
			<Dialog.Description>
				{m.bk_request_desc()}
			</Dialog.Description>
		</Dialog.Header>

		<form method="POST" action="?/request" use:enhance class="space-y-1">
			<InputComp
				label={m.bk_vendor()}
				{form}
				{errors}
				name="vendorId"
				type="combo"
				items={data.vendorItems}
				placeholder={m.bk_search_vendors()}
			/>

			{#if $form.vendorId}
				{#if loadingServices}
					<p class="px-1 py-2 text-sm text-muted-foreground">{m.bk_loading_services()}</p>
				{:else if serviceItems.length > 0}
					<InputComp
						label={m.bk_service_opt()}
						{form}
						{errors}
						name="serviceId"
						type="select"
						items={serviceItems}
						placeholder={m.bk_choose_service()}
					/>
				{:else}
					<p class="px-1 py-2 text-sm text-muted-foreground">
						{m.bk_no_services()}
					</p>
				{/if}
			{/if}

			<InputComp
				label={m.bk_event_date()}
				{form}
				{errors}
				name="eventDate"
				type="date"
				oldDays={false}
				futureDays={true}
				year={true}
			/>

			<InputComp
				label={m.bk_agreed_price()}
				{form}
				{errors}
				name="agreedPrice"
				type="number"
				min="0"
				placeholder="0"
			/>

			<Dialog.Footer class="pt-4">
				<Button type="button" variant="outline" onclick={() => (bookingOpen = false)}
					>{m.bk_cancel()}</Button
				>
				<Button type="submit" disabled={$submitting}>
					{#if $submitting}<Loader2 class="mr-2 size-4 animate-spin" />{/if}
					{m.bk_send_request()}
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
			<AlertDialog.Title>{m.bk_cancel_title()}</AlertDialog.Title>
			<AlertDialog.Description>
				{m.bk_cancel_desc({ name: pendingCancel?.label ?? '' })}
				{#if pendingCancel && pendingCancel.paid > 0}
					{m.bk_cancel_refund({
						policy: POLICY_NAME[pendingCancel.policy],
						percent: pendingCancel.percent,
						amount: etb(Math.round((pendingCancel.paid * pendingCancel.percent) / 100))
					})}
				{/if}
			</AlertDialog.Description>
		</AlertDialog.Header>
		<form method="POST" action="?/cancel" use:cancelEnhance>
			<HiddenField name="id" value={$cancelData.id} />
			<AlertDialog.Footer>
				<AlertDialog.Cancel type="button">{m.bk_keep()}</AlertDialog.Cancel>
				<Button type="submit" variant="destructive" disabled={$cancelling}>
					{#if $cancelling}<Loader2 class="mr-2 size-4 animate-spin" />{/if}
					{m.bk_cancel_booking()}
				</Button>
			</AlertDialog.Footer>
		</form>
	</AlertDialog.Content>
</AlertDialog.Root>

<!-- Refund request -->
<Dialog.Root open={!!refundFor} onOpenChange={(open) => !open && (refundFor = null)}>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>{m.bk_refund_title()}</Dialog.Title>
			<Dialog.Description>
				{m.bk_refund_desc()}
			</Dialog.Description>
		</Dialog.Header>
		{#if refundFor}
			<ActionForm
				action="?/requestRefund"
				fields={{ paymentId: refundFor.paymentId }}
				onDone={() => (refundFor = null)}
				class="space-y-4"
			>
				{#snippet children({ busy })}
					<label class="block space-y-1.5 text-sm font-medium">
						<span>{m.pay_amount()}</span>
						<input
							name="amount"
							type="number"
							min="1"
							step="0.01"
							max={refundFor?.amount}
							value={refundFor?.amount}
							required
							class="h-10 w-full rounded-md border bg-background px-3"
						/>
					</label>
					<label class="block space-y-1.5 text-sm font-medium">
						<span>{m.bk_why()}</span>
						<textarea
							name="reason"
							required
							minlength="10"
							maxlength="1000"
							rows="4"
							class="w-full rounded-md border bg-background p-2"
						></textarea>
					</label>
					<Dialog.Footer>
						<Button type="button" variant="outline" onclick={() => (refundFor = null)}
							>{m.bk_cancel()}</Button
						>
						<Button type="submit" disabled={!!busy}>{m.bk_send_request()}</Button>
					</Dialog.Footer>
				{/snippet}
			</ActionForm>
		{/if}
	</Dialog.Content>
</Dialog.Root>

<!-- Dispute -->
<Dialog.Root open={!!disputeFor} onOpenChange={(open) => !open && (disputeFor = null)}>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>{m.bk_report()}</Dialog.Title>
			<Dialog.Description>
				{#if disputeFor}{m.bk_dispute_with({ name: disputeFor.label })}{/if}
				{m.bk_dispute_desc()}
			</Dialog.Description>
		</Dialog.Header>
		{#if disputeFor}
			<ActionForm
				action="?/openDispute"
				fields={{ bookingId: disputeFor.bookingId }}
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
						aria-label={m.bk_what_happened()}
						class="w-full rounded-md border bg-background p-2 text-sm"
					></textarea>
					<Dialog.Footer>
						<Button type="button" variant="outline" onclick={() => (disputeFor = null)}
							>{m.bk_cancel()}</Button
						>
						<Button type="submit" disabled={!!busy}>{m.bk_send()}</Button>
					</Dialog.Footer>
				{/snippet}
			</ActionForm>
		{/if}
	</Dialog.Content>
</Dialog.Root>

<!-- Delivered -->
<Dialog.Root open={!!deliveredFor} onOpenChange={(open) => !open && (deliveredFor = null)}>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>
				{#if deliveredFor}{m.bk_delivered_title({ vendor: deliveredFor.label })}{/if}
			</Dialog.Title>
			<Dialog.Description>{m.bk_delivered_body()}</Dialog.Description>
		</Dialog.Header>
		{#if deliveredFor}
			<ActionForm
				action="?/markDelivered"
				fields={{ bookingId: deliveredFor.bookingId }}
				onDone={() => (deliveredFor = null)}
			>
				{#snippet children({ busy })}
					<Dialog.Footer>
						<Button type="button" variant="outline" onclick={() => (deliveredFor = null)}
							>{m.bk_cancel()}</Button
						>
						<Button type="submit" disabled={!!busy}>{m.bk_mark_delivered()}</Button>
					</Dialog.Footer>
				{/snippet}
			</ActionForm>
		{/if}
	</Dialog.Content>
</Dialog.Root>

<!-- Contract -->
<Dialog.Root open={!!contractBooking} onOpenChange={(open) => !open && (contractFor = null)}>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>{m.contract_title()}</Dialog.Title>
			<Dialog.Description>{contractBooking?.vendorName}</Dialog.Description>
		</Dialog.Header>
		{#if contractBooking}
			<ContractPanel
				contract={contractBooking.contract}
				side="couple"
				fields={{ bookingId: contractBooking.id }}
			/>
		{/if}
	</Dialog.Content>
</Dialog.Root>
