<script lang="ts">
	import LoadingBtn from '$lib/formComponents/LoadingBtn.svelte';
	import { SquarePen, Plus, X } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import type { Edit } from './schema';
	import { buttonVariants } from '$lib/components/ui/button/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';

	import type { Infer, SuperValidated } from 'sveltekit-superforms';
	import { superForm } from 'sveltekit-superforms';
	import Errors from '$lib/formComponents/Errors.svelte';
	import * as Tooltip from '$lib/components/ui/tooltip/index.js';

	import ScrollArea from '$lib/components/ui/scroll-area/scroll-area.svelte';

	let {
		data,
		id,
		customerName,
		icon = false,
		status = true
	}: {
		data: SuperValidated<Infer<Edit>>;
		id: number;
		customerName: string;
		icon: boolean;
		status: boolean;
	} = $props();

	const { form, errors, enhance, delayed, message, allErrors } = superForm(data, {
		resetForm: false,
		dataType: 'json'
	});

	let open = $state(false);

	$form.id = id;

	$form.status = status;

	import { toast } from 'svelte-sonner';
	import InputComp from '$lib/formComponents/InputComp.svelte';
	$effect(() => {
		if ($message) {
			if ($message.type === 'error') {
				toast.error($message.text);
			} else {
				toast.success($message.text);
				open = false;
			}
		}
	});
</script>

<Tooltip.Provider>
	<Tooltip.Root>
		<Tooltip.Trigger class="{buttonVariants({ variant: 'ghost' })} justify-self-start p-0!">
			<Dialog.Root bind:open>
				<Dialog.Trigger class="flex w-auto flex-row items-center justify-center gap-2 border-0">
					{#if icon}
						<SquarePen /> Change Order Status
					{:else}
						{customerName}
					{/if}
				</Dialog.Trigger>

				<Dialog.Content class="bg-background">
					<ScrollArea class="h-128 w-full px-2 pr-4" orientation="both">
						<Dialog.Header>
							<Dialog.Title class="text-center text-4xl">Edit {customerName}'s Orders</Dialog.Title>
						</Dialog.Header>
						<form
							action="/vendor-dashboard/orders/?/edit"
							use:enhance
							method="post"
							id="edit"
							class="flex w-full flex-col gap-4 p-4"
						>
							<Errors allErrors={$allErrors} />
							<input type="hidden" name="id" value={$form.id} />

							<InputComp
								label="Status"
								name="status"
								type="select"
								{form}
								{errors}
								items={[
									{ value: 'pending', name: 'Pending' },
									{ value: 'delivered', name: 'Delivered' },
									{ value: 'cancelled', name: 'Cancelled' }
								]}
							/>

							<Button type="submit" class="mt-4" form="edit">
								{#if $delayed}
									<LoadingBtn name="Saving Changes" />
								{:else}
									<Plus class="h-4 w-4" />

									Save Changes
								{/if}
							</Button>
						</form>
					</ScrollArea>
				</Dialog.Content>
			</Dialog.Root>
		</Tooltip.Trigger>
		<Tooltip.Content>
			<p>Edit {customerName}</p>
		</Tooltip.Content>
	</Tooltip.Root>
</Tooltip.Provider>
