<script lang="ts">
	import PageHeader from '@nahu/admin-kit/components/PageHeader.svelte';
	import HiddenField from '@nahu/admin-kit/formComponents/HiddenField.svelte';
	import InputComp from '@nahu/admin-kit/formComponents/InputComp.svelte';
	import { createForm } from '@nahu/admin-kit/forms/createForm';
	import { Button } from '@nahu/admin-kit/components/ui/button/index.js';
	import { Badge } from '@nahu/admin-kit/components/ui/badge/index.js';
	import * as Card from '@nahu/admin-kit/components/ui/card/index.js';
	import * as Dialog from '@nahu/admin-kit/components/ui/dialog/index.js';
	import * as Tabs from '@nahu/admin-kit/components/ui/tabs/index.js';
	import { CheckIcon, Loader2Icon } from '@lucide/svelte';
	import TransferFields from '$lib/components/payments/TransferFields.svelte';
	import { planTransferSchema } from '$lib/schemas/payment';
	import { formatETB } from '$lib/money';
	import { m } from '$lib/paraglide/messages.js';

	let { data } = $props();

	type Plan = (typeof data.plans)[number];
	let checkout = $state<Plan | null>(null);
	let payMode = $state<'chapa' | 'transfer'>('chapa');

	// svelte-ignore state_referenced_locally
	const {
		form: transferData,
		errors: transferErrors,
		enhance: transferEnhance,
		submitting
	} = createForm(data.transferForm, planTransferSchema, {
		id: 'plan-transfer',
		resetForm: true,
		onUpdated: ({ form }) => {
			if (form.message?.type === 'success') checkout = null;
		}
	});

	function open(plan: Plan) {
		checkout = plan;
		payMode = 'chapa';
		$transferData.planId = plan.id;
	}

	function firstError(errors: unknown): string | undefined {
		if (Array.isArray(errors)) return errors[0];
		return (errors as { _errors?: string[] } | undefined)?._errors?.[0];
	}

	const cycle = (c: string) => (c === 'monthly' ? '/ month' : c === 'yearly' ? '/ year' : 'one-time');
</script>

<div class="space-y-6">
	<PageHeader
		title="Your plan"
		tabTitle="Plan — Vendor Dashboard"
		description={data.current
			? `You're on ${data.current.name}${data.current.endsAt ? ` until ${data.current.endsAt}` : ''}. Renew or switch any time; the new period starts when payment is confirmed.`
			: 'Choose a plan to grow your listing. Plans start when payment is confirmed.'}
	/>

	{#if data.pending.length}
		<Card.Root class="border-amber-300 p-4 text-sm">
			{#each data.pending as p (p.id)}
				<p>Receipt for {p.plan} ({formatETB(p.amount)}) is waiting for review.</p>
			{/each}
		</Card.Root>
	{/if}

	<div class="grid gap-5 md:grid-cols-2">
		{#each data.plans as plan (plan.id)}
			{@const isCurrent = data.current?.planId === plan.id}
			<Card.Root class={['flex flex-col', isCurrent && 'ring-2 ring-(--leora-gold)']}>
				<Card.Header>
					<div class="flex items-center justify-between">
						<Card.Title class="text-xl">{plan.name}</Card.Title>
						{#if isCurrent}<Badge>Current</Badge>{/if}
					</div>
					<p class="text-3xl font-bold">
						{formatETB(plan.price)}
						<span class="text-sm font-normal text-muted-foreground">{cycle(plan.billingCycle)}</span>
					</p>
				</Card.Header>
				<Card.Content class="flex-1">
					<ul class="space-y-2 text-sm">
						{#each plan.features ?? [] as feature, i (i)}
							<li class="flex gap-2"><CheckIcon class="mt-0.5 size-4 text-green-600" />{feature}</li>
						{/each}
					</ul>
				</Card.Content>
				<Card.Footer>
					<Button class="w-full" onclick={() => open(plan)}>
						{isCurrent ? 'Renew' : `Choose ${plan.name}`}
					</Button>
				</Card.Footer>
			</Card.Root>
		{/each}
	</div>
</div>

<Dialog.Root open={!!checkout} onOpenChange={(o) => !o && (checkout = null)}>
	<Dialog.Content class="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
		{#if checkout}
			<Dialog.Header>
				<Dialog.Title>{checkout.name}</Dialog.Title>
				<Dialog.Description>{formatETB(checkout.price)} {cycle(checkout.billingCycle)}</Dialog.Description>
			</Dialog.Header>
			<Tabs.Root bind:value={payMode}>
				<Tabs.List class="grid w-full grid-cols-2">
					<Tabs.Trigger value="chapa">{m.pay_method_chapa()}</Tabs.Trigger>
					<Tabs.Trigger value="transfer">{m.pay_method_transfer()}</Tabs.Trigger>
				</Tabs.List>
				<Tabs.Content value="chapa" class="pt-3">
					<p class="mb-4 text-sm text-muted-foreground">{m.pay_method_chapa_hint()}</p>
					<form method="POST" action="?/subscribe">
						<input type="hidden" name="planId" value={checkout.id} />
						<Button type="submit" class="w-full">{m.pay_chapa_submit()}</Button>
					</form>
				</Tabs.Content>
				<Tabs.Content value="transfer" class="pt-3">
					{#if data.accounts.length === 0}
						<p class="text-sm text-muted-foreground">{m.pay_no_accounts()}</p>
					{:else}
						<form
							method="POST"
							action="?/transfer"
							enctype="multipart/form-data"
							use:transferEnhance
							class="space-y-4"
						>
							<HiddenField name="planId" value={checkout.id} />
							<TransferFields
								form={transferData}
								accounts={data.accounts}
								total={checkout.price}
								accountError={firstError($transferErrors.bankAccountId)}
								receiptError={firstError($transferErrors.receipt)}
							/>
							<InputComp label={m.pay_reference()} form={transferData} errors={transferErrors} name="reference" />
							<Button type="submit" class="w-full" disabled={$submitting}>
								{#if $submitting}<Loader2Icon class="mr-2 size-4 animate-spin" />{/if}
								{m.pay_transfer_submit()}
							</Button>
						</form>
					{/if}
				</Tabs.Content>
			</Tabs.Root>
		{/if}
	</Dialog.Content>
</Dialog.Root>
