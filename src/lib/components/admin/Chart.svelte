<script lang="ts">
	import {
		Chart,
		BarController,
		LineController,
		DoughnutController,
		BarElement,
		LineElement,
		PointElement,
		ArcElement,
		CategoryScale,
		LinearScale,
		Filler,
		Tooltip,
		Legend,
		type ChartConfiguration
	} from 'chart.js';
	import { mode } from 'mode-watcher';

	Chart.register(
		BarController,
		LineController,
		DoughnutController,
		BarElement,
		LineElement,
		PointElement,
		ArcElement,
		CategoryScale,
		LinearScale,
		Filler,
		Tooltip,
		Legend
	);

	/** Categorical palette — distinguishable in both themes, gold leads for brand. */
	const PALETTE = [
		'#d4af37',
		'#3b82c4',
		'#2a9d8f',
		'#d1495b',
		'#8b6fd0',
		'#e07a3f',
		'#6b7280',
		'#7fb069',
		'#c06c9b',
		'#4cc9f0'
	];

	type Dataset = { label: string; data: number[]; color?: string };
	let {
		type = 'bar',
		labels,
		datasets,
		stacked = false,
		money = false,
		height = 260,
		horizontal = false
	}: {
		type?: 'bar' | 'line' | 'doughnut';
		labels: string[];
		datasets: Dataset[];
		stacked?: boolean;
		money?: boolean;
		height?: number;
		horizontal?: boolean;
	} = $props();

	let canvas: HTMLCanvasElement;
	let chart: Chart | undefined;

	const fmt = (v: number) =>
		money
			? new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(v)
			: String(v);

	function build(): ChartConfiguration {
		const dark = mode.current === 'dark';
		const text = dark ? '#a8a29e' : '#57534e';
		const grid = dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)';
		const isDoughnut = type === 'doughnut';

		return {
			type,
			data: {
				labels,
				datasets: datasets.map((d, i) => {
					const color = d.color ?? PALETTE[i % PALETTE.length];
					return isDoughnut
						? {
								label: d.label,
								data: d.data,
								backgroundColor: labels.map((_, j) => PALETTE[j % PALETTE.length]),
								borderColor: dark ? '#1c1917' : '#ffffff',
								borderWidth: 2
							}
						: {
								label: d.label,
								data: d.data,
								backgroundColor: type === 'line' ? color + '22' : color,
								borderColor: color,
								borderWidth: type === 'line' ? 2 : 0,
								borderRadius: type === 'bar' ? 4 : 0,
								fill: type === 'line',
								tension: 0.3,
								pointRadius: 2
							};
				})
			},
			options: {
				...(isDoughnut ? ({ cutout: '62%' } as object) : {}),
				responsive: true,
				maintainAspectRatio: false,
				indexAxis: horizontal ? 'y' : 'x',
				plugins: {
					legend: {
						display: isDoughnut || datasets.length > 1,
						position: isDoughnut ? 'right' : 'bottom',
						labels: { color: text, boxWidth: 10, usePointStyle: true }
					},
					tooltip: {
						callbacks: money
							? {
									label: (c) =>
										`${c.dataset.label ?? c.label}: ETB ${Number(c.parsed.y ?? c.parsed).toLocaleString()}`
								}
							: {}
					}
				},
				scales: isDoughnut
					? {}
					: {
							x: {
								stacked,
								grid: { display: false },
								ticks: { color: text, ...(horizontal ? { callback: (v: string | number) => fmt(Number(v)) } : {}) }
							},
							y: {
								stacked,
								beginAtZero: true,
								grid: { color: grid },
								ticks: {
									color: text,
									precision: 0,
									...(horizontal ? {} : { callback: (v: string | number) => fmt(Number(v)) })
								}
							}
						}
			}
		};
	}

	// Rebuild on any data/theme change — datasets are small, so a full rebuild
	// is simpler than diffing and avoids stale scale options across theme flips.
	$effect(() => {
		const config = build();
		chart?.destroy();
		chart = new Chart(canvas, config);
		return () => {
			chart?.destroy();
			chart = undefined;
		};
	});

	const empty = $derived(datasets.every((d) => d.data.every((v) => !v)));
</script>

<div class="relative" style="height:{height}px" role="img" aria-label={datasets.map((d) => d.label).join(', ')}>
	<canvas bind:this={canvas}></canvas>
	{#if empty}
		<div
			class="text-muted-foreground bg-card/70 absolute inset-0 flex items-center justify-center text-sm"
		>
			No data for this period
		</div>
	{/if}
</div>
