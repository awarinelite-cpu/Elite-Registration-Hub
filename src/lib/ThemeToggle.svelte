<script>
	import { onMount } from 'svelte';
	// Three looks, one tap each: light -> dark -> forest (green & gold) -> light.
	// "forest" is dark mode plus its own colours, so both classes sit on <html>.
	const ICON = { light: '🌙', dark: '🌿', forest: '☀️' }; // shows what the next tap switches to
	const NEXT = { light: 'dark', dark: 'forest', forest: 'light' };
	const NAME = { light: 'Light mode', dark: 'Dark mode', forest: 'Forest mode' };
	const BAR = { light: '#0f3d24', dark: '#0f3d24', forest: '#0f2623' }; // phone status-bar colour

	let mode = $state('light');

	const current = () => {
		const c = document.documentElement.classList;
		return c.contains('forest') ? 'forest' : c.contains('dark') ? 'dark' : 'light';
	};
	onMount(() => (mode = current()));

	function toggle() {
		mode = NEXT[mode];
		const c = document.documentElement.classList;
		c.toggle('dark', mode !== 'light');
		c.toggle('forest', mode === 'forest');
		document.querySelector('meta[name="theme-color"]')?.setAttribute('content', BAR[mode]);
		try {
			localStorage.setItem('elitereg_theme', mode);
		} catch {
			/* storage unavailable: the choice just won't be remembered */
		}
	}
</script>

<button
	type="button"
	class="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-slate-300 bg-white text-lg shadow-sm print:hidden"
	aria-label={`Switch to ${NAME[NEXT[mode]].toLowerCase()}`}
	title={NAME[NEXT[mode]]}
	onclick={toggle}
>
	{ICON[mode]}
</button>
