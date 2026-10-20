<script lang="ts">
	import type { ColumnDef } from '@tanstack/table-core';
	import * as Dialog from '@nahu/admin-kit/components/ui/dialog/index.js';
	import * as Card from '@nahu/admin-kit/components/ui/card/index.js';
	import { Button } from '@nahu/admin-kit/components/ui/button/index.js';
	import InputComp from '@nahu/admin-kit/formComponents/InputComp.svelte';
	import FormDialog from '@nahu/admin-kit/formComponents/FormDialog.svelte';
	import DataTable from '@nahu/admin-kit/components/Table/data-table.svelte';
	import PageHeader from '$lib/components/admin/PageHeader.svelte';
	import { subscriptionPlanEditSchema } from '$lib/schemas/admin';
	import { formatETB } from '$lib/money';
	import { date, sortable, status, words } from '$lib/cells';
	import { Pencil, Users, CreditCard } from '@lucide/svelte';

	let { data } = $props();

	type Plan = (typeof data.plans)[number];
	type Subscriber = (typeof data.subscribers)[number];

	let editing = $state<Plan | null>(null);
	let editOpen = $state(false);
	let subscribersFor = $state<{ id: number; name: string } | null>(null);

	const billingItems = [
		{ value: 'one_time', name: 'One-time' },
		{ value: 'monthly', name: 'Monthly' },
		{ value: 'yearly', name: 'Yearly' }
	];

	function openEdit(plan: Plan) {
		editing = plan;
		editOpen = true;
	}

	const columns: ColumnDef<Subscriber>[] = [
		{ id: 'name', accessorKey: 'name', header: sortable('Name') },
		{
			id: 'email',
			accessorKey: 'email',
			header: 'Email',
			cell: ({ row }) => row.original.email ?? '—'
		},
		{
			id: 'kind',
			accessorKey: 'kind',
			header: 'Account',
			cell: ({ row }) => words(row.original.kind)
		},
		{
			id: 'status',
			accessorKey: 'status',
			header: 'Status',
			cell: ({ row }) => status(row.original.status)
		},
		{
			id: 'startedAt',
			accessorKey: 'startedAt',
			header: sortable('Since'),
			cell: ({ row }) => date(row.original.startedAt)
		},
		{
			id: 'expiresAt',
			accessorKey: 'expiresAt',
			header: sortable('Expires'),
			cell: ({ row }) => (row.original.expiresAt ? date(row.original.expiresAt) : 'No expiry')
		}
	];

	const subscribersForPlan = $derived(
		subscribersFor ? data.subscribers.filter((s) => s.planId === subscribersFor!.id) : []
	);
</script>

<div class="space-y-6">
	<PageHeader
		title="Subscriptions"
		description="Edit plan pricing and see who's subscribed to each."
	/>

	<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
		{#each data.plans as plan (plan.id)}
			{@const subscriberCount = data.subscribers.filter((s) => s.planId === plan.id).length}
			<Card.Root>
				<Card.Header>
					<Card.Title class="flex items-baseline justify-between gap-2">
						<span>{plan.name}</span>
						<span class="text-lg font-bold whitespace-nowrap text-primary"
							>{formatETB(plan.price)}</span
						>
					</Card.Title>
					<Card.Description class="capitalize">
						{plan.billingCycle.replace('_', ' ')} · {plan.audience}
					</Card.Description>
				</Card.Header>
				<Card.Content class="space-y-3">
					{#if plan.features?.length}
						<ul class="space-y-1 text-sm">
							<!-- Index-keyed — see the pricing page: duplicate bullets are valid input. -->
							{#each plan.features.slice(0, 4) as feature, i (i)}
								<li class="text-muted-foreground">• {feature}</li>
							{/each}
						</ul>
					{/if}
					<div class="flex items-center justify-between gap-1 pt-2">
						<Button
							variant="ghost"
							size="sm"
							onclick={() => (subscribersFor = { id: plan.id, name: plan.name })}
						>
							<Users class="mr-2 size-4" />
							{subscriberCount} subscriber{subscriberCount === 1 ? '' : 's'}
						</Button>
						<Button variant="ghost" size="icon" onclick={() => openEdit(plan)}>
							<Pencil class="size-4" />
						</Button>
					</div>
				</Card.Content>
			</Card.Root>
		{:else}
			<Card.Root class="sm:col-span-2 lg:col-span-3">
				<Card.Content class="py-16 text-center">
					<CreditCard class="text-muted-foreground mx-auto size-8" />
					<p class="text-muted-foreground mt-3 text-sm">No subscription plans found.</p>
				</Card.Content>
			</Card.Root>
		{/each}
	</div>
</div>

<FormDialog
	title="Edit {editing?.name ?? 'plan'}"
	action="?/edit"
	data={data.editForm}
	schema={subscriptionPlanEditSchema}
	bind:open={editOpen}
	seed={editing
		? {
				id: editing.id,
				name: editing.name,
				price: editing.price,
				billingCycle: editing.billingCycle,
				features: (editing.features ?? []).join('\n')
			}
		: {}}
	hideTrigger
	submitLabel="Save changes"
>
	{#snippet fields({ form, errors })}
		<InputComp {form} {errors} name="id" type="hidden" />
		<InputComp {form} {errors} name="name" label="Plan name" />
		<InputComp {form} {errors} name="price" label="Price (ETB)" type="number" min={0} />
		<InputComp
			{form}
			{errors}
			name="billingCycle"
			label="Billing cycle"
			type="select"
			items={billingItems}
		/>
		<InputComp
			{form}
			{errors}
			name="features"
			label="Features (one per line)"
			type="textarea"
			rows={5}
		/>
	{/snippet}
</FormDialog>

<!-- Subscriber list -->
<Dialog.Root open={subscribersFor !== null} onOpenChange={(v) => !v && (subscribersFor = null)}>
	<Dialog.Content class="sm:max-w-3xl">
		<Dialog.Header>
			<Dialog.Title>Subscribers — {subscribersFor?.name}</Dialog.Title>
		</Dialog.Header>
		{#if subscribersForPlan.length === 0}
			<p class="py-8 text-center text-sm text-muted-foreground">
				No one is subscribed to this plan yet.
			</p>
		{:else}
			<DataTable
				data={subscribersForPlan}
				{columns}
				variant="compact"
				facetKeys={['kind', 'status']}
				facetLabels={{ kind: 'Account', status: 'Status' }}
				fileName="Subscribers — {subscribersFor?.name}"
			/>
		{/if}
	</Dialog.Content>
</Dialog.Root>
