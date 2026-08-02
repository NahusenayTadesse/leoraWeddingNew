<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { superForm } from 'sveltekit-superforms';
	import { toast } from 'svelte-sonner';
	import { formatETB } from '$lib/money';
	import { Check } from '@lucide/svelte';
	import type { PageData } from './$types';

	/**
	 * Ported from leora-events-vendor-onboarding.html: a 4-step stepper
	 * (Business Info -> Category -> First Listing -> Plan & Payment), then a
	 * Review step, then Success. Nothing hits the server until "Confirm & Go
	 * Live" on the review step — every "Continue"/"Back" click before that is
	 * pure client-side state, exactly like the PHP `nextStep()`/`prevStep()`.
	 */

	let { data }: { data: PageData } = $props();

	type StepKey = 1 | 2 | 3 | 4 | 'review' | 'success';
	const ORDER: StepKey[] = [1, 2, 3, 4, 'review', 'success'];
	const STEP_LABELS = ['Business Info', 'Category', 'First Listing', 'Plan & Payment'];

	let stepIndex = $state(0);
	const step = $derived(ORDER[stepIndex]);

	const { form, errors, enhance, delayed, message } = superForm(data.form, {
		dataType: 'json',
		resetForm: false,
		// The page's own `load` redirects away once a vendor profile exists —
		// exactly what happens right after this submits. Without this, the
		// default post-submit `invalidateAll()` reruns that load immediately
		// and bounces past the success step before it ever renders.
		invalidateAll: false,
		onUpdated: ({ form: f }) => {
			if (f.message?.type === 'success') {
				stepIndex = ORDER.indexOf('success');
			} else if (f.message?.type === 'error') {
				toast.error(f.message.text);
			}
		}
	});

	const selectedCategory = $derived(data.categories.find((c) => c.id === $form.categoryId));
	const selectedPlan = $derived(data.plans.find((p) => p.id === $form.planId));
	const selectedPlanLabel = $derived(selectedPlan ? selectedPlan.name : 'Starter — Free');

	function next() {
		if (stepIndex < ORDER.length - 1) stepIndex++;
	}
	function back() {
		if (stepIndex > 0) stepIndex--;
	}
</script>

<svelte:head>
	<title>Become a Vendor — Leora Events</title>
</svelte:head>

<main class="wizard-main">
	<!-- Stepper -->
	<div class="stepper">
		{#each STEP_LABELS as label, i (label)}
			{@const n = i + 1}
			<div
				class="step"
				class:active={step === n}
				class:done={typeof step === 'number' ? n < step : true}
			>
				<div class="circle">
					{#if typeof step !== 'number' || n < step}
						<Check class="size-4" />
					{:else}
						{n}
					{/if}
				</div>
				<div class="lbl">{label}</div>
			</div>
		{/each}
	</div>

	<div class="card">
		<form method="POST" action="?/createListing" use:enhance>
			{#if step === 1}
				<h2>Tell us about your business</h2>
				<p class="sub">This information appears on your public Leora Events profile.</p>

				<div class="field">
					<Label for="businessName">Business name</Label>
					<Input
						id="businessName"
						bind:value={$form.businessName}
						placeholder="e.g. Mesk Studio Photography"
					/>
					{#if $errors.businessName}<span class="err">{$errors.businessName}</span>{/if}
				</div>

				<div class="field-row">
					<div class="field">
						<Label for="city">City</Label>
						<Input id="city" bind:value={$form.city} placeholder="Addis Ababa" />
						{#if $errors.city}<span class="err">{$errors.city}</span>{/if}
					</div>
					<div class="field">
						<Label for="phone">Phone number</Label>
						<Input id="phone" bind:value={$form.phone} placeholder="+251 9__ ___ ___" />
						{#if $errors.phone}<span class="err">{$errors.phone}</span>{/if}
					</div>
				</div>

				<div class="field">
					<Label for="bizEmail">Business email</Label>
					<Input
						id="bizEmail"
						type="email"
						bind:value={$form.email}
						placeholder="hello@yourbusiness.com"
					/>
					{#if $errors.email}<span class="err">{$errors.email}</span>{/if}
				</div>

				<div class="field">
					<Label for="description">Short description</Label>
					<textarea
						id="description"
						bind:value={$form.description}
						placeholder="Tell couples what makes your business special..."
					></textarea>
				</div>
			{:else if step === 2}
				<h2>What category best fits your business?</h2>
				<p class="sub">You can add more categories later from your Vendor Portal.</p>

				<div class="cat-grid">
					{#each data.categories as cat (cat.id)}
						<button
							type="button"
							class="cat-chip"
							class:selected={$form.categoryId === cat.id}
							onclick={() => ($form.categoryId = cat.id)}
						>
							{#if cat.icon}<span class="cat-icon">{cat.icon}</span>{/if}
							{cat.name}
						</button>
					{/each}
				</div>
				{#if $errors.categoryId}<span class="err">{$errors.categoryId}</span>{/if}
			{:else if step === 3}
				<h2>Create your first listing</h2>
				<p class="sub">Add one package to get started — you can add more anytime.</p>

				<div class="field">
					<Label for="packageName">Package name</Label>
					<Input
						id="packageName"
						bind:value={$form.packageName}
						placeholder="e.g. Signature Package"
					/>
					{#if $errors.packageName}<span class="err">{$errors.packageName}</span>{/if}
				</div>

				<div class="field-row">
					<div class="field">
						<Label for="packagePrice">Starting price (ETB)</Label>
						<Input
							id="packagePrice"
							inputmode="decimal"
							bind:value={$form.packagePrice}
							placeholder="95,000"
						/>
						{#if $errors.packagePrice}<span class="err">{$errors.packagePrice}</span>{/if}
					</div>
					<div class="field">
						<Label for="packageCapacity">Guest capacity (if applicable)</Label>
						<Input
							id="packageCapacity"
							inputmode="numeric"
							bind:value={$form.packageCapacity}
							placeholder="200"
						/>
					</div>
				</div>

				<div class="field">
					<Label for="packageIncludes">What's included</Label>
					<textarea
						id="packageIncludes"
						bind:value={$form.packageIncludes}
						placeholder="Full-day coverage, edited gallery, engagement session..."
					></textarea>
				</div>
			{:else if step === 4}
				<h2>Choose your plan</h2>
				<p class="sub">Start free, upgrade anytime for more visibility.</p>

				<button
					type="button"
					class="plan-option"
					class:selected={!$form.planId}
					onclick={() => ($form.planId = undefined)}
				>
					<div>
						<h4>Starter — Free</h4>
						<p class="plan-desc">Basic listing, up to 1 package</p>
					</div>
					<div class="price">ETB 0</div>
				</button>

				{#each data.plans as plan (plan.id)}
					<button
						type="button"
						class="plan-option"
						class:selected={$form.planId === plan.id}
						onclick={() => ($form.planId = plan.id)}
					>
						<div>
							<h4>{plan.name}</h4>
							<p class="plan-desc">{plan.features?.[0] ?? ''}</p>
						</div>
						<div class="price">
							{formatETB(plan.price)}{plan.billingCycle === 'monthly' ? '/mo' : ''}
						</div>
					</button>
				{/each}

				<p class="fine-print">
					Paid plans are billed monthly and can be cancelled anytime from Account Settings.
				</p>
			{:else if step === 'review'}
				<h2>Review &amp; confirm</h2>
				<p class="sub">Make sure everything looks right before you go live.</p>

				<div class="review-row"><span>Business</span><span>{$form.businessName || '—'}</span></div>
				<div class="review-row">
					<span>Category</span><span>{selectedCategory?.name ?? 'Not selected'}</span>
				</div>
				<div class="review-row">
					<span>First package</span><span>{$form.packageName || 'Signature Package'}</span>
				</div>
				<div class="review-row"><span>Plan</span><span>{selectedPlanLabel}</span></div>
			{:else}
				<div class="success">
					<div class="circle-check"><Check class="size-8" /></div>
					<h2>Your listing is submitted</h2>
					<p>
						Our team reviews every new vendor before it appears in the Marketplace — you'll hear
						from us shortly. In the meantime, head to your Vendor Portal to add photos and finish
						your profile.
					</p>
					<Button href="/vendor-dashboard" class="mt-5">Go to Vendor Portal</Button>
				</div>
			{/if}

			{#if step !== 'success'}
				<div class="actions-row">
					<Button type="button" variant="outline" onclick={back} style={stepIndex === 0 ? 'visibility:hidden' : ''}>
						Back
					</Button>
					{#if step === 'review'}
						<Button type="submit" disabled={$delayed}>
							{$delayed ? 'Submitting…' : 'Confirm & Go Live'}
						</Button>
					{:else}
						<Button type="button" onclick={next}>Continue</Button>
					{/if}
				</div>
			{/if}
		</form>
	</div>
</main>

<style>
	.wizard-main {
		max-width: 660px;
		margin: 0 auto;
		padding: 44px 20px 90px;
	}

	.stepper {
		display: flex;
		justify-content: space-between;
		margin-bottom: 34px;
	}
	.step {
		flex: 1;
		text-align: center;
		position: relative;
	}
	.step .circle {
		width: 30px;
		height: 30px;
		border-radius: 50%;
		background: var(--card);
		border: 2px solid var(--border);
		display: flex;
		align-items: center;
		justify-content: center;
		margin: 0 auto 8px;
		font-weight: 700;
		font-size: 13px;
		color: var(--muted-foreground);
	}
	.step.active .circle {
		border-color: var(--leora-gold);
		color: var(--leora-gold-dark);
	}
	:global(.dark) .step.active .circle {
		color: var(--leora-gold);
	}
	.step.done .circle {
		background: var(--leora-gold);
		border-color: var(--leora-gold);
		color: #1a1204;
	}
	.step .lbl {
		font-size: 11.5px;
		font-weight: 600;
		color: var(--muted-foreground);
	}
	.step.active .lbl {
		color: var(--foreground);
	}
	.step::after {
		content: '';
		position: absolute;
		top: 15px;
		left: calc(50% + 20px);
		right: calc(-50% + 20px);
		height: 2px;
		background: var(--border);
		z-index: -1;
	}
	.step:last-child::after {
		display: none;
	}
	.step.done::after {
		background: var(--leora-gold);
	}

	.card {
		background: var(--card);
		border: 1px solid var(--border);
		border-radius: 18px;
		box-shadow: var(--card-shadow);
		padding: 30px 28px;
	}
	.card h2 {
		font-family: var(--font-display);
		font-size: 21px;
		font-weight: 800;
		letter-spacing: -0.02em;
		margin: 0 0 6px;
	}
	.card > form > p.sub {
		font-size: 14px;
		color: var(--muted-foreground);
		margin: 0 0 24px;
	}

	.field {
		margin-bottom: 16px;
		display: grid;
		gap: 6px;
	}
	.field-row {
		display: flex;
		gap: 14px;
	}
	.field-row .field {
		flex: 1;
		min-width: 0;
	}
	.field textarea {
		width: 100%;
		padding: 11px 13px;
		border-radius: 10px;
		border: 1px solid var(--border);
		background: var(--background);
		color: var(--foreground);
		font-family: inherit;
		font-size: 14px;
		outline: none;
		resize: vertical;
		min-height: 90px;
	}
	.field textarea:focus {
		border-color: var(--leora-gold);
	}
	.err {
		font-size: 12.5px;
		color: var(--destructive);
	}

	.cat-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 10px;
		margin-bottom: 8px;
	}
	.cat-chip {
		border: 1px solid var(--border);
		border-radius: 12px;
		padding: 14px 8px;
		text-align: center;
		font-size: 13px;
		font-weight: 600;
		cursor: pointer;
		background: var(--background);
		color: var(--foreground);
		display: grid;
		gap: 4px;
		justify-items: center;
	}
	.cat-chip.selected {
		border-color: var(--leora-gold);
		background: var(--leora-gold-soft);
		color: var(--leora-gold-dark);
	}
	:global(.dark) .cat-chip.selected {
		color: var(--leora-gold);
	}
	.cat-icon {
		font-size: 18px;
	}

	.plan-option {
		width: 100%;
		border: 1px solid var(--border);
		border-radius: 14px;
		padding: 16px 18px;
		margin-bottom: 12px;
		cursor: pointer;
		display: flex;
		justify-content: space-between;
		align-items: center;
		background: var(--background);
		color: var(--foreground);
		text-align: left;
	}
	.plan-option.selected {
		border-color: var(--leora-gold);
		background: var(--leora-gold-soft);
	}
	.plan-option h4 {
		font-family: var(--font-display);
		font-size: 15px;
		font-weight: 700;
		margin: 0;
	}
	.plan-desc {
		font-size: 13px;
		margin: 2px 0 0;
	}
	.plan-option .price {
		font-family: var(--font-display);
		font-weight: 800;
		color: var(--leora-gold-dark);
		white-space: nowrap;
	}
	:global(.dark) .plan-option .price {
		color: var(--leora-gold);
	}
	.fine-print {
		font-size: 12.5px;
		margin-top: 10px;
	}

	.review-row {
		display: flex;
		justify-content: space-between;
		padding: 10px 0;
		border-bottom: 1px solid var(--border);
		font-size: 14px;
	}

	.success {
		text-align: center;
		padding: 20px 0;
	}
	.success .circle-check {
		width: 64px;
		height: 64px;
		border-radius: 50%;
		background: var(--leora-gold-soft);
		color: var(--leora-gold-dark);
		display: flex;
		align-items: center;
		justify-content: center;
		margin: 0 auto 18px;
	}
	:global(.dark) .success .circle-check {
		color: var(--leora-gold);
	}
	.success h2 {
		margin-bottom: 8px;
	}
	.success p {
		font-size: 14px;
		color: var(--muted-foreground);
	}

	.actions-row {
		display: flex;
		justify-content: space-between;
		margin-top: 26px;
	}
</style>
