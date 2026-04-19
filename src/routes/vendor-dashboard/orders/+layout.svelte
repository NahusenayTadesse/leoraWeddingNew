<script>
	import { page } from '$app/state';
	import Button from '$lib/components/ui/button/button.svelte';

	import { Sheet, Loader, CircleCheckBig, OctagonMinus } from '@lucide/svelte';
	let { children } = $props();
</script>

<div class="mb-8 flex flex-row items-center justify-start gap-2">
	<Button
		variant={page.url.pathname === '/vendor-dashboard/orders/all-orders' ? 'default' : 'outline'}
		href="/vendor-dashboard/orders/all-orders"><Sheet /> All Orders</Button
	>

	<Button
		variant={page.url.pathname === '/vendor-dashboard/orders' ? 'default' : 'outline'}
		href="/vendor-dashboard/orders"><Loader /> Pending Orders</Button
	>
	<Button
		variant={page.url.pathname === '/vendor-dashboard/orders/delivered' ? 'default' : 'outline'}
		href="/vendor-dashboard/orders/delivered"><CircleCheckBig /> Delivered Orders</Button
	>

	<Button
		variant={page.url.pathname === '/vendor-dashboard/orders/cancelled' ? 'default' : 'outline'}
		href="/vendor-dashboard/orders/cancelled"><OctagonMinus /> Cancelled Orders</Button
	>
</div>

{@render children?.()}
