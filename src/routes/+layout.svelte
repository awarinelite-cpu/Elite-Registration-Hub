<script>
	import '../app.css';
	import { page } from '$app/state';
	import ThemeToggle from '$lib/ThemeToggle.svelte';
	import { onMount } from 'svelte';
	import { onAuthStateChanged } from 'firebase/auth';
	import { auth } from '$lib/firebase.js';
	let { children } = $props();
	// signed in as admin / sub-admin on this device? (students never sign in) -> always offer a way back to the admin area
	let staff = $state(false);
	onMount(() => onAuthStateChanged(auth, (u) => (staff = !!u)));
</script>

{#if staff && !page.url.pathname.startsWith('/admin')}
	<div class="sticky top-0 z-40 flex items-center justify-between gap-2 bg-teal-800 px-4 py-2 text-sm text-white print:hidden">
		<span>Admin view of the student page</span>
		<a href="/admin" data-sveltekit-reload class="rounded-lg bg-white px-3 py-1 font-semibold text-teal-800">← Back to admin</a>
	</div>
{/if}

<!-- top-right corner of every page; the admin area puts it beside Sign out in its own header -->
{#if !page.url.pathname.startsWith('/admin')}
	<div class="flex justify-end px-4 pt-3 print:hidden"><ThemeToggle /></div>
{/if}
{@render children()}
