<script lang="ts">
	import { LayoutDashboard, Building2, CreditCard, Heart } from '@lucide/svelte';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import type { ComponentProps } from 'svelte';
	import { page } from '$app/state';
	import { bgGradient, selectItem } from '$lib/global.svelte';
	import { fade } from 'svelte/transition';
	import { useSidebar } from '$lib/components/ui/sidebar/index.js';

	let restProps: ComponentProps<typeof Sidebar.Root> = $props();

	const navigation = [
		{ title: 'Dashboard', url: '/admin', icon: LayoutDashboard },
		{ title: 'Vendors', url: '/admin/vendors', icon: Building2 },
		{ title: 'Subscriptions', url: '/admin/subscriptions', icon: CreditCard }
	];

	const on = 'bg-sidebar-primary text-sidebar-primary-foreground';
	const off = 'text-sidebar-foreground';
	/**
	 * "Dashboard" is `/admin` itself, which is a prefix of every other item's
	 * url — `startsWith` alone would light it up on every page. It only
	 * matches exactly; every other item matches its own subtree.
	 */
	function blacken(url: string) {
		const currentPath = page.url.pathname;
		if (url === '/admin') {
			return currentPath === url ? on : off;
		}
		return currentPath.startsWith(url) ? on : off;
	}

	const sidebar = useSidebar();

	function closeSidebar() {
		if (sidebar.isMobile) {
			sidebar.setOpenMobile(false);
		}
	}
</script>

<Sidebar.Root collapsible="icon" {...restProps}>
	<Sidebar.Content
		class="{bgGradient} h-full
  overflow-y-scroll [scrollbar-color:#a3a3a3_transparent]
  [scrollbar-width:thin]
  [&::-webkit-scrollbar]:w-2
  [&::-webkit-scrollbar-thumb]:bg-gray-400
  [&::-webkit-scrollbar-thumb:hover]:bg-gray-500
  [&::-webkit-scrollbar-track]:bg-transparent
"
	>
		<Sidebar.Group>
			<Sidebar.GroupLabel class="sticky top-0 z-10 bg-white py-4 dark:bg-gray-700">
				<a href="/" class="flex cursor-pointer items-center gap-2">
					<div
						class="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-leora-gold to-leora-champagne"
					>
						<Heart class="h-5 w-5 fill-white text-white" />
					</div>
					<div class="flex flex-col">
						<span class="font-display text-2xl font-semibold text-leora-charcoal">Leora</span>
						<span class="text-xs tracking-widest text-leora-gold uppercase">Admin</span>
					</div>
				</a></Sidebar.GroupLabel
			>
			<Sidebar.GroupContent class="mt-8">
				<Sidebar.Menu class="w-full gap-3">
					{#each navigation as item (item.title)}
						<Sidebar.MenuItem>
							<Sidebar.MenuButton
								class="flex items-center gap-3 rounded-lg px-3 py-5 text-lg
          font-normal transition-colors duration-300 hover:bg-sidebar-accent
          hover:text-sidebar-accent-foreground {selectItem}
          {blacken(item.url)}"
							>
								{#snippet child({ props })}
									<a href={item.url} onclick={closeSidebar} {...props} transition:fade>
										<item.icon class="!h-5 !w-5" />
										<span>{item.title}</span>
									</a>
								{/snippet}
							</Sidebar.MenuButton>
						</Sidebar.MenuItem>
					{/each}
				</Sidebar.Menu>
			</Sidebar.GroupContent>
		</Sidebar.Group>
	</Sidebar.Content>
	<Sidebar.Footer class="flex flex-row bg-white dark:bg-black">
		<Sidebar.GroupLabel>
			Powered By <a href="https://leoradigitals.com" target="_blank" class="ml-1">Leora Digitals</a>
		</Sidebar.GroupLabel>
	</Sidebar.Footer>
</Sidebar.Root>
