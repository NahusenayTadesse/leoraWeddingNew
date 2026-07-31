<script lang="ts">
	import { superForm } from 'sveltekit-superforms';
	import { page } from '$app/state';
	import InputComp from '$lib/formComponents/InputComp.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Table from '$lib/components/ui/table/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import {
		Search,
		Phone,
		Mail,
		Users,
		MapPin,
		CalendarDays,
		CircleAlert,
		CircleCheck,
		TriangleAlert,
		FileText,
		Check,
		X,
		Clock,
		ChevronLeft,
		ChevronRight
	} from '@lucide/svelte';

	let { data } = $props();

	/* ---------- formatting ---------- */

	const gregorian = new Intl.DateTimeFormat('en-GB', {
		day: 'numeric',
		month: 'short',
		year: 'numeric'
	});

	function ethiopic(iso: string | null) {
		if (!iso) return '';
		try {
			return new Intl.DateTimeFormat('am-ET-u-ca-ethiopic', {
				day: 'numeric',
				month: 'long',
				year: 'numeric'
			}).format(new Date(`${iso}T00:00:00`));
		} catch {
			return '';
		}
	}

	function fmtDate(iso: string | null) {
		if (!iso) return 'No date set';
		return gregorian.format(new Date(`${iso}T00:00:00`));
	}

	const birr = (n: number) =>
		`${new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)} ETB`;

	function daysAway(iso: string | null) {
		if (!iso) return null;
		const diff = Math.round((Date.parse(iso) - Date.parse(data.today)) / 86_400_000);
		if (diff === 0) return 'Today';
		if (diff === 1) return 'Tomorrow';
		if (diff < 0) return `${Math.abs(diff)}d ago`;
		return `in ${diff}d`;
	}

	const coupleName = (b: { groomName: string | null; brideName: string | null }) =>
		[b.groomName, b.brideName].filter(Boolean).join(' & ') || 'Unnamed couple';

	const statusStyle: Record<string, string> = {
		pending: 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400',
		confirmed: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
		cancelled: 'border-destructive/40 bg-destructive/10 text-destructive'
	};

	/* ---------- filter links ---------- */

	const tabs = [
		{ key: 'upcoming', label: 'Upcoming' },
		{ key: 'pending', label: 'Pending' },
		{ key: 'confirmed', label: 'Confirmed' },
		{ key: 'past', label: 'Past' },
		{ key: 'cancelled', label: 'Cancelled' },
		{ key: 'all', label: 'All' }
	];

	function qs(overrides: Record<string, string | number | undefined>) {
		const p = new URLSearchParams(page.url.searchParams);
		for (const [k, v] of Object.entries(overrides)) {
			if (v === undefined || v === '') p.delete(k);
			else p.set(k, String(v));
		}
		if (!('page' in overrides)) p.delete('page');
		const s = p.toString();
		return s ? `?${s}` : '?';
	}

	/* ---------- dialog ---------- */

	type Booking = (typeof data.bookings)[number];
	type Mode = 'view' | 'confirm' | 'cancel' | 'quote' | 'reschedule';

	let open = $state(false);
	let selectedId = $state<number | null>(null);
	let mode = $state<Mode>('view');

	const selected = $derived(data.bookings.find((b) => b.id === selectedId) ?? null);

	const confirm = superForm(data.confirmForm, {
		id: 'confirm',
		resetForm: false,
		onUpdated: ({ form }) => form.message?.type === 'success' && close()
	});
	const {
		form: confirmData,
		errors: confirmErrors,
		enhance: confirmEnhance,
		submitting: confirmBusy,
		message: confirmMsg
	} = confirm;

	const cancel = superForm(data.cancelForm, {
		id: 'cancel',
		resetForm: false,
		onUpdated: ({ form }) => form.message?.type === 'success' && close()
	});
	const {
		form: cancelData,
		errors: cancelErrors,
		enhance: cancelEnhance,
		submitting: cancelBusy,
		message: cancelMsg
	} = cancel;

	const quote = superForm(data.quoteForm, {
		id: 'quote',
		resetForm: false,
		onUpdated: ({ form }) => form.message?.type === 'success' && close()
	});
	const {
		form: quoteData,
		errors: quoteErrors,
		enhance: quoteEnhance,
		submitting: quoteBusy,
		message: quoteMsg
	} = quote;

	const resched = superForm(data.rescheduleForm, {
		id: 'reschedule',
		resetForm: false,
		onUpdated: ({ form }) => form.message?.type === 'success' && close()
	});
	const {
		form: reschedData,
		errors: reschedErrors,
		enhance: reschedEnhance,
		submitting: reschedBusy,
		message: reschedMsg
	} = resched;

	function openBooking(b: Booking) {
		selectedId = b.id;
		mode = 'view';
		open = true;
	}

	function close() {
		open = false;
		mode = 'view';
	}

	/** Every action form carries the booking id in a hidden field. */
	function startMode(m: Mode) {
		if (!selected) return;
		mode = m;
		if (m === 'confirm') {
			$confirmData.id = selected.id;
			$confirmData.agreedPrice = selected.agreedPrice || undefined;
			$confirmData.allowOverlap = false;
		}
		if (m === 'cancel') {
			$cancelData.id = selected.id;
			$cancelData.reason = '';
		}
		if (m === 'quote') {
			$quoteData.id = selected.id;
			$quoteData.proposedPrice = selected.agreedPrice || undefined;
			$quoteData.notes = '';
		}
		if (m === 'reschedule') {
			$reschedData.id = selected.id;
			$reschedData.eventDate = selected.eventDate ?? data.today;
			$reschedData.allowOverlap = false;
		}
	}

	const activeMsg = $derived(
		mode === 'confirm'
			? $confirmMsg
			: mode === 'cancel'
				? $cancelMsg
				: mode === 'quote'
					? $quoteMsg
					: mode === 'reschedule'
						? $reschedMsg
						: null
	);
</script>

<div class="flex w-full flex-col gap-6 p-4 md:p-6">
	<div>
		<h1 class="text-2xl font-semibold tracking-tight">Bookings</h1>
		<p class="text-sm text-muted-foreground">
			Service requests and confirmed work for {data.vendor.businessName}.
		</p>
	</div>

	<!-- Stats -->
	<div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
		{#each [{ label: 'Awaiting your reply', value: data.stats.pending, tone: 'text-amber-600' }, { label: 'Confirmed', value: data.stats.confirmed, tone: 'text-emerald-600' }, { label: 'Cancelled', value: data.stats.cancelled, tone: 'text-destructive' }, { label: 'Total', value: data.stats.total, tone: '' }] as s (s.label)}
			<Card.Root>
				<Card.Content class="p-4">
					<p class="text-xs text-muted-foreground">{s.label}</p>
					<p class="text-2xl font-semibold {s.tone}">{s.value}</p>
				</Card.Content>
			</Card.Root>
		{/each}
	</div>

	<!-- Tabs -->
	<div class="flex flex-wrap gap-2 border-b pb-2">
		{#each tabs as t (t.key)}
			<a
				href={qs({ tab: t.key })}
				data-sveltekit-noscroll
				class="rounded-md px-3 py-1.5 text-sm font-medium transition-colors
					{data.filters.tab === t.key
					? 'bg-primary text-primary-foreground'
					: 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'}"
			>
				{t.label}
			</a>
		{/each}
	</div>

	<!-- Filters: plain GET, so the view is shareable and back-button friendly -->
	<form
		method="GET"
		data-sveltekit-keepfocus
		data-sveltekit-replacestate
		class="flex flex-wrap items-end gap-3"
	>
		<input type="hidden" name="tab" value={data.filters.tab} />

		<div class="relative min-w-56 flex-1">
			<Search class="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
			<Input
				name="q"
				value={data.filters.q}
				placeholder="Couple, phone, service, city…"
				class="pl-9"
			/>
		</div>

		<select
			name="serviceId"
			class="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-xs"
		>
			<option value="">All services</option>
			{#each data.services as s (s.value)}
				<option value={s.value} selected={data.filters.serviceId === s.value}>{s.label}</option>
			{/each}
		</select>

		<select
			name="sort"
			class="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-xs"
		>
			{#each [{ v: 'date_asc', l: 'Event date ↑' }, { v: 'date_desc', l: 'Event date ↓' }, { v: 'created_desc', l: 'Newest request' }, { v: 'price_desc', l: 'Highest value' }] as o (o.v)}
				<option value={o.v} selected={data.filters.sort === o.v}>{o.l}</option>
			{/each}
		</select>

		<Button type="submit" variant="secondary">Filter</Button>
		{#if data.filters.q || data.filters.serviceId}
			<Button variant="ghost" href={qs({ q: undefined, serviceId: undefined })}>Reset</Button>
		{/if}
	</form>

	<!-- List -->
	{#if !data.bookings.length}
		<Card.Root>
			<Card.Content class="flex flex-col items-center gap-2 py-16 text-center">
				<CalendarDays class="size-8 text-muted-foreground" />
				<p class="font-medium">No bookings here yet</p>
				<p class="max-w-sm text-sm text-muted-foreground">
					{data.filters.q || data.filters.serviceId
						? 'Nothing matches those filters. Try widening the search.'
						: 'When a couple books one of your services it will land in this list.'}
				</p>
			</Card.Content>
		</Card.Root>
	{:else}
		<!-- Desktop -->
		<Card.Root class="hidden md:block">
			<Table.Root>
				<Table.Header>
					<Table.Row>
						<Table.Head>Couple</Table.Head>
						<Table.Head>Service</Table.Head>
						<Table.Head>Event date</Table.Head>
						<Table.Head class="text-right">Value</Table.Head>
						<Table.Head>Status</Table.Head>
						<Table.Head class="w-24"></Table.Head>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{#each data.bookings as b (b.id)}
						<Table.Row class="cursor-pointer" onclick={() => openBooking(b)}>
							<Table.Cell>
								<div class="flex flex-col">
									<span class="font-medium">{coupleName(b)}</span>
									<span class="text-xs text-muted-foreground">{b.phone ?? b.email ?? '—'}</span>
								</div>
							</Table.Cell>
							<Table.Cell class="text-sm">{b.serviceTitle ?? 'General enquiry'}</Table.Cell>
							<Table.Cell>
								<div class="flex flex-col">
									<span class="text-sm">{fmtDate(b.eventDate)}</span>
									<span class="text-xs text-muted-foreground">
										{ethiopic(b.eventDate)}{#if daysAway(b.eventDate)} · {daysAway(b.eventDate)}{/if}
									</span>
								</div>
							</Table.Cell>
							<Table.Cell class="text-right">
								<div class="flex flex-col items-end">
									<span class="text-sm">{b.agreedPrice ? birr(b.agreedPrice) : '—'}</span>
									{#if b.outstanding > 0 && b.agreedPrice}
										<span class="text-xs text-amber-600">{birr(b.outstanding)} due</span>
									{:else if b.agreedPrice}
										<span class="text-xs text-emerald-600">Paid</span>
									{/if}
								</div>
							</Table.Cell>
							<Table.Cell>
								<div class="flex items-center gap-1">
									<Badge variant="outline" class="capitalize {statusStyle[b.status]}">
										{b.status}
									</Badge>
									{#if b.hasDispute}
										<TriangleAlert class="size-4 text-destructive" aria-label="Open dispute" />
									{/if}
								</div>
							</Table.Cell>
							<Table.Cell>
								<Button variant="ghost" size="sm" onclick={(e) => { e.stopPropagation(); openBooking(b); }}>
									View
								</Button>
							</Table.Cell>
						</Table.Row>
					{/each}
				</Table.Body>
			</Table.Root>
		</Card.Root>

		<!-- Mobile -->
		<div class="flex flex-col gap-3 md:hidden">
			{#each data.bookings as b (b.id)}
				<Card.Root>
					<button type="button" class="w-full p-4 text-left" onclick={() => openBooking(b)}>
						<div class="flex items-start justify-between gap-2">
							<div>
								<p class="font-medium">{coupleName(b)}</p>
								<p class="text-xs text-muted-foreground">{b.serviceTitle ?? 'General enquiry'}</p>
							</div>
							<Badge variant="outline" class="capitalize {statusStyle[b.status]}">{b.status}</Badge>
						</div>
						<div class="mt-3 flex items-center justify-between text-sm">
							<span class="flex items-center gap-1.5 text-muted-foreground">
								<CalendarDays class="size-3.5" />
								{fmtDate(b.eventDate)}
							</span>
							<span class="font-medium">{b.agreedPrice ? birr(b.agreedPrice) : '—'}</span>
						</div>
					</button>
				</Card.Root>
			{/each}
		</div>

		<!-- Pagination -->
		{#if data.pagination.pages > 1}
			<div class="flex items-center justify-between">
				<p class="text-sm text-muted-foreground">
					Page {data.pagination.page} of {data.pagination.pages} · {data.pagination.total} bookings
				</p>
				<div class="flex gap-2">
					<Button
						variant="outline"
						size="sm"
						disabled={data.pagination.page <= 1}
						href={qs({ page: data.pagination.page - 1 })}
					>
						<ChevronLeft class="size-4" /> Prev
					</Button>
					<Button
						variant="outline"
						size="sm"
						disabled={data.pagination.page >= data.pagination.pages}
						href={qs({ page: data.pagination.page + 1 })}
					>
						Next <ChevronRight class="size-4" />
					</Button>
				</div>
			</div>
		{/if}
	{/if}
</div>

<!-- Detail -->
<Dialog.Root bind:open onOpenChange={(v) => !v && close()}>
	<Dialog.Content class="max-h-[90vh] max-w-2xl overflow-y-auto">
		{#if selected}
			<Dialog.Header>
				<Dialog.Title class="flex items-center gap-2">
					{coupleName(selected)}
					<Badge variant="outline" class="capitalize {statusStyle[selected.status]}">
						{selected.status}
					</Badge>
				</Dialog.Title>
				<Dialog.Description>
					{selected.serviceTitle ?? 'General enquiry'} · booking #{selected.id}
				</Dialog.Description>
			</Dialog.Header>

			{#if selected.hasDispute}
				<div class="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
					<TriangleAlert class="size-4 shrink-0" />
					There is an unresolved dispute on this booking.
				</div>
			{/if}

			<div class="grid gap-4 sm:grid-cols-2">
				<div class="flex flex-col gap-2 text-sm">
					<p class="text-xs font-medium tracking-wide text-muted-foreground uppercase">Event</p>
					<span class="flex items-center gap-2">
						<CalendarDays class="size-4 text-muted-foreground" />
						{fmtDate(selected.eventDate)}
					</span>
					{#if ethiopic(selected.eventDate)}
						<span class="pl-6 text-xs text-muted-foreground">{ethiopic(selected.eventDate)}</span>
					{/if}
					{#if selected.city}
						<span class="flex items-center gap-2">
							<MapPin class="size-4 text-muted-foreground" />{selected.city}
						</span>
					{/if}
					{#if selected.expectedGuests}
						<span class="flex items-center gap-2">
							<Users class="size-4 text-muted-foreground" />{selected.expectedGuests} guests
						</span>
					{/if}
					{#if selected.weddingStyle}
						<span class="text-muted-foreground">Style: {selected.weddingStyle}</span>
					{/if}
				</div>

				<div class="flex flex-col gap-2 text-sm">
					<p class="text-xs font-medium tracking-wide text-muted-foreground uppercase">Contact</p>
					{#if selected.phone}
						<a href="tel:{selected.phone}" class="flex items-center gap-2 hover:underline">
							<Phone class="size-4 text-muted-foreground" />{selected.phone}
						</a>
					{/if}
					{#if selected.phone2}
						<a href="tel:{selected.phone2}" class="flex items-center gap-2 hover:underline">
							<Phone class="size-4 text-muted-foreground" />{selected.phone2}
						</a>
					{/if}
					{#if selected.email}
						<a href="mailto:{selected.email}" class="flex items-center gap-2 hover:underline">
							<Mail class="size-4 text-muted-foreground" />{selected.email}
						</a>
					{/if}
					{#if !selected.coupleVerified}
						<span class="text-xs text-amber-600">Couple not yet verified</span>
					{/if}
				</div>
			</div>

			<Separator />

			<div class="grid gap-4 sm:grid-cols-3">
				<div>
					<p class="text-xs text-muted-foreground">Agreed price</p>
					<p class="font-medium">{selected.agreedPrice ? birr(selected.agreedPrice) : 'Not set'}</p>
				</div>
				<div>
					<p class="text-xs text-muted-foreground">Received</p>
					<p class="font-medium text-emerald-600">{birr(selected.paidTotal)}</p>
				</div>
				<div>
					<p class="text-xs text-muted-foreground">Outstanding</p>
					<p class="font-medium {selected.outstanding > 0 ? 'text-amber-600' : ''}">
						{birr(selected.outstanding)}
					</p>
				</div>
			</div>

			{#if selected.contract}
				<div class="flex items-center gap-2 rounded-md border p-3 text-sm">
					<FileText class="size-4 text-muted-foreground" />
					<span class="flex-1">
						Contract · couple {selected.contract.signedByCouple ? 'signed' : 'unsigned'}, you
						{selected.contract.signedByVendor ? 'signed' : 'have not signed'}
					</span>
					{#if selected.contract.documentUrl}
						<Button variant="outline" size="sm" href={selected.contract.documentUrl} target="_blank">
							Open
						</Button>
					{/if}
				</div>
			{/if}

			{#if selected.status === 'cancelled' && selected.cancellationReason}
				<div class="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm">
					<p class="font-medium text-destructive">
						Cancelled by {selected.cancelledBy ?? 'unknown'}
					</p>
					<p class="text-muted-foreground">{selected.cancellationReason}</p>
				</div>
			{/if}

			{#if activeMsg}
				<p
					class="flex items-center gap-2 text-sm"
					class:text-destructive={activeMsg.type === 'error'}
					class:text-emerald-600={activeMsg.type === 'success'}
				>
					{#if activeMsg.type === 'error'}<CircleAlert class="size-4" />{:else}<CircleCheck class="size-4" />{/if}
					{activeMsg.text}
				</p>
			{/if}

			<Separator />

			{#if mode === 'view'}
				{#if selected.status !== 'cancelled'}
					<div class="flex flex-wrap gap-2">
						{#if selected.status === 'pending'}
							<Button onclick={() => startMode('confirm')}>
								<Check class="size-4" /> Confirm
							</Button>
						{/if}
						<Button variant="outline" onclick={() => startMode('quote')}>Send a quote</Button>
						<Button variant="outline" onclick={() => startMode('reschedule')}>
							<Clock class="size-4" /> Reschedule
						</Button>
						<Button variant="ghost" class="text-destructive" onclick={() => startMode('cancel')}>
							<X class="size-4" /> Cancel booking
						</Button>
					</div>
				{/if}

			{:else if mode === 'confirm'}
				<form method="POST" action="?/confirm" use:confirmEnhance class="flex flex-col gap-2">
					<input type="hidden" name="id" value={selected.id} />
					<InputComp
						label="Agreed price (ETB)"
						form={confirmData}
						errors={confirmErrors}
						name="agreedPrice"
						type="number"
						min="0"
						placeholder="Leave blank to keep the current price"
					/>
					<InputComp
						label=""
						form={confirmData}
						errors={confirmErrors}
						name="allowOverlap"
						type="checkboxSingle"
						placeholder="Allow same-day overlap with another confirmed booking"
					/>
					<div class="mt-2 flex gap-2">
						<Button type="submit" disabled={$confirmBusy}>
							{$confirmBusy ? 'Confirming…' : 'Confirm booking'}
						</Button>
						<Button type="button" variant="ghost" onclick={() => (mode = 'view')}>Back</Button>
					</div>
				</form>

			{:else if mode === 'quote'}
				<form method="POST" action="?/quote" use:quoteEnhance class="flex flex-col gap-2">
					<input type="hidden" name="id" value={selected.id} />
					<InputComp
						label="Proposed price (ETB)"
						form={quoteData}
						errors={quoteErrors}
						name="proposedPrice"
						type="number"
						min="0"
						required
					/>
					<InputComp
						label="Notes"
						form={quoteData}
						errors={quoteErrors}
						name="notes"
						type="textarea"
						rows={4}
						placeholder="What the price covers, deposit terms, travel costs…"
					/>
					<div class="mt-2 flex gap-2">
						<Button type="submit" disabled={$quoteBusy}>
							{$quoteBusy ? 'Sending…' : 'Send quote'}
						</Button>
						<Button type="button" variant="ghost" onclick={() => (mode = 'view')}>Back</Button>
					</div>
				</form>

			{:else if mode === 'reschedule'}
				<form method="POST" action="?/reschedule" use:reschedEnhance class="flex flex-col gap-2">
					<input type="hidden" name="id" value={selected.id} />
					<InputComp
						label="New event date"
						form={reschedData}
						errors={reschedErrors}
						name="eventDate"
						type="date"
						oldDays={false}
						year={true}
					/>
					<InputComp
						label=""
						form={reschedData}
						errors={reschedErrors}
						name="allowOverlap"
						type="checkboxSingle"
						placeholder="Allow same-day overlap"
					/>
					<div class="mt-2 flex gap-2">
						<Button type="submit" disabled={$reschedBusy}>
							{$reschedBusy ? 'Saving…' : 'Move booking'}
						</Button>
						<Button type="button" variant="ghost" onclick={() => (mode = 'view')}>Back</Button>
					</div>
				</form>

			{:else if mode === 'cancel'}
				<form method="POST" action="?/cancel" use:cancelEnhance class="flex flex-col gap-2">
					<input type="hidden" name="id" value={selected.id} />
					<InputComp
						label="Why are you cancelling?"
						form={cancelData}
						errors={cancelErrors}
						name="reason"
						type="textarea"
						rows={4}
						required
						placeholder="The couple sees this, so be clear and polite."
					/>
					<div class="mt-2 flex gap-2">
						<Button type="submit" variant="destructive" disabled={$cancelBusy}>
							{$cancelBusy ? 'Cancelling…' : 'Cancel this booking'}
						</Button>
						<Button type="button" variant="ghost" onclick={() => (mode = 'view')}>Back</Button>
					</div>
				</form>
			{/if}
		{/if}
	</Dialog.Content>
</Dialog.Root>