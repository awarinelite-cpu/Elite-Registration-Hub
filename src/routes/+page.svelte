<script>
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import Logo from '$lib/ui/Logo.svelte';
	import Icon from '$lib/ui/Icon.svelte';
	import { BRAND } from '$lib/brand.js';

	// Splash: shows the brand for a moment, then opens the home screen (tap to skip).
	onMount(() => {
		const html = document.documentElement.classList;
		const had = { dark: html.contains('dark'), forest: html.contains('forest') };
		html.remove('dark', 'forest');
		const t = setTimeout(() => goto('/home', { replaceState: true }), 2200);
		return () => {
			clearTimeout(t);
			if (had.dark) html.add('dark');
			if (had.forest) html.add('forest');
		};
	});
</script>

<svelte:head><title>{BRAND.name}</title></svelte:head>

<div class="sv">
	<a href="/home" class="sv-frame" aria-label="Open {BRAND.name}" style="display:block">
		<div class="sv-splash">
			<Logo size={110} />
			<div class="brand">{BRAND.short}</div>
			<div class="sub">{BRAND.name}</div>
			<div class="tag">Simple &nbsp;•&nbsp; Secure &nbsp;•&nbsp; Reliable</div>
			<div class="gate">{BRAND.gateway}</div>
			<svg class="swoosh" viewBox="0 0 400 120" fill="none" preserveAspectRatio="none" aria-hidden="true">
				<path d="M0 118C90 112 200 90 400 20" stroke="#f6b93b" stroke-width="5" stroke-linecap="round" />
				<path d="M0 110C100 108 220 84 400 28L400 40C220 96 100 118 0 118z" fill="#f6b93b" opacity=".35" />
			</svg>
			<div class="by"><Icon name="crown" size={14} /> Powered by Elite</div>
		</div>
	</a>
</div>
