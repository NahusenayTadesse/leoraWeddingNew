<script lang="ts">
	import { superForm } from 'sveltekit-superforms';
	import { zod4Client } from 'sveltekit-superforms/adapters';
	import { coupleSchema } from '$lib/schemas/couples';
	import { slugify } from '$lib/utils/slugify';
	import InputComp from '$lib/formComponents/InputComp.svelte';
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { toast } from 'svelte-sonner';
	import { BadgeCheck, Loader2 } from '@lucide/svelte';

	let { data } = $props();

	const sf = superForm(data.form, {
		validators: zod4Client(coupleSchema),
		resetForm: false,
		onUpdated: ({ form }) => {
			if (form.message) toast.success(form.message);
		}
	});

	const { form, errors, enhance, submitting } = sf;

	const previewSlug = $derived(
		$form.slug || slugify(`${$form.brideName ?? ''}-${$form.groomName ?? ''}`) || '…'
	);
</script>

<div class="space-y-6">
	<div class="flex items-start justify-between gap-4">
		<div>
			<h1 class="text-2xl font-semibold tracking-tight">
				{data.isNew ? 'Welcome to Leora Events' : 'Couple details'}
			</h1>
			<p class="text-muted-foreground text-sm">
				{data.isNew
					? "Tell us who's getting married so we can set up your planning space."
					: 'Update your names and contact information.'}
			</p>
		</div>
		{#if !data.isNew}
			<Badge variant={data.verified ? 'default' : 'secondary'} class="gap-1">
				{#if data.verified}<BadgeCheck class="size-3.5" />{/if}
				{data.verified ? 'Verified' : 'Unverified'}
			</Badge>
		{/if}
	</div>

	<form method="POST" use:enhance>
		<Card.Root>
			<Card.Header>
				<Card.Title>The couple</Card.Title>
				<Card.Description>These names appear on your public wedding page.</Card.Description>
			</Card.Header>

			<Card.Content class="grid gap-3 sm:grid-cols-2">
				<InputComp
					label="bride's name"
					{form}
					{errors}
					name="brideName"
					type="text"
					required
					placeholder="Hanan"
				/>

				<InputComp
					label="groom's name"
					{form}
					{errors}
					name="groomName"
					type="text"
					required
					placeholder="Dawit"
				/>

				<InputComp
					label="primary phone"
					{form}
					{errors}
					name="phone"
					type="tel"
					required
					placeholder="0911234567"
				/>

				<InputComp
					label="secondary phone (optional)"
					{form}
					{errors}
					name="phone2"
					type="tel"
					placeholder="0911234567"
				/>

				<div class="sm:col-span-2">
					<InputComp
						label="contact email"
						{form}
						{errors}
						name="email"
						type="email"
						placeholder="you@example.com"
					/>
				</div>

				<div class="sm:col-span-2">
					<InputComp
						label="public link (optional)"
						{form}
						{errors}
						name="slug"
						type="text"
						placeholder="hanan-and-dawit"
					/>
					<p class="text-muted-foreground px-1 text-sm">
						leoraevents.com/w/<span class="text-foreground font-medium">{previewSlug}</span>
					</p>
				</div>
			</Card.Content>

			<Card.Footer class="justify-end gap-3 border-t pt-6">
				<Button type="submit" disabled={$submitting}>
					{#if $submitting}<Loader2 class="mr-2 size-4 animate-spin" />{/if}
					{data.isNew ? 'Create my planning space' : 'Save changes'}
				</Button>
			</Card.Footer>
		</Card.Root>
	</form>
</div>