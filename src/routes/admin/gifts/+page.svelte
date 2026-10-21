<script lang="ts">
	import ActionForm from '@nahu/admin-kit/formComponents/ActionForm.svelte';
	import { Button } from '@nahu/admin-kit/components/ui/button/index.js';
	import { Badge } from '@nahu/admin-kit/components/ui/badge/index.js';
	import * as Card from '@nahu/admin-kit/components/ui/card/index.js';
	import PageHeader from '$lib/components/admin/PageHeader.svelte';
	import Kpi from '$lib/components/admin/Kpi.svelte';
	import { formatETB, formatETBWhole } from '$lib/money';
	import { statusLabel } from '$lib/status';

	let { data } = $props();
	const fmt = (d: Date | string) => new Date(d).toLocaleDateString('en-GB');
</script>

<div class="space-y-6">
	<PageHeader
		title="Gift payouts"
		description="Couples asking for the money gifts guests sent them. Transfer it, then mark it sent with the bank reference."
	/>

	<div class="grid gap-4 sm:grid-cols-2">
		<Kpi label="Gifts received" value={formatETBWhole(data.totals.paid)} />
		<Kpi label="Number of gifts" value={String(data.totals.count)} />
	</div>

	{#if data.requests.length === 0}
		<Card.Root class="p-10 text-center text-sm text-muted-foreground">No requests yet.</Card.Root>
	{:else}
		<div class="grid gap-3">
			{#each data.requests as r (r.id)}
				<Card.Root class="flex flex-wrap items-center justify-between gap-3 p-4">
					<div class="min-w-0 text-sm">
						<p class="font-medium">{r.couple || 'Couple'} · {formatETB(r.amount)}</p>
						<p class="text-muted-foreground">{r.destination}</p>
						<p class="text-xs text-muted-foreground">
							#{r.id} · {fmt(r.createdAt)}{r.reference ? ` · ref ${r.reference}` : ''}
						</p>
					</div>
					{#if r.status === 'requested'}
						<div class="flex flex-wrap items-center gap-2">
							<ActionForm
								action="?/settle"
								fields={{ id: r.id, outcome: 'completed' }}
								class="flex gap-2"
							>
								{#snippet children({ busy })}
									<input
										name="reference"
										placeholder="Bank reference"
										aria-label="Bank reference"
										class="h-9 w-40 rounded-md border bg-background px-2 text-sm"
									/>
									<Button type="submit" size="sm" disabled={!!busy}>Mark sent</Button>
								{/snippet}
							</ActionForm>
							<ActionForm action="?/settle" fields={{ id: r.id, outcome: 'rejected' }}>
								{#snippet children({ busy })}
									<Button type="submit" size="sm" variant="ghost" disabled={!!busy}>Decline</Button>
								{/snippet}
							</ActionForm>
						</div>
					{:else}
						<Badge variant={r.status === 'completed' ? 'default' : 'secondary'}
							>{statusLabel(r.status)}</Badge
						>
					{/if}
				</Card.Root>
			{/each}
		</div>
	{/if}
</div>
