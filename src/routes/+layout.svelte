<script>
	import '../app.css';
	import { page } from '$app/state';
	import ThemeToggle from '$lib/ThemeToggle.svelte';
	import EliteHeader from '$lib/EliteHeader.svelte';
	import BackButton from '$lib/BackButton.svelte';
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
		<BackButton fallback="/admin" class="!py-1" />
	</div>
{/if}

<!-- same green & gold header on every public page; the admin area draws its own (with bell + profile) -->
{#if !page.url.pathname.startsWith('/admin')}
	<EliteHeader home="/login"><ThemeToggle /></EliteHeader>
{/if}
{@render children()}
