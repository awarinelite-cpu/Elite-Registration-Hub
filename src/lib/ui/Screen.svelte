<script>
	import { onMount } from 'svelte';
	import Icon from './Icon.svelte';
	import BottomNav from './BottomNav.svelte';
	// One app screen: navy header (title + back), white sheet, optional sticky action bar and bottom nav.
	// back: href string, or onback: function. nav: which bottom-nav tab is highlighted (null = no nav bar).
	let { title = '', back = null, onback = null, nav = null, navDark = false, sheet = true, tint = false, header, hero, footer, children } = $props();

	// The applicant app is always light: switch the app-wide dark/forest theme off while a screen is open.
	onMount(() => {
		const c = document.documentElement.classList;
		const had = { dark: c.contains('dark'), forest: c.contains('forest') };
		c.remove('dark', 'forest');
		return () => {
			if (had.dark) c.add('dark');
			if (had.forest) c.add('forest');
		};
	});
</script>

<div class="sv">
	<div class="sv-frame" class:has-nav={!!nav} class:tint>
		{#if header}
			{@render header()}
		{:else}
			<header class="sv-head">
				{#if onback}
					<button type="button" class="sv-iconbtn" aria-label="Back" onclick={onback}><Icon name="arrow-left" size={22} /></button>
				{:else if back}
					<a class="sv-iconbtn" aria-label="Back" href={back}><Icon name="arrow-left" size={22} /></a>
				{/if}
				<h1 class="sv-title">{title}</h1>
			</header>
		{/if}
		{@render hero?.()}
		<main class="sv-main" class:sheet>{@render children?.()}</main>
		{#if footer}<div class="sv-bar" class:above-nav={!!nav}>{@render footer()}</div>{/if}
		{#if nav}<BottomNav active={nav} dark={navDark} />{/if}
	</div>
</div>
