<script lang="ts">
	import FormCard from '@nahu/admin-kit/formComponents/FormCard.svelte';
	import InputComp from '@nahu/admin-kit/formComponents/InputComp.svelte';
	import Errors from '@nahu/admin-kit/formComponents/Errors.svelte';
	import LoadingBtn from '@nahu/admin-kit/formComponents/LoadingBtn.svelte';
	import { createForm } from '@nahu/admin-kit/forms/createForm';
	import { Button } from '@nahu/admin-kit/components/ui/button/index.js';
	import { Badge } from '@nahu/admin-kit/components/ui/badge/index.js';
	import ActionForm from '@nahu/admin-kit/formComponents/ActionForm.svelte';
	import ConfirmAction from '@nahu/admin-kit/components/ConfirmAction.svelte';
	import PageHeader from '$lib/components/admin/PageHeader.svelte';
	import { commissionSchema } from '$lib/schemas/admin';

	let { data } = $props();

	// svelte-ignore state_referenced_locally
	const { form, errors, enhance, delayed, allErrors } = createForm(data.form, commissionSchema, {
		resetForm: false
	});

	const typeItems = [
		{ value: 'percentage', name: 'Percentage' },
		{ value: 'fixed', name: 'Fixed (ETB)' }
	];
</script>

<div class="space-y-6">
	<PageHeader title="Settings" description="Platform-wide business rules." />

	<FormCard
		title="Marketplace commission"
		description="Taken from each confirmed vendor payment. {data.commission
			? `Currently ${data.commission.value}${data.commission.type === 'percentage' ? '%' : ' ETB flat'}.`
			: 'Not configured yet.'}"
	>
		<form method="POST" action="?/commission" use:enhance class="space-y-1">
			<Errors allErrors={$allErrors} />
			<InputComp
				{form}
				{errors}
				name="type"
				label="Commission type"
				type="select"
				items={typeItems}
			/>
			<InputComp {form} {errors} name="value" label="Value" type="number" min={0} required />
			<Button type="submit" class="mt-4" disabled={$delayed}>
				{#if $delayed}<LoadingBtn name="Saving" />{:else}Save{/if}
			</Button>
		</form>
	</FormCard>

	<FormCard
		title="Bank accounts for transfers"
		description="Couples who pay by bank transfer choose one of the active accounts and upload their receipt. Receipts are reviewed under Payments → To review."
	>
		{#if data.accounts.length}
			<ul class="mb-6 divide-y rounded-md border">
				{#each data.accounts as account (account.id)}
					<li class="flex flex-wrap items-center justify-between gap-3 p-3">
						<div>
							<p class="font-medium">
								{account.bankName}
								{#if !account.isActive}<Badge variant="secondary" class="ml-2">Hidden</Badge>{/if}
							</p>
							<p class="text-sm text-muted-foreground">
								{account.accountName} · <span class="tabular-nums">{account.accountNumber}</span>
							</p>
						</div>
						<div class="flex gap-2">
							<ActionForm action="?/toggleAccount" fields={{ id: account.id }}>
								{#snippet children({ busy })}
									<Button type="submit" variant="outline" size="sm" disabled={!!busy}>
										{account.isActive ? 'Hide' : 'Show'}
									</Button>
								{/snippet}
							</ActionForm>
							<ConfirmAction
								action="?/removeAccount"
								fields={{ id: account.id }}
								label="Remove"
								variant="outline"
								title="Remove {account.bankName} {account.accountNumber}?"
								description="It disappears from checkout. Past payments keep their record."
							/>
						</div>
					</li>
				{/each}
			</ul>
		{:else}
			<p class="mb-4 text-sm text-muted-foreground">
				No accounts yet — bank transfer is hidden from checkout until you add one.
			</p>
		{/if}

		<ActionForm action="?/addAccount" class="grid gap-3 sm:grid-cols-2">
			{#snippet children({ busy })}
				<input
					name="bankName"
					required
					placeholder="Bank (e.g. Commercial Bank of Ethiopia)"
					class="h-10 rounded-md border bg-background px-3"
				/>
				<input
					name="accountName"
					required
					placeholder="Account name"
					class="h-10 rounded-md border bg-background px-3"
				/>
				<input
					name="accountNumber"
					required
					inputmode="numeric"
					placeholder="Account number"
					class="h-10 rounded-md border bg-background px-3"
				/>
				<input
					name="sortOrder"
					type="number"
					min="0"
					value="0"
					aria-label="Sort order"
					class="h-10 rounded-md border bg-background px-3"
				/>
				<Button type="submit" class="sm:col-span-2" disabled={!!busy}>Add account</Button>
			{/snippet}
		</ActionForm>
	</FormCard>

	<p class="text-sm text-muted-foreground">
		Subscription plan prices live under <a href="/admin/subscriptions" class="underline"
			>Subscriptions</a
		>; coupons under <a href="/admin/coupons" class="underline">Coupons</a>.
	</p>
</div>
