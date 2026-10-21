<script lang="ts">
	import ActionForm from '@nahu/admin-kit/formComponents/ActionForm.svelte';
	import { Button } from '@nahu/admin-kit/components/ui/button/index.js';
	import { Badge } from '@nahu/admin-kit/components/ui/badge/index.js';
	import * as Card from '@nahu/admin-kit/components/ui/card/index.js';
	import { Gift } from '@lucide/svelte';
	import DateText from '@nahu/admin-kit/components/DateText.svelte';
	import { dateLocale } from '$lib/dateLocale';
	import { formatETB } from '$lib/money';
	import { m } from '$lib/paraglide/messages.js';

	let { data } = $props();

	const PAYOUT_STATUS = {
		requested: m.gifts_status_requested,
		completed: m.gifts_status_completed,
		rejected: m.gifts_status_rejected
	};
</script>

<svelte:head>
	<title>{m.gifts_title()} — Leora Events</title>
</svelte:head>

<div class="space-y-6">
	<div>
		<h1 class="text-2xl font-semibold tracking-tight">{m.gifts_title()}</h1>
		<p class="text-sm text-muted-foreground">{m.gifts_lead()}</p>
	</div>

	<Card.Root>
		<Card.Content class="flex flex-wrap items-center justify-between gap-3 py-4">
			<p class="font-medium">{m.gifts_accept()}</p>
			<ActionForm action="?/toggle" fields={{ enabled: data.enabled ? 'no' : 'yes' }}>
				{#snippet children({ busy })}
					<Button
						type="submit"
						variant={data.enabled ? 'outline' : 'default'}
						disabled={!!busy}
						aria-pressed={data.enabled}
					>
						{data.enabled ? m.gifts_turn_off() : m.gifts_turn_on()}
					</Button>
				{/snippet}
			</ActionForm>
		</Card.Content>
	</Card.Root>

	<dl class="grid gap-4 sm:grid-cols-3">
		{#each [{ label: m.gifts_received(), value: data.balance.received }, { label: m.gifts_fee(), value: data.balance.fee }, { label: m.gifts_available(), value: data.balance.available }] as kpi (kpi.label)}
			<Card.Root>
				<Card.Content class="py-5">
					<dt class="text-xs text-muted-foreground">{kpi.label}</dt>
					<dd class="text-2xl font-semibold tabular-nums">{formatETB(kpi.value)}</dd>
				</Card.Content>
			</Card.Root>
		{/each}
	</dl>

	{#if data.gifts.length === 0}
		<Card.Root class="p-10 text-center text-sm text-muted-foreground">
			<Gift class="mx-auto mb-2 size-8" />{m.gifts_none()}
		</Card.Root>
	{:else}
		<div class="grid gap-3">
			{#each data.gifts as gift (gift.id)}
				<Card.Root class="flex flex-wrap items-start justify-between gap-3 p-4">
					<div class="min-w-0">
						<p class="font-medium">{gift.fromName}</p>
						{#if gift.message}<p class="mt-1 text-sm whitespace-pre-line">{gift.message}</p>{/if}
						<p class="mt-1 text-xs text-muted-foreground">
							<DateText locale={dateLocale()} value={gift.paidAt} />
						</p>
					</div>
					<div class="flex flex-col items-end gap-2">
						<p class="text-lg font-semibold tabular-nums">{formatETB(gift.amount)}</p>
						<ActionForm
							action="?/thanked"
							fields={{ id: gift.id, thanked: gift.thankedAt ? 'no' : 'yes' }}
						>
							{#snippet children({ busy })}
								{#if gift.thankedAt}
									<button type="submit" disabled={!!busy}>
										<Badge>{m.gifts_thanked()}</Badge>
									</button>
								{:else}
									<Button type="submit" size="sm" variant="outline" disabled={!!busy}>
										{m.gifts_mark_thanked()}
									</Button>
								{/if}
							{/snippet}
						</ActionForm>
					</div>
				</Card.Root>
			{/each}
		</div>
	{/if}

	{#if data.balance.available > 0}
		<Card.Root>
			<Card.Header><Card.Title>{m.gifts_payout_title()}</Card.Title></Card.Header>
			<Card.Content>
				<ActionForm action="?/payout" class="grid gap-3 sm:grid-cols-[10rem_1fr_auto] sm:items-end">
					{#snippet children({ busy })}
						<label class="grid gap-1 text-sm">
							<span>{m.gift_amount()}</span>
							<input
								name="amount"
								type="number"
								min="1"
								max={data.balance.available}
								value={data.balance.available}
								required
								class="h-10 rounded-md border bg-background px-3"
							/>
						</label>
						<label class="grid gap-1 text-sm">
							<span>{m.gifts_payout_dest()}</span>
							<input
								name="destination"
								required
								minlength="5"
								maxlength="255"
								class="h-10 rounded-md border bg-background px-3"
							/>
						</label>
						<Button type="submit" disabled={!!busy}>{m.gifts_payout_send()}</Button>
					{/snippet}
				</ActionForm>
			</Card.Content>
		</Card.Root>
	{/if}

	{#if data.payouts.length}
		<Card.Root>
			<Card.Header><Card.Title>{m.gifts_payouts()}</Card.Title></Card.Header>
			<Card.Content class="divide-y text-sm">
				{#each data.payouts as payout (payout.id)}
					<div class="flex flex-wrap items-center justify-between gap-2 py-2">
						<span
							><DateText locale={dateLocale()} value={payout.createdAt} month="short" /> · {payout.destination}</span
						>
						<span class="flex items-center gap-2">
							<span class="font-medium tabular-nums">{formatETB(payout.amount)}</span>
							<Badge variant={payout.status === 'completed' ? 'default' : 'secondary'}
								>{PAYOUT_STATUS[payout.status]()}</Badge
							>
						</span>
					</div>
				{/each}
			</Card.Content>
		</Card.Root>
	{/if}
</div>
