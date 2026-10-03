<script lang="ts">
	import { enhance } from '$app/forms';
	import { toast } from 'svelte-sonner';
	import { Button } from '$lib/components/ui/button/index.js';
	import type { Snippet } from 'svelte';
	import type { ComponentProps } from 'svelte';

	/**
	 * A one-button POST to a page action. `fields` become hidden inputs; extra
	 * inputs (a reason box, a select) can be passed as children and are
	 * submitted with it. The server action answers `{ message }`, shown as a toast.
	 */
	let {
		action,
		fields = {},
		label,
		variant = 'outline',
		size = 'sm',
		confirmText,
		children
	}: {
		action: string;
		fields?: Record<string, string | number>;
		label: string;
		variant?: ComponentProps<typeof Button>['variant'];
		size?: ComponentProps<typeof Button>['size'];
		confirmText?: string;
		children?: Snippet;
	} = $props();

	let busy = $state(false);
</script>

<form
	method="POST"
	{action}
	class="inline-flex items-center gap-2"
	use:enhance={({ cancel }) => {
		if (confirmText && !confirm(confirmText)) return cancel();
		busy = true;
		return async ({ result, update }) => {
			busy = false;
			const msg = (result as { data?: { message?: string } }).data?.message;
			if (result.type === 'success') toast.success(msg ?? 'Saved');
			else if (result.type === 'failure') toast.error(msg ?? 'Something went wrong');
			else if (result.type === 'error') toast.error(result.error.message);
			await update({ reset: false });
		};
	}}
>
	{#each Object.entries(fields) as [name, value] (name)}
		<input type="hidden" {name} {value} />
	{/each}
	{@render children?.()}
	<Button type="submit" {variant} {size} disabled={busy}>{label}</Button>
</form>
