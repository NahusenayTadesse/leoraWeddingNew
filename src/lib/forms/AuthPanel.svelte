<script lang="ts">
	import { Button } from '@nahu/admin-kit/components/ui/button/index.js';
	import { Checkbox } from '@nahu/admin-kit/components/ui/checkbox/index.js';
	import InputComp from '@nahu/admin-kit/formComponents/InputComp.svelte';
	import LoadingBtn from '@nahu/admin-kit/formComponents/LoadingBtn.svelte';
	import Errors from '@nahu/admin-kit/formComponents/Errors.svelte';
	import { createForm } from '@nahu/admin-kit/forms/createForm';
	import { addUser, addVendor, loginSchema } from '$lib/ZodSchema';
	import { replaceState } from '$app/navigation';
	import { page } from '$app/state';
	import { m } from '$lib/paraglide/messages.js';

	/**
	 * The combined auth card from the PHP app (leora-events-login.html): role
	 * tabs across the top, a Log In / Sign Up toggle beneath, and one card that
	 * re-labels itself for the chosen combination. Switching tab or mode is
	 * purely client-side, exactly as it was in PHP — no navigation, no reload,
	 * and whatever you already typed into email/password stays put.
	 */

	type Role = 'couple' | 'vendor' | 'admin';
	type Mode = 'login' | 'signup';

	let {
		data,
		mode: initialMode = 'login'
	}: { data: import('../../routes/login/$types').PageData; mode?: Mode } = $props();

	let role = $state<Role>((page.url.searchParams.get('role') as Role) ?? 'couple');
	// The tab the card opens on; switching afterwards is local state.
	// svelte-ignore state_referenced_locally
	let mode = $state<Mode>(initialMode);

	const ROLE_LABEL: Record<Role, string> = {
		couple: m.auth_role_couple(),
		vendor: m.auth_role_vendor(),
		admin: m.auth_role_admin()
	};
	const ROLES: Role[] = ['couple', 'vendor', 'admin'];

	const isSignup = $derived(mode === 'signup');

	const headTitle = $derived(
		isSignup ? m.auth_join_as({ role: ROLE_LABEL[role] }) : m.auth_welcome_back()
	);

	const headSub = $derived(
		!isSignup
			? m.auth_sub_login()
			: role === 'vendor'
				? m.auth_sub_vendor()
				: role === 'admin'
					? m.auth_sub_admin()
					: m.auth_sub_couple()
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

	// Each form toasts its own result through the kit's `createForm`.

	// ---------------------------------------------------------------- login
	// svelte-ignore state_referenced_locally
	const {
		form: loginForm,
		errors: loginErrors,
		enhance: loginEnhance,
		delayed: loginDelayed,
		allErrors: loginAllErrors
	} = createForm(data.form, loginSchema, { resetForm: false });

	// --------------------------------------------------------- couple signup
	// svelte-ignore state_referenced_locally
	const {
		form: signupForm,
		errors: signupErrors,
		enhance: signupEnhance,
		delayed: signupDelayed,
		allErrors: signupAllErrors
	} = createForm(data.signupForm, addUser, { resetForm: false });

	// ---------------------------------------------------------- vendor start
	// Just enough to open the account — see `authForms.ts`'s `vendorStart`.
	// The rest is collected by the /vendor-onboarding wizard.
	// svelte-ignore state_referenced_locally
	const {
		form: vendorForm,
		errors: vendorErrors,
		enhance: vendorEnhance,
		delayed: vendorDelayed,
		allErrors: vendorAllErrors
	} = createForm(data.vendorForm, addVendor, { resetForm: false });
</script>

<div class="auth-shell">
	<div class="auth-card">
		<div class="auth-head">
			<h1>{headTitle}</h1>
			<p>{headSub}</p>
		</div>

		<!-- Role tabs -->
		<div class="role-tabs" role="tablist" aria-label={m.auth_account_type()}>
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
				{m.auth_tab_login()}
			</button>
			<button type="button" class:active={isSignup} onclick={() => (mode = 'signup')}>
				{m.auth_tab_signup()}
			</button>
		</div>

		{#if role === 'admin'}
			<p class="role-note">
				{m.auth_admin_note()}
			</p>
		{/if}

		{#if isSignup && role === 'admin'}
			<!--
				PHP mapped an admin sign-up to the `bride` role, which quietly created
				a couple account under an admin-looking form. There is no self-serve
				admin sign-up, so the card says so instead of pretending.
			-->
			<Button class="w-full" onclick={() => (mode = 'login')}>{m.auth_login_as_admin()}</Button>
		{:else if isSignup && role === 'vendor'}
			<!--
				Matches leora-events-login.html exactly: the vendor sign-up step on
				the auth card only takes a business name, email and password, then
				hands off to the "Become a Vendor" wizard for everything else.
			-->
			<form method="POST" action="?/vendorStart" use:vendorEnhance>
				<Errors allErrors={$vendorAllErrors} />

				<InputComp
					form={vendorForm}
					errors={vendorErrors}
					name="businessName"
					label={m.auth_business_name()}
					placeholder="e.g. Mesk Studio Photography"
					required
				/>
				<InputComp
					form={vendorForm}
					errors={vendorErrors}
					name="email"
					label={m.auth_email()}
					type="email"
					placeholder="hello@yourbusiness.com"
					required
				/>
				<InputComp
					form={vendorForm}
					errors={vendorErrors}
					name="password"
					label={m.auth_password()}
					type="password"
					placeholder="••••••••"
					required
				/>

				<div class="checkbox-row">
					<Checkbox id="vendorTerms" required />
					<label for="vendorTerms">
						{m.auth_agree_before()} <a href="/terms">{m.footer_terms()}</a>
						{m.auth_agree_and()}
						<a href="/privacy">{m.footer_privacy()}</a>{m.auth_agree_after()}
					</label>
				</div>

				<Button type="submit" class="mt-1 h-11 w-full">
					{#if $vendorDelayed}
						<LoadingBtn name={m.auth_setting_up()} />
					{:else}
						{m.auth_continue_setup()}
					{/if}
				</Button>
			</form>
		{:else if isSignup}
			<!-- ------------------------------ Couple sign-up ------------------------------ -->
			<form method="POST" action="?/signup" use:signupEnhance>
				<Errors allErrors={$signupAllErrors} />

				<div class="field-row">
					<InputComp
						form={signupForm}
						errors={signupErrors}
						name="brideName"
						label={m.auth_bride()}
						placeholder="Selam"
						required
					/>
					<InputComp
						form={signupForm}
						errors={signupErrors}
						name="groomName"
						label={m.auth_groom()}
						placeholder="Tesfaye"
						required
					/>
				</div>
				<InputComp
					form={signupForm}
					errors={signupErrors}
					name="email"
					label={m.auth_email()}
					type="email"
					placeholder="you@email.com"
					required
				/>
				<div class="field-row">
					<InputComp
						form={signupForm}
						errors={signupErrors}
						name="phone"
						label={m.auth_phone()}
						type="tel"
						placeholder="09xxxxxxxx"
						required
					/>
					<InputComp
						form={signupForm}
						errors={signupErrors}
						name="phone2"
						label={m.auth_phone2()}
						type="tel"
						placeholder={m.auth_optional()}
					/>
				</div>
				<InputComp
					form={signupForm}
					errors={signupErrors}
					name="password"
					label={m.auth_password()}
					type="password"
					placeholder="••••••••"
					required
				/>

				<div class="checkbox-row">
					<Checkbox id="coupleTerms" required />
					<label for="coupleTerms">
						{m.auth_agree_before()} <a href="/terms">{m.footer_terms()}</a>
						{m.auth_agree_and()}
						<a href="/privacy">{m.footer_privacy()}</a>{m.auth_agree_after()}
					</label>
				</div>

				<Button type="submit" class="mt-1 h-11 w-full">
					{#if $signupDelayed}
						<LoadingBtn name={m.auth_creating()} />
					{:else}
						{m.auth_create_couple()}
					{/if}
				</Button>
			</form>
		{:else}
			<!-- --------------------------------- Log in --------------------------------- -->
			<form method="POST" action="?/login" use:loginEnhance>
				<Errors allErrors={$loginAllErrors} />

				<InputComp
					form={loginForm}
					errors={loginErrors}
					name="email"
					label={m.auth_email()}
					type="email"
					placeholder="you@email.com"
					required
				/>
				<InputComp
					form={loginForm}
					errors={loginErrors}
					name="password"
					label={m.auth_password()}
					type="password"
					placeholder="••••••••"
					required
				/>
				<p class="forgot-row">
					<a href="/forgot-password">{m.auth_forgot_link()}</a>
				</p>
				<InputComp
					form={loginForm}
					errors={loginErrors}
					name="rememberMe"
					label={m.auth_remember()}
					hideLabel
					type="checkboxSingle"
					placeholder={m.auth_remember()}
				/>

				<Button type="submit" class="h-11 w-full">
					{#if $loginDelayed}
						<LoadingBtn name={m.auth_signing_in()} />
					{:else}
						{m.auth_login_as({ role: ROLE_LABEL[role] })}
					{/if}
				</Button>
			</form>
		{/if}

		<p class="switch-note">
			{#if isSignup}
				{m.auth_have_account()}
				<button type="button" onclick={() => (mode = 'login')}>{m.nav_login()}</button>
			{:else}
				{m.auth_no_account()}
				<button type="button" onclick={() => (mode = 'signup')}>{m.auth_signup_link()}</button>
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

	.field-row {
		display: flex;
		gap: 12px;
	}

	/* Password field with the reveal toggle sitting inside the input. */

	.checkbox-row {
		display: flex;
		align-items: flex-start;
		gap: 8px;
		font-size: 12.5px;
		margin-bottom: 18px;
		cursor: pointer;
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

	.forgot-row {
		text-align: right;
		margin: -6px 0 10px;
		font-size: 13px;
	}
	.forgot-row a {
		color: var(--leora-gold-dark);
		font-weight: 600;
	}
	:global(.dark) .forgot-row a {
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
