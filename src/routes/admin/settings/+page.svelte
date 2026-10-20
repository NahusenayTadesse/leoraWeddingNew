<script lang="ts">
	import FormCard from '@nahu/admin-kit/formComponents/FormCard.svelte';
	import InputComp from '@nahu/admin-kit/formComponents/InputComp.svelte';
	import Errors from '@nahu/admin-kit/formComponents/Errors.svelte';
	import LoadingBtn from '@nahu/admin-kit/formComponents/LoadingBtn.svelte';
	import { createForm } from '@nahu/admin-kit/forms/createForm';
	import { Button } from '@nahu/admin-kit/components/ui/button/index.js';
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
			<InputComp {form} {errors} name="type" label="Commission type" type="select" items={typeItems} />
			<InputComp {form} {errors} name="value" label="Value" type="number" min={0} required />
			<Button type="submit" class="mt-4" disabled={$delayed}>
				{#if $delayed}<LoadingBtn name="Saving" />{:else}Save{/if}
			</Button>
		</form>
	</FormCard>

	<p class="text-muted-foreground text-sm">
		Subscription plan prices live under <a href="/admin/subscriptions" class="underline">Subscriptions</a>;
		coupons under <a href="/admin/coupons" class="underline">Coupons</a>.
	</p>
</div>
