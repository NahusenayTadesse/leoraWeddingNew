<script lang="ts">
	import { page } from '$app/state';
	import { Button } from '$lib/components/ui/button';
</script>

<div class="flex h-full w-full flex-col items-center justify-center gap-2 py-24 text-center">
	<h1 class="text-destructive text-5xl font-bold">{page.status}</h1>
	<h3 class="text-muted-foreground max-w-md text-lg">{page.error?.message}</h3>
	<Button href="/admin" class="mt-4">Back to Dashboard</Button>
</div>
