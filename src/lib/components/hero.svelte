<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card';
	import { HeartIcon, CalendarIcon, DollarSignIcon, UsersIcon } from '@lucide/svelte';
	import DarkMode from '$lib/components/DarkMode.svelte';

	const features = [
		{
			icon: DollarSignIcon,
			title: 'Budget Tracking',
			description: 'Track every expense and stay within your wedding budget'
		},
		{
			icon: CalendarIcon,
			title: 'Timeline Management',
			description: 'Organize tasks and deadlines leading up to your big day'
		},
		{
			icon: UsersIcon,
			title: 'Guest Management',
			description: 'Manage your guest list and track RSVPs'
		},
		{
			icon: HeartIcon,
			title: 'Dream Planning',
			description: 'Plan every detail of your perfect wedding'
		}
	];
</script>

<div class="min-h-dvh bg-linear-to-br from-primary/10 via-background to-secondary/10">
	<!-- Header -->

	<!-- Hero Section -->
	<main class="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
		<div class="mb-20 space-y-6 text-center">
			<h2
				class="bg-linear-to-r from-primary to-secondary bg-clip-text text-5xl font-bold text-transparent md:text-6xl"
			>
				Plan Your Perfect Wedding
			</h2>
			<p class="mx-auto max-w-2xl text-xl text-muted-foreground">
				Manage your budget, track expenses, and organize every detail of your special day with our
				comprehensive wedding planner.
			</p>
			<div class="flex justify-center gap-4">
				<Button size="lg" href="/register">Start Planning</Button>
				<Button size="lg" variant="outline" href="/login">Sign In</Button>
			</div>

			<DarkMode />
		</div>

		<!-- Features Grid -->
		<div class="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
			{#each features as feature (feature.title)}
				<Card class="hover:shadow-lg-lg transition-shadow-lg">
					<CardHeader>
						<div class="mb-4 w-fit rounded-lg bg-primary/10 p-2">
							<svelte:component this={feature.icon} class="size-6 text-primary" />
						</div>
						<CardTitle class="text-lg">{feature.title}</CardTitle>
					</CardHeader>
					<CardContent>
						<CardDescription>{feature.description}</CardDescription>
					</CardContent>
				</Card>
			{/each}
		</div>
	</main>
</div>
