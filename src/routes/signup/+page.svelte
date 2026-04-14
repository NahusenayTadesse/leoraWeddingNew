<script lang="ts">
	import { fly, fade } from 'svelte/transition';
	import { cubicInOut } from 'svelte/easing';
	import Signup from '$lib/forms/Signup.svelte';
	import VendorSignup from '$lib/forms/VendorSignUp.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	let vendor = $state(false);
	let switching = $state(false);

	function toggle(isVendor: boolean) {
		if (vendor === isVendor) return;
		switching = true;
		setTimeout(() => {
			vendor = isVendor;
			switching = false;
		}, 50);
	}
</script>

<svelte:head>
	<title>Sign Up — Leora Weddings</title>
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link
		href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400&family=DM+Sans:wght@300;400;500&display=swap"
		rel="stylesheet"
	/>
</svelte:head>

<!-- Floating petals layer -->
<div aria-hidden="true" class="pointer-events-none fixed inset-0 z-0 overflow-hidden">
	{#each [{ l: '5%', delay: '0s', dur: '14s' }, { l: '15%', delay: '2.5s', dur: '18s' }, { l: '28%', delay: '6s', dur: '12s' }, { l: '42%', delay: '1s', dur: '16s' }, { l: '58%', delay: '4s', dur: '20s' }, { l: '70%', delay: '8s', dur: '13s' }, { l: '82%', delay: '3s', dur: '17s' }, { l: '92%', delay: '5.5s', dur: '15s' }] as p (p)}
		<span class="petal" style="left:{p.l}; animation-delay:{p.delay}; animation-duration:{p.dur}"
			>🌸</span
		>
	{/each}
</div>

<!-- Split background -->
<div class="fixed inset-0 z-0 flex">
	<div
		class="h-full transition-all duration-700 ease-in-out {vendor ? 'w-1/4' : 'w-2/3'} bg-couple"
	>
		<div class="h-full w-full bg-linear-to-r from-black/30 to-black/10"></div>
	</div>
	<div
		class="h-full transition-all duration-700 ease-in-out {vendor ? 'w-3/4' : 'w-1/3'} bg-vendor"
	>
		<div class="h-full w-full bg-linear-to-l from-black/30 to-black/10"></div>
	</div>
</div>

<!-- Watermark text -->
<div
	class="pointer-events-none fixed inset-0 z-0 flex items-end justify-center overflow-hidden pb-4"
>
	<span class="watermark text-white">{vendor ? 'Vendor' : 'Love Story'}</span>
</div>

<!-- Main content -->
<div class="relative z-10 flex min-h-screen flex-col items-center justify-center gap-8 px-4 py-12">
	<!-- Header -->
	<div class="text-center" in:fade={{ duration: 800, delay: 100 }}>
		<p class="mb-2 text-xs font-medium tracking-[0.25em] text-white/70 uppercase">✦ Welcome to ✦</p>
		<h1
			class="font-display text-5xl leading-none font-light text-white italic drop-shadow-lg md:text-7xl"
		>
			Leora
		</h1>
		<h1 class="font-display text-5xl leading-none font-light text-white drop-shadow-lg md:text-7xl">
			Events
		</h1>
	</div>

	<!-- Toggle switch -->
	<div in:fade={{ duration: 600, delay: 300 }}>
		<div class="toggle-track">
			<!-- Animated thumb -->
			<div class="toggle-thumb {vendor ? 'vendor' : ''}"></div>

			<button class="toggle-btn {!vendor ? 'active' : ''}" onclick={() => toggle(false)}>
				💍 Couples
			</button>
			<button class="toggle-btn {vendor ? 'active' : ''}" onclick={() => toggle(true)}>
				🌿 Vendors
			</button>
		</div>

		<!-- Sub-label -->
		<p class="mt-3 text-center text-xs tracking-wide text-white/60">
			{vendor
				? 'Showcase your services to thousands of couples'
				: 'Start planning your perfect day'}
		</p>
	</div>

	<!-- Form card -->
	<div class="w-full max-w-md">
		{#key vendor}
			<div class="glass-card form-enter overflow-hidden rounded-3xl shadow-2xl">
				<!-- Card header accent -->
				<div
					class="h-1.5 w-full transition-all duration-700 {vendor
						? 'bg-linear-to-r from-emerald-400 via-teal-400 to-emerald-500'
						: 'bg-linear-to-r from-rose-300 via-pink-400 to-rose-400'}"
				></div>

				<!-- Card inner -->
				<div class="bg-background px-6 pt-6 pb-8">
					<!-- Card title -->
					<div class="mb-6 flex items-center gap-3">
						<div
							class="ring-deco flex h-10 w-10 items-center justify-center rounded-full text-lg shadow-inner {vendor
								? 'bg-emerald-50 ring-2 ring-emerald-200'
								: 'bg-rose-50 ring-2 ring-rose-200'}"
						>
							{vendor ? '🌿' : '💍'}
						</div>
						<div>
							<h2 class="font-display text-2xl leading-none font-medium">
								{vendor ? 'Vendor Sign Up' : 'Couple Sign Up'}
							</h2>
							<p class="mt-0.5 text-xs text-stone-400">
								{vendor ? 'Grow your wedding business' : 'Your love story starts here'}
							</p>
						</div>
					</div>

					<!-- Form slot -->
					{#if vendor}
						<VendorSignup
							data={data?.vendorForm}
							action="?/vendorSignup"
							subCityList={data?.subCityList}
							categoryList={data?.categoryList}
							cityList={data?.cityList}
						/>
					{:else}
						<Signup data={data?.form} action="?/signup" />
					{/if}
				</div>
			</div>
		{/key}
	</div>

	<!-- Footer note -->
	<p class="text-center text-xs text-white/40" in:fade={{ duration: 600, delay: 500 }}>
		Already have an account?
		<a
			href="/login"
			class="text-white/70 underline underline-offset-2 transition-colors hover:text-white"
		>
			Sign in
		</a>
	</p>
</div>

<style>
	:global(body) {
		font-family: 'DM Sans', sans-serif;
	}

	.font-display {
		font-family: 'Cormorant Garamond', serif;
	}

	/* Split background panels */
	.bg-couple {
		background-image: url('https://images.unsplash.com/photo-1519741497674-611481863552?w=900&auto=format&fit=crop&q=80');
		background-size: cover;
		background-position: center;
	}

	.bg-vendor {
		background-image: url('https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=900&auto=format&fit=crop&q=80');
		background-size: cover;
		background-position: center;
	}

	/* Animated toggle pill */
	.toggle-track {
		position: relative;
		background: rgba(255, 255, 255, 0.15);
		backdrop-filter: blur(12px);
		border: 1px solid rgba(255, 255, 255, 0.3);
		border-radius: 999px;
		padding: 4px;
		display: inline-flex;
	}

	.toggle-thumb {
		position: absolute;
		top: 4px;
		height: calc(100% - 8px);
		width: calc(50% - 4px);
		background: white;
		border-radius: 999px;
		transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
		box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
	}

	.toggle-thumb.vendor {
		transform: translateX(calc(100% + 0px));
	}

	.toggle-btn {
		position: relative;
		z-index: 1;
		padding: 10px 28px;
		border-radius: 999px;
		font-size: 0.85rem;
		font-weight: 500;
		letter-spacing: 0.05em;
		text-transform: uppercase;
		transition: color 0.3s ease;
		border: none;
		background: transparent;
		cursor: pointer;
		white-space: nowrap;
	}

	.toggle-btn.active {
		color: #7c5c3a;
	}

	.toggle-btn:not(.active) {
		color: rgba(255, 255, 255, 0.85);
	}

	/* Floating petals */
	@keyframes float-petal {
		0% {
			transform: translateY(0) rotate(0deg) scale(1);
			opacity: 0;
		}
		10% {
			opacity: 0.6;
		}
		90% {
			opacity: 0.3;
		}
		100% {
			transform: translateY(-110vh) rotate(720deg) scale(0.5);
			opacity: 0;
		}
	}

	.petal {
		position: fixed;
		pointer-events: none;
		font-size: 1.4rem;
		animation: float-petal linear infinite;
		bottom: -5%;
		z-index: 0;
	}

	/* Card glass */
	.glass-card {
		background: rgba(255, 255, 255, 0.92);
		backdrop-filter: blur(24px);
		border: 1px solid rgba(255, 255, 255, 0.6);
	}

	/* Decorative script watermark */
	.watermark {
		font-family: 'Cormorant Garamond', serif;
		font-style: italic;
		font-size: clamp(5rem, 12vw, 10rem);
		font-weight: 300;
		line-height: 0.9;
		opacity: 0.06;
		pointer-events: none;
		user-select: none;
		white-space: nowrap;
	}

	/* Ring shine on hover */
	@keyframes ring-pulse {
		0%,
		100% {
			opacity: 0.4;
			transform: scale(1);
		}
		50% {
			opacity: 0.7;
			transform: scale(1.08);
		}
	}

	.ring-deco {
		animation: ring-pulse 3s ease-in-out infinite;
	}

	/* Slide animation override for form panel */
	.form-enter {
		animation: slideUp 0.5s cubic-bezier(0.34, 1.2, 0.64, 1) both;
	}
	@keyframes slideUp {
		from {
			opacity: 0;
			transform: translateY(30px) scale(0.97);
		}
		to {
			opacity: 1;
			transform: translateY(0) scale(1);
		}
	}
</style>
