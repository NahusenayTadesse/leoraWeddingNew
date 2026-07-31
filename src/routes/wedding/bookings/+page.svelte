<script lang="ts">
	import { superForm } from 'sveltekit-superforms';
	import { zod4Client } from 'sveltekit-superforms/adapters';
	import { bookingSchema, paymentSchema } from '$lib/schemas/booking';
	import InputComp from '$lib/formComponents/InputComp.svelte';
	import * as Card from '$lib/components/ui/card';
	import * as Dialog from '$lib/components/ui/dialog';
	import * as AlertDialog from '$lib/components/ui/alert-dialog';
	import * as Tabs from '$lib/components/ui/tabs';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Progress } from '$lib/components/ui/progress';
	import { toast } from 'svelte-sonner';
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

	const METHOD_ITEMS = [
		{ value: 'cash', name: 'Cash' },
		{ value: 'bank_transfer', name: 'Bank transfer' },
		{ value: 'mobile_money', name: 'Mobile money (telebirr, etc.)' },
		{ value: 'card', name: 'Card' }
	];

	const TYPE_ITEMS = [
		{ value: 'advance', name: 'Advance / deposit' },
		{ value: 'balance', name: 'Balance' },
		{ value: 'full', name: 'Full payment' }
	];

	let bookingOpen = $state(false);
	let paymentOpen = $state(false);
	let pendingCancel = $state<{ id: number; label: string } | null>(null);
	let payingFor = $state<{ id: number; label: string; balance: number } | null>(null);
	let serviceItems = $state<{ value: string; name: string }[]>([]);
	let loadingServices = $state(false);
	let statusTab = $state('active');

	const sf = superForm(data.form, {
		id: 'booking',
		validators: zod4Client(bookingSchema),
		resetForm: true,
		onUpdated: ({ form }) => {
			if (form.valid && form.message) {
				toast.success(form.message);
				bookingOpen = false;
			}
		}
	});
	const { form, errors, enhance, submitting } = sf;

	const cf = superForm(data.cancelForm, {
		id: 'cancel',
		onUpdated: ({ form }) => {
			if (form.message) toast.success(form.message);
			pendingCancel = null;
		}
	});
	const { form: cancelData, enhance: cancelEnhance, submitting: cancelling } = cf;

	const pf = superForm(data.paymentForm, {
		id: 'payment',
		validators: zod4Client(paymentSchema),
		resetForm: true,
		onUpdated: ({ form }) => {
			if (form.valid && form.message) {
				toast.success(form.message);
				paymentOpen = false;
			}
		}
	});
	const { form: payData, errors: payErrors, enhance: payEnhance, submitting: paying } = pf;

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

	const etb = (n: number) =>
		new Intl.NumberFormat('en-ET', { maximumFractionDigits: 0 }).format(n);

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
		$payData.bookingId = booking.id;
		$payData.amount = booking.balance || 0;
		$payData.paymentMethod = 'mobile_money';
		$payData.paymentType = booking.paid > 0 ? 'balance' : 'advance';
		$payData.transactionReference = '';
		paymentOpen = true;
	}

	function confirmCancel(booking: (typeof data.bookings)[number]) {
		pendingCancel = { id: booking.id, label: booking.vendorName };
		$cancelData.id = booking.id;
	}

    import { page as pageState } from '$app/state';

// …after openBooking is defined
$effect(() => {
	const preselect = Number(pageState.url.searchParams.get('vendor'));
	if (!preselect || bookingOpen) return;
	if (!data.vendorItems.some((v) => v.value === String(preselect))) return;

	openBooking();
	$form.vendorId = preselect;
});
</script>

<div class="space-y-6">
	<div class="flex flex-wrap items-start justify-between gap-4">
		<div>
			<h1 class="text-2xl font-semibold tracking-tight">Bookings</h1>
			<p class="text-muted-foreground text-sm">
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
				<p class="text-muted-foreground text-xs">Agreed total</p>
				<p class="text-xl font-semibold">{etb(totalAgreed)}</p>
			</div>
			<div>
				<p class="text-muted-foreground text-xs">Paid</p>
				<p class="text-xl font-semibold">{etb(totalPaid)}</p>
			</div>
			<div>
				<p class="text-muted-foreground text-xs">Awaiting confirmation</p>
				<p class="text-xl font-semibold">{etb(totalPending)}</p>
			</div>
			<div>
				<p class="text-muted-foreground text-xs">Outstanding</p>
				<p class="text-xl font-semibold">{etb(totalBalance)}</p>
			</div>
		</div>

		{#if totalAgreed > 0}
			<div class="mt-5 space-y-2">
				<Progress value={paidPct} class="h-2" />
				<p class="text-muted-foreground text-xs">
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
			<Store class="text-muted-foreground mx-auto size-8" />
			<p class="text-muted-foreground mt-3 text-sm">
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
		<Card.Root class="text-muted-foreground p-10 text-center text-sm">
			Nothing in this view.
		</Card.Root>
	{:else}
		<div class="grid gap-4">
			{#each visible as booking (booking.id)}
				{@const pct =
					booking.agreedPrice > 0
						? Math.min(100, (booking.paid / booking.agreedPrice) * 100)
						: 0}
				<Card.Root class="p-5 {booking.status === 'cancelled' ? 'opacity-60': ''}">
					<div class="flex flex-wrap items-start justify-between gap-4">
						<div class="min-w-0">
							<div class="flex items-center gap-2">
								<h3 class="truncate font-medium">{booking.vendorName}</h3>
								{#if booking.vendorVerified}
									<BadgeCheck class="text-primary size-4 shrink-0" />
								{/if}
								<Badge variant={statusVariant(booking.status)} class="capitalize">
									{booking.status}
								</Badge>
							</div>

							<p class="text-muted-foreground mt-1 text-sm">
								{booking.serviceTitle ?? 'General booking'}
							</p>

							<div class="text-muted-foreground mt-3 flex flex-wrap gap-4 text-xs">
								<span class="flex items-center gap-1.5">
									<CalendarClock class="size-3.5" />
									{eventLabel(booking.eventDate)}
								</span>
								{#if booking.vendorPhone}
									<a
										href="tel:{booking.vendorPhone}"
										class="hover:text-foreground flex items-center gap-1.5"
									>
										<Phone class="size-3.5" />{booking.vendorPhone}
									</a>
								{/if}
							</div>
						</div>

						<div class="text-right">
							<p class="text-muted-foreground text-xs">Agreed</p>
							<p class="text-lg font-semibold tabular-nums">{etb(booking.agreedPrice)}</p>
							{#if booking.balance > 0 && booking.status !== 'cancelled'}
								<p class="text-muted-foreground text-xs">
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
							<p class="text-muted-foreground text-xs">
								{etb(booking.paid)} paid
								{#if booking.pendingPaid > 0}
									· <span class="text-foreground">{etb(booking.pendingPaid)} awaiting confirmation</span>
								{/if}
							</p>
						</div>
					{/if}

					{#if booking.status !== 'cancelled'}
						<div class="mt-4 flex flex-wrap justify-end gap-2 border-t pt-4">
							<Button variant="ghost" size="sm" class="text-destructive" onclick={() => confirmCancel(booking)}>
								<Ban class="mr-2 size-4" /> Cancel
							</Button>
							<Button variant="outline" size="sm" onclick={() => openPayment(booking)}>
								<CircleDollarSign class="mr-2 size-4" /> Log a payment
							</Button>
						</div>
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
				The vendor confirms from their side. Agreed price can be left at zero until you settle on one.
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
					<p class="text-muted-foreground px-1 py-2 text-sm">Loading services…</p>
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
					<p class="text-muted-foreground px-1 py-2 text-sm">
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
				<Button type="button" variant="outline" onclick={() => (bookingOpen = false)}>Cancel</Button>
				<Button type="submit" disabled={$submitting}>
					{#if $submitting}<Loader2 class="mr-2 size-4 animate-spin" />{/if}
					Send request
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>

<!-- Log payment -->
<Dialog.Root bind:open={paymentOpen}>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>Log a payment</Dialog.Title>
			<Dialog.Description>
				{#if payingFor}
					To {payingFor.label}. This records the payment as pending until the vendor confirms it.
				{/if}
			</Dialog.Description>
		</Dialog.Header>

		<form method="POST" action="?/pay" use:payEnhance class="space-y-1">
			<input type="hidden" name="bookingId" bind:value={$payData.bookingId} />

			<InputComp
				label="amount (ETB)"
				form={payData}
				errors={payErrors}
				name="amount"
				type="number"
				min="0"
				placeholder="10000"
			/>

			<InputComp
				label="method"
				form={payData}
				errors={payErrors}
				name="paymentMethod"
				type="select"
				items={METHOD_ITEMS}
				placeholder="How did you pay?"
			/>

			<InputComp
				label="type"
				form={payData}
				errors={payErrors}
				name="paymentType"
				type="select"
				items={TYPE_ITEMS}
				placeholder="What kind of payment?"
			/>

			<InputComp
				label="reference (optional)"
				form={payData}
				errors={payErrors}
				name="transactionReference"
				type="text"
				placeholder="Transaction or receipt number"
			/>

			<Dialog.Footer class="pt-4">
				<Button type="button" variant="outline" onclick={() => (paymentOpen = false)}>Cancel</Button>
				<Button type="submit" disabled={$paying}>
					{#if $paying}<Loader2 class="mr-2 size-4 animate-spin" />{/if}
					<Wallet class="mr-2 size-4" /> Log payment
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>

<!-- Cancel booking -->
<AlertDialog.Root open={!!pendingCancel} onOpenChange={(v) => !v && (pendingCancel = null)}>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title>Cancel this booking?</AlertDialog.Title>
			<AlertDialog.Description>
				Your booking with {pendingCancel?.label} will be marked cancelled and the vendor will be
				notified. Any payments already logged stay on record.
			</AlertDialog.Description>
		</AlertDialog.Header>
		<form method="POST" action="?/cancel" use:cancelEnhance>
			<input type="hidden" name="id" bind:value={$cancelData.id} />
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