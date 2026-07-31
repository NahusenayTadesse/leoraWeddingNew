<script lang="ts">
	import { superForm } from 'sveltekit-superforms';
	import { zod4Client } from 'sveltekit-superforms/adapters';
	import { weddingSchema, WEDDING_STYLES } from '$lib/schemas/wedding';
	import InputComp from '$lib/formComponents/InputComp.svelte';
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { toast } from 'svelte-sonner';
	import { CalendarHeart, Loader2, Users, Wallet } from '@lucide/svelte';

	let { data } = $props();

	const sf = superForm(data.form, {
		validators: zod4Client(weddingSchema),
		resetForm: false,
		onUpdated: ({ form }) => {
			if (form.message) toast.success(form.message);
		}
	});

	const { form, errors, enhance, submitting } = sf;

	const styleItems = WEDDING_STYLES.map((s) => ({ value: s, label: s }));

	const daysAway = $derived.by(() => {
		if (!$form.weddingDate) return null;
		const target = new Date(`${$form.weddingDate}T00:00:00`);
		if (isNaN(target.getTime())) return null;
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		return Math.round((target.getTime() - today.getTime()) / 86_400_000);
	});

	const perGuest = $derived(
		$form.totalBudget > 0 && $form.expectedGuests > 0
			? Math.round(Number($form.totalBudget) / Number($form.expectedGuests))
			: null
	);

	const etb = (n: number) => new Intl.NumberFormat('en-ET', { maximumFractionDigits: 0 }).format(n);
</script>

<div class="space-y-6">
	<div>
		<h1 class="text-2xl font-semibold tracking-tight">
			{data.isNew ? 'Set up your wedding' : 'Wedding details'}
		</h1>
		<p class="text-muted-foreground text-sm">
			{data.isNew
				? 'These details drive your budget, guest list and vendor recommendations.'
				: 'Changing the date or budget updates the rest of your dashboard.'}
		</p>
	</div>

	{#if !data.isNew}
		<div class="grid gap-3 sm:grid-cols-3">
			<Card.Root class="p-4">
				<div class="text-muted-foreground flex items-center gap-2 text-xs">
					<CalendarHeart class="size-4" /> Countdown
				</div>
				<p class="mt-1 text-2xl font-semibold">
					{#if daysAway === null}
						—
					{:else if daysAway > 0}
						{daysAway} <span class="text-muted-foreground text-base font-normal">days</span>
					{:else if daysAway === 0}
						Today!
					{:else}
						<span class="text-base font-normal">Past</span>
					{/if}
				</p>
			</Card.Root>

			<Card.Root class="p-4">
				<div class="text-muted-foreground flex items-center gap-2 text-xs">
					<Users class="size-4" /> Expected guests
				</div>
				<p class="mt-1 text-2xl font-semibold">{$form.expectedGuests || '—'}</p>
			</Card.Root>

			<Card.Root class="p-4">
				<div class="text-muted-foreground flex items-center gap-2 text-xs">
					<Wallet class="size-4" /> Per guest
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
				<Card.Title>The big day</Card.Title>
				<Card.Description>You can change any of this later.</Card.Description>
			</Card.Header>

			<Card.Content class="grid gap-3 sm:grid-cols-2">
				<InputComp
					label="wedding date"
					{form}
					{errors}
					name="weddingDate"
					type="date"
					oldDays={false}
					futureDays={true}
					year={true}
				/>

				<InputComp
					label="wedding style"
					{form}
					{errors}
					name="weddingStyle"
					type="select"
					items={styleItems}
					placeholder="Choose a style"
				/>

				<InputComp
					label="city"
					{form}
					{errors}
					name="city"
					type="combo"
					items={data.cityItems}
					placeholder="Search cities"
				/>

				<InputComp
					label="expected guests"
					{form}
					{errors}
					name="expectedGuests"
					type="number"
					min="1"
					placeholder="250"
				/>

				<div class="sm:col-span-2">
					<InputComp
						label="total budget (ETB)"
						{form}
						{errors}
						name="totalBudget"
						type="number"
						min="0"
						placeholder="500000"
					/>
					{#if perGuest}
						<p class="text-muted-foreground px-1 text-sm">
							About <span class="text-foreground font-medium">{etb(perGuest)} ETB</span> per guest.
						</p>
					{/if}
				</div>
			</Card.Content>

			<Card.Footer class="justify-end border-t pt-6">
				<Button type="submit" disabled={$submitting}>
					{#if $submitting}<Loader2 class="mr-2 size-4 animate-spin" />{/if}
					{data.isNew ? 'Save and continue' : 'Save changes'}
				</Button>
			</Card.Footer>
		</Card.Root>
	</form>
</div>