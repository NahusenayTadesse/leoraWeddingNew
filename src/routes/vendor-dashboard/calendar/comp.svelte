<script lang="ts">
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';

	type AvailabilityRecord = {
		id: number;
		vendorId: number;
		availableDate: string; // ISO date string e.g. "2025-06-14"
		isAvailable: boolean;
	};

	type Props = {
		availability?: AvailabilityRecord[];
		vendorName?: string;
		onRequestDate?: Date;
	};

	let { availability = [], vendorName = 'Vendor', onRequestDate = new Date() }: Props = $props();

	// ── State ──────────────────────────────────────────────────────────────────
	const today = new Date();
	let viewYear = $state(today.getFullYear());
	let viewMonth = $state(today.getMonth()); // 0-indexed
	let selectedDate = $state<string | null>(null);
	let hoveredDate = $state<string | null>(null);

	// ── Derived ────────────────────────────────────────────────────────────────
	const availabilityMap = $derived(
		Object.fromEntries(availability.map((a) => [a.availableDate, a.isAvailable]))
	);

	const monthLabel = $derived(
		new Date(viewYear, viewMonth, 1).toLocaleDateString('en-GB', {
			month: 'long',
			year: 'numeric'
		})
	);

	const calendarDays = $derived(() => {
		const firstDay = new Date(viewYear, viewMonth, 1);
		const lastDay = new Date(viewYear, viewMonth + 1, 0);
		const startDow = (firstDay.getDay() + 6) % 7; // Monday-first offset
		const days: Array<{ date: string; day: number; inMonth: boolean } | null> = [];

		// Leading empty cells
		for (let i = 0; i < startDow; i++) days.push(null);

		for (let d = 1; d <= lastDay.getDate(); d++) {
			const date = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
			days.push({ date, day: d, inMonth: true });
		}

		// Trailing empty cells to complete the grid
		while (days.length % 7 !== 0) days.push(null);
		return days;
	});

	const totalAvailable = $derived(availability.filter((a) => a.isAvailable).length);
	const totalUnavailable = $derived(availability.filter((a) => !a.isAvailable).length);

	// ── Helpers ────────────────────────────────────────────────────────────────
	function getStatus(dateStr: string): 'available' | 'booked' | 'unknown' {
		if (!(dateStr in availabilityMap)) return 'unknown';
		return availabilityMap[dateStr] ? 'available' : 'booked';
	}

	function isToday(dateStr: string) {
		return dateStr === today.toISOString().slice(0, 10);
	}

	function isPast(dateStr: string) {
		return dateStr < today.toISOString().slice(0, 10);
	}

	function prevMonth() {
		if (viewMonth === 0) {
			viewMonth = 11;
			viewYear--;
		} else viewMonth--;
	}

	function nextMonth() {
		if (viewMonth === 11) {
			viewMonth = 0;
			viewYear++;
		} else viewMonth++;
	}

	function selectDate(dateStr: string) {
		const status = getStatus(dateStr);
		if (status !== 'available' || isPast(dateStr)) return;
		selectedDate = selectedDate === dateStr ? null : dateStr;
	}

	function formatSelected(dateStr: string) {
		return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-GB', {
			weekday: 'long',
			day: 'numeric',
			month: 'long',
			year: 'numeric'
		});
	}

	function handleRequest() {
		if (selectedDate) onRequestDate?.(selectedDate);
	}
</script>

<!-- ── Fonts ───────────────────────────────────────────────────────────────── -->
<svelte:head>
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link
		href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400&family=DM+Sans:wght@300;400;500&display=swap"
		rel="stylesheet"
	/>
</svelte:head>

<!-- ── Root ───────────────────────────────────────────────────────────────── -->

<div class="availability-root">
	<!-- Header -->
	<div class="section-header">
		<div class="header-ornament">
			<span class="ornament-line"></span>
			<svg
				class="ornament-icon"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="1"
			>
				<path d="M12 2C8 2 5 5 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-4-3-7-7-7z" />
				<circle cx="12" cy="9" r="2.5" />
			</svg>
			<span class="ornament-line"></span>
		</div>
		<h2 class="section-title">Availability</h2>
		<p class="section-sub">
			Select a date to check {vendorName}'s availability for your special day
		</p>
	</div>

	<!-- Stats strip -->
	<div class="stats-strip">
		<div class="stat">
			<span class="stat-dot available-dot"></span>
			<span class="stat-label">{totalAvailable} dates open</span>
		</div>
		<div class="stat-divider">·</div>
		<div class="stat">
			<span class="stat-dot booked-dot"></span>
			<span class="stat-label">{totalUnavailable} dates booked</span>
		</div>
	</div>

	<!-- Calendar card -->
	<div class="calendar-card">
		<!-- Month navigation -->
		<div class="month-nav">
			<button class="nav-btn" onclick={prevMonth} aria-label="Previous month">
				<svg
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="1.5"
					width="18"
					height="18"
				>
					<path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
				</svg>
			</button>
			<span class="month-label">{monthLabel}</span>
			<button class="nav-btn" onclick={nextMonth} aria-label="Next month">
				<svg
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="1.5"
					width="18"
					height="18"
				>
					<path stroke-linecap="round" stroke-linejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
				</svg>
			</button>
		</div>

		<!-- Day-of-week headers -->
		<div class="dow-grid">
			{#each ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as d (d)}
				<span class="dow">{d}</span>
			{/each}
		</div>

		<!-- Date grid -->
		<div class="date-grid">
			{#each calendarDays() as cell}
				{#if cell === null}
					<div class="day-cell empty"></div>
				{:else}
					{@const status = getStatus(cell.date)}
					{@const past = isPast(cell.date)}
					{@const active = selectedDate === cell.date}
					{@const hovered = hoveredDate === cell.date}
					<button
						class="day-cell day-btn"
						class:available={status === 'available' && !past}
						class:booked={status === 'booked'}
						class:unknown={status === 'unknown' || past}
						class:today={isToday(cell.date)}
						class:selected={active}
						class:hovered={hovered && !active}
						disabled={status !== 'available' || past}
						onclick={() => selectDate(cell.date)}
						onmouseenter={() => (hoveredDate = cell.date)}
						onmouseleave={() => (hoveredDate = null)}
						aria-label="{cell.date}: {status}"
						aria-pressed={active}
					>
						<span class="day-num">{cell.day}</span>
						{#if status === 'available' && !past}
							<span class="avail-dot"></span>
						{/if}
					</button>
				{/if}
			{/each}
		</div>

		<!-- Legend -->
		<div class="legend">
			<span class="legend-item">
				<span class="legend-swatch available-swatch"></span> Available
			</span>
			<span class="legend-item">
				<span class="legend-swatch booked-swatch"></span> Booked
			</span>
			<span class="legend-item">
				<span class="legend-swatch unknown-swatch"></span> Not listed
			</span>
		</div>
	</div>

	<!-- Selected date panel -->
	{#if selectedDate}
		<div class="selected-panel">
			<div class="selected-inner">
				<div class="selected-text">
					<p class="selected-eyebrow">Your selected date</p>
					<p class="selected-date">{formatSelected(selectedDate)}</p>
				</div>
				<button class="request-btn" onclick={handleRequest}>
					<span>Request Booking</span>
					<svg
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="1.5"
						width="16"
						height="16"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							d="M17.25 8.25 21 12m0 0-3.75 3.75M21 12H3"
						/>
					</svg>
				</button>
			</div>
		</div>
	{/if}
</div>

<style>
	/* ── Tokens ──────────────────────────────────────────────────────────────── */
	.availability-root {
		--rose: hsl(346 77% 49%);
		--rose-light: hsl(346 77% 96%);
		--rose-mid: hsl(346 60% 88%);
		--stone-50: hsl(60 9% 98%);
		--stone-100: hsl(60 5% 94%);
		--stone-200: hsl(20 6% 90%);
		--stone-400: hsl(24 6% 64%);
		--stone-600: hsl(25 5% 45%);
		--stone-800: hsl(20 14% 20%);
		--stone-900: hsl(20 14% 12%);
		--green-light: hsl(152 50% 95%);
		--green: hsl(152 55% 40%);
		--red-light: hsl(0 70% 96%);
		--red: hsl(0 65% 58%);

		font-family: 'DM Sans', sans-serif;
		max-width: 480px;
		margin: 0 auto;
		padding: 0;
		color: var(--stone-800);
	}

	/* ── Header ──────────────────────────────────────────────────────────────── */
	.section-header {
		text-align: center;
		margin-bottom: 1.5rem;
	}

	.header-ornament {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.75rem;
		margin-bottom: 0.75rem;
		color: var(--rose);
	}

	.ornament-line {
		display: block;
		width: 48px;
		height: 1px;
		background: linear-gradient(to right, transparent, var(--rose-mid));
	}
	.header-ornament :last-child.ornament-line {
		background: linear-gradient(to left, transparent, var(--rose-mid));
	}

	.ornament-icon {
		width: 18px;
		height: 18px;
		color: var(--rose);
		flex-shrink: 0;
	}

	.section-title {
		font-family: 'Cormorant Garamond', serif;
		font-size: 2rem;
		font-weight: 300;
		letter-spacing: 0.04em;
		color: var(--stone-900);
		margin: 0 0 0.35rem;
		line-height: 1.1;
	}

	.section-sub {
		font-size: 0.8rem;
		color: var(--stone-400);
		margin: 0;
		font-weight: 300;
		letter-spacing: 0.01em;
	}

	/* ── Stats strip ─────────────────────────────────────────────────────────── */
	.stats-strip {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.75rem;
		margin-bottom: 1.25rem;
	}

	.stat {
		display: flex;
		align-items: center;
		gap: 0.4rem;
	}

	.stat-dot {
		width: 7px;
		height: 7px;
		border-radius: 50%;
		display: inline-block;
	}
	.available-dot {
		background: var(--green);
	}
	.booked-dot {
		background: var(--red);
	}

	.stat-label {
		font-size: 0.75rem;
		color: var(--stone-600);
	}
	.stat-divider {
		color: var(--stone-200);
		font-size: 1rem;
	}

	/* ── Calendar card ───────────────────────────────────────────────────────── */
	.calendar-card {
		background: white;
		border: 1px solid var(--stone-200);
		border-radius: 16px;
		padding: 1.5rem;
		box-shadow:
			0 1px 3px hsl(0 0% 0% / 0.04),
			0 8px 32px hsl(346 40% 50% / 0.06);
	}

	/* ── Month navigation ────────────────────────────────────────────────────── */
	.month-nav {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 1.25rem;
	}

	.month-label {
		font-family: 'Cormorant Garamond', serif;
		font-size: 1.3rem;
		font-weight: 400;
		letter-spacing: 0.04em;
		color: var(--stone-900);
	}

	.nav-btn {
		width: 32px;
		height: 32px;
		border-radius: 8px;
		border: 1px solid var(--stone-200);
		background: var(--stone-50);
		color: var(--stone-600);
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		transition: all 0.15s ease;
		padding: 0;
	}
	.nav-btn:hover {
		background: var(--rose-light);
		border-color: var(--rose-mid);
		color: var(--rose);
	}

	/* ── Day-of-week headers ─────────────────────────────────────────────────── */
	.dow-grid {
		display: grid;
		grid-template-columns: repeat(7, 1fr);
		margin-bottom: 0.5rem;
	}
	.dow {
		text-align: center;
		font-size: 0.65rem;
		font-weight: 500;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--stone-400);
		padding: 0.25rem 0;
	}

	/* ── Date grid ───────────────────────────────────────────────────────────── */
	.date-grid {
		display: grid;
		grid-template-columns: repeat(7, 1fr);
		gap: 3px;
	}

	.day-cell {
		aspect-ratio: 1;
		border-radius: 8px;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		position: relative;
		gap: 2px;
	}

	.day-btn {
		background: transparent;
		border: 1px solid transparent;
		cursor: default;
		transition: all 0.15s ease;
		padding: 0;
	}

	.day-num {
		font-size: 0.8rem;
		font-weight: 400;
		line-height: 1;
	}

	/* Available */
	.day-btn.available {
		cursor: pointer;
		background: var(--green-light);
		border-color: hsl(152 40% 85%);
	}
	.day-btn.available .day-num {
		color: var(--green);
		font-weight: 500;
	}
	.day-btn.available:hover {
		background: hsl(152 50% 88%);
		border-color: var(--green);
		transform: scale(1.06);
		box-shadow: 0 2px 8px hsl(152 55% 40% / 0.2);
	}

	.avail-dot {
		width: 4px;
		height: 4px;
		border-radius: 50%;
		background: var(--green);
		display: block;
	}

	/* Booked */
	.day-btn.booked {
		background: var(--red-light);
		border-color: hsl(0 50% 90%);
	}
	.day-btn.booked .day-num {
		color: var(--red);
	}

	/* Unknown / past */
	.day-btn.unknown {
		opacity: 0.4;
	}
	.day-btn.unknown .day-num {
		color: var(--stone-400);
	}

	/* Today ring */
	.day-btn.today {
		outline: 2px solid var(--rose);
		outline-offset: -2px;
	}

	/* Selected */
	.day-btn.selected {
		background: var(--rose) !important;
		border-color: var(--rose) !important;
		transform: scale(1.08);
		box-shadow: 0 4px 14px hsl(346 77% 49% / 0.35);
	}
	.day-btn.selected .day-num {
		color: white !important;
		font-weight: 600;
	}
	.day-btn.selected .avail-dot {
		background: white;
		opacity: 0.7;
	}

	/* Legend */
	.legend {
		display: flex;
		justify-content: center;
		gap: 1rem;
		margin-top: 1.25rem;
		padding-top: 1rem;
		border-top: 1px solid var(--stone-100);
	}

	.legend-item {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		font-size: 0.7rem;
		color: var(--stone-600);
	}

	.legend-swatch {
		width: 10px;
		height: 10px;
		border-radius: 3px;
		display: inline-block;
	}
	.available-swatch {
		background: var(--green-light);
		border: 1px solid hsl(152 40% 78%);
	}
	.booked-swatch {
		background: var(--red-light);
		border: 1px solid hsl(0 50% 85%);
	}
	.unknown-swatch {
		background: var(--stone-100);
		border: 1px solid var(--stone-200);
	}

	/* ── Selected date panel ─────────────────────────────────────────────────── */
	.selected-panel {
		margin-top: 1rem;
		background: linear-gradient(135deg, var(--rose-light) 0%, hsl(346 60% 93%) 100%);
		border: 1px solid var(--rose-mid);
		border-radius: 14px;
		padding: 1rem 1.25rem;
		animation: slideUp 0.2s ease;
	}

	@keyframes slideUp {
		from {
			opacity: 0;
			transform: translateY(6px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.selected-inner {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
	}

	.selected-eyebrow {
		font-size: 0.65rem;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: var(--rose);
		margin: 0 0 0.2rem;
		font-weight: 500;
	}

	.selected-date {
		font-family: 'Cormorant Garamond', serif;
		font-size: 1rem;
		font-weight: 400;
		color: var(--stone-900);
		margin: 0;
		font-style: italic;
	}

	.request-btn {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		white-space: nowrap;
		background: var(--rose);
		color: white;
		border: none;
		border-radius: 9px;
		padding: 0.55rem 1rem;
		font-size: 0.78rem;
		font-weight: 500;
		font-family: 'DM Sans', sans-serif;
		cursor: pointer;
		transition: all 0.2s ease;
		box-shadow: 0 2px 10px hsl(346 77% 49% / 0.3);
		flex-shrink: 0;
	}

	.request-btn:hover {
		background: hsl(346 77% 42%);
		transform: translateY(-1px);
		box-shadow: 0 4px 16px hsl(346 77% 49% / 0.4);
	}

	.request-btn:active {
		transform: translateY(0);
	}
</style>
