<script>
	import { page } from '$app/state';
	import Button from '$lib/components/ui/button/button.svelte';
	// import DialogComp from "$lib/formComponents/DialogComp.svelte";
	// import AddCustomer from "$lib/forms/AddCustomer.svelte";
	import { Plus, Sheet } from '@lucide/svelte';
	let { children } = $props();
</script>

<div class="mb-8 flex flex-row items-center justify-start gap-2">
	<Button
		href="/vendor-dashboard/products"
		variant={page.url.pathname === '/vendor-dashboard/products' ? 'default' : 'outline'}
		><Sheet /> Products and Services</Button
	>
	<Button
		href="/vendor-dashboard/products/add-products"
		variant={page.url.pathname === '/vendor-dashboard/products/add-products'
			? 'default'
			: 'outline'}><Plus /> Add Products and Services</Button
	>
</div>

{@render children?.()}
