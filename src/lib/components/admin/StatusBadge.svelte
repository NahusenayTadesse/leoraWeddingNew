<script lang="ts">
	import { Badge } from '$lib/components/ui/badge/index.js';

	let { status }: { status: string } = $props();

	const good = ['approved', 'active', 'confirmed', 'completed', 'resolved', 'paid', 'accepted', 'delivered', 'done'];
	const bad = ['rejected', 'failed', 'cancelled', 'suspended', 'banned', 'expired', 'declined'];
	const variant = $derived(
		good.includes(status) ? 'default' : bad.includes(status) ? 'destructive' : 'secondary'
	);
</script>

<Badge {variant}>{status.replace(/_/g, ' ')}</Badge>
