<script lang="ts">
	import ActionForm from '@nahu/admin-kit/formComponents/ActionForm.svelte';
	import { Button } from '@nahu/admin-kit/components/ui/button/index.js';
	import { FileTextIcon, CircleCheckIcon, CircleDashedIcon } from '@lucide/svelte';
	import { m } from '$lib/paraglide/messages.js';

	type Contract = {
		id: number;
		title: string | null;
		hasDocument: boolean;
		signedByCouple: boolean;
		signedByVendor: boolean;
		coupleSignedName: string | null;
		coupleSignedAt: Date | string | null;
		vendorSignedName: string | null;
		vendorSignedAt: Date | string | null;
	};

	/**
	 * A booking's contract, for either side: the document, both signatures, a typed-name sign
	 * form for `side`, and (for the vendor) attaching or replacing the PDF.
	 */
	type Props = {
		contract: Contract | null;
		side: 'couple' | 'vendor';
		/** Hidden fields identifying the booking for the sign/attach actions. */
		fields: Record<string, unknown>;
		onDone?: () => void;
	};

	let { contract, side, fields, onDone }: Props = $props();

	let agreed = $state(false);

	const signedMine = $derived(
		!!contract && (side === 'couple' ? contract.signedByCouple : contract.signedByVendor)
	);
	const fmt = (d: Date | string | null) => (d ? new Date(d).toLocaleDateString() : '');
</script>

<div class="space-y-4 text-sm">
	{#if contract?.hasDocument}
		<a
			href="/contracts/{contract.id}"
			target="_blank"
			rel="noopener"
			class="flex items-center gap-2 rounded-lg border p-3 font-medium hover:bg-muted/50"
		>
			<FileTextIcon class="size-5" />
			<span class="flex-1">{contract.title ?? m.contract_view()}</span>
			<span class="text-xs text-muted-foreground underline">{m.contract_open()}</span>
		</a>

		<ul class="space-y-1.5">
			{#each [{ label: m.contract_couple(), signed: contract.signedByCouple, name: contract.coupleSignedName, at: contract.coupleSignedAt }, { label: m.contract_vendor(), signed: contract.signedByVendor, name: contract.vendorSignedName, at: contract.vendorSignedAt }] as party (party.label)}
				<li class="flex items-center gap-2">
					{#if party.signed}
						<CircleCheckIcon class="size-4 text-green-600" />
					{:else}
						<CircleDashedIcon class="size-4 text-muted-foreground" />
					{/if}
					<span class="font-medium">{party.label}:</span>
					<span class="text-muted-foreground">
						{party.signed
							? m.contract_signed_by({ name: party.name ?? '', date: fmt(party.at) })
							: m.contract_not_signed()}
					</span>
				</li>
			{/each}
		</ul>

		{#if !signedMine}
			<ActionForm action="?/signContract" {fields} {onDone} class="space-y-3 rounded-lg border p-3">
				{#snippet children({ busy })}
					<label class="block space-y-1.5 font-medium">
						<span>{m.contract_sign_name()}</span>
						<input
							name="name"
							required
							minlength="3"
							maxlength="150"
							autocomplete="name"
							class="h-10 w-full rounded-md border bg-background px-3 font-normal"
						/>
					</label>
					<label class="flex items-start gap-2">
						<input type="checkbox" bind:checked={agreed} class="mt-0.5" />
						<span>{m.contract_agree()}</span>
					</label>
					<Button type="submit" class="w-full" disabled={!agreed || !!busy}>
						{m.contract_sign()}
					</Button>
				{/snippet}
			</ActionForm>
		{/if}
	{:else}
		<p class="text-muted-foreground">{m.contract_none()}</p>
	{/if}

	{#if side === 'vendor'}
		<ActionForm
			action="?/attachContract"
			{fields}
			{onDone}
			enctype="multipart/form-data"
			class="space-y-3 rounded-lg border border-dashed p-3"
		>
			{#snippet children({ busy })}
				<p class="font-medium">
					{contract?.hasDocument ? m.contract_replace() : m.contract_attach()}
				</p>
				<input
					name="title"
					placeholder={m.contract_doc_title()}
					maxlength="150"
					class="h-10 w-full rounded-md border bg-background px-3"
				/>
				<input name="document" type="file" accept="application/pdf" required class="w-full" />
				<Button type="submit" variant="outline" class="w-full" disabled={!!busy}>
					{contract?.hasDocument ? m.contract_replace() : m.contract_attach()}
				</Button>
			{/snippet}
		</ActionForm>
	{/if}
</div>
