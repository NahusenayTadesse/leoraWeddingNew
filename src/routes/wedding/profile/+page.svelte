<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
	import { createForm } from '@nahu/admin-kit/forms/createForm';
	import { coupleSchema } from '$lib/schemas/couples';
	import InputComp from '@nahu/admin-kit/formComponents/InputComp.svelte';
	import * as Card from '@nahu/admin-kit/components/ui/card/index.js';
	import { Button } from '@nahu/admin-kit/components/ui/button/index.js';
	import { Badge } from '@nahu/admin-kit/components/ui/badge/index.js';
	import ActionForm from '@nahu/admin-kit/formComponents/ActionForm.svelte';
	import { BadgeCheck, Loader2, Users } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';

	async function copyInvite(link: string) {
		try {
			await navigator.clipboard.writeText(link);
			toast.success(m.partner_copied());
		} catch {
			// Clipboard blocked (http, old browser): the link is on screen to copy by hand.
		}
	}

	let { data } = $props();

	// svelte-ignore state_referenced_locally
	const { form, errors, enhance, submitting } = createForm(data.form, coupleSchema, {
		resetForm: false
	});
</script>

<div class="space-y-6">
	<div class="flex items-start justify-between gap-4">
		<div>
			<h1 class="text-2xl font-semibold tracking-tight">
				{data.isNew ? m.cp_welcome() : m.nav_couple_details()}
			</h1>
			<p class="text-sm text-muted-foreground">
				{data.isNew ? m.cp_new_hint() : m.cp_edit_hint()}
			</p>
		</div>
		{#if !data.isNew}
			<Badge variant={data.verified ? 'default' : 'secondary'} class="gap-1">
				{#if data.verified}<BadgeCheck class="size-3.5" />{/if}
				{data.verified ? m.vdet_verified() : m.cp_unverified()}
			</Badge>
		{/if}
	</div>

	<form method="POST" action="?/save" use:enhance>
		<Card.Root>
			<Card.Header>
				<Card.Title>{m.cp_couple()}</Card.Title>
				<Card.Description>{m.cp_names_hint()}</Card.Description>
			</Card.Header>

			<Card.Content class="grid gap-3 sm:grid-cols-2">
				<InputComp
					label={m.cp_bride()}
					{form}
					{errors}
					name="brideName"
					type="text"
					required
					placeholder="Hanan"
				/>

				<InputComp
					label={m.cp_groom()}
					{form}
					{errors}
					name="groomName"
					type="text"
					required
					placeholder="Dawit"
				/>

				<InputComp
					label={m.cp_phone()}
					{form}
					{errors}
					name="phone"
					type="tel"
					required
					placeholder="0911234567"
				/>

				<InputComp
					label={m.cp_phone2()}
					{form}
					{errors}
					name="phone2"
					type="tel"
					placeholder="0911234567"
				/>

				<div class="sm:col-span-2">
					<InputComp
						label={m.cp_email()}
						{form}
						{errors}
						name="email"
						type="email"
						placeholder="you@example.com"
					/>
				</div>

				<!-- The workspace's internal handle; generated from the names when empty. -->
				<input type="hidden" name="slug" value={$form.slug ?? ''} />
			</Card.Content>

			<Card.Footer class="justify-end gap-3 border-t pt-6">
				<Button type="submit" disabled={$submitting}>
					{#if $submitting}<Loader2 class="mr-2 size-4 animate-spin" />{/if}
					{data.isNew ? m.cp_create() : m.wd_save()}
				</Button>
			</Card.Footer>
		</Card.Root>
	</form>

	{#if !data.isNew && (data.partner.canInvite || data.partner.name)}
		<Card.Root>
			<Card.Header>
				<Card.Title class="flex items-center gap-2"
					><Users class="size-4" />{m.partner_title()}</Card.Title
				>
				{#if data.partner.name}
					<Card.Description>{m.partner_joined({ name: data.partner.name })}</Card.Description>
				{:else}
					<Card.Description>{m.partner_lead()}</Card.Description>
				{/if}
			</Card.Header>
			{#if data.partner.canInvite}
				<Card.Content class="space-y-3">
					{#if !data.partner.name && data.partner.inviteUrl}
						<div class="flex flex-wrap gap-2">
							<input
								readonly
								value={data.partner.inviteUrl}
								aria-label={m.partner_title()}
								class="min-w-0 flex-1 rounded-md border bg-muted px-3 py-2 text-sm"
								onfocus={(e) => e.currentTarget.select()}
							/>
							<Button type="button" onclick={() => copyInvite(data.partner.inviteUrl ?? '')}>
								{m.partner_copy()}
							</Button>
						</div>
					{/if}
					<div class="flex flex-wrap gap-2">
						{#if !data.partner.name}
							<ActionForm action="?/newInviteLink">
								{#snippet children({ busy })}
									<Button type="submit" variant="ghost" size="sm" disabled={!!busy}>
										{m.partner_new_link()}
									</Button>
								{/snippet}
							</ActionForm>
						{:else}
							<ActionForm action="?/removePartner">
								{#snippet children({ busy })}
									<Button
										type="submit"
										variant="ghost"
										size="sm"
										class="text-destructive"
										disabled={!!busy}
									>
										{m.partner_remove()}
									</Button>
								{/snippet}
							</ActionForm>
						{/if}
					</div>
				</Card.Content>
			{/if}
		</Card.Root>
	{/if}
</div>
