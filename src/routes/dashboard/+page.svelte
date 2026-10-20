<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
	import { Button } from '@nahu/admin-kit/components/ui/button/index.js';
	import * as Card from '@nahu/admin-kit/components/ui/card/index.js';
	import { Badge } from '@nahu/admin-kit/components/ui/badge/index.js';
	import { Progress } from '@nahu/admin-kit/components/ui/progress/index.js';
	import { toMoney, formatETB } from '$lib/money';
	import { Star, CalendarDays, Users, Wallet, CheckCircle2 } from '@lucide/svelte';

	let { data } = $props();

	const eventLabels: Record<string, string> = {
		engagement: m.event_type_engagement(),
		shimgelegna: m.event_type_shimgelegna(),
		gebez_enshoshela: m.home_ev_gebez(),
		ceremony: m.home_ev_ceremony(),
		melse: m.event_type_melse(),
		kilikil: m.event_type_kilikil(),
		reception: m.dash_ev_reception(),
		other: m.event_type_other()
	};

	const previewFeatures = [
		['💰', m.dash_f1_title(), m.dash_f1_body()],
		['🤝', m.dash_f2_title(), m.dash_f2_body()],
		['👥', m.dash_f3_title(), m.dash_f3_body()],
		['✅', m.dash_f4_title(), m.dash_f4_body()],
		['🎉', m.dash_f5_title(), m.dash_f5_body()],
		['🔔', m.dash_f6_title(), m.dash_f6_body()]
	];

	const fmtDate = (d: string | Date | null) =>
		d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : null;
</script>

<svelte:head>
	<title>{data.couple ? m.dash_meta_yours() : m.err_planning_dashboard()} — Leora Events</title>
</svelte:head>

{#if !data.couple}
	<!-- ---------- Logged-out / no-workspace preview: no sample data ---------- -->
	<section class="mx-auto max-w-[1180px] px-5 py-16 text-center sm:px-8">
		<p class="text-[12.5px] font-bold tracking-[0.08em] text-accent-foreground uppercase">
			{m.home_dash_eyebrow()}
		</p>
		<h1
			class="mx-auto mt-2 max-w-2xl font-display text-4xl font-extrabold text-balance sm:text-5xl"
		>
			{m.home_dash_title()}
		</h1>
		<p class="mx-auto mt-4 max-w-xl text-[15.5px] text-muted-foreground">
			{m.home_dash_lead()}
		</p>
		<div class="mt-7 flex flex-wrap justify-center gap-3">
			{#if data.loggedIn}
				<Button href="/wedding/profile" size="lg">{m.dash_create_profile()}</Button>
			{:else}
				<Button href="/signup" size="lg">{m.nav_start()}</Button>
				<Button href="/login" variant="outline" size="lg">{m.nav_login()}</Button>
			{/if}
		</div>

		<div class="mt-14 grid gap-4 text-left sm:grid-cols-2 lg:grid-cols-3">
			{#each previewFeatures as [icon, title, body] (title)}
				<Card.Root class="h-full">
					<Card.Content>
						<span class="grid size-11 place-items-center rounded-xl bg-accent text-xl">{icon}</span>
						<h2 class="mt-3 text-base font-bold">{title}</h2>
						<p class="mt-1.5 text-[13.5px] leading-relaxed text-muted-foreground">{body}</p>
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
				<p class="text-[12.5px] font-bold tracking-[0.08em] text-accent-foreground uppercase">
					{m.home_dash_eyebrow()}
				</p>
				<h1 class="mt-2 font-display text-3xl font-extrabold sm:text-4xl">
					{#if data.couple.brideName && data.couple.groomName}
						{data.couple.brideName} &amp; {data.couple.groomName}
					{:else}
						{m.dash_workspace()}
					{/if}
				</h1>
				<p class="mt-2 text-[14px] text-muted-foreground">
					{#if data.daysUntilWedding === null}
						{m.dash_set_date()}
					{:else if data.daysUntilWedding > 0}
						{m.dash_days_until({ days: data.daysUntilWedding })}
					{:else if data.daysUntilWedding === 0}
						{m.dash_today()}
					{:else}
						{m.dash_passed()}
					{/if}
				</p>
			</div>
			<Badge variant="secondary" class="text-accent-foreground"
				>{m.dash_plan({ plan: data.planSlug.name })}</Badge
			>
		</div>

		<!-- Stat row -->
		<div class="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
			<Card.Root>
				<Card.Content>
					<p class="flex items-center gap-1.5 text-[12.5px] font-bold text-muted-foreground">
						<CheckCircle2 class="size-3.5" />
						{m.dash_progress()}
					</p>
					<p class="mt-2 font-display text-3xl font-extrabold">{data.progressPct}%</p>
					<Progress value={data.progressPct} class="mt-3 h-2" />
					<p class="mt-2 text-[12.5px] text-muted-foreground">
						{m.dash_tasks_done({ done: data.tasks.done, total: data.tasks.total })}
					</p>
				</Card.Content>
			</Card.Root>

			<Card.Root>
				<Card.Content>
					<p class="flex items-center gap-1.5 text-[12.5px] font-bold text-muted-foreground">
						<Wallet class="size-3.5" />
						{m.dash_spent()}
					</p>
					<p class="mt-2 font-display text-3xl font-extrabold">{formatETB(data.budget.actual)}</p>
					<p class="mt-2 text-[12.5px] text-muted-foreground">
						{m.dash_of_estimated({ amount: formatETB(data.budget.estimated) })}
					</p>
				</Card.Content>
			</Card.Root>

			<Card.Root>
				<Card.Content>
					<p class="flex items-center gap-1.5 text-[12.5px] font-bold text-muted-foreground">
						<Users class="size-3.5" />
						{m.dash_guests_confirmed()}
					</p>
					<p class="mt-2 font-display text-3xl font-extrabold">
						{data.guests.confirmed}<span class="text-lg text-muted-foreground"
							>/{data.guests.total}</span
						>
					</p>
					<p class="mt-2 text-[12.5px] text-muted-foreground">
						{m.dash_pending_declined({
							pending: data.guests.pending,
							declined: data.guests.declined
						})}
					</p>
				</Card.Content>
			</Card.Root>

			<Card.Root>
				<Card.Content>
					<p class="flex items-center gap-1.5 text-[12.5px] font-bold text-muted-foreground">
						<CalendarDays class="size-3.5" />
						{m.dash_budget_items()}
					</p>
					<p class="mt-2 font-display text-3xl font-extrabold">{data.budget.items}</p>
					<p class="mt-2 text-[12.5px] text-muted-foreground">
						{#if data.plan?.totalBudget}
							{m.dash_left({
								amount: formatETB(
									Math.max(0, toMoney(data.plan.totalBudget) - toMoney(data.budget.actual))
								)
							})}
						{:else}
							{m.dash_set_total()}
						{/if}
					</p>
				</Card.Content>
			</Card.Root>
		</div>

		<div class="mt-6 grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
			<div class="space-y-6">
				<Card.Root>
					<Card.Header class="flex-row items-center justify-between">
						<Card.Title class="font-display text-base font-extrabold"
							>{m.dash_upcoming()}</Card.Title
						>
						<Button href="/wedding/tasks" variant="ghost" size="sm">{m.dash_view_all()}</Button>
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
							<p class="py-8 text-center text-sm text-muted-foreground">
								{m.dash_no_tasks()}
								<a href="/wedding/tasks" class="underline">{m.dash_build_checklist()}</a>
							</p>
						{/if}
					</Card.Content>
				</Card.Root>

				<Card.Root>
					<Card.Header>
						<Card.Title class="font-display text-base font-extrabold">
							{m.dash_timeline()}
						</Card.Title>
					</Card.Header>
					<Card.Content>
						{#if data.events.length}
							<div class="flex flex-wrap gap-2">
								{#each data.events as ev (ev.id)}
									<span
										class="rounded-full bg-accent px-3.5 py-1.5 text-[12.5px] font-semibold text-accent-foreground"
									>
										{eventLabels[ev.eventType] ?? ev.eventName}
										{#if ev.eventDate}
											· {fmtDate(ev.eventDate)}
										{/if}
									</span>
								{/each}
							</div>
						{:else}
							<p class="py-8 text-center text-sm text-muted-foreground">
								{m.dash_no_events()}
								<a href="/wedding/events" class="underline">{m.dash_add_events()}</a>
							</p>
						{/if}
					</Card.Content>
				</Card.Root>
			</div>

			<div class="space-y-6">
				<Card.Root>
					<Card.Header class="flex-row items-center justify-between">
						<Card.Title class="font-display text-base font-extrabold">{m.dash_saved()}</Card.Title>
						<Button href="/wedding/saved" variant="ghost" size="sm">{m.dash_view_all()}</Button>
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
												<span class="block text-[12px] text-muted-foreground">{v.categoryName}</span
												>
											{/if}
										</span>
										<span class="flex shrink-0 items-center gap-0.5 text-[12.5px] text-primary">
											<Star class="size-3 fill-current" />
											{Number(v.ratingAvg).toFixed(1)}
										</span>
									</li>
								{/each}
							</ul>
						{:else}
							<p class="py-8 text-center text-sm text-muted-foreground">
								{m.dash_no_saved()}
								<a href="/vendors" class="underline">{m.dash_browse_market()}</a>
							</p>
						{/if}
					</Card.Content>
				</Card.Root>

				{#if data.planSlug.slug === 'free'}
					<Card.Root class="border-primary">
						<Card.Content>
							<p class="font-display text-base font-extrabold">{m.dash_unlock()}</p>
							<p class="mt-1.5 text-[13.5px] text-muted-foreground">
								{m.dash_unlock_body()}
							</p>
							<Button href="/pricing" class="mt-4 w-full">{m.cardp_see_plans()}</Button>
						</Card.Content>
					</Card.Root>
				{/if}
			</div>
		</div>
	</section>
{/if}
