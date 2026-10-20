<script lang="ts">
	import { createForm } from '@nahu/admin-kit/forms/createForm';
	import { coupleSchema } from '$lib/schemas/couples';
	import { slugify } from '$lib/utils/slugify';
	import InputComp from '@nahu/admin-kit/formComponents/InputComp.svelte';
	import * as Card from '@nahu/admin-kit/components/ui/card/index.js';
	import { Button } from '@nahu/admin-kit/components/ui/button/index.js';
	import { Badge } from '@nahu/admin-kit/components/ui/badge/index.js';
	import { BadgeCheck, Loader2 } from '@lucide/svelte';

	let { data } = $props();

	// svelte-ignore state_referenced_locally
	const { form, errors, enhance, submitting } = createForm(data.form, coupleSchema, {
		resetForm: false
	});

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
			<p class="text-sm text-muted-foreground">
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
					<p class="px-1 text-sm text-muted-foreground">
						leoraevents.com/w/<span class="font-medium text-foreground">{previewSlug}</span>
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
