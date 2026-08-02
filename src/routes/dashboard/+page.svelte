<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Progress } from '$lib/components/ui/progress';
	import { toMoney, formatETB } from '$lib/money';
	import { Star, CalendarDays, Users, Wallet, CheckCircle2 } from '@lucide/svelte';

	let { data } = $props();

	const eventLabels: Record<string, string> = {
		engagement: 'Engagement',
		shimgelegna: 'Shimgelegna',
		gebez_enshoshela: 'Gebez / Enshoshela',
		ceremony: 'Wedding Ceremony',
		melse: 'Melse',
		kilikil: 'Kilikil',
		reception: 'Reception',
		other: 'Other'
	};

	const previewFeatures = [
		['💰', 'Budget Tracker', 'Set a total, split it by category and watch every birr against it.'],
		['🤝', 'Vendor Shortlists', 'Save vendors, compare them side by side and book from one place.'],
		['👥', 'Guest List & RSVP', 'Track invitations, replies, plus-ones and meal preferences.'],
		['✅', 'Task Checklist', 'A full Ethiopian wedding checklist, counted back from your date.'],
		['🎉', 'Multi-Event Planning', 'Engagement through Kilikil under a single budget and guest list.'],
		['🔔', 'Shared Workspace', 'Invite your partner so you both plan from the same numbers.']
	];

	const fmtDate = (d: string | Date | null) =>
		d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : null;
</script>

<svelte:head>
	<title>{data.couple ? 'Your Planning Dashboard' : 'Planning Dashboard'} — Leora Events</title>
</svelte:head>

{#if !data.couple}
	<!-- ---------- Logged-out / no-workspace preview: no sample data ---------- -->
	<section class="mx-auto max-w-[1180px] px-5 py-16 text-center sm:px-8">
		<p class="text-accent-foreground text-[12.5px] font-bold tracking-[0.08em] uppercase">
			Planning Dashboard
		</p>
		<h1 class="font-display mx-auto mt-2 max-w-2xl text-4xl font-extrabold text-balance sm:text-5xl">
			One workspace for the whole wedding
		</h1>
		<p class="text-muted-foreground mx-auto mt-4 max-w-xl text-[15.5px]">
			Track budget, tasks, vendors and guests — all in one place, updating live as you plan.
		</p>
		<div class="mt-7 flex flex-wrap justify-center gap-3">
			{#if data.loggedIn}
				<Button href="/wedding/profile" size="lg">Create your wedding profile</Button>
			{:else}
				<Button href="/signup" size="lg">Start Planning</Button>
				<Button href="/login" variant="outline" size="lg">Log in</Button>
			{/if}
		</div>

		<div class="mt-14 grid gap-4 text-left sm:grid-cols-2 lg:grid-cols-3">
			{#each previewFeatures as [icon, title, body] (title)}
				<Card.Root class="h-full">
					<Card.Content>
						<span class="bg-accent grid size-11 place-items-center rounded-xl text-xl">{icon}</span>
						<h2 class="mt-3 text-base font-bold">{title}</h2>
						<p class="text-muted-foreground mt-1.5 text-[13.5px] leading-relaxed">{body}</p>
					</Card.Content>
				</Card.Root>
			{/each}
		</div>
	</section>
{:else}
	<!-- ---------------- Signed in: this couple's real data ---------------- -->
	<section class="mx-auto max-w-[1180px] px-5 py-10 sm:px-8">
		<div class="flex flex-wrap items-end justify-between gap-4">
			<div>
				<p class="text-accent-foreground text-[12.5px] font-bold tracking-[0.08em] uppercase">
					Planning Dashboard
				</p>
				<h1 class="font-display mt-2 text-3xl font-extrabold sm:text-4xl">
					{#if data.couple.brideName && data.couple.groomName}
						{data.couple.brideName} &amp; {data.couple.groomName}
					{:else}
						Your Wedding Workspace
					{/if}
				</h1>
				<p class="text-muted-foreground mt-2 text-[14px]">
					{#if data.daysUntilWedding === null}
						Set your wedding date to start the countdown.
					{:else if data.daysUntilWedding > 0}
						{data.daysUntilWedding} days until your wedding
					{:else if data.daysUntilWedding === 0}
						Today is the day — congratulations!
					{:else}
						Your wedding day has passed — congratulations!
					{/if}
				</p>
			</div>
			<Badge variant="secondary" class="text-accent-foreground">{data.planSlug.name} plan</Badge>
		</div>

		<!-- Stat row -->
		<div class="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
			<Card.Root>
				<Card.Content>
					<p class="text-muted-foreground flex items-center gap-1.5 text-[12.5px] font-bold">
						<CheckCircle2 class="size-3.5" /> Planning progress
					</p>
					<p class="font-display mt-2 text-3xl font-extrabold">{data.progressPct}%</p>
					<Progress value={data.progressPct} class="mt-3 h-2" />
					<p class="text-muted-foreground mt-2 text-[12.5px]">
						{data.tasks.done} of {data.tasks.total} tasks done
					</p>
				</Card.Content>
			</Card.Root>

			<Card.Root>
				<Card.Content>
					<p class="text-muted-foreground flex items-center gap-1.5 text-[12.5px] font-bold">
						<Wallet class="size-3.5" /> Spent
					</p>
					<p class="font-display mt-2 text-3xl font-extrabold">{formatETB(data.budget.actual)}</p>
					<p class="text-muted-foreground mt-2 text-[12.5px]">
						of {formatETB(data.budget.estimated)} estimated
					</p>
				</Card.Content>
			</Card.Root>

			<Card.Root>
				<Card.Content>
					<p class="text-muted-foreground flex items-center gap-1.5 text-[12.5px] font-bold">
						<Users class="size-3.5" /> Guests confirmed
					</p>
					<p class="font-display mt-2 text-3xl font-extrabold">
						{data.guests.confirmed}<span class="text-muted-foreground text-lg"
							>/{data.guests.total}</span
						>
					</p>
					<p class="text-muted-foreground mt-2 text-[12.5px]">
						{data.guests.pending} pending · {data.guests.declined} declined
					</p>
				</Card.Content>
			</Card.Root>

			<Card.Root>
				<Card.Content>
					<p class="text-muted-foreground flex items-center gap-1.5 text-[12.5px] font-bold">
						<CalendarDays class="size-3.5" /> Budget items
					</p>
					<p class="font-display mt-2 text-3xl font-extrabold">{data.budget.items}</p>
					<p class="text-muted-foreground mt-2 text-[12.5px]">
						{#if data.plan?.totalBudget}
							{formatETB(
								Math.max(0, toMoney(data.plan.totalBudget) - toMoney(data.budget.actual))
							)} left of budget
						{:else}
							Set a total budget to track what's left
						{/if}
					</p>
				</Card.Content>
			</Card.Root>
		</div>

		<div class="mt-6 grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
			<div class="space-y-6">
				<Card.Root>
					<Card.Header class="flex-row items-center justify-between">
						<Card.Title class="font-display text-base font-extrabold">Upcoming Tasks</Card.Title>
						<Button href="/wedding/tasks" variant="ghost" size="sm">View all</Button>
					</Card.Header>
					<Card.Content>
						{#if data.tasks.upcoming.length}
							<ul class="divide-y">
								{#each data.tasks.upcoming as task (task.id)}
									<li class="flex items-center justify-between gap-3 py-2.5 first:pt-0">
										<span class="text-[13.5px]">{task.title}</span>
										<Badge variant={task.priority === 'high' ? 'default' : 'secondary'}>
											{fmtDate(task.dueDate) ?? task.priority}
										</Badge>
									</li>
								{/each}
							</ul>
						{:else}
							<p class="text-muted-foreground py-8 text-center text-sm">
								No tasks yet. <a href="/wedding/tasks" class="underline">Build your checklist</a> to
								get started.
							</p>
						{/if}
					</Card.Content>
				</Card.Root>

				<Card.Root>
					<Card.Header>
						<Card.Title class="font-display text-base font-extrabold">
							Wedding Events Timeline
						</Card.Title>
					</Card.Header>
					<Card.Content>
						{#if data.events.length}
							<div class="flex flex-wrap gap-2">
								{#each data.events as ev (ev.id)}
									<span
										class="bg-accent text-accent-foreground rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold"
									>
										{eventLabels[ev.eventType] ?? ev.eventName}
										{#if ev.eventDate}
											· {fmtDate(ev.eventDate)}
										{/if}
									</span>
								{/each}
							</div>
						{:else}
							<p class="text-muted-foreground py-8 text-center text-sm">
								No events scheduled yet. Add your Engagement, Shimgelegna, Gebez/Enshoshela,
								Ceremony, Melse and Kilikil dates to build your timeline.
							</p>
						{/if}
					</Card.Content>
				</Card.Root>
			</div>

			<div class="space-y-6">
				<Card.Root>
					<Card.Header class="flex-row items-center justify-between">
						<Card.Title class="font-display text-base font-extrabold">Saved Vendors</Card.Title>
						<Button href="/vendors" variant="ghost" size="sm">Browse</Button>
					</Card.Header>
					<Card.Content>
						{#if data.shortlist.length}
							<ul class="divide-y">
								{#each data.shortlist as v (v.id)}
									<li class="flex items-center justify-between gap-3 py-2.5 first:pt-0">
										<span>
											<a href="/vendors/{v.id}" class="text-[13.5px] font-medium hover:underline">
												{v.businessName}
											</a>
											{#if v.categoryName}
												<span class="text-muted-foreground block text-[12px]">{v.categoryName}</span>
											{/if}
										</span>
										<span class="text-primary flex shrink-0 items-center gap-0.5 text-[12.5px]">
											<Star class="size-3 fill-current" />
											{Number(v.ratingAvg).toFixed(1)}
										</span>
									</li>
								{/each}
							</ul>
						{:else}
							<p class="text-muted-foreground py-8 text-center text-sm">
								No vendors saved yet. <a href="/vendors" class="underline">Browse the marketplace</a>.
							</p>
						{/if}
					</Card.Content>
				</Card.Root>

				{#if data.planSlug.slug === 'free'}
					<Card.Root class="border-primary">
						<Card.Content>
							<p class="font-display text-base font-extrabold">Unlock unlimited tools</p>
							<p class="text-muted-foreground mt-1.5 text-[13.5px]">
								Golden gives you the unlimited budget estimator, 5-vendor comparison and a
								consultation.
							</p>
							<Button href="/pricing" class="mt-4 w-full">See plans</Button>
						</Card.Content>
					</Card.Root>
				{/if}
			</div>
		</div>
	</section>
{/if}
