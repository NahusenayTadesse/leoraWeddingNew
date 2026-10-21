<script lang="ts">
	import { page } from '$app/state';
	import {
		Heart,
		User,
		CalendarHeart,
		CalendarRange,
		Wallet,
		Users,
		Armchair,
		ListChecks,
		Store,
		Bookmark,
		MessageSquare,
		Mail,
		ScanLine,
		Gift,
		Images,
		LayoutGrid
	} from '@lucide/svelte';
	import { m } from '$lib/paraglide/messages.js';
	import { cn } from '$lib/utils';
	import * as Avatar from '@nahu/admin-kit/components/ui/avatar/index.js';
	import { Separator } from '@nahu/admin-kit/components/ui/separator/index.js';
	import { assetUrl } from '$lib/assetUrl';

	let { data, children } = $props();

	const nav = [
		{ href: '/wedding', label: m.nav_overview(), icon: Heart, exact: true },
		{ href: '/wedding/profile', label: m.nav_couple_details(), icon: User },
		{ href: '/wedding/wedding', label: m.nav_wedding(), icon: CalendarHeart },
		{ href: '/wedding/budget', label: m.nav_budget(), icon: Wallet },
		{ href: '/wedding/events', label: m.nav_events(), icon: CalendarRange },
		{ href: '/wedding/guests', label: m.nav_guests(), icon: Users },
		{ href: '/wedding/card', label: m.nav_card_editor(), icon: Mail },
		{ href: '/wedding/gifts', label: m.nav_gifts(), icon: Gift },
		{ href: '/wedding/guestbook', label: m.nav_guestbook(), icon: Images },
		{ href: '/wedding/check-in', label: m.nav_check_in(), icon: ScanLine },
		{ href: '/wedding/seating', label: m.nav_seating(), icon: Armchair },
		{ href: '/wedding/tasks', label: m.nav_tasks(), icon: ListChecks },
		{ href: '/wedding/bookings', label: m.nav_bookings(), icon: Store },
		{ href: '/wedding/saved', label: m.nav_saved(), icon: Bookmark },
		{ href: '/wedding/boards', label: m.nav_boards(), icon: LayoutGrid },
		{ href: '/wedding/messages', label: m.nav_messages(), icon: MessageSquare }
	];

	const isActive = (href: string, exact = false) =>
		exact ? page.url.pathname === href : page.url.pathname.startsWith(href);

	const initials = $derived(
		data.couple
			? `${data.couple.brideName?.[0] ?? ''}${data.couple.groomName?.[0] ?? ''}`.toUpperCase()
			: (data.user.name?.[0]?.toUpperCase() ?? '?')
	);
</script>

<div class="min-h-svh bg-muted/30">
	<div class="mx-auto flex max-w-7xl gap-6 px-4 py-6 lg:px-6">
		<!-- Sidebar -->
		<aside class="hidden w-60 shrink-0 lg:block">
			<div class="sticky top-6 rounded-xl border bg-card p-3">
				<div class="flex items-center gap-3 px-2 py-3">
					<Avatar.Root class="size-9">
						<Avatar.Image src={assetUrl(data.user.image)} alt={data.user.name} />
						<Avatar.Fallback>{initials}</Avatar.Fallback>
					</Avatar.Root>
					<div class="min-w-0">
						<p class="truncate text-sm font-medium">
							{data.couple ? `${data.couple.brideName} & ${data.couple.groomName}` : data.user.name}
						</p>
						<p class="text-xs text-muted-foreground">{m.nav_couple_account()}</p>
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
		<div class="fixed inset-x-0 bottom-0 z-40 border-t bg-background lg:hidden">
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

		<div class="min-w-0 flex-1 pb-20 lg:pb-0">
			{@render children()}
		</div>
	</div>
</div>
