<script>
	import { onMount } from 'svelte';
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
	class="fixed bottom-4 right-4 z-40 grid h-11 w-11 place-items-center rounded-full border border-slate-300 bg-white text-xl opacity-90 shadow-lg print:hidden"
	aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
	title={dark ? 'Light mode' : 'Dark mode'}
	onclick={toggle}
>
	{dark ? '☀️' : '🌙'}
</button>
