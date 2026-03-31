<script lang="ts">
	import { TrendingUp, Star, Check } from '@lucide/svelte';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import StatsCard from '$lib/components/StatsCard.svelte';

	const leads = [
		{
			id: 1,
			couple: 'Hanna & Thomas',
			date: 'June 15, 2025',
			note: 'Looking for full day photography + video package. Budget: 50,000–60,000 ETB',
			status: 'new'
		},
		{
			id: 2,
			couple: 'Abeba & Daniel',
			date: 'August 22, 2025',
			note: 'Estimate sent: ETB 55,000 for premium package',
			status: 'pending'
		}
	];

	const packages = [
		{ name: 'Basic Package', price: 35000, desc: '6 hours coverage, 200 edited photos' },
		{ name: 'Premium Package', price: 55000, desc: 'Full day, video included, album' }
	];

	const reviews = [
		{
			text: 'Absolutely stunning photos! Captured every moment perfectly.',
			author: 'Sarah M.',
			ago: '2 days ago'
		},
		{
			text: 'Professional team, delivered on time. Highly recommend!',
			author: 'Michael K.',
			ago: '1 week ago'
		}
	];

	// Minimal calendar for the month
	const calendarDays = Array.from({ length: 35 }, (_, i) => {
		const d = i - 3; // offset for month start
		return d > 0 && d <= 30 ? d : null;
	});
	const bookedDays = new Set([6, 10, 17, 24]);
	const todayDay = 3;
</script>

<svelte:head>
	<title>Vendor Dashboard — Leora Events</title>
</svelte:head>

<div class="bg-leora-ivory min-h-screen pb-24">
	<div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
		<!-- Header -->
		<div class="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-center">
			<div>
				<h1 class="font-display text-leora-charcoal text-3xl font-semibold">Vendor Dashboard</h1>
				<p class="text-gray-600">Lensa Photography · Addis Ababa</p>
			</div>
			<div class="flex items-center gap-3">
				<div class="flex items-center gap-1">
					{#each { length: 5 } as _}
						<Star class="text-leora-gold fill-leora-gold h-5 w-5" />
					{/each}
					<span class="ml-2 font-semibold">4.9</span>
				</div>
				<Button size="md">Edit Profile</Button>
			</div>
		</div>

		<!-- Stats -->
		<div class="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
			<StatsCard value="1,234" label="Profile Views" />
			<StatsCard value="28" label="Estimates Sent" />
			<StatsCard value="12" label="Bookings" />
			<StatsCard value="4.9" label="Rating" />
		</div>

		<div class="grid gap-8 lg:grid-cols-3">
			<!-- Main -->
			<div class="space-y-6 lg:col-span-2">
				<!-- Leads -->
				<div class="glass-card shadow-soft rounded-2xl p-6">
					<div class="mb-4 flex items-center justify-between">
						<h3 class="font-display text-xl font-semibold">Recent Leads</h3>
						<button class="text-leora-gold text-sm font-medium hover:underline">View All</button>
					</div>
					<div class="space-y-3">
						{#each leads as lead}
							<div class="border-leora-gold/10 rounded-xl border bg-white p-4">
								<div class="mb-2 flex items-start justify-between">
									<div>
										<p class="font-semibold">{lead.couple}</p>
										<p class="text-sm text-gray-500">Wedding Date: {lead.date}</p>
									</div>
									<Badge variant={lead.status === 'new' ? 'info' : 'warning'}>
										{lead.status === 'new' ? 'New' : 'Pending'}
									</Badge>
								</div>
								<p class="mb-3 text-sm text-gray-600">{lead.note}</p>
								{#if lead.status === 'new'}
									<div class="flex gap-2">
										<button
											class="bg-leora-gold hover:bg-leora-gold-dark flex-1 rounded-lg py-2 text-sm font-medium text-white transition-colors"
										>
											Send Estimate
										</button>
										<button
											class="rounded-lg border border-gray-200 px-4 py-2 text-sm transition-colors hover:bg-gray-50"
										>
											Decline
										</button>
									</div>
								{:else}
									<button
										class="border-leora-gold text-leora-gold hover:bg-leora-gold/5 w-full rounded-lg border py-2 text-sm font-medium transition-colors"
									>
										Follow Up
									</button>
								{/if}
							</div>
						{/each}
					</div>
				</div>

				<!-- Calendar -->
				<div class="glass-card shadow-soft rounded-2xl p-6">
					<h3 class="font-display mb-4 text-xl font-semibold">Availability Calendar</h3>
					<div class="grid grid-cols-7 gap-2 text-center text-sm">
						{#each ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as day}
							<div class="py-2 text-xs font-medium text-gray-400">{day}</div>
						{/each}
						{#each calendarDays as d}
							{#if d === null}
								<div class="py-2 text-sm text-gray-200">—</div>
							{:else if d === todayDay}
								<div class="bg-leora-gold rounded-lg py-2 text-sm font-medium text-white">{d}</div>
							{:else if bookedDays.has(d)}
								<div class="cursor-pointer rounded-lg bg-red-100 py-2 text-sm text-red-600">
									{d}
								</div>
							{:else}
								<div
									class="hover:bg-leora-ivory cursor-pointer rounded-lg py-2 text-sm transition-colors"
								>
									{d}
								</div>
							{/if}
						{/each}
					</div>
					<div class="mt-4 flex gap-6 text-xs text-gray-500">
						<span class="flex items-center gap-1.5">
							<span class="bg-leora-gold inline-block h-3 w-3 rounded"></span> Today
						</span>
						<span class="flex items-center gap-1.5">
							<span class="inline-block h-3 w-3 rounded bg-red-100"></span> Booked
						</span>
					</div>
				</div>

				<!-- Revenue Chart placeholder -->
				<div class="glass-card shadow-soft rounded-2xl p-6">
					<div class="mb-4 flex items-center justify-between">
						<h3 class="font-display text-xl font-semibold">Revenue Overview</h3>
						<TrendingUp class="text-leora-gold h-5 w-5" />
					</div>
					<div class="flex h-32 items-end gap-2">
						{#each [40, 65, 50, 80, 70, 90, 75] as h, i}
							<div class="flex flex-1 flex-col items-center gap-1">
								<div
									class="bg-leora-gold/70 hover:bg-leora-gold w-full rounded-t-md transition-colors"
									style="height: {h}%"
								></div>
								<span class="text-xs text-gray-400">{['M', 'T', 'W', 'T', 'F', 'S', 'S'][i]}</span>
							</div>
						{/each}
					</div>
				</div>
			</div>

			<!-- Sidebar -->
			<div class="space-y-6">
				<!-- Packages -->
				<div class="glass-card shadow-soft rounded-2xl p-6">
					<h3 class="font-display mb-4 text-xl font-semibold">Your Packages</h3>
					<div class="space-y-3">
						{#each packages as pkg}
							<div class="border-leora-gold/10 rounded-xl border bg-white p-4">
								<div class="mb-1 flex items-center justify-between">
									<span class="text-sm font-semibold">{pkg.name}</span>
									<span class="text-leora-gold text-sm font-bold"
										>ETB {pkg.price.toLocaleString()}</span
									>
								</div>
								<p class="text-xs text-gray-500">{pkg.desc}</p>
							</div>
						{/each}
						<button
							class="border-leora-gold/30 text-leora-gold hover:bg-leora-gold/5 w-full rounded-xl border border-dashed py-2 text-sm transition-colors"
						>
							+ Add Package
						</button>
					</div>
				</div>

				<!-- Reviews -->
				<div class="glass-card shadow-soft rounded-2xl p-6">
					<h3 class="font-display mb-4 text-xl font-semibold">Recent Reviews</h3>
					<div class="space-y-4">
						{#each reviews as r}
							<div class="border-leora-gold/10 border-b pb-3 last:border-0 last:pb-0">
								<div class="mb-1 flex items-center gap-0.5">
									{#each { length: 5 } as _}
										<Star class="text-leora-gold fill-leora-gold h-3.5 w-3.5" />
									{/each}
								</div>
								<p class="mb-1 text-sm text-gray-600">"{r.text}"</p>
								<p class="text-xs text-gray-400">— {r.author}, {r.ago}</p>
							</div>
						{/each}
					</div>
				</div>

				<!-- Upgrade CTA -->
				<div
					class="from-leora-gold to-leora-champagne rounded-2xl bg-gradient-to-br p-6 text-white"
				>
					<h3 class="font-display mb-2 text-xl font-semibold">Upgrade to Pro</h3>
					<p class="mb-4 text-sm text-white/90">
						Get featured placement, unlimited leads, and analytics.
					</p>
					<ul class="mb-4 space-y-2 text-sm">
						{#each ['Featured on homepage', 'Priority in search', 'Advanced analytics'] as perk}
							<li class="flex items-center gap-2">
								<Check class="h-4 w-4 shrink-0" />
								{perk}
							</li>
						{/each}
					</ul>
					<button
						class="text-leora-gold hover:bg-leora-ivory w-full rounded-xl bg-white py-2.5 text-sm font-semibold transition-colors"
					>
						Upgrade Now
					</button>
				</div>
			</div>
		</div>
	</div>
</div>
