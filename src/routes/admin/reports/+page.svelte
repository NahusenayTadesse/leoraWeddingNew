<script lang="ts">
	import Chart from '$lib/components/admin/Chart.svelte';
	import ChartCard from '$lib/components/admin/ChartCard.svelte';
	import Kpi from '$lib/components/admin/Kpi.svelte';
	import PageHeader from '$lib/components/admin/PageHeader.svelte';
	import type { ColumnDef } from '@tanstack/table-core';
	import * as Card from '@nahu/admin-kit/components/ui/card/index.js';
	import { Button } from '@nahu/admin-kit/components/ui/button/index.js';
	import DataTable from '@nahu/admin-kit/components/Table/data-table.svelte';
	import PeriodFilter from '@nahu/admin-kit/formComponents/PeriodFilter.svelte';
	import { formatETB, formatETBWhole } from '$lib/money';
	import { sortable } from '$lib/cells';

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

	type Month = (typeof monthly)[number];
	type TopVendor = (typeof data.vendors)[number];

	/** A money column with its total under it. */
	const moneyColumn = (key: keyof Month & string, header: string): ColumnDef<Month> => ({
		id: key,
		accessorKey: key,
		header,
		meta: { align: 'right' },
		cell: ({ row }) => formatETB(row.original[key] as number),
		footer: ({ table }) =>
			formatETB(table.getCoreRowModel().rows.reduce((sum, r) => sum + (r.original[key] as number), 0))
	});
	const countColumn = (key: keyof Month & string, header: string): ColumnDef<Month> => ({
		id: key,
		accessorKey: key,
		header,
		meta: { align: 'right' },
		footer: ({ table }) =>
			String(table.getCoreRowModel().rows.reduce((sum, r) => sum + (r.original[key] as number), 0))
	});

	const monthlyColumns: ColumnDef<Month>[] = [
		{ id: 'label', accessorKey: 'label', header: 'Month', footer: 'Total' },
		moneyColumn('subscriptions', 'Subscriptions'),
		moneyColumn('commission', 'Commission'),
		moneyColumn('platform', 'Platform'),
		moneyColumn('gmv', 'GMV'),
		countColumn('couples', 'Couples'),
		countColumn('vendors', 'Vendors'),
		countColumn('bookings', 'Bookings')
	];

	const vendorColumns: ColumnDef<TopVendor>[] = [
		{ id: 'name', accessorKey: 'name', header: sortable('Vendor') },
		{ id: 'payments', accessorKey: 'payments', header: sortable('Payments'), meta: { align: 'right' } },
		{
			id: 'gross',
			accessorKey: 'gross',
			header: sortable('Gross'),
			meta: { align: 'right' },
			cell: ({ row }) => formatETB(row.original.gross)
		},
		{
			id: 'commission',
			accessorKey: 'commission',
			header: sortable('Commission'),
			meta: { align: 'right' },
			cell: ({ row }) => formatETB(row.original.commission)
		}
	];
</script>

<div class="space-y-6">
	<PageHeader title="Reports" description="Revenue, growth and vendor performance for a date range." />

	<Card.Root>
		<Card.Content class="flex flex-wrap items-end gap-3 py-4">
			<PeriodFilter from={data.from} to={data.to} />
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
		<Card.Content>
			<DataTable
				columns={monthlyColumns}
				data={monthly}
				search={false}
				paginate={false}
				height="auto"
				fileName="leora-report-{data.from}_{data.to}"
			/>
		</Card.Content>
	</Card.Root>

	<Card.Root>
		<Card.Header><Card.Title class="text-base">Top vendors</Card.Title></Card.Header>
		<Card.Content>
			{#if data.vendors.length}
				<DataTable
					columns={vendorColumns}
					data={data.vendors}
					search={false}
					paginate={false}
					height="auto"
					fileName="leora-top-vendors-{data.from}_{data.to}"
				/>
			{:else}
				<p class="text-muted-foreground py-6 text-center text-sm">No payments in this range.</p>
			{/if}
		</Card.Content>
	</Card.Root>
</div>
