<script lang="ts">
	import { page } from '$app/state';
	import { Button } from '@nahu/admin-kit/components/ui/button/index.js';
</script>

<div class="flex h-full w-full flex-col items-center justify-center gap-2 py-24 text-center">
	<h1 class="text-5xl font-bold text-destructive">{page.status}</h1>
	<h3 class="max-w-md text-lg text-muted-foreground">{page.error?.message}</h3>
	<Button href="/admin" class="mt-4">Back to Dashboard</Button>
</div>
