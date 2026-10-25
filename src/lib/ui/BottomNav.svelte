<script>
	import Icon from './Icon.svelte';
	// active: home | application | status | more (anything else = none highlighted); dark = navy bar (home screen)
	let { active = '', dark = false } = $props();
	const items = [
		{ key: 'home', href: '/home', icon: 'home', label: 'Home' },
		{ key: 'application', href: '/application', icon: 'file-text', label: 'Application' },
		{ key: 'status', href: '/status', icon: 'clock', label: 'Status' },
		{ key: 'more', href: '/more', icon: 'menu', label: 'More' }
	];
</script>

<nav class="sv-nav" class:dark aria-label="Main">
	{#each items as it}
		<a href={it.href} class="sv-nav-i" class:on={active === it.key} aria-current={active === it.key ? 'page' : undefined}>
			<span class="sv-nav-ic"><Icon name={it.icon} size={18} /></span>
			<span>{it.label}</span>
		</a>
	{/each}
</nav>
