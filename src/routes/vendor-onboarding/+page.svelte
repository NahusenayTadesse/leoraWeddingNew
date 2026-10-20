<script lang="ts">
	import { Button } from '@nahu/admin-kit/components/ui/button/index.js';
	import InputComp from '@nahu/admin-kit/formComponents/InputComp.svelte';
	import { createForm } from '@nahu/admin-kit/forms/createForm';
	import { vendorOnboardingSchema } from '$lib/ZodSchema';
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

	// svelte-ignore state_referenced_locally
	const { form, errors, enhance, delayed } = createForm(data.form, vendorOnboardingSchema, {
		dataType: 'json',
		resetForm: false,
		// The page's own `load` redirects away once a vendor profile exists —
		// exactly what happens right after this submits. Without this, the
		// default post-submit `invalidateAll()` reruns that load immediately
		// and bounces past the success step before it ever renders.
		invalidateAll: false,
		onUpdated: ({ form: f }) => {
			if (f.message?.type === 'success') stepIndex = ORDER.indexOf('success');
		}
	});

	const selectedCategory = $derived(data.categories.find((c) => c.id === $form.categoryId));
	const selectedPlan = $derived(data.plans.find((p) => p.id === $form.planId));
	const selectedPlanLabel = $derived(selectedPlan ? selectedPlan.name : 'Starter — Free');

	/** The category step's cards. */
	const categoryItems = $derived(
		data.categories.map((c) => ({ value: c.id, name: c.icon ? `${c.icon} ${c.name}` : c.name }))
	);

	/** The plan step's cards: the free Starter tier (`0`), then the paid plans. */
	const planItems = $derived([
		{ value: 0, name: 'Starter — Free', description: 'Basic listing, up to 1 package', meta: 'ETB 0' },
		...data.plans.map((plan) => ({
			value: plan.id,
			name: plan.name,
			description: plan.features?.[0] ?? '',
			meta: `${formatETB(plan.price)}${plan.billingCycle === 'monthly' ? '/mo' : ''}`
		}))
	]);

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

				<InputComp
					{form}
					{errors}
					name="businessName"
					label="Business name"
					placeholder="e.g. Mesk Studio Photography"
				/>
				<div class="field-row">
					<InputComp {form} {errors} name="city" label="City" placeholder="Addis Ababa" />
					<InputComp
						{form}
						{errors}
						name="phone"
						label="Phone number"
						type="tel"
						placeholder="+251 9__ ___ ___"
					/>
				</div>
				<InputComp
					{form}
					{errors}
					name="email"
					label="Business email"
					type="email"
					placeholder="hello@yourbusiness.com"
				/>
				<InputComp
					{form}
					{errors}
					name="description"
					label="Short description"
					type="textarea"
					rows={4}
					placeholder="Tell couples what makes your business special..."
				/>
			{:else if step === 2}
				<h2>What category best fits your business?</h2>
				<p class="sub">You can add more categories later from your Vendor Portal.</p>

				<InputComp
					{form}
					{errors}
					name="categoryId"
					label="Category"
					hideLabel
					type="imageSelect"
					items={categoryItems}
				/>
			{:else if step === 3}
				<h2>Create your first listing</h2>
				<p class="sub">Add one package to get started — you can add more anytime.</p>

				<InputComp
					{form}
					{errors}
					name="packageName"
					label="Package name"
					placeholder="e.g. Signature Package"
				/>
				<div class="field-row">
					<InputComp
						{form}
						{errors}
						name="packagePrice"
						label="Starting price (ETB)"
						type="number"
						min={0}
						placeholder="95000"
					/>
					<InputComp
						{form}
						{errors}
						name="packageCapacity"
						label="Guest capacity (if applicable)"
						type="number"
						min={0}
						placeholder="200"
					/>
				</div>
				<InputComp
					{form}
					{errors}
					name="packageIncludes"
					label="What's included"
					type="textarea"
					rows={4}
					placeholder="Full-day coverage, edited gallery, engagement session..."
				/>
			{:else if step === 4}
				<h2>Choose your plan</h2>
				<p class="sub">Start free, upgrade anytime for more visibility.</p>

				<InputComp
					{form}
					{errors}
					name="planId"
					label="Plan"
					hideLabel
					type="imageSelect"
					items={planItems}
				/>
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

	.field-row {
		display: flex;
		gap: 14px;
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
