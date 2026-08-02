<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Checkbox } from '$lib/components/ui/checkbox/index.js';
	import LoadingBtn from '$lib/formComponents/LoadingBtn.svelte';
	import Errors from '$lib/formComponents/Errors.svelte';
	import { Eye, EyeOff } from '@lucide/svelte';
	import { superForm } from 'sveltekit-superforms';
	import { toast } from 'svelte-sonner';
	import { replaceState } from '$app/navigation';
	import { page } from '$app/state';

	/**
	 * The combined auth card from the PHP app (leora-events-login.html): role
	 * tabs across the top, a Log In / Sign Up toggle beneath, and one card that
	 * re-labels itself for the chosen combination. Switching tab or mode is
	 * purely client-side, exactly as it was in PHP — no navigation, no reload,
	 * and whatever you already typed into email/password stays put.
	 */

	type Role = 'couple' | 'vendor' | 'admin';
	type Mode = 'login' | 'signup';

	let { data, mode: initialMode = 'login' }: { data: any; mode?: Mode } = $props();

	let role = $state<Role>((page.url.searchParams.get('role') as Role) ?? 'couple');
	let mode = $state<Mode>(initialMode);

	const ROLE_LABEL: Record<Role, string> = { couple: 'Couple', vendor: 'Vendor', admin: 'Admin' };
	const ROLES: Role[] = ['couple', 'vendor', 'admin'];

	const isSignup = $derived(mode === 'signup');

	const headTitle = $derived(
		isSignup ? `Join Leora as a ${ROLE_LABEL[role]}` : 'Welcome back'
	);

	const headSub = $derived(
		!isSignup
			? 'Log in to continue planning your day'
			: role === 'vendor'
				? 'List your business and start getting booking requests.'
				: role === 'admin'
					? 'Admin sign-up is invite-only.'
					: 'Start planning your wedding day.'
	);

	/**
	 * The tab lives in the URL so a refresh, a back button or a shared link all
	 * land on the same tab. `replaceState` keeps it out of the history stack —
	 * flipping tabs three times shouldn't cost three back-presses.
	 */
	function selectRole(next: Role) {
		role = next;
		const url = new URL(page.url);
		if (next === 'couple') url.searchParams.delete('role');
		else url.searchParams.set('role', next);
		replaceState(url, page.state);
	}

	// ---------------------------------------------------------------- login
	const {
		form: loginForm,
		errors: loginErrors,
		enhance: loginEnhance,
		delayed: loginDelayed,
		allErrors: loginAllErrors,
		message: loginMessage
	} = superForm(data.form, { resetForm: false });

	// --------------------------------------------------------- couple signup
	const {
		form: signupForm,
		errors: signupErrors,
		enhance: signupEnhance,
		delayed: signupDelayed,
		allErrors: signupAllErrors,
		message: signupMessage
	} = superForm(data.signupForm, { resetForm: false });

	// ---------------------------------------------------------- vendor start
	// Just enough to open the account — see `authForms.ts`'s `vendorStart`.
	// The rest is collected by the /vendor-onboarding wizard.
	const {
		form: vendorForm,
		errors: vendorErrors,
		enhance: vendorEnhance,
		delayed: vendorDelayed,
		allErrors: vendorAllErrors,
		message: vendorMessage
	} = superForm(data.vendorForm, { resetForm: false });

	$effect(() => {
		const msg = $loginMessage ?? $signupMessage ?? $vendorMessage;
		if (!msg) return;
		if (msg.type === 'error') toast.error(msg.text);
		else toast.success(msg.text);
	});

	let showLoginPassword = $state(false);
	let showSignupPassword = $state(false);
	let showVendorPassword = $state(false);
</script>

<div class="auth-shell">
	<div class="auth-card">
		<div class="auth-head">
			<h1>{headTitle}</h1>
			<p>{headSub}</p>
		</div>

		<!-- Role tabs -->
		<div class="role-tabs" role="tablist" aria-label="Account type">
			{#each ROLES as r (r)}
				<button
					type="button"
					role="tab"
					aria-selected={role === r}
					class="role-tab"
					class:active={role === r}
					onclick={() => selectRole(r)}
				>
					{ROLE_LABEL[r]}
				</button>
			{/each}
		</div>

		<!-- Log in / Sign up -->
		<div class="mode-toggle">
			<button type="button" class:active={!isSignup} onclick={() => (mode = 'login')}>
				Log In
			</button>
			<button type="button" class:active={isSignup} onclick={() => (mode = 'signup')}>
				Sign Up
			</button>
		</div>

		{#if role === 'admin'}
			<p class="role-note">
				Admin accounts are provisioned by Leora Events staff. Contact your team lead for access.
			</p>
		{/if}

		{#if isSignup && role === 'admin'}
			<!--
				PHP mapped an admin sign-up to the `bride` role, which quietly created
				a couple account under an admin-looking form. There is no self-serve
				admin sign-up, so the card says so instead of pretending.
			-->
			<Button class="w-full" onclick={() => (mode = 'login')}>Log in as Admin</Button>
		{:else if isSignup && role === 'vendor'}
			<!--
				Matches leora-events-login.html exactly: the vendor sign-up step on
				the auth card only takes a business name, email and password, then
				hands off to the "Become a Vendor" wizard for everything else.
			-->
			<form method="POST" action="?/vendorStart" use:vendorEnhance>
				<Errors allErrors={$vendorAllErrors} />

				<div class="field">
					<Label for="businessName">Business name</Label>
					<Input
						id="businessName"
						name="businessName"
						placeholder="e.g. Mesk Studio Photography"
						bind:value={$vendorForm.businessName}
						required
					/>
					{#if $vendorErrors.businessName}<span class="err">{$vendorErrors.businessName}</span
						>{/if}
				</div>

				<div class="field">
					<Label for="vendorEmail">Email address</Label>
					<Input
						id="vendorEmail"
						name="email"
						type="email"
						placeholder="hello@yourbusiness.com"
						bind:value={$vendorForm.email}
						required
					/>
					{#if $vendorErrors.email}<span class="err">{$vendorErrors.email}</span>{/if}
				</div>

				<div class="field">
					<Label for="vendorPassword">Password</Label>
					<div class="pw">
						<Input
							id="vendorPassword"
							name="password"
							type={showVendorPassword ? 'text' : 'password'}
							placeholder="••••••••"
							bind:value={$vendorForm.password}
							required
						/>
						<button
							type="button"
							class="pw-toggle"
							aria-label={showVendorPassword ? 'Hide password' : 'Show password'}
							onclick={() => (showVendorPassword = !showVendorPassword)}
						>
							{#if showVendorPassword}<EyeOff class="size-4" />{:else}<Eye class="size-4" />{/if}
						</button>
					</div>
					{#if $vendorErrors.password}<span class="err">{$vendorErrors.password}</span>{/if}
				</div>

				<label class="checkbox-row">
					<input type="checkbox" required />
					<span>
						I agree to Leora Events' <a href="/terms">Terms of Service</a> and
						<a href="/privacy">Privacy Policy</a>.
					</span>
				</label>

				<Button type="submit" class="mt-1 h-11 w-full">
					{#if $vendorDelayed}
						<LoadingBtn name="Setting up your account" />
					{:else}
						Continue to Business Setup
					{/if}
				</Button>
			</form>
		{:else if isSignup}
			<!-- ------------------------------ Couple sign-up ------------------------------ -->
			<form method="POST" action="?/signup" use:signupEnhance>
				<Errors allErrors={$signupAllErrors} />

				<div class="field-row">
					<div class="field">
						<Label for="brideName">Bride name</Label>
						<Input
							id="brideName"
							name="brideName"
							placeholder="Selam"
							bind:value={$signupForm.brideName}
							required
						/>
						{#if $signupErrors.brideName}<span class="err">{$signupErrors.brideName}</span>{/if}
					</div>
					<div class="field">
						<Label for="groomName">Groom name</Label>
						<Input
							id="groomName"
							name="groomName"
							placeholder="Tesfaye"
							bind:value={$signupForm.groomName}
							required
						/>
						{#if $signupErrors.groomName}<span class="err">{$signupErrors.groomName}</span>{/if}
					</div>
				</div>

				<div class="field">
					<Label for="signupEmail">Email address</Label>
					<Input
						id="signupEmail"
						name="email"
						type="email"
						placeholder="you@email.com"
						bind:value={$signupForm.email}
						required
					/>
					{#if $signupErrors.email}<span class="err">{$signupErrors.email}</span>{/if}
				</div>

				<div class="field-row">
					<div class="field">
						<Label for="phone">Phone</Label>
						<Input
							id="phone"
							name="phone"
							type="tel"
							placeholder="09xxxxxxxx"
							bind:value={$signupForm.phone}
							required
						/>
						{#if $signupErrors.phone}<span class="err">{$signupErrors.phone}</span>{/if}
					</div>
					<div class="field">
						<Label for="phone2">Second phone</Label>
						<Input
							id="phone2"
							name="phone2"
							type="tel"
							placeholder="Optional"
							bind:value={$signupForm.phone2}
						/>
						{#if $signupErrors.phone2}<span class="err">{$signupErrors.phone2}</span>{/if}
					</div>
				</div>

				<div class="field">
					<Label for="signupPassword">Password</Label>
					<div class="pw">
						<Input
							id="signupPassword"
							name="password"
							type={showSignupPassword ? 'text' : 'password'}
							placeholder="••••••••"
							bind:value={$signupForm.password}
							required
						/>
						<button
							type="button"
							class="pw-toggle"
							aria-label={showSignupPassword ? 'Hide password' : 'Show password'}
							onclick={() => (showSignupPassword = !showSignupPassword)}
						>
							{#if showSignupPassword}<EyeOff class="size-4" />{:else}<Eye class="size-4" />{/if}
						</button>
					</div>
					{#if $signupErrors.password}<span class="err">{$signupErrors.password}</span>{/if}
				</div>

				<label class="checkbox-row">
					<input type="checkbox" required />
					<span>
						I agree to Leora Events' <a href="/terms">Terms of Service</a> and
						<a href="/privacy">Privacy Policy</a>.
					</span>
				</label>

				<Button type="submit" class="mt-1 h-11 w-full">
					{#if $signupDelayed}
						<LoadingBtn name="Creating your account" />
					{:else}
						Create Couple Account
					{/if}
				</Button>
			</form>
		{:else}
			<!-- --------------------------------- Log in --------------------------------- -->
			<form method="POST" action="?/login" use:loginEnhance>
				<Errors allErrors={$loginAllErrors} />

				<div class="field">
					<Label for="email">Email address</Label>
					<Input
						id="email"
						name="email"
						type="email"
						placeholder="you@email.com"
						bind:value={$loginForm.email}
						required
					/>
					{#if $loginErrors.email}<span class="err">{$loginErrors.email}</span>{/if}
				</div>

				<div class="field">
					<Label for="password">Password</Label>
					<div class="pw">
						<Input
							id="password"
							name="password"
							type={showLoginPassword ? 'text' : 'password'}
							placeholder="••••••••"
							bind:value={$loginForm.password}
							required
						/>
						<button
							type="button"
							class="pw-toggle"
							aria-label={showLoginPassword ? 'Hide password' : 'Show password'}
							onclick={() => (showLoginPassword = !showLoginPassword)}
						>
							{#if showLoginPassword}<EyeOff class="size-4" />{:else}<Eye class="size-4" />{/if}
						</button>
					</div>
					{#if $loginErrors.password}<span class="err">{$loginErrors.password}</span>{/if}
				</div>

				<div class="helper-row">
					<label class="remember">
						<Checkbox name="rememberMe" bind:checked={$loginForm.rememberMe} />
						Remember me
					</label>
				</div>

				<Button type="submit" class="h-11 w-full">
					{#if $loginDelayed}
						<LoadingBtn name="Signing you in" />
					{:else}
						Log In as {ROLE_LABEL[role]}
					{/if}
				</Button>
			</form>
		{/if}

		<p class="switch-note">
			{#if isSignup}
				Already have an account?
				<button type="button" onclick={() => (mode = 'login')}>Log in</button>
			{:else}
				Don't have an account?
				<button type="button" onclick={() => (mode = 'signup')}>Sign up</button>
			{/if}
		</p>
	</div>
</div>

<style>
	/*
		Ported from the PHP `.auth-*` rules. The raw hex values are gone — every
		colour resolves through the shadcn tokens in layout.css, so the card
		follows the theme toggle instead of carrying its own light/dark table.
	*/
	.auth-shell {
		width: 100%;
		max-width: 430px;
		margin: 0 auto;
		padding: 48px 20px;
	}

	.auth-card {
		background: var(--card);
		border: 1px solid var(--border);
		border-radius: 20px;
		box-shadow: var(--card-shadow);
		padding: 36px 32px;
	}

	.auth-head {
		text-align: center;
		margin-bottom: 22px;
	}
	.auth-head h1 {
		font-family: var(--font-display);
		font-size: 24px;
		font-weight: 800;
		letter-spacing: -0.02em;
		margin: 0 0 6px;
	}
	.auth-head p {
		font-size: 14px;
		color: var(--muted-foreground);
		margin: 0;
	}

	.role-tabs {
		display: flex;
		background: var(--background);
		border: 1px solid var(--border);
		border-radius: 12px;
		padding: 4px;
		margin-bottom: 22px;
	}
	.role-tab {
		flex: 1;
		padding: 9px 6px;
		border: none;
		border-radius: 9px;
		background: transparent;
		font-size: 13.5px;
		font-weight: 600;
		color: var(--muted-foreground);
		cursor: pointer;
		transition: all 0.2s ease;
	}
	.role-tab.active {
		background: var(--card);
		color: var(--foreground);
		box-shadow: 0 1px 3px rgb(0 0 0 / 0.08);
	}

	.mode-toggle {
		display: flex;
		justify-content: center;
		gap: 20px;
		margin-bottom: 24px;
	}
	.mode-toggle button {
		background: none;
		border: none;
		border-bottom: 2px solid transparent;
		padding-bottom: 6px;
		font-size: 14px;
		font-weight: 600;
		color: var(--muted-foreground);
		cursor: pointer;
		transition: all 0.2s ease;
	}
	.mode-toggle button.active {
		color: var(--foreground);
		border-color: var(--leora-gold);
	}

	.role-note {
		font-size: 12.5px;
		background: var(--leora-gold-soft);
		border: 1px solid rgb(212 175 55 / 0.3);
		color: var(--leora-gold-dark);
		padding: 9px 12px;
		border-radius: 9px;
		margin: 0 0 18px;
	}
	:global(.dark) .role-note {
		color: var(--leora-gold);
	}

	.field {
		margin-bottom: 16px;
		display: grid;
		gap: 6px;
	}
	.field-row {
		display: flex;
		gap: 12px;
	}
	.field-row .field {
		flex: 1;
		min-width: 0;
	}
	.opt {
		color: var(--muted-foreground);
		font-weight: 400;
	}
	.err {
		font-size: 12.5px;
		color: var(--destructive);
	}

	/* Password field with the reveal toggle sitting inside the input. */
	.pw {
		position: relative;
	}
	.pw :global(input) {
		padding-right: 40px;
	}
	.pw-toggle {
		position: absolute;
		top: 50%;
		right: 10px;
		transform: translateY(-50%);
		border: none;
		background: none;
		color: var(--muted-foreground);
		cursor: pointer;
		line-height: 0;
	}
	.pw-toggle:hover {
		color: var(--foreground);
	}

	.helper-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		font-size: 13px;
		margin: -4px 0 18px;
	}
	.remember {
		display: flex;
		align-items: center;
		gap: 8px;
		font-weight: 500;
		color: var(--muted-foreground);
		cursor: pointer;
	}

	.checkbox-row {
		display: flex;
		align-items: flex-start;
		gap: 8px;
		font-size: 12.5px;
		margin-bottom: 18px;
		cursor: pointer;
	}
	.checkbox-row input {
		margin-top: 2px;
		accent-color: var(--leora-gold);
	}
	.checkbox-row a {
		color: var(--leora-gold-dark);
		font-weight: 600;
		text-decoration: none;
	}
	.checkbox-row a:hover {
		text-decoration: underline;
	}
	:global(.dark) .checkbox-row a {
		color: var(--leora-gold);
	}

	.switch-note {
		text-align: center;
		font-size: 13.5px;
		margin: 20px 0 0;
		color: var(--muted-foreground);
	}
	.switch-note button {
		background: none;
		border: none;
		padding: 0;
		font-size: inherit;
		font-weight: 700;
		color: var(--leora-gold-dark);
		cursor: pointer;
	}
	:global(.dark) .switch-note button {
		color: var(--leora-gold);
	}
</style>
