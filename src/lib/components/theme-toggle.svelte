<script lang="ts">
	import { mode, toggleMode } from 'mode-watcher';

	/**
	 * The PHP header's theme switch: a 44x26 pill with a gold knob that slides
	 * 18px. Two states only — the original had no "system" option, so this is a
	 * switch rather than the shadcn dropdown.
	 *
	 * Rendered as a real <button role="switch"> so it is keyboard-operable and
	 * announces its state, which the PHP <div id="themeToggle"> did not.
	 */
	const isDark = $derived(mode.current === 'dark');
</script>

<button
	type="button"
	role="switch"
	aria-checked={isDark}
	aria-label="Toggle dark mode"
	class="theme-toggle"
	onclick={toggleMode}
>
	<span class="knob"></span>
</button>

<style>
	/*
	 * Dimensions, easing and shadow are copied from the PHP stylesheet. A
	 * sliding knob needs a positioned pseudo-element and a transform that
	 * depends on an ancestor state — cheaper and clearer as CSS than as a pile
	 * of arbitrary-value utilities.
	 */
	.theme-toggle {
		width: 44px;
		height: 26px;
		border-radius: 20px;
		border: 1px solid var(--border);
		background: var(--card);
		position: relative;
		cursor: pointer;
		flex-shrink: 0;
		padding: 0;
	}

	.theme-toggle:focus-visible {
		outline: 2px solid var(--ring);
		outline-offset: 2px;
	}

	.knob {
		position: absolute;
		top: 2px;
		left: 2px;
		width: 20px;
		height: 20px;
		border-radius: 50%;
		background: linear-gradient(135deg, var(--leora-gold), var(--leora-gold-dark));
		box-shadow: 0 2px 6px rgba(0, 0, 0, 0.25);
		transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
	}

	:global(.dark) .knob {
		transform: translateX(18px);
	}

	@media (prefers-reduced-motion: reduce) {
		.knob {
			transition: none;
		}
	}
</style>
