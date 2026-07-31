<script lang="ts">
	import { page } from '$app/state';
	import { Heart, User, CalendarHeart, Wallet, Users, ListChecks, Store } from '@lucide/svelte';
	import { cn } from '$lib/utils';
	import * as Avatar from '$lib/components/ui/avatar';
	import { Separator } from '$lib/components/ui/separator';

	let { data, children } = $props();

	const nav = [
		{ href: '/wedding', label: 'Overview', icon: Heart, exact: true },
		{ href: '/wedding/profile', label: 'Couple details', icon: User },
		{ href: '/wedding/wedding', label: 'Wedding', icon: CalendarHeart },
		{ href: '/wedding/budget', label: 'Budget', icon: Wallet },
		{ href: '/wedding/guests', label: 'Guests', icon: Users },
		{ href: '/wedding/tasks', label: 'Tasks', icon: ListChecks },
		{ href: '/wedding/bookings', label: 'Bookings', icon: Store }
	];

	const isActive = (href: string, exact = false) =>
		exact ? page.url.pathname === href : page.url.pathname.startsWith(href);

	const initials = $derived(
		data.couple
			? `${data.couple.brideName?.[0] ?? ''}${data.couple.groomName?.[0] ?? ''}`.toUpperCase()
			: (data.user.name?.[0]?.toUpperCase() ?? '?')
	);
</script>

<div class="bg-muted/30 min-h-svh">
	<div class="mx-auto flex max-w-7xl gap-6 px-4 py-6 lg:px-6">
		<!-- Sidebar -->
		<aside class="hidden w-60 shrink-0 lg:block">
			<div class="bg-card sticky top-6 rounded-xl border p-3">
				<div class="flex items-center gap-3 px-2 py-3">
					<Avatar.Root class="size-9">
						<Avatar.Image src={data.user.image} alt={data.user.name} />
						<Avatar.Fallback>{initials}</Avatar.Fallback>
					</Avatar.Root>
					<div class="min-w-0">
						<p class="truncate text-sm font-medium">
							{data.couple ? `${data.couple.brideName} & ${data.couple.groomName}` : data.user.name}
						</p>
						<p class="text-muted-foreground text-xs">Couple account</p>
					</div>
				</div>

				<Separator class="my-2" />

				<nav class="flex flex-col gap-1">
					{#each nav as item (item.href)}
						{@const Icon = item.icon}
						 <a
							href={item.href}
							class={cn(
								'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
								isActive(item.href, item.exact)
									? 'bg-primary text-primary-foreground'
									: 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
							)}
						>
							<Icon class="size-4" />
							{item.label}
						</a>
					{/each}
				</nav>
			</div>
		</aside>

		<!-- Mobile nav -->
		<div class="bg-background fixed inset-x-0 bottom-0 z-40 border-t lg:hidden">
			<nav class="flex justify-around">
				{#each nav as item (item.href)}
					{@const Icon = item.icon}
					  <a
						href={item.href}
						class={cn(
							'flex flex-1 flex-col items-center gap-1 py-2 text-[10px]',
							isActive(item.href, item.exact) ? 'text-primary' : 'text-muted-foreground'
						)}
					>
						<Icon class="size-5" />
						{item.label}
					</a>
				{/each}
			</nav>
		</div>

		<main class="min-w-0 flex-1 pb-20 lg:pb-0">
			{@render children()}
		</main>
	</div>
</div>