<script lang="ts">
	import Chart from '$lib/components/admin/Chart.svelte';
	import ChartCard from '$lib/components/admin/ChartCard.svelte';
	import Kpi from '$lib/components/admin/Kpi.svelte';
	import PageHeader from '$lib/components/admin/PageHeader.svelte';
	import * as Card from '@nahu/admin-kit/components/ui/card/index.js';
	import { formatETBWhole } from '$lib/money';
	import {
		Users,
		Building2,
		Wallet,
		TrendingUp,
		Landmark,
		Gavel,
		Hourglass,
		RotateCcw,
		MessageSquare,
		Star,
		Heart,
		CreditCard
	} from '@lucide/svelte';

	let { data } = $props();
	const s = $derived(data.stats);

	const queue = $derived([
		{
			label: 'Vendors awaiting approval',
			n: s.queue.pendingVendors,
			href: '/admin/vendors',
			icon: Hourglass
		},
		{ label: 'Open disputes', n: s.queue.openDisputes, href: '/admin/disputes', icon: Gavel },
		{ label: 'Payout requests', n: s.queue.pendingPayouts, href: '/admin/payouts', icon: Landmark },
		{
			label: 'Refund requests',
			n: s.queue.pendingRefunds,
			href: '/admin/payments',
			icon: RotateCcw
		},
		{
			label: 'Messages (7 days)',
			n: s.queue.messagesThisWeek,
			href: '/admin/messages',
			icon: MessageSquare
		},
		{
			label: 'New reviews (7 days)',
			n: s.queue.reviewsThisWeek,
			href: '/admin/reviews',
			icon: Star
		}
	]);
</script>

<div class="space-y-6">
	<PageHeader
		title="Overview"
		description="Marketplace health, revenue and what needs your attention."
	/>

	<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
		<Kpi
			label="Platform revenue"
			value={formatETBWhole(s.platformRevenue)}
			hint="Subscriptions + commission"
			icon={TrendingUp}
			href="/admin/reports"
		/>
		<Kpi
			label="Gross bookings value"
			value={formatETBWhole(s.gmv)}
			hint="Confirmed vendor payments"
			icon={Wallet}
			href="/admin/payments"
		/>
		<Kpi label="Couples" value={s.couples} icon={Heart} href="/admin/users" />
		<Kpi
			label="Vendors"
			value={s.vendors}
			hint="{s.queue.pendingVendors} pending"
			icon={Building2}
			href="/admin/vendors"
		/>
		<Kpi
			label="Subscription revenue"
			value={formatETBWhole(s.subscriptionRevenue)}
			icon={CreditCard}
			href="/admin/subscriptions"
		/>
		<Kpi
			label="Commission earned"
			value={formatETBWhole(s.commissionRevenue)}
			icon={Landmark}
			href="/admin/reports"
		/>
		<Kpi
			label="Active subscribers"
			value={s.activeSubscribers}
			icon={Users}
			href="/admin/subscriptions"
		/>
		<Kpi label="User accounts" value={s.users} icon={Users} href="/admin/users" />
	</div>

	<div class="grid gap-4 lg:grid-cols-3">
		<ChartCard
			class="lg:col-span-2"
			title="Revenue, last 12 months"
			description="Platform income in ETB"
		>
			<Chart
				type="bar"
				stacked
				money
				labels={data.revenue.labels}
				datasets={[
					{ label: 'Subscriptions', data: data.revenue.subscriptions },
					{ label: 'Commission', data: data.revenue.commission, color: '#2a9d8f' }
				]}
			/>
		</ChartCard>

		<Card.Root>
			<Card.Header>
				<Card.Title class="text-base">Needs attention</Card.Title>
			</Card.Header>
			<Card.Content class="space-y-1">
				{#each queue as q (q.label)}
					<a
						href={q.href}
						class="flex items-center justify-between rounded-md px-2 py-2 text-sm hover:bg-muted"
					>
						<span class="flex items-center gap-2"
							><q.icon class="size-4 text-muted-foreground" />{q.label}</span
						>
						<span
							class="font-semibold {q.n > 0 && q.label.match(/approval|disputes|Payout|Refund/)
								? 'text-amber-600'
								: ''}">{q.n}</span
						>
					</a>
				{/each}
			</Card.Content>
		</Card.Root>
	</div>

	<div class="grid gap-4 lg:grid-cols-2">
		<ChartCard title="Signups" description="New couples and vendors per month">
			<Chart
				type="line"
				labels={data.signups.labels}
				datasets={[
					{ label: 'Couples', data: data.signups.couples },
					{ label: 'Vendors', data: data.signups.vendors, color: '#3b82c4' }
				]}
			/>
		</ChartCard>
		<ChartCard title="Vendor bookings" description="Requests created per month">
			<Chart
				type="bar"
				labels={data.bookings.labels}
				datasets={[{ label: 'Bookings', data: data.bookings.bookings }]}
			/>
		</ChartCard>
	</div>

	<div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
		<ChartCard title="Booking status">
			<Chart
				type="doughnut"
				height={200}
				labels={data.mix.bookingStatus.labels}
				datasets={[{ label: 'Bookings', data: data.mix.bookingStatus.values }]}
			/>
		</ChartCard>
		<ChartCard title="Vendor status">
			<Chart
				type="doughnut"
				height={200}
				labels={data.mix.vendorStatus.labels}
				datasets={[{ label: 'Vendors', data: data.mix.vendorStatus.values }]}
			/>
		</ChartCard>
		<ChartCard title="Payment methods">
			<Chart
				type="doughnut"
				height={200}
				labels={data.mix.paymentMethods.labels}
				datasets={[{ label: 'Payments', data: data.mix.paymentMethods.values }]}
			/>
		</ChartCard>
		<ChartCard title="Couple plans">
			<Chart
				type="doughnut"
				height={200}
				labels={data.mix.planMix.labels}
				datasets={[{ label: 'Active', data: data.mix.planMix.values }]}
			/>
		</ChartCard>
	</div>

	<div class="grid gap-4 lg:grid-cols-2">
		<ChartCard title="Vendors by category" description="Top 10">
			<Chart
				type="bar"
				horizontal
				labels={data.mix.vendorCategories.labels}
				datasets={[{ label: 'Vendors', data: data.mix.vendorCategories.values }]}
			/>
		</ChartCard>
		<Card.Root>
			<Card.Header>
				<Card.Title class="text-base">Recent admin activity</Card.Title>
				<Card.Description
					><a href="/admin/activity" class="underline">View full log</a></Card.Description
				>
			</Card.Header>
			<Card.Content>
				{#if data.recent.length === 0}
					<p class="text-sm text-muted-foreground">Nothing logged yet.</p>
				{:else}
					<ul class="divide-y text-sm">
						{#each data.recent as r (r.id)}
							<li class="flex justify-between gap-3 py-2">
								<span
									><span class="font-medium">{r.who ?? 'System'}</span> · {r.action}{r.entityType
										? ` (${r.entityType}${r.entityId ? ' #' + r.entityId : ''})`
										: ''}</span
								>
								<span class="shrink-0 text-muted-foreground"
									>{new Date(r.createdAt).toLocaleDateString()}</span
								>
							</li>
						{/each}
					</ul>
				{/if}
			</Card.Content>
		</Card.Root>
	</div>
</div>
