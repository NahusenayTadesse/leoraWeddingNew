<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { formatETB } from '$lib/money';
	import {
		CalendarClock,
		CalendarCheck,
		Wallet,
		Sparkles,
		ShieldAlert,
		ShieldCheck,
		ArrowRight
	} from '@lucide/svelte';

	let { data } = $props();

	const STATUS_LABEL: Record<string, string> = {
		pending: 'Awaiting review',
		approved: 'Approved',
		rejected: 'Rejected',
		suspended: 'Suspended'
	};

	const BOOKING_STATUS_VARIANT: Record<string, 'secondary' | 'default' | 'destructive'> = {
		pending: 'secondary',
		confirmed: 'default',
		cancelled: 'destructive'
	};

	const checklist = $derived([
		{
			done: data.stats.serviceCount > 0,
			label: 'Add at least one service',
			href: '/vendor-dashboard/services'
		},
		{
			done: data.stats.packageCount > 0,
			label: 'Publish a price package',
			href: '/vendor-dashboard/packages'
		},
		{
			done: data.vendor.isVerified,
			label: 'Get verified by the Leora team',
			href: '/vendor-dashboard/profile'
		}
	]);
</script>

<svelte:head>
	<title>Dashboard — Vendor Portal</title>
</svelte:head>

<div class="space-y-6">
	<div>
		<h1 class="text-2xl font-semibold tracking-tight">Welcome back, {data.vendor.businessName}</h1>
		<p class="text-muted-foreground text-sm">Here's what's happening with your listing.</p>
	</div>

	{#if data.vendor.status !== 'approved'}
		<Card.Root class="border-amber-300 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/40">
			<Card.Content class="flex flex-wrap items-center gap-3 py-4">
				<ShieldAlert class="size-5 shrink-0 text-amber-600 dark:text-amber-400" />
				<div class="flex-1">
					<p class="text-sm font-medium">
						Your listing is {STATUS_LABEL[data.vendor.status]?.toLowerCase() ?? data.vendor.status}
					</p>
					<p class="text-muted-foreground text-xs">
						{#if data.vendor.status === 'pending'}
							Our team reviews every new vendor before it appears in the Marketplace. This
							usually takes 1–2 business days — finish setting up your services and packages in
							the meantime.
						{:else if data.vendor.status === 'rejected'}
							Contact support to find out what needs to change before you can relist.
						{:else}
							Contact support for details.
						{/if}
					</p>
				</div>
			</Card.Content>
		</Card.Root>
	{/if}

	<!-- Stats -->
	<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
		<Card.Root>
			<Card.Content class="flex items-center justify-between py-5">
				<div>
					<p class="text-muted-foreground text-xs">Pending requests</p>
					<p class="text-2xl font-semibold">{data.stats.pending}</p>
				</div>
				<CalendarClock class="text-muted-foreground size-8" />
			</Card.Content>
		</Card.Root>
		<Card.Root>
			<Card.Content class="flex items-center justify-between py-5">
				<div>
					<p class="text-muted-foreground text-xs">Confirmed upcoming</p>
					<p class="text-2xl font-semibold">{data.stats.confirmedUpcoming}</p>
				</div>
				<CalendarCheck class="text-muted-foreground size-8" />
			</Card.Content>
		</Card.Root>
		<Card.Root>
			<Card.Content class="flex items-center justify-between py-5">
				<div>
					<p class="text-muted-foreground text-xs">Wallet balance</p>
					<p class="text-2xl font-semibold">{formatETB(data.stats.walletBalance)}</p>
				</div>
				<Wallet class="text-muted-foreground size-8" />
			</Card.Content>
		</Card.Root>
		<Card.Root>
			<Card.Content class="flex items-center justify-between py-5">
				<div>
					<p class="text-muted-foreground text-xs">Rating</p>
					<p class="text-2xl font-semibold">
						{Number(data.vendor.ratingAvg ?? 0).toFixed(1)}
						<span class="text-muted-foreground text-sm font-normal"
							>({data.vendor.reviewCount ?? 0})</span
						>
					</p>
				</div>
				<Sparkles class="text-muted-foreground size-8" />
			</Card.Content>
		</Card.Root>
	</div>

	<div class="grid gap-4 lg:grid-cols-3">
		<!-- Recent bookings -->
		<Card.Root class="lg:col-span-2">
			<Card.Header class="flex flex-row items-center justify-between">
				<Card.Title>Recent booking requests</Card.Title>
				<Button variant="ghost" size="sm" href="/vendor-dashboard/bookings">
					View all <ArrowRight class="ml-1 size-4" />
				</Button>
			</Card.Header>
			<Card.Content>
				{#if data.recentBookings.length === 0}
					<div class="text-muted-foreground py-10 text-center text-sm">
						No booking requests yet. Couples will find you once your listing is approved.
					</div>
				{:else}
					<div class="divide-y">
						{#each data.recentBookings as booking (booking.id)}
							<div class="flex items-center justify-between gap-3 py-3">
								<div>
									<p class="font-medium">{booking.coupleNames}</p>
									<p class="text-muted-foreground text-xs">
										{booking.eventDate ?? 'Date not set'}
										{#if booking.agreedPrice}
											· {formatETB(booking.agreedPrice)}
										{/if}
									</p>
								</div>
								<Badge
									variant={BOOKING_STATUS_VARIANT[booking.status] ?? 'secondary'}
									class="capitalize"
								>
									{booking.status}
								</Badge>
							</div>
						{/each}
					</div>
				{/if}
			</Card.Content>
		</Card.Root>

		<!-- Getting started -->
		<Card.Root>
			<Card.Header>
				<Card.Title>Getting started</Card.Title>
				<Card.Description>Finish these to get the most bookings.</Card.Description>
			</Card.Header>
			<Card.Content class="space-y-3">
				{#each checklist as item (item.label)}
					<a
						href={item.href}
						class="hover:bg-muted flex items-center justify-between gap-2 rounded-lg border p-3 text-sm transition-colors"
					>
						<span class="flex items-center gap-2">
							{#if item.done}
								<ShieldCheck class="size-4 text-emerald-600" />
							{:else}
								<span class="border-muted-foreground/40 size-4 rounded-full border-2"></span>
							{/if}
							<span class:text-muted-foreground={item.done} class:line-through={item.done}>
								{item.label}
							</span>
						</span>
						<ArrowRight class="text-muted-foreground size-3.5" />
					</a>
				{/each}
			</Card.Content>
		</Card.Root>
	</div>
</div>
