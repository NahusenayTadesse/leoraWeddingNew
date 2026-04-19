<script lang="ts">
	import type { PageData } from './$types';
	import { Badge } from '$lib/components/ui/badge';
	import { Progress } from '$lib/components/ui/progress';
	import { Separator } from '$lib/components/ui/separator';

	let { data }: { data: PageData } = $props();

	const { wedding, couple, budgetItems, guests, tasks, stats } = data;

	const fmt = new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency: 'USD',
		maximumFractionDigits: 0
	});

	function formatDate(d: string | null | undefined) {
		if (!d) return '—';
		return new Date(d).toLocaleDateString('en-US', {
			weekday: 'long',
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		});
	}

	function relativeDate(d: string | null | undefined) {
		if (!d) return null;
		const diff = Math.ceil((new Date(d).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
		if (diff < 0) return 'Overdue';
		if (diff === 0) return 'Today';
		if (diff === 1) return 'Tomorrow';
		return `In ${diff}d`;
	}

	const brideGuests = $derived(guests.filter((g) => g.side === 'bride'));
	const groomGuests = $derived(guests.filter((g) => g.side === 'groom'));
	const pendingTasks = $derived(tasks.filter((t) => !t.isConfirmed));
	const doneTasks = $derived(tasks.filter((t) => t.isConfirmed));

	const budgetPct = $derived(
		stats.totalPlanned > 0
			? Math.min(100, Math.round((stats.totalActual / stats.totalPlanned) * 100))
			: 0
	);
	const taskPct = $derived(
		stats.totalTasks > 0 ? Math.round((stats.completedTasks / stats.totalTasks) * 100) : 0
	);
	const guestPct = $derived(
		stats.totalGuests > 0 ? Math.round((stats.confirmedGuests / stats.totalGuests) * 100) : 0
	);
</script>

<svelte:head>
	<title>{couple.brideName} & {couple.groomName} — Wedding</title>
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link
		href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=Jost:wght@300;400;500&display=swap"
		rel="stylesheet"
	/>
</svelte:head>

<div class="min-h-screen bg-[#faf8f5]" style="font-family: 'Jost', sans-serif;">
	<!-- Hero Header -->
	<header class="relative overflow-hidden bg-[#2d1f1a] text-[#f5ede3]">
		<!-- Decorative botanical SVG -->
		<svg
			class="absolute top-0 left-0 h-full w-64 opacity-10"
			viewBox="0 0 200 400"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
		>
			<path
				d="M40 400 Q60 300 20 200 Q-10 100 40 0"
				stroke="#c9a882"
				stroke-width="1.5"
				fill="none"
			/>
			<ellipse cx="30" cy="180" rx="28" ry="14" fill="#c9a882" transform="rotate(-30 30 180)" />
			<ellipse cx="55" cy="240" rx="22" ry="11" fill="#c9a882" transform="rotate(20 55 240)" />
			<ellipse cx="20" cy="120" rx="20" ry="10" fill="#c9a882" transform="rotate(-50 20 120)" />
			<ellipse cx="65" cy="310" rx="18" ry="9" fill="#c9a882" transform="rotate(40 65 310)" />
		</svg>
		<svg
			class="absolute top-0 right-0 h-full w-64 scale-x-[-1] opacity-10"
			viewBox="0 0 200 400"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
		>
			<path
				d="M40 400 Q60 300 20 200 Q-10 100 40 0"
				stroke="#c9a882"
				stroke-width="1.5"
				fill="none"
			/>
			<ellipse cx="30" cy="180" rx="28" ry="14" fill="#c9a882" transform="rotate(-30 30 180)" />
			<ellipse cx="55" cy="240" rx="22" ry="11" fill="#c9a882" transform="rotate(20 55 240)" />
			<ellipse cx="20" cy="120" rx="20" ry="10" fill="#c9a882" transform="rotate(-50 20 120)" />
			<ellipse cx="65" cy="310" rx="18" ry="9" fill="#c9a882" transform="rotate(40 65 310)" />
		</svg>

		<div class="relative mx-auto max-w-4xl px-6 py-16 text-center">
			<p class="mb-3 text-xs tracking-[0.4em] text-[#c9a882] uppercase">Wedding Dashboard</p>

			<h1
				class="mb-2 text-5xl leading-tight font-light md:text-6xl"
				style="font-family: 'Cormorant Garamond', serif; font-style: italic;"
			>
				{couple.brideName}
				<span class="mx-3 text-[#c9a882] not-italic" style="font-weight: 300;">&</span>
				{couple.groomName}
			</h1>

			<div class="mt-5 flex items-center justify-center gap-3 text-sm text-[#c9a882]">
				<span>✦</span>
				<span class="text-xs font-light tracking-widest uppercase"
					>{formatDate(wedding.weddingDate)}</span
				>
				<span>✦</span>
			</div>

			{#if wedding.city}
				<p class="mt-2 text-sm font-light tracking-wide text-[#d4bfa8]">{wedding.city}</p>
			{/if}

			{#if stats.daysUntilWedding !== null}
				<div class="mt-8 inline-block border border-[#c9a882]/30 px-8 py-3">
					{#if stats.daysUntilWedding > 0}
						<span
							class="text-3xl font-light text-[#f5ede3]"
							style="font-family: 'Cormorant Garamond', serif;">{stats.daysUntilWedding}</span
						>
						<span class="ml-2 text-xs tracking-[0.3em] text-[#c9a882] uppercase">days to go</span>
					{:else if stats.daysUntilWedding === 0}
						<span class="text-lg tracking-[0.3em] text-[#c9a882] uppercase"
							>Today is the day! 🎉</span
						>
					{:else}
						<span class="text-xs tracking-[0.3em] text-[#c9a882] uppercase">Happily married ♡</span>
					{/if}
				</div>
			{/if}
		</div>
	</header>

	<main class="mx-auto max-w-4xl space-y-10 px-4 py-12">
		<!-- At-a-Glance Stats -->
		<section class="grid grid-cols-2 gap-4 md:grid-cols-4">
			{#each [{ label: 'Expected Guests', value: wedding.expectedGuests ?? '—', sub: null }, { label: 'RSVP Confirmed', value: `${stats.confirmedGuests}/${stats.totalGuests}`, sub: `${guestPct}%` }, { label: 'Budget Spent', value: fmt.format(stats.totalActual), sub: `of ${fmt.format(stats.totalPlanned > 0 ? stats.totalPlanned : Number(wedding.totalBudget ?? 0))}` }, { label: 'Tasks Done', value: `${stats.completedTasks}/${stats.totalTasks}`, sub: `${taskPct}%` }] as card}
				<div class="border border-[#e8ddd4] bg-white p-5 text-center shadow-sm">
					<p class="mb-1 text-[10px] tracking-[0.3em] text-[#9c7f6e] uppercase">{card.label}</p>
					<p
						class="text-2xl font-light text-[#2d1f1a]"
						style="font-family: 'Cormorant Garamond', serif;"
					>
						{card.value}
					</p>
					{#if card.sub}
						<p class="mt-0.5 text-xs text-[#b89e8c]">{card.sub}</p>
					{/if}
				</div>
			{/each}
		</section>

		<!-- Couple & Wedding Details -->
		<section class="grid gap-6 md:grid-cols-2">
			<!-- Couple -->
			<div class="border border-[#e8ddd4] bg-white p-6 shadow-sm">
				<h2 class="section-title">The Couple</h2>
				<Separator class="mb-4 bg-[#e8ddd4]" />
				<dl class="space-y-3 text-sm">
					<div class="flex justify-between">
						<dt class="tracking-wide text-[#9c7f6e]">Bride</dt>
						<dd class="font-medium text-[#2d1f1a]">{couple.brideName}</dd>
					</div>
					<div class="flex justify-between">
						<dt class="tracking-wide text-[#9c7f6e]">Groom</dt>
						<dd class="font-medium text-[#2d1f1a]">{couple.groomName}</dd>
					</div>
					{#if couple.email}
						<div class="flex justify-between">
							<dt class="tracking-wide text-[#9c7f6e]">Email</dt>
							<dd class="text-[#2d1f1a]">{couple.email}</dd>
						</div>
					{/if}
					{#if couple.phone}
						<div class="flex justify-between">
							<dt class="tracking-wide text-[#9c7f6e]">Phone</dt>
							<dd class="text-[#2d1f1a]">{couple.phone}</dd>
						</div>
					{/if}
					{#if couple.phone2}
						<div class="flex justify-between">
							<dt class="tracking-wide text-[#9c7f6e]">Phone 2</dt>
							<dd class="text-[#2d1f1a]">{couple.phone2}</dd>
						</div>
					{/if}
					<div class="flex justify-between">
						<dt class="tracking-wide text-[#9c7f6e]">Status</dt>
						<dd>
							{#if couple.verified}
								<span
									class="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700"
								>
									<span>✓</span> Verified
								</span>
							{:else}
								<span
									class="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs text-amber-700"
								>
									Pending
								</span>
							{/if}
						</dd>
					</div>
				</dl>
			</div>

			<!-- Wedding Details -->
			<div class="border border-[#e8ddd4] bg-white p-6 shadow-sm">
				<h2 class="section-title">Wedding Details</h2>
				<Separator class="mb-4 bg-[#e8ddd4]" />
				<dl class="space-y-3 text-sm">
					{#if wedding.weddingStyle}
						<div class="flex justify-between">
							<dt class="tracking-wide text-[#9c7f6e]">Style</dt>
							<dd>
								<span
									class="border border-[#c9a882]/40 bg-[#fdf5ed] px-2.5 py-0.5 text-xs tracking-wide text-[#7a5c48] capitalize"
									>{wedding.weddingStyle}</span
								>
							</dd>
						</div>
					{/if}
					<div class="flex justify-between">
						<dt class="tracking-wide text-[#9c7f6e]">Date</dt>
						<dd class="text-right text-[#2d1f1a]">{formatDate(wedding.weddingDate)}</dd>
					</div>
					{#if wedding.city}
						<div class="flex justify-between">
							<dt class="tracking-wide text-[#9c7f6e]">City</dt>
							<dd class="text-[#2d1f1a]">{wedding.city}</dd>
						</div>
					{/if}
					<div class="flex justify-between">
						<dt class="tracking-wide text-[#9c7f6e]">Expected Guests</dt>
						<dd class="text-[#2d1f1a]">{wedding.expectedGuests ?? '—'}</dd>
					</div>
					{#if wedding.totalBudget}
						<div class="flex justify-between">
							<dt class="tracking-wide text-[#9c7f6e]">Total Budget</dt>
							<dd class="font-medium text-[#2d1f1a]">{fmt.format(Number(wedding.totalBudget))}</dd>
						</div>
					{/if}
				</dl>
			</div>
		</section>

		<!-- Budget -->
		{#if budgetItems.length > 0}
			<section class="border border-[#e8ddd4] bg-white p-6 shadow-sm">
				<div class="mb-1 flex items-end justify-between">
					<h2 class="section-title mb-0">Budget</h2>
					<span class="text-xs text-[#9c7f6e]"
						>{fmt.format(stats.totalActual)} spent of {fmt.format(stats.totalPlanned)} planned</span
					>
				</div>
				<div class="mt-2 mb-6 h-1.5 w-full overflow-hidden rounded-full bg-[#f0e8e0]">
					<div
						class="h-full rounded-full transition-all"
						class:bg-emerald-500={budgetPct < 80}
						class:bg-amber-500={budgetPct >= 80 && budgetPct < 100}
						class:bg-rose-500={budgetPct >= 100}
						style="width: {budgetPct}%"
					></div>
				</div>
				<div class="divide-y divide-[#f0e8e0]">
					{#each budgetItems as item}
						{@const planned = Number(item.plannedAmount ?? 0)}
						{@const actual = Number(item.actualAmount ?? 0)}
						{@const pct = planned > 0 ? Math.min(100, Math.round((actual / planned) * 100)) : 0}
						<div class="grid grid-cols-[1fr_auto_auto] items-center gap-4 py-3 text-sm">
							<div>
								<span class="text-[#2d1f1a]">Category #{item.categoryId}</span>
								{#if item.notes}
									<p class="mt-0.5 truncate text-xs text-[#9c7f6e]">{item.notes}</p>
								{/if}
							</div>
							<div class="text-right">
								<p class="font-medium text-[#2d1f1a]">{fmt.format(actual)}</p>
								<p class="text-xs text-[#9c7f6e]">of {fmt.format(planned)}</p>
							</div>
							<div class="w-16">
								<div class="h-1 overflow-hidden rounded-full bg-[#f0e8e0]">
									<div
										class="h-full rounded-full"
										class:bg-emerald-400={pct < 80}
										class:bg-amber-400={pct >= 80 && pct < 100}
										class:bg-rose-400={pct >= 100}
										style="width: {pct}%"
									></div>
								</div>
								<p class="mt-0.5 text-right text-[10px] text-[#b89e8c]">{pct}%</p>
							</div>
						</div>
					{/each}
				</div>
			</section>
		{/if}

		<!-- Guest List -->
		{#if guests.length > 0}
			<section class="border border-[#e8ddd4] bg-white p-6 shadow-sm">
				<div class="flex items-end justify-between">
					<h2 class="section-title">Guest List</h2>
					<span class="text-xs text-[#9c7f6e]"
						>{stats.confirmedGuests} of {stats.totalGuests} confirmed</span
					>
				</div>
				<Separator class="my-4 bg-[#e8ddd4]" />
				<div class="grid gap-6 md:grid-cols-2">
					<!-- Bride's side -->
					<div>
						<h3 class="mb-3 text-[10px] tracking-[0.3em] text-[#c9a882] uppercase">Bride's Side</h3>
						{#if brideGuests.length === 0}
							<p class="text-sm text-[#b89e8c] italic">No guests added yet</p>
						{:else}
							<ul class="space-y-2">
								{#each brideGuests as guest}
									<li
										class="flex items-center justify-between border-b border-[#f5ede3] py-1.5 text-sm last:border-0"
									>
										<span class="text-[#2d1f1a]">{guest.fullName}</span>
										{#if guest.isConfirmed}
											<span
												class="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] text-emerald-600"
												>Confirmed</span
											>
										{:else}
											<span
												class="rounded-full border border-[#e8ddd4] bg-[#f5ede3] px-2 py-0.5 text-[10px] text-[#9c7f6e]"
												>Pending</span
											>
										{/if}
									</li>
								{/each}
							</ul>
						{/if}
					</div>
					<!-- Groom's side -->
					<div>
						<h3 class="mb-3 text-[10px] tracking-[0.3em] text-[#c9a882] uppercase">Groom's Side</h3>
						{#if groomGuests.length === 0}
							<p class="text-sm text-[#b89e8c] italic">No guests added yet</p>
						{:else}
							<ul class="space-y-2">
								{#each groomGuests as guest}
									<li
										class="flex items-center justify-between border-b border-[#f5ede3] py-1.5 text-sm last:border-0"
									>
										<span class="text-[#2d1f1a]">{guest.fullName}</span>
										{#if guest.isConfirmed}
											<span
												class="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] text-emerald-600"
												>Confirmed</span
											>
										{:else}
											<span
												class="rounded-full border border-[#e8ddd4] bg-[#f5ede3] px-2 py-0.5 text-[10px] text-[#9c7f6e]"
												>Pending</span
											>
										{/if}
									</li>
								{/each}
							</ul>
						{/if}
					</div>
				</div>
			</section>
		{/if}

		<!-- Tasks -->
		{#if tasks.length > 0}
			<section class="border border-[#e8ddd4] bg-white p-6 shadow-sm">
				<div class="flex items-end justify-between">
					<h2 class="section-title">Tasks</h2>
					<span class="text-xs text-[#9c7f6e]">{stats.completedTasks}/{stats.totalTasks} done</span>
				</div>
				<div class="mt-2 mb-5 h-1.5 w-full overflow-hidden rounded-full bg-[#f0e8e0]">
					<div
						class="h-full rounded-full bg-[#c9a882] transition-all"
						style="width: {taskPct}%"
					></div>
				</div>

				{#if pendingTasks.length > 0}
					<h3 class="mb-2 text-[10px] tracking-[0.3em] text-[#9c7f6e] uppercase">Pending</h3>
					<ul class="mb-6 space-y-2">
						{#each pendingTasks as task}
							{@const rel = relativeDate(task.dueDate)}
							<li
								class="flex items-center justify-between gap-3 border-b border-[#f5ede3] py-2.5 last:border-0"
							>
								<div class="flex items-center gap-3">
									<div class="h-4 w-4 flex-shrink-0 rounded-full border border-[#c9a882]"></div>
									<span class="text-sm text-[#2d1f1a]">{task.title}</span>
								</div>
								{#if rel}
									<span
										class="flex-shrink-0 rounded-full border px-2 py-0.5 text-[10px]"
										class:text-rose-600={rel === 'Overdue'}
										class:bg-rose-50={rel === 'Overdue'}
										class:border-rose-200={rel === 'Overdue'}
										class:text-amber-600={rel === 'Today' || rel === 'Tomorrow'}
										class:bg-amber-50={rel === 'Today' || rel === 'Tomorrow'}
										class:border-amber-200={rel === 'Today' || rel === 'Tomorrow'}
										class:text-[#9c7f6e]={rel !== 'Overdue' &&
											rel !== 'Today' &&
											rel !== 'Tomorrow'}
										class:bg-[#f5ede3]={rel !== 'Overdue' && rel !== 'Today' && rel !== 'Tomorrow'}
										class:border-[#e8ddd4]={rel !== 'Overdue' &&
											rel !== 'Today' &&
											rel !== 'Tomorrow'}>{rel}</span
									>
								{/if}
							</li>
						{/each}
					</ul>
				{/if}

				{#if doneTasks.length > 0}
					<h3 class="mb-2 text-[10px] tracking-[0.3em] text-[#9c7f6e] uppercase">Completed</h3>
					<ul class="space-y-2">
						{#each doneTasks as task}
							<li
								class="flex items-center gap-3 border-b border-[#f5ede3] py-2 text-sm text-[#b89e8c] last:border-0"
							>
								<div
									class="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full border border-[#c9a882]/40 bg-[#c9a882]/20"
								>
									<svg class="h-2.5 w-2.5 text-[#c9a882]" viewBox="0 0 10 8" fill="none">
										<path
											d="M1 4l2.5 2.5L9 1"
											stroke="currentColor"
											stroke-width="1.5"
											stroke-linecap="round"
											stroke-linejoin="round"
										/>
									</svg>
								</div>
								<span class="line-through">{task.title}</span>
							</li>
						{/each}
					</ul>
				{/if}
			</section>
		{/if}
	</main>

	<!-- Footer -->
	<footer class="mt-12 border-t border-[#e8ddd4] py-8 text-center">
		<p class="text-xs tracking-[0.3em] text-[#b89e8c] uppercase">
			{couple.brideName} ✦ {couple.groomName}
		</p>
		{#if wedding.weddingDate}
			<p class="mt-1 text-[10px] text-[#c9a882]">{new Date(wedding.weddingDate).getFullYear()}</p>
		{/if}
	</footer>
</div>
<!--
<style>
	:global(.section-title) {
		font-family: 'Cormorant Garamond', serif;
		font-size: 1.25rem;
		font-weight: 400;
		color: #2d1f1a;
		letter-spacing: 0.03em;
		margin-bottom: 0;
	}
</style> -->
