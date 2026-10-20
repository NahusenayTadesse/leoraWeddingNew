<script lang="ts">
	import * as Sidebar from '@nahu/admin-kit/components/ui/sidebar/index.js';
	import KitProvider from '@nahu/admin-kit/components/KitProvider.svelte';
	import AppSidebar from '@nahu/admin-kit/components/shell/AppSidebar.svelte';
	import Search from '@nahu/admin-kit/components/shell/Search.svelte';
	import DarkMode from '@nahu/admin-kit/components/shell/DarkMode.svelte';
	import AvatarSettings from '$lib/components/AvatarSettings.svelte';
	import SidebarLogo from '$lib/components/SidebarLogo.svelte';
	import { VENDOR_NAVIGATION } from '$lib/navigation';

	let { children, data } = $props();
</script>

<!--
	No `access` here: the vendor dashboard is not behind the kit's permission gate. Every page in it
	belongs to the signed-in vendor, which `requireVendor` checks, so the whole menu is shown.
-->
<KitProvider navigation={VENDOR_NAVIGATION}>
	<Sidebar.Provider>
		<AppSidebar footer="Powered by Leora Digitals">
			{#snippet logo()}
				<SidebarLogo area="Events" />
			{/snippet}
		</AppSidebar>
		<main class="min-w-0 flex-1 px-2">
			<div
				class="sticky top-2 z-50 flex items-center justify-between rounded-lg p-2 shadow-lg backdrop-blur-md"
			>
				<Sidebar.Trigger />
				<div class="flex items-center gap-2">
					<Search />
					<DarkMode />
					<AvatarSettings data={data.vendor.businessName} />
				</div>
			</div>
			<div class="p-2 pt-4">
				{@render children()}
			</div>
		</main>
	</Sidebar.Provider>
</KitProvider>
