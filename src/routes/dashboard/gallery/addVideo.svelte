<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import { Save, Plus, Youtube } from '@lucide/svelte';

	import LoadingBtn from '$lib/formComponents/LoadingBtn.svelte';
	import type { Infer, SuperValidated } from 'sveltekit-superforms';
	import { superForm } from 'sveltekit-superforms';
	import type { AddYoutube } from './schema';
	import InputComp from '$lib/formComponents/InputComp.svelte';

	let {
		data
	}: {
		data: SuperValidated<Infer<AddYoutube>>;
	} = $props();
	const { form, errors, enhance, delayed, message } = superForm(data, {});
	import { toast } from 'svelte-sonner';
	import DialogComp from '$lib/formComponents/DialogComp.svelte';
	$effect(() => {
		if ($message) {
			if ($message.type === 'error') {
				toast.error($message.text);
			} else {
				toast.success($message.text);
			}
		}
	});
</script>

<DialogComp title="Add or Change Youtube Video" variant="default" IconComp={Youtube}>
	<div class="flex flex-col items-center justify-center gap-4 pt-4">
		<form
			method="post"
			action="?/addVideo"
			use:enhance
			class="flex w-full flex-col gap-3"
			enctype="multipart/form-data"
		>
			<InputComp label="Video URL" name="videoUrl" type="url" {form} {errors} required={true} />

			<Button type="submit" variant="default" size="lg">
				{#if $delayed}
					<LoadingBtn name="Saving Video" />
				{:else}
					<Save /> Save Video
				{/if}
			</Button>
		</form>
	</div>
</DialogComp>
