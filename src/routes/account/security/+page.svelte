<script lang="ts">
	import ActionForm from '@nahu/admin-kit/formComponents/ActionForm.svelte';
	import { Button } from '@nahu/admin-kit/components/ui/button/index.js';
	import * as Card from '@nahu/admin-kit/components/ui/card/index.js';
	import { ShieldCheckIcon, ShieldAlertIcon } from '@lucide/svelte';
	import { page } from '$app/state';
	import { m } from '$lib/paraglide/messages.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	type Setup = { qr: string; uri: string; backupCodes: string[] };
	const setup = $derived((page.form as { setup?: Setup } | null)?.setup ?? null);
</script>

<svelte:head>
	<title>{m.sec_title()} — Leora Events</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<main class="mx-auto w-full max-w-xl space-y-6 px-4 py-10">
	<h1 class="text-2xl font-bold">{m.sec_title()}</h1>

	{#if data.required && !data.twoFactorEnabled}
		<p
			class="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-100"
		>
			{m.sec_required()}
		</p>
	{/if}

	<Card.Root class="space-y-4 p-5">
		<div class="flex items-start gap-3">
			{#if data.twoFactorEnabled}
				<ShieldCheckIcon class="size-6 text-green-600" />
				<p>{m.sec_tfa_on()}</p>
			{:else}
				<ShieldAlertIcon class="size-6 text-amber-500" />
				<p>{m.sec_tfa_off()}</p>
			{/if}
		</div>

		{#if setup}
			<div class="space-y-3">
				<p class="text-sm">{m.sec_scan()}</p>
				<img
					src={setup.qr}
					alt="QR code"
					width="220"
					height="220"
					class="rounded-md border bg-white p-2"
				/>
				<p class="text-xs break-all text-muted-foreground">{setup.uri}</p>
				<div>
					<p class="font-medium">{m.sec_backup_title()}</p>
					<p class="text-sm text-muted-foreground">{m.sec_backup_hint()}</p>
					<ul class="mt-2 grid grid-cols-2 gap-1 font-mono text-sm">
						{#each setup.backupCodes as code (code)}<li>{code}</li>{/each}
					</ul>
				</div>
				<ActionForm action="?/confirm" class="flex gap-2">
					{#snippet children({ busy })}
						<input
							name="code"
							required
							inputmode="numeric"
							autocomplete="one-time-code"
							placeholder="123456"
							class="h-10 flex-1 rounded-md border bg-background px-3 tracking-widest"
						/>
						<Button type="submit" disabled={!!busy}>{m.sec_confirm()}</Button>
					{/snippet}
				</ActionForm>
			</div>
		{:else}
			<ActionForm action={data.twoFactorEnabled ? '?/disable' : '?/enable'} class="flex gap-2">
				{#snippet children({ busy })}
					<input
						name="password"
						type="password"
						required
						autocomplete="current-password"
						placeholder={m.sec_password()}
						aria-label={m.sec_password()}
						class="h-10 flex-1 rounded-md border bg-background px-3"
					/>
					<Button
						type="submit"
						variant={data.twoFactorEnabled ? 'outline' : 'default'}
						disabled={!!busy}
					>
						{data.twoFactorEnabled ? m.sec_disable() : m.sec_enable()}
					</Button>
				{/snippet}
			</ActionForm>
		{/if}
	</Card.Root>

	<Card.Root class="space-y-3 p-5">
		<h2 class="font-medium">{m.sec_change_password()}</h2>
		<ActionForm action="?/changePassword" class="space-y-3">
			{#snippet children({ busy })}
				<input
					name="currentPassword"
					type="password"
					required
					autocomplete="current-password"
					placeholder={m.sec_password()}
					aria-label={m.sec_password()}
					class="h-10 w-full rounded-md border bg-background px-3"
				/>
				<input
					name="newPassword"
					type="password"
					required
					minlength="8"
					autocomplete="new-password"
					placeholder={m.sec_new_password()}
					aria-label={m.sec_new_password()}
					class="h-10 w-full rounded-md border bg-background px-3"
				/>
				<Button type="submit" variant="outline" disabled={!!busy}>{m.sec_change_password()}</Button>
			{/snippet}
		</ActionForm>
	</Card.Root>
</main>
