<script>
	import '../app.css';
	import { page } from '$app/state';
	import ThemeToggle from '$lib/ThemeToggle.svelte';
	let { children } = $props();
</script>

{@render children()}
<!-- the admin area has its own toggle in the header, beside Sign out -->
{#if !page.url.pathname.startsWith('/admin')}<ThemeToggle />{/if}
