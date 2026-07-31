<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Progress } from '$lib/components/ui/progress';
	import { Separator } from '$lib/components/ui/separator';
	import {
		CalendarHeart,
		Wallet,
		Users,
		ListChecks,
		Store,
		ArrowRight,
		TriangleAlert,
		CalendarClock,
		Star,
		BadgeCheck,
		MapPin,
		Sparkles,
		CircleCheck,
		Link2
	} from '@lucide/svelte';

	let { data } = $props();

	const etb = (n: number) =>
		new Intl.NumberFormat('en-ET', { maximumFractionDigits: 0 }).format(n);

	function prettyDate(iso: string) {
		if (!iso) return null;
		return new Date(`${iso}T00:00:00`).toLocaleDateString('en-GB', {
			weekday: 'long',
			day: 'numeric',
			month: 'long',
			year: 'numeric'
		});
	}

	function shortDate(iso: string) {
		if (!iso) return 'No date';
		return new Date(`${iso}T00:00:00`).toLocaleDateString('en-GB', {
			day: 'numeric',
			month: 'short'
		});
	}

	function dueLabel(days: number | null) {
		if (days === null) return 'No due date';
		if (days === 0) return 'Due today';
		if (days === 1) return 'Due tomorrow';
		if (days < 0) return `${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} overdue`;
		return `In ${days} days`;
	}
</script>

{#if !data.ready}
	<!-- Setup state -->
	<div class="mx-auto max-w-2xl py-10">
		<Card.Root class="p-8 text-center">
			<CalendarHeart class="text-primary mx-auto size-10" />
			<h1 class="mt-4 text-2xl font-semibold tracking-tight">
				Almost there, {data.coupleName}
			</h1>
			<p class="text-muted-foreground mt-2 text-sm">
				Add your wedding date, city and budget and we'll build your planning space around them —
				checklist, budget tracker and guest list included.
			</p>
			<Button href="/wedding/wedding" class="mt-6">
				Set up your wedding <ArrowRight class="ml-2 size-4" />
			</Button>
		</Card.Root>
	</div>
{:else}
	{@const w = data.wedding}
	{@const budgetPct = w.totalBudget > 0 ? Math.min(100, (data.budget.spent / w.totalBudget) * 100) : 0}
	{@const guestPct =
		w.expectedGuests > 0 ? Math.min(100, (data.guests.total / w.expectedGuests) * 100) : 0}
	{@const taskPct = data.tasks.total > 0 ? (data.tasks.done / data.tasks.total) * 100 : 0}
	{@const bookingPct = data.bookings.agreed > 0 ? Math.min(100, (data.bookings.paid / data.bookings.agreed) * 100) : 0}
	{@const overBudget = data.budget.planned > w.totalBudget && w.totalBudget > 0}

	<div class="space-y-6">
		<!-- Hero -->
		<Card.Root class="from-primary/10 overflow-hidden bg-gradient-to-br to-transparent p-6 sm:p-8">
			<div class="flex flex-wrap items-start justify-between gap-6">
				<div class="min-w-0">
					<div class="flex flex-wrap items-center gap-2">
						<h1 class="text-2xl font-semibold tracking-tight sm:text-3xl">{data.coupleName}</h1>
						{#if data.verified}
							<Badge class="gap-1"><BadgeCheck class="size-3.5" /> Verified</Badge>
						{/if}
					</div>

					<div class="text-muted-foreground mt-3 flex flex-wrap items-center gap-4 text-sm">
						{#if w.date}
							<span class="flex items-center gap-1.5">
								<CalendarHeart class="size-4" />{prettyDate(w.date)}
							</span>
						{/if}
						{#if w.city}
							<span class="flex items-center gap-1.5"><MapPin class="size-4" />{w.city}</span>
						{/if}
						{#if w.style}
							<span>{w.style}</span>
						{/if}
					</div>

					{#if data.slug}
						<a
							href="/w/{data.slug}"
							class="text-muted-foreground hover:text-foreground mt-3 inline-flex items-center gap-1.5 text-xs"
						>
							<Link2 class="size-3.5" /> leoraevents.com/w/{data.slug}
						</a>
					{/if}
				</div>

				<div class="text-right">
					{#if w.daysAway === null}
						<p class="text-muted-foreground text-sm">No date set</p>
					{:else if w.daysAway > 0}
						<p class="text-4xl font-semibold sm:text-5xl">{w.daysAway}</p>
						<p class="text-muted-foreground text-sm">
							day{w.daysAway === 1 ? '' : 's'} to go
						</p>
					{:else if w.daysAway === 0}
						<p class="text-3xl font-semibold sm:text-4xl">Today!</p>
						<p class="text-muted-foreground text-sm">Congratulations</p>
					{:else}
						<p class="text-3xl font-semibold sm:text-4xl">Married</p>
						<p class="text-muted-foreground text-sm">
							{Math.abs(w.daysAway)} days ago
						</p>
					{/if}
				</div>
			</div>
		</Card.Root>

		<!-- Alerts -->
		{#if data.tasks.overdue > 0 || overBudget || data.bookings.outstanding > 0}
			<div class="grid gap-3 sm:grid-cols-3">
				{#if data.tasks.overdue > 0}
					<a href="/wedding/tasks" class="block">
						<Card.Root
							class="border-destructive/30 bg-destructive/5 hover:bg-destructive/10 p-4 transition-colors"
						>
							<p class="text-destructive flex items-center gap-2 text-sm font-medium">
								<TriangleAlert class="size-4" />
								{data.tasks.overdue} overdue task{data.tasks.overdue === 1 ? '' : 's'}
							</p>
						</Card.Root>
					</a>
				{/if}

				{#if overBudget}
					<a href="/wedding/budget" class="block">
						<Card.Root
							class="border-destructive/30 bg-destructive/5 hover:bg-destructive/10 p-4 transition-colors"
						>
							<p class="text-destructive flex items-center gap-2 text-sm font-medium">
								<TriangleAlert class="size-4" />
								{etb(data.budget.planned - w.totalBudget)} ETB over budget
							</p>
						</Card.Root>
					</a>
				{/if}

				{#if data.bookings.outstanding > 0}
					<a href="/wedding/bookings" class="block">
						<Card.Root class="hover:bg-accent p-4 transition-colors">
							<p class="flex items-center gap-2 text-sm font-medium">
								<Wallet class="size-4" />
								{etb(data.bookings.outstanding)} ETB left to pay
							</p>
						</Card.Root>
					</a>
				{/if}
			</div>
		{/if}

		<!-- Four pillars -->
		<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
			<!-- Budget -->
			<a href="/wedding/budget" class="block">
				<Card.Root class="hover:border-primary/40 h-full p-5 transition-colors">
					<div class="text-muted-foreground flex items-center gap-2 text-xs">
						<Wallet class="size-4" /> Budget
					</div>
					<p class="mt-2 text-2xl font-semibold">{etb(data.budget.spent)}</p>
					<p class="text-muted-foreground text-xs">of {etb(w.totalBudget)} ETB spent</p>
					<Progress value={budgetPct} class="mt-3 h-1.5" />
				</Card.Root>
			</a>

			<!-- Guests -->
			<a href="/wedding/guests" class="block">
				<Card.Root class="hover:border-primary/40 h-full p-5 transition-colors">
					<div class="text-muted-foreground flex items-center gap-2 text-xs">
						<Users class="size-4" /> Guests
					</div>
					<p class="mt-2 text-2xl font-semibold">{data.guests.total}</p>
					<p class="text-muted-foreground text-xs">
						{data.guests.confirmed} confirmed · {w.expectedGuests || '—'} expected
					</p>
					<Progress value={guestPct} class="mt-3 h-1.5" />
				</Card.Root>
			</a>

			<!-- Tasks -->
			<a href="/wedding/tasks" class="block">
				<Card.Root class="hover:border-primary/40 h-full p-5 transition-colors">
					<div class="text-muted-foreground flex items-center gap-2 text-xs">
						<ListChecks class="size-4" /> Tasks
					</div>
					<p class="mt-2 text-2xl font-semibold">
						{data.tasks.done}<span class="text-muted-foreground text-base">/{data.tasks.total}</span>
					</p>
					<p class="text-muted-foreground text-xs">
						{data.tasks.total - data.tasks.done} still to do
					</p>
					<Progress value={taskPct} class="mt-3 h-1.5" />
				</Card.Root>
			</a>

			<!-- Bookings -->
			<a href="/wedding/bookings" class="block">
				<Card.Root class="hover:border-primary/40 h-full p-5 transition-colors">
					<div class="text-muted-foreground flex items-center gap-2 text-xs">
						<Store class="size-4" /> Vendors
					</div>
					<p class="mt-2 text-2xl font-semibold">{data.bookings.total}</p>
					<p class="text-muted-foreground text-xs">
						{data.bookings.confirmed} confirmed · {data.bookings.pending} pending
					</p>
					<Progress value={bookingPct} class="mt-3 h-1.5" />
				</Card.Root>
			</a>
		</div>

		<div class="grid gap-6 lg:grid-cols-3">
			<!-- Next up -->
			<Card.Root class="lg:col-span-2">
				<Card.Header class="flex-row items-center justify-between">
					<div>
						<Card.Title>Next up</Card.Title>
						<Card.Description>Your most urgent tasks.</Card.Description>
					</div>
					<Button variant="ghost" size="sm" href="/wedding/tasks">
						All tasks <ArrowRight class="ml-1.5 size-4" />
					</Button>
				</Card.Header>

				<Card.Content>
					{#if data.tasks.next.length === 0}
						<div class="py-8 text-center">
							{#if data.tasks.total === 0}
								<ListChecks class="text-muted-foreground mx-auto size-7" />
								<p class="text-muted-foreground mt-3 text-sm">No tasks yet.</p>
								<Button variant="outline" size="sm" class="mt-4" href="/wedding/tasks">
									<Sparkles class="mr-2 size-4" /> Build your checklist
								</Button>
							{:else}
								<CircleCheck class="mx-auto size-7 text-emerald-600" />
								<p class="text-muted-foreground mt-3 text-sm">Everything's done. Nice.</p>
							{/if}
						</div>
					{:else}
						<ul class="divide-y">
							{#each data.tasks.next as task (task.id)}
								<li class="flex items-center gap-3 py-2.5">
									<div class="border-muted-foreground/30 size-4 shrink-0 rounded border"></div>
									<div class="min-w-0 flex-1">
										<p class="truncate text-sm font-medium">{task.title}</p>
										<p
											class="flex items-center gap-1 text-xs"
											class:text-destructive={task.daysAway !== null && task.daysAway < 0}
											class:text-muted-foreground={task.daysAway === null || task.daysAway >= 0}
										>
											<CalendarClock class="size-3" />{dueLabel(task.daysAway)}
										</p>
									</div>
								</li>
							{/each}
						</ul>
					{/if}
				</Card.Content>
			</Card.Root>

			<!-- Payments -->
			<Card.Root>
				<Card.Header>
					<Card.Title>Outstanding</Card.Title>
					<Card.Description>What's still owed to vendors.</Card.Description>
				</Card.Header>

				<Card.Content class="space-y-4">
					<div>
						<p class="text-2xl font-semibold">{etb(data.bookings.outstanding)}</p>
						<p class="text-muted-foreground text-xs">
							{etb(data.bookings.paid)} of {etb(data.bookings.agreed)} ETB settled
						</p>
						{#if data.bookings.awaitingConfirmation > 0}
							<p class="text-muted-foreground mt-1 text-xs">
								{etb(data.bookings.awaitingConfirmation)} awaiting vendor confirmation
							</p>
						{/if}
					</div>

					{#if data.bookings.upcoming.length > 0}
						<Separator />
						<ul class="space-y-3">
							{#each data.bookings.upcoming as booking (booking.id)}
								<li class="flex items-center justify-between gap-3">
									<div class="min-w-0">
										<p class="truncate text-sm font-medium">{booking.vendorName}</p>
										<p class="text-muted-foreground text-xs">{shortDate(booking.eventDate)}</p>
									</div>
									<span class="text-sm font-medium tabular-nums">{etb(booking.balance)}</span>
								</li>
							{/each}
						</ul>
					{/if}

					<Button variant="outline" size="sm" class="w-full" href="/wedding/bookings">
						Manage bookings
					</Button>
				</Card.Content>
			</Card.Root>
		</div>

		<!-- Budget breakdown -->
		{#if data.budget.topCategories.length > 0}
			<Card.Root>
				<Card.Header class="flex-row items-center justify-between">
					<div>
						<Card.Title>Where the money goes</Card.Title>
						<Card.Description>Your biggest planned categories.</Card.Description>
					</div>
					<Button variant="ghost" size="sm" href="/wedding/budget">
						Full budget <ArrowRight class="ml-1.5 size-4" />
					</Button>
				</Card.Header>

				<Card.Content class="space-y-4">
					{#each data.budget.topCategories as cat (cat.name)}
						{@const pct = cat.planned > 0 ? Math.min(100, (cat.actual / cat.planned) * 100) : 0}
						<div>
							<div class="mb-1.5 flex items-center justify-between text-sm">
								<span class="font-medium">{cat.name}</span>
								<span class="text-muted-foreground tabular-nums">
									{etb(cat.actual)} / {etb(cat.planned)}
								</span>
							</div>
							<Progress value={pct} class="h-1.5" />
						</div>
					{/each}
				</Card.Content>
			</Card.Root>
		{/if}

		<!-- Recommended vendors -->
		{#if data.recommended.length > 0}
			<Card.Root>
				<Card.Header class="flex-row items-center justify-between">
					<div>
						<Card.Title>Vendors you might like</Card.Title>
						<Card.Description>Top-rated on Leora Events.</Card.Description>
					</div>
					<Button variant="ghost" size="sm" href="/vendors">
						Browse all <ArrowRight class="ml-1.5 size-4" />
					</Button>
				</Card.Header>

				<Card.Content>
					<div class="grid gap-4 sm:grid-cols-3">
						{#each data.recommended as vendor (vendor.id)}
							<a href="/vendors/{vendor.id}" class="group block">
								<div class="bg-muted aspect-[4/3] overflow-hidden rounded-lg">
									{#if vendor.cover}
										<img
											src={vendor.cover}
											alt={vendor.name}
											loading="lazy"
											class="size-full object-cover transition-transform duration-300 group-hover:scale-105"
										/>
									{:else}
										<div class="text-muted-foreground flex size-full items-center justify-center">
											<Store class="size-7" />
										</div>
									{/if}
								</div>

								<p class="mt-2 flex items-center gap-1.5 truncate text-sm font-medium">
									{vendor.name}
									{#if vendor.isVerified}
										<BadgeCheck class="text-primary size-3.5 shrink-0" />
									{/if}
								</p>

								<div class="text-muted-foreground flex items-center gap-2 text-xs">
									{#if vendor.category}<span>{vendor.category}</span>{/if}
									{#if vendor.reviewCount > 0}
										<span class="flex items-center gap-0.5">
											<Star class="size-3 fill-amber-400 text-amber-400" />
											{vendor.rating?.toFixed(1)}
										</span>
									{/if}
								</div>
							</a>
						{/each}
					</div>
				</Card.Content>
			</Card.Root>
		{/if}
	</div>
{/if}