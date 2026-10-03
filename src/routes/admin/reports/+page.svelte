<script lang="ts">
	import Chart from '$lib/components/admin/Chart.svelte';
	import ChartCard from '$lib/components/admin/ChartCard.svelte';
	import Kpi from '$lib/components/admin/Kpi.svelte';
	import PageHeader from '$lib/components/admin/PageHeader.svelte';
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Table from '$lib/components/ui/table/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { formatETB, formatETBWhole } from '$lib/money';
	import { Download } from '@lucide/svelte';

	let { data } = $props();

	const monthly = $derived(
		data.revenue.labels.map((label, i) => ({
			label,
			subscriptions: data.revenue.subscriptions[i],
			commission: data.revenue.commission[i],
			platform: data.revenue.platform[i],
			gmv: data.revenue.gmv[i],
			couples: data.signups.couples[i],
			vendors: data.signups.vendors[i],
			bookings: data.bookings.bookings[i]
		}))
	);

	const presets = [
		{ label: '3 months', m: 3 },
		{ label: '6 months', m: 6 },
		{ label: '12 months', m: 12 }
	];
	function presetHref(m: number) {
		const to = new Date();
		const from = new Date(to.getFullYear(), to.getMonth() - (m - 1), 1);
		const local = (d: Date) =>
			`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
		return `?from=${local(from)}&to=${local(to)}`;
	}

	const csvCell = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
	function exportCsv() {
		const header = ['Month', 'Subscriptions', 'Commission', 'Platform revenue', 'Booking volume', 'New couples', 'New vendors', 'Bookings'];
		const rows = monthly.map((r) => [r.label, r.subscriptions, r.commission, r.platform, r.gmv, r.couples, r.vendors, r.bookings]);
		const csv = [header, ...rows].map((r) => r.map(csvCell).join(',')).join('\n');
		const a = document.createElement('a');
		a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
		a.download = `leora-report-${data.from}_${data.to}.csv`;
		a.click();
		URL.revokeObjectURL(a.href);
	}
</script>

<div class="space-y-6">
	<PageHeader title="Reports" description="Revenue, growth and vendor performance for a date range.">
		<Button variant="outline" onclick={exportCsv}><Download class="size-4" /> Export CSV</Button>
	</PageHeader>

	<Card.Root>
		<Card.Content class="flex flex-wrap items-end gap-3 py-4">
			<form method="GET" class="flex flex-wrap items-end gap-3">
				<label class="text-sm">From <Input type="date" name="from" value={data.from} class="mt-1 w-40" /></label>
				<label class="text-sm">To <Input type="date" name="to" value={data.to} class="mt-1 w-40" /></label>
				<Button type="submit">Apply</Button>
			</form>
			<div class="flex gap-2">
				{#each presets as p (p.m)}
					<Button variant="ghost" size="sm" href={presetHref(p.m)}>{p.label}</Button>
				{/each}
			</div>
		</Card.Content>
	</Card.Root>

	<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
		<Kpi label="Platform revenue" value={formatETBWhole(data.totals.platform)} />
		<Kpi label="Subscriptions" value={formatETBWhole(data.totals.subscriptions)} />
		<Kpi label="Commission" value={formatETBWhole(data.totals.commission)} />
		<Kpi label="Booking volume" value={formatETBWhole(data.totals.gmv)} />
		<Kpi label="New couples" value={data.totals.couples} />
		<Kpi label="New vendors" value={data.totals.vendors} />
		<Kpi label="Bookings" value={data.totals.bookings} />
	</div>

	<div class="grid gap-4 lg:grid-cols-2">
		<ChartCard title="Platform revenue">
			<Chart type="line" money labels={data.revenue.labels} datasets={[{ label: 'Platform revenue', data: data.revenue.platform }]} />
		</ChartCard>
		<ChartCard title="Booking volume (GMV)">
			<Chart type="bar" money labels={data.revenue.labels} datasets={[{ label: 'GMV', data: data.revenue.gmv, color: '#3b82c4' }]} />
		</ChartCard>
		<ChartCard title="Growth">
			<Chart
				type="bar"
				labels={data.signups.labels}
				datasets={[
					{ label: 'Couples', data: data.signups.couples },
					{ label: 'Vendors', data: data.signups.vendors, color: '#3b82c4' }
				]}
			/>
		</ChartCard>
		<ChartCard title="Top vendors by volume" description="Confirmed payments in range">
			<Chart type="bar" horizontal money labels={data.vendors.map((v) => v.name)} datasets={[{ label: 'Gross', data: data.vendors.map((v) => v.gross), color: '#2a9d8f' }]} />
		</ChartCard>
	</div>

	<Card.Root>
		<Card.Header><Card.Title class="text-base">Monthly breakdown</Card.Title></Card.Header>
		<Card.Content class="overflow-x-auto">
			<Table.Root>
				<Table.Header>
					<Table.Row>
						<Table.Head>Month</Table.Head>
						<Table.Head class="text-right">Subscriptions</Table.Head>
						<Table.Head class="text-right">Commission</Table.Head>
						<Table.Head class="text-right">Platform</Table.Head>
						<Table.Head class="text-right">GMV</Table.Head>
						<Table.Head class="text-right">Couples</Table.Head>
						<Table.Head class="text-right">Vendors</Table.Head>
						<Table.Head class="text-right">Bookings</Table.Head>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{#each monthly as r (r.label)}
						<Table.Row>
							<Table.Cell class="font-medium">{r.label}</Table.Cell>
							<Table.Cell class="text-right">{formatETB(r.subscriptions)}</Table.Cell>
							<Table.Cell class="text-right">{formatETB(r.commission)}</Table.Cell>
							<Table.Cell class="text-right">{formatETB(r.platform)}</Table.Cell>
							<Table.Cell class="text-right">{formatETB(r.gmv)}</Table.Cell>
							<Table.Cell class="text-right">{r.couples}</Table.Cell>
							<Table.Cell class="text-right">{r.vendors}</Table.Cell>
							<Table.Cell class="text-right">{r.bookings}</Table.Cell>
						</Table.Row>
					{/each}
				</Table.Body>
			</Table.Root>
		</Card.Content>
	</Card.Root>

	<Card.Root>
		<Card.Header><Card.Title class="text-base">Top vendors</Card.Title></Card.Header>
		<Card.Content class="overflow-x-auto">
			<Table.Root>
				<Table.Header>
					<Table.Row>
						<Table.Head>Vendor</Table.Head>
						<Table.Head class="text-right">Payments</Table.Head>
						<Table.Head class="text-right">Gross</Table.Head>
						<Table.Head class="text-right">Commission</Table.Head>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{#each data.vendors as v (v.id)}
						<Table.Row>
							<Table.Cell class="font-medium">{v.name}</Table.Cell>
							<Table.Cell class="text-right">{v.payments}</Table.Cell>
							<Table.Cell class="text-right">{formatETB(v.gross)}</Table.Cell>
							<Table.Cell class="text-right">{formatETB(v.commission)}</Table.Cell>
						</Table.Row>
					{:else}
						<Table.Row><Table.Cell colspan={4} class="text-muted-foreground text-center">No payments in this range.</Table.Cell></Table.Row>
					{/each}
				</Table.Body>
			</Table.Root>
		</Card.Content>
	</Card.Root>
</div>
