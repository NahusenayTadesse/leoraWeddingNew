<script lang="ts">
	import { page } from '$app/stores';
	import { Heart, Menu, X } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { openAuth } from '$lib/state.svelte.js';

	let mobileOpen = $state(false);

	const navLinks = [
		{ label: 'Vendors', href: '/vendors' },
		{ label: 'Budget Planner', href: '/budget' },
		{ label: 'My Wedding', href: '/dashboard' },
		{ label: 'For Vendors', href: '/vendor-dashboard' }
	];

	function isActive(href: string) {
		return $page.url.pathname === href;
	}
</script>

<nav
	class="border-leora-gold/10 fixed z-50 w-full border-b bg-white/90 backdrop-blur-md transition-all duration-300"
>
	<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
		<div class="flex h-20 items-center justify-between">
			<!-- Logo -->
			<a href="/" class="flex cursor-pointer items-center gap-2">
				<div
					class="from-leora-gold to-leora-champagne flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br"
				>
					<Heart class="h-5 w-5 fill-white text-white" />
				</div>
				<div class="flex flex-col">
					<span class="font-display text-leora-charcoal text-2xl font-semibold">Leora</span>
					<span class="text-leora-gold text-xs tracking-widest uppercase">Events</span>
				</div>
			</a>

			<!-- Desktop Nav -->
			<div class="hidden items-center gap-8 md:flex">
				{#each navLinks as link}
					<a
						href={link.href}
						class="nav-link text-sm font-medium transition-colors"
						class:text-leora-gold={isActive(link.href)}
						class:text-leora-charcoal={!isActive(link.href)}
					>
						{link.label}
					</a>
				{/each}
			</div>

			<!-- Actions -->
			<div class="flex items-center gap-4">
				<button
					class="text-leora-charcoal hover:text-leora-gold hidden text-sm font-medium transition-colors md:block"
					onclick={() => openAuth('login')}
				>
					Sign In
				</button>
				<Button size="md" class="hidden md:inline-flex" href="/budget">Start Planning</Button>

				<!-- Mobile hamburger -->
				<button
					class="text-leora-charcoal p-1 md:hidden"
					onclick={() => (mobileOpen = !mobileOpen)}
					aria-label="Toggle menu"
				>
					{#if mobileOpen}
						<X class="h-6 w-6" />
					{:else}
						<Menu class="h-6 w-6" />
					{/if}
				</button>
			</div>
		</div>
	</div>

	<!-- Mobile Menu -->
	{#if mobileOpen}
		<div class="border-leora-gold/10 border-t bg-white md:hidden">
			<div class="space-y-1 px-4 pt-2 pb-6">
				{#each navLinks as link}
					<a
						href={link.href}
						onclick={() => (mobileOpen = false)}
						class="text-leora-charcoal hover:text-leora-gold hover:bg-leora-ivory block rounded-lg px-3 py-2.5 text-base font-medium transition-colors"
					>
						{link.label}
					</a>
				{/each}
				<div class="border-leora-gold/10 flex flex-col gap-2 border-t pt-3">
					<button
						class="text-leora-charcoal hover:text-leora-gold px-3 py-2.5 text-left text-base font-medium"
						onclick={() => {
							mobileOpen = false;
							openAuth('login');
						}}
					>
						Sign In
					</button>
					<Button href="/budget" onclick={() => (mobileOpen = false)} class="p-4"
						>Start Planning</Button
					>
				</div>
			</div>
		</div>
	{/if}
</nav>
