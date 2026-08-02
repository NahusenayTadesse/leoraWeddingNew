import type { Action } from 'svelte/action';

/**
 * Fires once when the element scrolls into view, then disconnects — the same
 * pattern the PHP homepage used for its counter and progress ring
 * (`IntersectionObserver` at `threshold: 0.4`, `.disconnect()` on first hit).
 *
 *   <div use:inview={() => (started = true)}>
 *
 * Respects `prefers-reduced-motion`: when the user has asked for less motion
 * the callback runs immediately, so the end state is shown without the
 * animation rather than being withheld.
 */
export const inview: Action<HTMLElement, (() => void) | undefined> = (node, callback) => {
	let cb = callback;

	const reduced =
		typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

	if (reduced) {
		cb?.();
		return {
			update(next) {
				cb = next;
			}
		};
	}

	const observer = new IntersectionObserver(
		(entries) => {
			for (const entry of entries) {
				if (entry.isIntersecting) {
					cb?.();
					observer.disconnect();
				}
			}
		},
		{ threshold: 0.4 }
	);

	observer.observe(node);

	return {
		update(next) {
			cb = next;
		},
		destroy() {
			observer.disconnect();
		}
	};
};

/**
 * Eased count-up, matching the PHP `animateCount`: 1400ms with a cubic
 * ease-out (`1 - (1-p)^3`). Calls `onTick` with the current value each frame.
 */
export function animateCount(
	target: number,
	duration: number,
	onTick: (value: number) => void
): () => void {
	let frame = 0;
	const start = performance.now();

	const step = (now: number) => {
		const p = Math.min((now - start) / duration, 1);
		const eased = 1 - Math.pow(1 - p, 3);
		onTick(Math.round(target * eased));
		if (p < 1) frame = requestAnimationFrame(step);
	};

	frame = requestAnimationFrame(step);
	return () => cancelAnimationFrame(frame);
}
