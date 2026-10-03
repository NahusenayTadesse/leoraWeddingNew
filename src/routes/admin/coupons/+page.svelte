<script lang="ts">
	import PageHeader from '$lib/components/admin/PageHeader.svelte';
	import ActionForm from '$lib/components/admin/ActionForm.svelte';
	import StatusBadge from '$lib/components/admin/StatusBadge.svelte';
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Table from '$lib/components/ui/table/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { enhance } from '$app/forms';
	import { toast } from 'svelte-sonner';
	import { formatETB } from '$lib/money';

	let { data } = $props();
	let formEl: HTMLFormElement;
	const expired = (d: Date | string | null) => !!d && new Date(d) < new Date();
</script>

<div class="space-y-6">
	<PageHeader title="Coupons" description="Discount codes couples can apply at checkout." />

	<Card.Root>
		<Card.Header><Card.Title class="text-base">New coupon</Card.Title></Card.Header>
		<Card.Content>
			<form
				bind:this={formEl}
				method="POST"
				action="?/create"
				class="flex flex-wrap items-end gap-3"
				use:enhance={() => async ({ result, update }) => {
					const msg = (result as { data?: { message?: string } }).data?.message;
					if (result.type === 'success') {
						toast.success(msg ?? 'Created');
						formEl.reset();
					} else if (result.type === 'failure') toast.error(msg ?? 'Could not create coupon');
					await update({ reset: false });
				}}
			>
				<label class="text-sm">Code<Input name="code" required placeholder="WELCOME20" class="mt-1 w-40 uppercase" /></label>
				<label class="text-sm">Type
					<select name="type" class="border-input bg-background mt-1 block h-9 rounded-md border px-3 text-sm">
						<option value="percent">Percent off</option>
						<option value="flat">Flat ETB off</option>
					</select>
				</label>
				<label class="text-sm">Value<Input name="value" type="number" step="0.01" min="0" required class="mt-1 w-28" /></label>
				<label class="text-sm">Max uses<Input name="maxUses" type="number" min="1" placeholder="∞" class="mt-1 w-24" /></label>
				<label class="text-sm">Expires<Input name="expiresAt" type="date" class="mt-1 w-40" /></label>
				<Button type="submit">Create</Button>
			</form>
		</Card.Content>
	</Card.Root>

	<Card.Root><Card.Content class="overflow-x-auto p-0">
		<Table.Root>
			<Table.Header><Table.Row>
				<Table.Head>Code</Table.Head><Table.Head>Discount</Table.Head><Table.Head>Used</Table.Head><Table.Head>Expires</Table.Head><Table.Head>Status</Table.Head><Table.Head class="text-right">Actions</Table.Head>
			</Table.Row></Table.Header>
			<Table.Body>
				{#each data.rows as c (c.id)}
					<Table.Row>
						<Table.Cell class="font-mono font-medium">{c.code}</Table.Cell>
						<Table.Cell>{c.type === 'percent' ? `${c.value}%` : formatETB(c.value)}</Table.Cell>
						<Table.Cell>{c.usesCount}{c.maxUses ? ` / ${c.maxUses}` : ''}</Table.Cell>
						<Table.Cell>{c.expiresAt ? new Date(c.expiresAt).toLocaleDateString() : 'Never'}</Table.Cell>
						<Table.Cell><StatusBadge status={expired(c.expiresAt) ? 'expired' : c.isActive ? 'active' : 'paused'} /></Table.Cell>
						<Table.Cell class="space-x-2 text-right">
							<ActionForm action="?/toggle" fields={{ id: c.id }} label={c.isActive ? 'Pause' : 'Activate'} />
							<ActionForm action="?/remove" fields={{ id: c.id }} label="Delete" variant="destructive" confirmText="Delete coupon {c.code}?" />
						</Table.Cell>
					</Table.Row>
				{:else}
					<Table.Row><Table.Cell colspan={6} class="text-muted-foreground py-8 text-center">No coupons yet.</Table.Cell></Table.Row>
				{/each}
			</Table.Body>
		</Table.Root>
	</Card.Content></Card.Root>
</div>
