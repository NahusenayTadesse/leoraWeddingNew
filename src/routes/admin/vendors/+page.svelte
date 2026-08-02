<script lang="ts">
	import { tick } from 'svelte';
	import { superForm } from 'sveltekit-superforms';
	import { toast } from 'svelte-sonner';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import DataTable from '$lib/components/Table/data-table.svelte';
	import { Check, X, Ban, RotateCcw, MoreVertical, ShieldCheck } from '@lucide/svelte';
	import { vendorColumns, type VendorRow } from './columns';

	let { data } = $props();

	const statusForm = superForm(data.statusForm, {
		id: 'status',
		resetForm: false,
		onUpdated: ({ form }) => {
			if (form.message) toast[form.message.type === 'error' ? 'error' : 'success'](form.message.text);
		}
	});
	const { form, enhance } = statusForm;

	async function updateStatus(id: number, status: VendorRow['status']) {
		$form.id = id;
		$form.status = status;
		// The hidden inputs are bound reactively — the DOM write has to flush
		// before the synthetic submit reads it, or the request goes out with
		// last render's (stale/empty) values and the server rejects it.
		await tick();
		document.getElementById('vendor-status-form')?.dispatchEvent(new Event('submit', { cancelable: true }));
	}

	const statusVariant = {
		approved: 'default',
		pending: 'secondary',
		rejected: 'destructive',
		suspended: 'outline'
	} as const;

	const columns = vendorColumns({ business: businessCell, status: statusCell, actions: actionsCell });
</script>

<svelte:head>
	<title>Vendors — Admin Console</title>
</svelte:head>

<form id="vendor-status-form" method="POST" action="?/updateStatus" use:enhance class="hidden">
	<input type="hidden" name="id" bind:value={$form.id} />
	<input type="hidden" name="status" bind:value={$form.status} />
</form>

{#snippet businessCell(row: VendorRow)}
	<div class="flex items-center gap-2">
		<span class="font-medium">{row.businessName}</span>
		{#if row.isVerified}
			<ShieldCheck class="size-3.5 text-emerald-600" />
		{/if}
	</div>
	{#if row.email || row.phone}
		<p class="text-muted-foreground text-xs">{[row.email, row.phone].filter(Boolean).join(' · ')}</p>
	{/if}
{/snippet}

{#snippet statusCell(row: VendorRow)}
	<Badge variant={statusVariant[row.status]}>{row.status}</Badge>
{/snippet}

{#snippet actionsCell(row: VendorRow)}
	<DropdownMenu.Root>
		<DropdownMenu.Trigger>
			{#snippet child({ props })}
				<Button {...props} variant="ghost" size="icon">
					<MoreVertical class="size-4" />
				</Button>
			{/snippet}
		</DropdownMenu.Trigger>
		<DropdownMenu.Content align="end">
			{#if row.status !== 'approved'}
				<DropdownMenu.Item onclick={() => updateStatus(row.id, 'approved')}>
					<Check class="size-4" /> Approve
				</DropdownMenu.Item>
			{/if}
			{#if row.status !== 'rejected'}
				<DropdownMenu.Item onclick={() => updateStatus(row.id, 'rejected')}>
					<X class="size-4" /> Reject
				</DropdownMenu.Item>
			{/if}
			{#if row.status === 'approved'}
				<DropdownMenu.Item onclick={() => updateStatus(row.id, 'suspended')}>
					<Ban class="size-4" /> Suspend
				</DropdownMenu.Item>
			{/if}
			{#if row.status === 'suspended' || row.status === 'rejected'}
				<DropdownMenu.Item onclick={() => updateStatus(row.id, 'pending')}>
					<RotateCcw class="size-4" /> Reset to pending
				</DropdownMenu.Item>
			{/if}
		</DropdownMenu.Content>
	</DropdownMenu.Root>
{/snippet}

<div class="space-y-6">
	<div>
		<h1 class="text-2xl font-semibold tracking-tight">Vendors</h1>
		<p class="text-muted-foreground text-sm">Approve, reject or suspend vendor listings.</p>
	</div>

	<DataTable data={data.rows as VendorRow[]} {columns} fileName="Vendors" />
</div>
