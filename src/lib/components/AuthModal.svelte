<script lang="ts">
	import { Heart } from '@lucide/svelte';
	import { Dialog } from '$lib/components/ui/dialog/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { authModal, closeAuth } from '$lib/state.svelte.js';
	import { goto } from '$app/navigation';

	function handleSubmit(e: Event) {
		e.preventDefault();
		closeAuth();
		goto('/dashboard');
	}

	let type = $derived(authModal.type);
</script>

<Dialog open={authModal.open} onclose={closeAuth}>
	<div class="mb-6 text-center">
		<div
			class="from-leora-gold to-leora-champagne mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br"
		>
			<Heart class="h-8 w-8 fill-white text-white" />
		</div>
		<h2 class="font-display text-2xl font-semibold">
			{type === 'login' ? 'Welcome Back' : 'Create Account'}
		</h2>
		<p class="mt-1 text-sm text-gray-600">
			{type === 'login'
				? 'Sign in to continue planning your perfect wedding'
				: 'Join thousands of couples planning their dream day'}
		</p>
	</div>

	<form class="space-y-4" onsubmit={handleSubmit}>
		{#if type === 'register'}
			<div>
				<label class="mb-1 block text-sm font-medium text-gray-700">Full Name</label>
				<Input placeholder="Your name" type="text" />
			</div>
		{/if}
		<div>
			<label class="mb-1 block text-sm font-medium text-gray-700">Email</label>
			<Input placeholder="you@example.com" type="email" />
		</div>
		<div>
			<label class="mb-1 block text-sm font-medium text-gray-700">Password</label>
			<Input placeholder="••••••••" type="password" />
		</div>
		<Button type="submit" class="w-full" size="lg">
			{type === 'login' ? 'Sign In' : 'Create Account'}
		</Button>
	</form>

	<div class="mt-6 text-center text-sm">
		{#if type === 'login'}
			<span class="text-gray-600">Don't have an account?</span>
			<button
				onclick={() => (authModal.type = 'register')}
				class="text-leora-gold ml-1 font-medium hover:underline"
			>
				Sign up
			</button>
		{:else}
			<span class="text-gray-600">Already have an account?</span>
			<button
				onclick={() => (authModal.type = 'login')}
				class="text-leora-gold ml-1 font-medium hover:underline"
			>
				Sign in
			</button>
		{/if}
	</div>
</Dialog>
