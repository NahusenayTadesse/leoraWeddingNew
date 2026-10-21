<script lang="ts">
	import Milestones from '$lib/components/Milestones.svelte';
	import SeasonHints from '$lib/components/dates/SeasonHints.svelte';
	import DateText from '@nahu/admin-kit/components/DateText.svelte';
	import { dateLocale } from '$lib/dateLocale';
	import { m } from '$lib/paraglide/messages.js';
	import * as Card from '@nahu/admin-kit/components/ui/card/index.js';
	import { Button } from '@nahu/admin-kit/components/ui/button/index.js';
	import { Badge } from '@nahu/admin-kit/components/ui/badge/index.js';
	import { Progress } from '@nahu/admin-kit/components/ui/progress/index.js';
	import { Separator } from '@nahu/admin-kit/components/ui/separator/index.js';
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
		CircleCheck
	} from '@lucide/svelte';

	let { data } = $props();

	const etb = (n: number) => new Intl.NumberFormat('en-ET', { maximumFractionDigits: 0 }).format(n);

	function dueLabel(days: number | null) {
		if (days === null) return m.wov_no_due();
		if (days === 0) return m.wov_due_today();
		if (days === 1) return m.wov_due_tomorrow();
		if (days < 0) return m.wov_overdue({ days: Math.abs(days) });
		return m.wov_in_days({ days });
	}
</script>

{#if !data.ready}
	<!-- Setup state -->
	<div class="mx-auto max-w-2xl py-10">
		<Card.Root class="p-8 text-center">
			<CalendarHeart class="mx-auto size-10 text-primary" />
			<h1 class="mt-4 text-2xl font-semibold tracking-tight">
				{m.wov_almost({ name: data.coupleName })}
			</h1>
			<p class="mt-2 text-sm text-muted-foreground">
				{m.wov_setup_body()}
			</p>
			<Button href="/wedding/wedding" class="mt-6">
				{m.wov_setup()}
				<ArrowRight class="ml-2 size-4" />
			</Button>
		</Card.Root>
	</div>
{:else}
	{@const w = data.wedding}
	{@const budgetPct =
		w.totalBudget > 0 ? Math.min(100, (data.budget.spent / w.totalBudget) * 100) : 0}
	{@const guestPct =
		w.expectedGuests > 0 ? Math.min(100, (data.guests.total / w.expectedGuests) * 100) : 0}
	{@const taskPct = data.tasks.total > 0 ? (data.tasks.done / data.tasks.total) * 100 : 0}
	{@const bookingPct =
		data.bookings.agreed > 0 ? Math.min(100, (data.bookings.paid / data.bookings.agreed) * 100) : 0}
	{@const overBudget = data.budget.planned > w.totalBudget && w.totalBudget > 0}

	<div class="space-y-6">
		<!-- Hero -->
		<Card.Root class="overflow-hidden bg-gradient-to-br from-primary/10 to-transparent p-6 sm:p-8">
			<div class="flex flex-wrap items-start justify-between gap-6">
				<div class="min-w-0">
					<div class="flex flex-wrap items-center gap-2">
						<h1 class="text-2xl font-semibold tracking-tight sm:text-3xl">{data.coupleName}</h1>
						{#if data.verified}
							<Badge class="gap-1"><BadgeCheck class="size-3.5" /> {m.vdet_verified()}</Badge>
						{/if}
					</div>

					<div class="mt-3 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
						{#if w.date}
							<span class="flex items-center gap-1.5">
								<CalendarHeart class="size-4" /><DateText
									locale={dateLocale()}
									value={w.date}
									both
								/>
							</span>
						{/if}
						{#if w.city}
							<span class="flex items-center gap-1.5"><MapPin class="size-4" />{w.city}</span>
						{/if}
						{#if w.style}
							<span>{w.style}</span>
						{/if}
					</div>
					<SeasonHints date={w.date} class="mt-2" />
				</div>

				<div class="text-right">
					{#if w.daysAway === null}
						<p class="text-sm text-muted-foreground">{m.wov_no_date_set()}</p>
					{:else if w.daysAway > 0}
						<p class="text-4xl font-semibold sm:text-5xl">{w.daysAway}</p>
						<p class="text-sm text-muted-foreground">
							{m.wov_days_to_go_label()}
						</p>
					{:else if w.daysAway === 0}
						<p class="text-3xl font-semibold sm:text-4xl">{m.wov_today()}</p>
						<p class="text-sm text-muted-foreground">{m.wov_congrats()}</p>
					{:else}
						<p class="text-3xl font-semibold sm:text-4xl">{m.wov_married()}</p>
						<p class="text-sm text-muted-foreground">
							{m.wov_days_ago({ days: Math.abs(w.daysAway) })}
						</p>
					{/if}
				</div>
			</div>
		</Card.Root>

		<Milestones
			dateSet={!!w.date}
			daysAway={w.daysAway}
			partnerJoined={data.progress.partnerJoined}
			budgetItems={data.budget.itemCount}
			vendorsBooked={data.bookings.confirmed}
			guests={data.guests.total}
			cardPublished={data.progress.cardPublished}
			rsvps={data.progress.rsvps}
			tasksDone={data.tasks.done}
			tasksTotal={data.tasks.total}
			allPaid={data.bookings.total > 0 && data.bookings.outstanding === 0}
		/>

		<!-- Alerts -->
		{#if data.tasks.overdue > 0 || overBudget || data.bookings.outstanding > 0}
			<div class="grid gap-3 sm:grid-cols-3">
				{#if data.tasks.overdue > 0}
					<a href="/wedding/tasks" class="block">
						<Card.Root
							class="border-destructive/30 bg-destructive/5 p-4 transition-colors hover:bg-destructive/10"
						>
							<p class="flex items-center gap-2 text-sm font-medium text-destructive">
								<TriangleAlert class="size-4" />
								{m.wov_overdue_tasks({ count: data.tasks.overdue })}
							</p>
						</Card.Root>
					</a>
				{/if}

				{#if overBudget}
					<a href="/wedding/budget" class="block">
						<Card.Root
							class="border-destructive/30 bg-destructive/5 p-4 transition-colors hover:bg-destructive/10"
						>
							<p class="flex items-center gap-2 text-sm font-medium text-destructive">
								<TriangleAlert class="size-4" />
								{m.wov_over_budget({ amount: etb(data.budget.planned - w.totalBudget) })}
							</p>
						</Card.Root>
					</a>
				{/if}

				{#if data.bookings.outstanding > 0}
					<a href="/wedding/bookings" class="block">
						<Card.Root class="p-4 transition-colors hover:bg-accent">
							<p class="flex items-center gap-2 text-sm font-medium">
								<Wallet class="size-4" />
								{m.wov_left_to_pay({ amount: etb(data.bookings.outstanding) })}
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
				<Card.Root class="h-full p-5 transition-colors hover:border-primary/40">
					<div class="flex items-center gap-2 text-xs text-muted-foreground">
						<Wallet class="size-4" />
						{m.nav_budget()}
					</div>
					<p class="mt-2 text-2xl font-semibold">{etb(data.budget.spent)}</p>
					<p class="text-xs text-muted-foreground">
						{m.wov_spent_of({ amount: etb(w.totalBudget) })}
					</p>
					<Progress value={budgetPct} class="mt-3 h-1.5" />
				</Card.Root>
			</a>

			<!-- Guests -->
			<a href="/wedding/guests" class="block">
				<Card.Root class="h-full p-5 transition-colors hover:border-primary/40">
					<div class="flex items-center gap-2 text-xs text-muted-foreground">
						<Users class="size-4" />
						{m.nav_guests()}
					</div>
					<p class="mt-2 text-2xl font-semibold">{data.guests.total}</p>
					<p class="text-xs text-muted-foreground">
						{m.wov_guests_line({
							confirmed: data.guests.confirmed,
							expected: w.expectedGuests || '—'
						})}
					</p>
					<Progress value={guestPct} class="mt-3 h-1.5" />
				</Card.Root>
			</a>

			<!-- Tasks -->
			<a href="/wedding/tasks" class="block">
				<Card.Root class="h-full p-5 transition-colors hover:border-primary/40">
					<div class="flex items-center gap-2 text-xs text-muted-foreground">
						<ListChecks class="size-4" />
						{m.nav_tasks()}
					</div>
					<p class="mt-2 text-2xl font-semibold">
						{data.tasks.done}<span class="text-base text-muted-foreground">/{data.tasks.total}</span
						>
					</p>
					<p class="text-xs text-muted-foreground">
						{m.wov_still_to_do({ count: data.tasks.total - data.tasks.done })}
					</p>
					<Progress value={taskPct} class="mt-3 h-1.5" />
				</Card.Root>
			</a>

			<!-- Bookings -->
			<a href="/wedding/bookings" class="block">
				<Card.Root class="h-full p-5 transition-colors hover:border-primary/40">
					<div class="flex items-center gap-2 text-xs text-muted-foreground">
						<Store class="size-4" />
						{m.wov_vendors()}
					</div>
					<p class="mt-2 text-2xl font-semibold">{data.bookings.total}</p>
					<p class="text-xs text-muted-foreground">
						{m.wov_vendors_line({
							confirmed: data.bookings.confirmed,
							pending: data.bookings.pending
						})}
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
						<Card.Title>{m.wov_next_up()}</Card.Title>
						<Card.Description>{m.wov_urgent()}</Card.Description>
					</div>
					<Button variant="ghost" size="sm" href="/wedding/tasks">
						{m.wov_all_tasks()}
						<ArrowRight class="ml-1.5 size-4" />
					</Button>
				</Card.Header>

				<Card.Content>
					{#if data.tasks.next.length === 0}
						<div class="py-8 text-center">
							{#if data.tasks.total === 0}
								<ListChecks class="mx-auto size-7 text-muted-foreground" />
								<p class="mt-3 text-sm text-muted-foreground">{m.dash_no_tasks()}</p>
								<Button variant="outline" size="sm" class="mt-4" href="/wedding/tasks">
									<Sparkles class="mr-2 size-4" />
									{m.dash_build_checklist()}
								</Button>
							{:else}
								<CircleCheck class="mx-auto size-7 text-emerald-600" />
								<p class="mt-3 text-sm text-muted-foreground">{m.wov_all_done()}</p>
							{/if}
						</div>
					{:else}
						<ul class="divide-y">
							{#each data.tasks.next as task (task.id)}
								<li class="flex items-center gap-3 py-2.5">
									<div class="size-4 shrink-0 rounded border border-muted-foreground/30"></div>
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
					<Card.Title>{m.wov_outstanding()}</Card.Title>
					<Card.Description>{m.wov_owed()}</Card.Description>
				</Card.Header>

				<Card.Content class="space-y-4">
					<div>
						<p class="text-2xl font-semibold">{etb(data.bookings.outstanding)}</p>
						<p class="text-xs text-muted-foreground">
							{m.wov_settled({ paid: etb(data.bookings.paid), agreed: etb(data.bookings.agreed) })}
						</p>
						{#if data.bookings.awaitingConfirmation > 0}
							<p class="mt-1 text-xs text-muted-foreground">
								{m.wov_awaiting({ amount: etb(data.bookings.awaitingConfirmation) })}
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
										<p class="text-xs text-muted-foreground">
											{#if booking.eventDate}<DateText
													locale={dateLocale()}
													value={booking.eventDate}
													month="short"
												/>{:else}{m.wov_no_date()}{/if}
										</p>
									</div>
									<span class="text-sm font-medium tabular-nums">{etb(booking.balance)}</span>
								</li>
							{/each}
						</ul>
					{/if}

					<Button variant="outline" size="sm" class="w-full" href="/wedding/bookings">
						{m.wov_manage_bookings()}
					</Button>
				</Card.Content>
			</Card.Root>
		</div>

		<!-- Budget breakdown -->
		{#if data.budget.topCategories.length > 0}
			<Card.Root>
				<Card.Header class="flex-row items-center justify-between">
					<div>
						<Card.Title>{m.be_where()}</Card.Title>
						<Card.Description>{m.wov_biggest()}</Card.Description>
					</div>
					<Button variant="ghost" size="sm" href="/wedding/budget">
						{m.wov_full_budget()}
						<ArrowRight class="ml-1.5 size-4" />
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
						<Card.Title>{m.wov_might_like()}</Card.Title>
						<Card.Description>{m.wov_top_rated()}</Card.Description>
					</div>
					<Button variant="ghost" size="sm" href="/vendors">
						{m.wov_browse_all()}
						<ArrowRight class="ml-1.5 size-4" />
					</Button>
				</Card.Header>

				<Card.Content>
					<div class="grid gap-4 sm:grid-cols-3">
						{#each data.recommended as vendor (vendor.id)}
							<a href="/vendors/{vendor.id}" class="group block">
								<div class="aspect-[4/3] overflow-hidden rounded-lg bg-muted">
									{#if vendor.cover}
										<img
											src={vendor.cover}
											alt={vendor.name}
											loading="lazy"
											class="size-full object-cover transition-transform duration-300 group-hover:scale-105"
										/>
									{:else}
										<div class="flex size-full items-center justify-center text-muted-foreground">
											<Store class="size-7" />
										</div>
									{/if}
								</div>

								<p class="mt-2 flex items-center gap-1.5 truncate text-sm font-medium">
									{vendor.name}
									{#if vendor.isVerified}
										<BadgeCheck class="size-3.5 shrink-0 text-primary" />
									{/if}
								</p>

								<div class="flex items-center gap-2 text-xs text-muted-foreground">
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
