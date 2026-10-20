<script lang="ts">
	import type { ComponentProps } from 'svelte';
	import { CheckIcon, CopyIcon } from '@lucide/svelte';
	import FileUpload from '@nahu/admin-kit/formComponents/FileUpload.svelte';
	import * as RadioGroup from '@nahu/admin-kit/components/ui/radio-group/index.js';
	import { formatETB } from '$lib/money';
	import { m } from '$lib/paraglide/messages.js';

	/**
	 * The bank-transfer half of a payment form (ported from amoria): the amount and each account
	 * to copy, which account was used, and the receipt. Posts `bankAccountId` and `receipt`.
	 */
	type Account = { id: number; bankName: string; accountName: string; accountNumber: string };
	type Props = {
		form: ComponentProps<typeof FileUpload>['form'];
		accountError?: string;
		receiptError?: string;
		accounts: Account[];
		total: number;
	};

	let { form, accountError, receiptError, accounts, total }: Props = $props();

	/** What was just copied (`amount` or an account id), for the "Copied" state. */
	let copied = $state<string | null>(null);
	let timer: ReturnType<typeof setTimeout> | undefined;

	/**
	 * The Clipboard API first; where it is missing (plain HTTP on a LAN) or refused (in-app
	 * browsers), the old `execCommand` route. "Copied" shows only if one worked.
	 */
	async function copy(key: string, text: string) {
		let ok = false;
		if (navigator.clipboard && window.isSecureContext) {
			ok = await navigator.clipboard.writeText(text).then(
				() => true,
				() => false
			);
		}
		if (!ok) ok = copyWithSelection(text);
		if (!ok) return;

		copied = key;
		clearTimeout(timer);
		timer = setTimeout(() => (copied = null), 2000);
	}

	function copyWithSelection(text: string): boolean {
		const field = document.createElement('textarea');
		field.value = text;
		field.setAttribute('readonly', '');
		field.style.position = 'fixed';
		field.style.opacity = '0';
		document.body.append(field);
		field.select();
		try {
			return document.execCommand('copy');
		} catch {
			return false;
		} finally {
			field.remove();
		}
	}

	function copyAccount(account: Account) {
		// Copying an account's number is choosing it: that is the one they are about to pay into.
		$form.bankAccountId = account.id;
		copy(String(account.id), account.accountNumber);
	}
</script>

<div class="flex flex-col gap-4">
	<div class="flex items-center justify-between gap-3 rounded-lg bg-muted p-4">
		<div class="flex flex-col">
			<span class="text-sm text-muted-foreground">{m.pay_total()}</span>
			<span class="text-2xl font-bold tabular-nums">{formatETB(total)}</span>
		</div>
		<button
			type="button"
			onclick={() => copy('amount', total.toFixed(2))}
			class="flex h-9 items-center gap-1.5 rounded-full border px-3 text-sm font-medium"
		>
			{#if copied === 'amount'}
				<CheckIcon class="size-4 text-green-600" aria-hidden="true" />
				{m.pay_copied()}
			{:else}
				<CopyIcon class="size-4" aria-hidden="true" />
				{m.pay_copy_amount()}
			{/if}
		</button>
	</div>

	<p class="text-sm text-muted-foreground">{m.pay_accounts_intro({ amount: formatETB(total) })}</p>

	<div class="flex flex-col gap-2">
		<span id="bank-account-label" class="text-sm font-medium">{m.pay_account()}</span>
		<RadioGroup.Root
			name="bankAccountId"
			bind:value={
				() => ($form.bankAccountId ? String($form.bankAccountId) : ''),
				(v) => ($form.bankAccountId = Number(v))
			}
			aria-labelledby="bank-account-label"
			aria-invalid={accountError ? 'true' : undefined}
			class="gap-2"
		>
			{#each accounts as account (account.id)}
				{@const isCopied = copied === String(account.id)}
				<div
					class={[
						'rounded-lg border bg-card p-3 transition-colors',
						$form.bankAccountId === account.id
							? 'border-(--leora-gold) ring-1 ring-(--leora-gold)'
							: 'border-border'
					]}
				>
					<label for="account-{account.id}" class="flex cursor-pointer items-start gap-3">
						<RadioGroup.Item id="account-{account.id}" value={String(account.id)} class="mt-1" />
						<span class="flex flex-col gap-0.5">
							<span class="text-sm font-semibold">{account.bankName}</span>
							<span class="text-sm text-muted-foreground">{account.accountName}</span>
						</span>
					</label>
					<button
						type="button"
						onclick={() => copyAccount(account)}
						aria-label={m.pay_copy_number({ number: account.accountNumber })}
						class="mt-2 flex w-full items-center justify-between gap-3 rounded-md bg-muted px-3 py-2 text-left hover:bg-accent"
					>
						<span class="text-base font-semibold tracking-wide tabular-nums">
							{account.accountNumber}
						</span>
						<span
							class={[
								'flex shrink-0 items-center gap-1.5 text-sm font-medium',
								isCopied && 'text-green-600'
							]}
						>
							{#if isCopied}
								<CheckIcon class="size-4" aria-hidden="true" />
								{m.pay_copied()}
							{:else}
								<CopyIcon class="size-4" aria-hidden="true" />
								{m.pay_copy()}
							{/if}
						</span>
					</button>
				</div>
			{/each}
		</RadioGroup.Root>
		{#if accountError}
			<p class="text-sm text-destructive" role="alert">{accountError}</p>
		{/if}
	</div>

	<p class="sr-only" aria-live="polite">{copied ? m.pay_copied() : ''}</p>

	<div class="flex flex-col gap-2">
		<span class="text-sm font-medium">{m.pay_receipt()}</span>
		<FileUpload
			{form}
			name="receipt"
			placeholder={m.pay_receipt_hint()}
			labels={{ prompt: m.pay_receipt() }}
		/>
		{#if receiptError}
			<p class="text-sm text-destructive" role="alert">{receiptError}</p>
		{/if}
	</div>
</div>
