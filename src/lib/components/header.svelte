<script lang="ts">
	import { page } from '$app/state';
	import { Button } from '$lib/components/ui/button';
	import { MenuIcon, XIcon } from '@lucide/svelte';
	import AvatarSettings from './AvatarSettings.svelte';
	import ThemeToggle from './theme-toggle.svelte';

	/** The signed-in user's name, or '' when logged out. */
	let { data = '' } = $props();

	let mobileMenuOpen = $state(false);

	// Same five links as the PHP header, pointed at routes that exist.
	const navLinks = [
		{ label: 'Marketplace', href: '/vendors' },
		{ label: 'Budget', href: '/budget-estimator' },
		{ label: 'Planning', href: '/dashboard' },
		{ label: 'Leora Card', href: '/card' },
		{ label: 'Pricing', href: '/pricing' }
	];

	const isActive = (href: string) => page.url.pathname.startsWith(href);
</script>

<header
	class="bg-background/85 supports-backdrop-filter:bg-background/70 sticky top-0 z-50 w-full border-b backdrop-blur-md"
>
	<nav class="mx-auto flex max-w-[1180px] items-center justify-between gap-6 px-5 py-3.5 sm:px-8">
		<a href="/" class="flex shrink-0 items-center gap-2.5">
			<img
				src="/leora-logo.jpg"
				alt=""
				width="38"
				height="38"
				class="size-9.5 rounded-[10px] object-cover"
			/>
			<span class="leading-tight">
				<span class="font-display block text-[18px] font-extrabold tracking-[-0.01em]">
					Leora Events
				</span>
				<small
					class="text-muted-foreground mt-px hidden text-[9px] font-semibold tracking-[0.12em] uppercase sm:block"
				>
					Ethiopia's First Wedding Platform
				</small>
			</span>
		</a>

		<div class="navlinks hidden items-center gap-[30px] lg:flex">
			{#each navLinks as link (link.href)}
				<a
					href={link.href}
					class="text-foreground relative py-1 text-[14.5px] font-medium transition-opacity
						{isActive(link.href) ? 'opacity-100' : 'opacity-[0.82] hover:opacity-100'}"
					class:is-active={isActive(link.href)}
				>
					{link.label}
				</a>
			{/each}
		</div>

		<div class="flex items-center gap-3.5">
			<ThemeToggle />

			{#if data === ''}
				<div class="hidden items-center gap-3.5 sm:flex">
					<Button href="/login" variant="outline" size="sm">Log in</Button>
					<Button href="/dashboard" size="sm">Start Planning</Button>
				</div>
			{:else}
				<AvatarSettings {data} />
			{/if}

			<button
				class="-mr-1 p-1.5 lg:hidden"
				aria-label="Toggle menu"
				aria-expanded={mobileMenuOpen}
				onclick={() => (mobileMenuOpen = !mobileMenuOpen)}
			>
				{#if mobileMenuOpen}
					<XIcon class="size-6" />
				{:else}
					<MenuIcon class="size-6" />
				{/if}
			</button>
		</div>
	</nav>

	{#if mobileMenuOpen}
		<div class="mx-auto max-w-[1180px] px-5 pb-4 sm:px-8 lg:hidden">
			<div class="flex flex-col gap-1 border-t pt-3">
				{#each navLinks as link (link.href)}
					<a
						href={link.href}
						onclick={() => (mobileMenuOpen = false)}
						class="hover:bg-accent rounded-md px-3 py-2.5 text-sm font-medium transition-colors
							{isActive(link.href) ? 'bg-accent text-accent-foreground' : 'text-muted-foreground'}"
					>
						{link.label}
					</a>
				{/each}
				{#if data === ''}
					<div class="mt-3 flex gap-2 border-t pt-4">
						<Button href="/login" variant="outline" class="flex-1" size="sm">Log in</Button>
						<Button href="/dashboard" class="flex-1" size="sm">Start Planning</Button>
					</div>
				{/if}
			</div>
		</div>
	{/if}
</header>

<style>
	/*
	 * The PHP nav underline: a 1.5px gold rule that grows from the left on
	 * hover. It needs ::after with an animated width, which utilities cannot
	 * express.
	 */
	.navlinks a::after {
		content: '';
		position: absolute;
		left: 0;
		bottom: -2px;
		height: 1.5px;
		width: 0;
		background: var(--leora-gold);
		transition: width 0.3s ease;
	}

	.navlinks a:hover::after,
	.navlinks a.is-active::after {
		width: 100%;
	}

	@media (prefers-reduced-motion: reduce) {
		.navlinks a::after {
			transition: none;
		}
	}
</style>
