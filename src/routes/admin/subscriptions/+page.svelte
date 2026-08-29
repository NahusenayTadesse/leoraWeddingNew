<script lang="ts">
	import { superForm } from 'sveltekit-superforms';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import InputComp from '$lib/formComponents/InputComp.svelte';
	import Errors from '$lib/formComponents/Errors.svelte';
	import DataTable from '$lib/components/Table/data-table.svelte';
	import { formatETB } from '$lib/money';
	import { toast } from 'svelte-sonner';
	import { Pencil, Loader2, Users, CreditCard } from '@lucide/svelte';
	import { subscriberColumns, type SubscriberRow } from './columns';

	let { data } = $props();

	let editingId = $state<number | null>(null);
	let subscribersFor = $state<{ id: number; name: string } | null>(null);

	const editSf = superForm(data.editForm, {
		id: 'edit',
		resetForm: false,
		onUpdated: ({ form }) => {
			if (form.valid && form.message?.type === 'success') {
				toast.success(form.message.text);
				editingId = null;
			} else if (form.message?.type === 'error') {
				toast.error(form.message.text);
			}
		}
	});
	const { form: editForm, errors: editErrors, enhance: editEnhance, delayed: editDelayed, allErrors: editAllErrors } =
		editSf;

	const billingItems = [
		{ value: 'one_time', name: 'One-time' },
		{ value: 'monthly', name: 'Monthly' },
		{ value: 'yearly', name: 'Yearly' }
	];

	function openEdit(plan: (typeof data.plans)[number]) {
		editingId = plan.id;
		$editForm.id = plan.id;
		$editForm.name = plan.name;
		$editForm.price = plan.price;
		$editForm.billingCycle = plan.billingCycle;
		$editForm.features = (plan.features ?? []).join('\n');
	}

	const columns = subscriberColumns({ status: statusCell, dates: datesCell });

	const subscribersForPlan = $derived(
		subscribersFor ? data.subscribers.filter((s) => s.planId === subscribersFor!.id) : []
	);
</script>

<svelte:head>
	<title>Subscriptions — Admin Console</title>
</svelte:head>

{#snippet statusCell(row: SubscriberRow)}
	<Badge variant={row.status === 'active' ? 'default' : row.status === 'expired' ? 'outline' : 'destructive'}>
		{row.status}
	</Badge>
{/snippet}

{#snippet datesCell(row: SubscriberRow)}
	<span class="text-muted-foreground text-xs">
		{row.startedAt ? new Date(row.startedAt).toLocaleDateString() : '—'}
		→
		{row.expiresAt ? new Date(row.expiresAt).toLocaleDateString() : 'no expiry'}
	</span>
{/snippet}

<div class="space-y-6">
	<div>
		<h1 class="text-2xl font-semibold tracking-tight">Subscriptions</h1>
		<p class="text-muted-foreground text-sm">Edit plan pricing and see who's subscribed to each.</p>
	</div>

	<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
		{#each data.plans as plan (plan.id)}
			{@const subscriberCount = data.subscribers.filter((s) => s.planId === plan.id).length}
			<Card.Root>
				<Card.Header>
					<Card.Title class="flex items-baseline justify-between gap-2">
						<span>{plan.name}</span>
						<span class="text-primary text-lg font-bold whitespace-nowrap">{formatETB(plan.price)}</span>
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
							<Users class="mr-2 size-4" /> {subscriberCount} subscriber{subscriberCount === 1 ? '' : 's'}
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

<!-- Edit price -->
<Dialog.Root open={editingId !== null} onOpenChange={(v) => !v && (editingId = null)}>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>Edit plan</Dialog.Title>
		</Dialog.Header>
		<form method="POST" action="?/edit" use:editEnhance class="space-y-1">
			<input type="hidden" name="id" bind:value={$editForm.id} />
			<Errors allErrors={$editAllErrors} />
			<InputComp label="Plan name" name="name" type="text" form={editForm} errors={editErrors} />
			<InputComp label="Price (ETB)" name="price" type="number" placeholder="0" form={editForm} errors={editErrors} />
			<InputComp
				label="Billing cycle"
				name="billingCycle"
				type="select"
				items={billingItems}
				form={editForm}
				errors={editErrors}
			/>
			<InputComp
				label="Features (one per line)"
				name="features"
				type="textarea"
				rows={5}
				form={editForm}
				errors={editErrors}
			/>
			<Dialog.Footer class="pt-4">
				<Button type="button" variant="outline" onclick={() => (editingId = null)}>Cancel</Button>
				<Button type="submit" disabled={$editDelayed}>
					{#if $editDelayed}<Loader2 class="mr-2 size-4 animate-spin" />{/if}
					Save changes
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>

<!-- Subscriber list -->
<Dialog.Root open={subscribersFor !== null} onOpenChange={(v) => !v && (subscribersFor = null)}>
	<Dialog.Content class="sm:max-w-3xl">
		<Dialog.Header>
			<Dialog.Title>Subscribers — {subscribersFor?.name}</Dialog.Title>
		</Dialog.Header>
		{#if subscribersForPlan.length === 0}
			<p class="text-muted-foreground py-8 text-center text-sm">No one is subscribed to this plan yet.</p>
		{:else}
			<DataTable data={subscribersForPlan} {columns} fileName="Subscribers" />
		{/if}
	</Dialog.Content>
</Dialog.Root>
