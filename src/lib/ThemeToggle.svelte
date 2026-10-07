<script>
	import { onMount } from 'svelte';
	// inline = sits in a header (admin, beside Sign out); otherwise floats in the corner
	let { inline = false } = $props();
	let dark = $state(false);

	onMount(() => (dark = document.documentElement.classList.contains('dark')));

	function toggle() {
		dark = !dark;
		document.documentElement.classList.toggle('dark', dark);
		try {
			localStorage.setItem('elitereg_theme', dark ? 'dark' : 'light');
		} catch {
			/* storage unavailable: the choice just won't be remembered */
		}
	}
</script>

<button
	type="button"
	class="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-slate-300 bg-white text-xl print:hidden {inline ? '' : 'fixed bottom-4 right-4 z-40 opacity-90 shadow-lg'}"
	aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
	title={dark ? 'Light mode' : 'Dark mode'}
	onclick={toggle}
>
	{dark ? '☀️' : '🌙'}
</button>
