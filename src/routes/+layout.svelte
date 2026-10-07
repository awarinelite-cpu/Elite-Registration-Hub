<script>
	import '../app.css';
	import { page } from '$app/state';
	import ThemeToggle from '$lib/ThemeToggle.svelte';
	let { children } = $props();
</script>

<!-- top-right corner of every page; the admin area puts it beside Sign out in its own header -->
{#if !page.url.pathname.startsWith('/admin')}
	<div class="flex justify-end px-4 pt-3 print:hidden"><ThemeToggle /></div>
{/if}
{@render children()}
