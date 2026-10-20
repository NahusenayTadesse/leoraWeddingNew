<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
	import { createForm } from '@nahu/admin-kit/forms/createForm';
	import { weddingSchema, WEDDING_STYLES } from '$lib/schemas/wedding';
	import InputComp from '@nahu/admin-kit/formComponents/InputComp.svelte';
	import * as Card from '@nahu/admin-kit/components/ui/card/index.js';
	import { Button } from '@nahu/admin-kit/components/ui/button/index.js';
	import { CalendarHeart, Loader2, Users, Wallet } from '@lucide/svelte';

	let { data } = $props();

	// svelte-ignore state_referenced_locally
	const { form, errors, enhance, submitting } = createForm(data.form, weddingSchema, {
		resetForm: false
	});

	const styleItems = WEDDING_STYLES.map((s) => ({ value: s, name: s }));

	const daysAway = $derived.by(() => {
		if (!$form.weddingDate) return null;
		const target = new Date(`${$form.weddingDate}T00:00:00`);
		if (isNaN(target.getTime())) return null;
		// eslint-disable-next-line svelte/prefer-svelte-reactivity -- a local value, not state
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		return Math.round((target.getTime() - today.getTime()) / 86_400_000);
	});

	const perGuest = $derived(
		Number($form.totalBudget) > 0 && Number($form.expectedGuests) > 0
			? Math.round(Number($form.totalBudget) / Number($form.expectedGuests))
			: null
	);

	const etb = (n: number) => new Intl.NumberFormat('en-ET', { maximumFractionDigits: 0 }).format(n);
</script>

<div class="space-y-6">
	<div>
		<h1 class="text-2xl font-semibold tracking-tight">
			{data.isNew ? m.wd_setup() : m.wd_details()}
		</h1>
		<p class="text-sm text-muted-foreground">
			{data.isNew ? m.wd_setup_hint() : m.wd_edit_hint()}
		</p>
	</div>

	{#if !data.isNew}
		<div class="grid gap-3 sm:grid-cols-3">
			<Card.Root class="p-4">
				<div class="flex items-center gap-2 text-xs text-muted-foreground">
					<CalendarHeart class="size-4" />
					{m.wd_countdown()}
				</div>
				<p class="mt-1 text-2xl font-semibold">
					{#if daysAway === null}
						—
					{:else if daysAway > 0}
						{daysAway}
						<span class="text-base font-normal text-muted-foreground">{m.wd_days()}</span>
					{:else if daysAway === 0}
						{m.wov_today()}
					{:else}
						<span class="text-base font-normal">{m.wd_past()}</span>
					{/if}
				</p>
			</Card.Root>

			<Card.Root class="p-4">
				<div class="flex items-center gap-2 text-xs text-muted-foreground">
					<Users class="size-4" />
					{m.wd_expected()}
				</div>
				<p class="mt-1 text-2xl font-semibold">{$form.expectedGuests || '—'}</p>
			</Card.Root>

			<Card.Root class="p-4">
				<div class="flex items-center gap-2 text-xs text-muted-foreground">
					<Wallet class="size-4" />
					{m.wd_per_guest()}
				</div>
				<p class="mt-1 text-2xl font-semibold">
					{perGuest ? `${etb(perGuest)} ETB` : '—'}
				</p>
			</Card.Root>
		</div>
	{/if}

	<form method="POST" use:enhance>
		<Card.Root>
			<Card.Header>
				<Card.Title>{m.wd_big_day()}</Card.Title>
				<Card.Description>{m.wd_change_later()}</Card.Description>
			</Card.Header>

			<Card.Content class="grid gap-3 sm:grid-cols-2">
				<InputComp
					label={m.wd_date()}
					{form}
					{errors}
					name="weddingDate"
					type="date"
					oldDays={false}
					year={true}
				/>

				<InputComp
					label={m.wd_style()}
					{form}
					{errors}
					name="weddingStyle"
					type="select"
					items={styleItems}
					placeholder={m.wd_choose_style()}
				/>

				<InputComp
					label={m.wd_city()}
					{form}
					{errors}
					name="city"
					type="combo"
					items={data.cityItems}
					placeholder={m.wd_search_cities()}
				/>

				<InputComp
					label={m.wd_expected()}
					{form}
					{errors}
					name="expectedGuests"
					type="number"
					min="1"
					placeholder="250"
				/>

				<div class="sm:col-span-2">
					<InputComp
						label={m.wd_total_budget()}
						{form}
						{errors}
						name="totalBudget"
						type="number"
						min="0"
						placeholder="500000"
					/>
					{#if perGuest}
						<p class="px-1 text-sm text-muted-foreground">
							About <span class="font-medium text-foreground">{etb(perGuest)} ETB</span> per guest.
						</p>
					{/if}
				</div>
			</Card.Content>

			<Card.Footer class="justify-end border-t pt-6">
				<Button type="submit" disabled={$submitting}>
					{#if $submitting}<Loader2 class="mr-2 size-4 animate-spin" />{/if}
					{data.isNew ? m.wd_save_continue() : m.wd_save()}
				</Button>
			</Card.Footer>
		</Card.Root>
	</form>
</div>
