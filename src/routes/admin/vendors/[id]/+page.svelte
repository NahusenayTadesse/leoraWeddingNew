<script lang="ts">
	import * as Card from '@nahu/admin-kit/components/ui/card/index.js';
	import { Button } from '@nahu/admin-kit/components/ui/button/index.js';
	import { Badge } from '@nahu/admin-kit/components/ui/badge/index.js';
	import PageHeader from '$lib/components/admin/PageHeader.svelte';
	import Kpi from '$lib/components/admin/Kpi.svelte';
	import { formatETB, formatETBWhole } from '$lib/money';
	import { statusLabel } from '$lib/status';

	let { data } = $props();

	const v = $derived(data.vendor);
	const fmt = (d: Date | string | null) => (d ? new Date(d).toLocaleDateString('en-GB') : '—');
</script>

<div class="space-y-6">
	<PageHeader title={v.businessName} description="{v.category ?? 'Vendor'} · {v.city ?? '—'}">
		<Button href="/vendors/{v.id}" variant="outline" target="_blank">Public page</Button>
		<Button href="/admin/vendors" variant="ghost">All vendors</Button>
	</PageHeader>

	<div class="flex flex-wrap gap-2">
		<Badge variant={v.status === 'approved' ? 'default' : 'secondary'}
			>{statusLabel(v.status)}</Badge
		>
		{#if !v.isActive}<Badge variant="secondary">Paused by vendor</Badge>{/if}
		{#if v.isVerified}<Badge variant="outline">Verified</Badge>{/if}
		<Badge variant="outline">
			{data.plan
				? `${data.plan.name} (${data.plan.status}${data.plan.endsAt ? ` until ${data.plan.endsAt}` : ''})`
				: 'No plan'}
		</Badge>
	</div>

	<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
		<Kpi label="Wallet balance" value={formatETB(data.wallet)} href="/admin/payouts" />
		<Kpi
			label="Confirmed payments"
			value={formatETBWhole(data.money.gross)}
			hint="{data.money.payments} payments"
		/>
		<Kpi label="Commission earned" value={formatETBWhole(data.money.commission)} />
		<Kpi
			label="Rating"
			value={v.reviewCount ? `${v.ratingAvg.toFixed(1)} ★` : '—'}
			hint="{v.reviewCount} reviews"
		/>
	</div>

	<div class="grid gap-6 lg:grid-cols-2">
		<Card.Root>
			<Card.Header><Card.Title class="text-base">Contact</Card.Title></Card.Header>
			<Card.Content class="space-y-1 text-sm">
				<p>Owner: {v.ownerName ?? '—'} {v.ownerEmail ? `· ${v.ownerEmail}` : ''}</p>
				<p>Business phone: {v.phone ?? '—'}</p>
				<p>Business email: {v.email ?? '—'}</p>
				<p>Listed since: {fmt(v.createdAt)}</p>
				{#if v.description}<p class="pt-2 whitespace-pre-line text-muted-foreground">
						{v.description}
					</p>{/if}
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header><Card.Title class="text-base">Recent bookings</Card.Title></Card.Header>
			<Card.Content>
				{#if data.bookings.length === 0}
					<p class="text-sm text-muted-foreground">No bookings yet.</p>
				{:else}
					<ul class="divide-y text-sm">
						{#each data.bookings as b (b.id)}
							<li class="flex items-center justify-between gap-2 py-2">
								<span class="truncate">#{b.id} · {b.couple}</span>
								<span class="text-muted-foreground">{b.eventDate ?? '—'}</span>
								<span class="tabular-nums">{formatETB(b.agreedPrice)}</span>
								<Badge variant="secondary">{statusLabel(b.status)}</Badge>
							</li>
						{/each}
					</ul>
				{/if}
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header><Card.Title class="text-base">Payouts</Card.Title></Card.Header>
			<Card.Content>
				{#if data.payouts.length === 0}
					<p class="text-sm text-muted-foreground">No payout requests.</p>
				{:else}
					<ul class="divide-y text-sm">
						{#each data.payouts as p (p.id)}
							<li class="flex items-center justify-between gap-2 py-2">
								<span class="tabular-nums">{formatETB(p.amount)}</span>
								<span class="truncate text-muted-foreground">{p.destination ?? '—'}</span>
								<Badge variant="secondary">{statusLabel(p.status)}</Badge>
							</li>
						{/each}
					</ul>
				{/if}
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header><Card.Title class="text-base">Disputes</Card.Title></Card.Header>
			<Card.Content>
				{#if data.disputes.length === 0}
					<p class="text-sm text-muted-foreground">No disputes.</p>
				{:else}
					<ul class="divide-y text-sm">
						{#each data.disputes as d (d.id)}
							<li class="space-y-1 py-2">
								<div class="flex justify-between gap-2">
									<span>#{d.id} · raised by {d.raisedBy ?? '—'} · {fmt(d.createdAt)}</span>
									<Badge variant="secondary">{statusLabel(d.status)}</Badge>
								</div>
								<p class="text-muted-foreground">{d.reason}</p>
							</li>
						{/each}
					</ul>
				{/if}
			</Card.Content>
		</Card.Root>

		<Card.Root class="lg:col-span-2">
			<Card.Header><Card.Title class="text-base">Latest reviews</Card.Title></Card.Header>
			<Card.Content>
				{#if data.reviews.length === 0}
					<p class="text-sm text-muted-foreground">No reviews yet.</p>
				{:else}
					<ul class="divide-y text-sm">
						{#each data.reviews as r (r.id)}
							<li class="py-2">
								<span class="font-medium">{'★'.repeat(r.rating)}</span>
								<span class="ml-2 text-muted-foreground">{fmt(r.createdAt)}</span>
								{#if r.comment}<p class="mt-1">{r.comment}</p>{/if}
							</li>
						{/each}
					</ul>
				{/if}
			</Card.Content>
		</Card.Root>
	</div>
</div>
