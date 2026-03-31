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
		href="/dashboard/products"
		variant={page.url.pathname === '/dashboard/products' ? 'default' : 'outline'}
		><Sheet /> Products</Button
	>
	<Button
		href="/dashboard/products/add-products"
		variant={page.url.pathname === '/dashboard/products/add-products' ? 'default' : 'outline'}
		><Plus /> Add Products</Button
	>

	<Button
		href="/dashboard/products/categories"
		variant={page.url.pathname === '/dashboard/products/categories' ? 'default' : 'outline'}
		><Sheet /> Categories</Button
	>
</div>

{@render children?.()}
