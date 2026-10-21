<script lang="ts">
	import * as Card from '@nahu/admin-kit/components/ui/card/index.js';
	import { Badge } from '@nahu/admin-kit/components/ui/badge/index.js';
	import { Button } from '@nahu/admin-kit/components/ui/button/index.js';
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

	const funnelSteps = $derived([
		{ label: 'Profile views', value: data.funnel.views },
		{ label: 'Saved by couples', value: data.funnel.saves },
		{ label: 'Inquiries', value: data.funnel.inquiries },
		{ label: 'Bookings', value: data.funnel.bookings },
		{
			label: 'Inquiries that booked',
			value: data.funnel.inquiries
				? `${Math.round((data.funnel.bookings / data.funnel.inquiries) * 100)}%`
				: '—'
		}
	]);

	const BOOKING_STATUS_VARIANT: Record<string, 'secondary' | 'default' | 'destructive'> = {
		pending: 'secondary',
		confirmed: 'default',
		completed: 'default',
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
		<p class="text-sm text-muted-foreground">Here's what's happening with your listing.</p>
	</div>

	{#if data.vendor.status !== 'approved'}
		<Card.Root class="border-amber-300 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/40">
			<Card.Content class="flex flex-wrap items-center gap-3 py-4">
				<ShieldAlert class="size-5 shrink-0 text-amber-600 dark:text-amber-400" />
				<div class="flex-1">
					<p class="text-sm font-medium">
						Your listing is {STATUS_LABEL[data.vendor.status]?.toLowerCase() ?? data.vendor.status}
					</p>
					<p class="text-xs text-muted-foreground">
						{#if data.vendor.status === 'pending'}
							Our team reviews every new vendor before it appears in the Marketplace. This usually
							takes 1–2 business days — finish setting up your services and packages in the
							meantime.
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
					<p class="text-xs text-muted-foreground">Pending requests</p>
					<p class="text-2xl font-semibold">{data.stats.pending}</p>
				</div>
				<CalendarClock class="size-8 text-muted-foreground" />
			</Card.Content>
		</Card.Root>
		<Card.Root>
			<Card.Content class="flex items-center justify-between py-5">
				<div>
					<p class="text-xs text-muted-foreground">Confirmed upcoming</p>
					<p class="text-2xl font-semibold">{data.stats.confirmedUpcoming}</p>
				</div>
				<CalendarCheck class="size-8 text-muted-foreground" />
			</Card.Content>
		</Card.Root>
		<Card.Root>
			<Card.Content class="flex items-center justify-between py-5">
				<div>
					<p class="text-xs text-muted-foreground">Wallet balance</p>
					<p class="text-2xl font-semibold">{formatETB(data.stats.walletBalance)}</p>
					{#if data.stats.heldBalance > 0}
						<p class="text-xs text-muted-foreground">
							+ {formatETB(data.stats.heldBalance)} on hold
						</p>
					{/if}
				</div>
				<Wallet class="size-8 text-muted-foreground" />
			</Card.Content>
		</Card.Root>
		<Card.Root>
			<Card.Content class="flex items-center justify-between py-5">
				<div>
					<p class="text-xs text-muted-foreground">Rating</p>
					<p class="text-2xl font-semibold">
						{Number(data.vendor.ratingAvg ?? 0).toFixed(1)}
						<span class="text-sm font-normal text-muted-foreground"
							>({data.vendor.reviewCount ?? 0})</span
						>
					</p>
				</div>
				<Sparkles class="size-8 text-muted-foreground" />
			</Card.Content>
		</Card.Root>
	</div>

	<!-- Funnel -->
	<Card.Root>
		<Card.Header>
			<Card.Title>Last 30 days</Card.Title>
			<Card.Description>How couples found you and how many booked.</Card.Description>
		</Card.Header>
		<Card.Content>
			<dl class="grid grid-cols-2 gap-4 sm:grid-cols-5">
				{#each funnelSteps as step (step.label)}
					<div>
						<dt class="text-xs text-muted-foreground">{step.label}</dt>
						<dd class="text-2xl font-semibold tabular-nums">{step.value}</dd>
					</div>
				{/each}
			</dl>
		</Card.Content>
	</Card.Root>

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
					<div class="py-10 text-center text-sm text-muted-foreground">
						No booking requests yet. Couples will find you once your listing is approved.
					</div>
				{:else}
					<div class="divide-y">
						{#each data.recentBookings as booking (booking.id)}
							<div class="flex items-center justify-between gap-3 py-3">
								<div>
									<p class="font-medium">{booking.coupleNames}</p>
									<p class="text-xs text-muted-foreground">
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
						class="flex items-center justify-between gap-2 rounded-lg border p-3 text-sm transition-colors hover:bg-muted"
					>
						<span class="flex items-center gap-2">
							{#if item.done}
								<ShieldCheck class="size-4 text-emerald-600" />
							{:else}
								<span class="size-4 rounded-full border-2 border-muted-foreground/40"></span>
							{/if}
							<span class:text-muted-foreground={item.done} class:line-through={item.done}>
								{item.label}
							</span>
						</span>
						<ArrowRight class="size-3.5 text-muted-foreground" />
					</a>
				{/each}
			</Card.Content>
		</Card.Root>
	</div>
</div>
