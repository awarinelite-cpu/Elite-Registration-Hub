<script>
	import '../app.css';
	import '../mobile.css';
	import { page } from '$app/state';
	import BackButton from '$lib/BackButton.svelte';
	import { onMount } from 'svelte';
	import { onAuthStateChanged } from 'firebase/auth';
	import { auth } from '$lib/firebase.js';
	let { children } = $props();
	// signed in as admin / sub-admin on this device? (students never sign in) -> always offer a way back to the admin area
	let staff = $state(false);
	onMount(() => onAuthStateChanged(auth, (u) => (staff = !!u)));
</script>

{#if staff && !page.url.pathname.startsWith('/admin') && page.url.pathname !== '/'}
	<div class="sticky top-0 z-40 flex items-center justify-between gap-2 bg-teal-800 px-4 py-2 text-sm text-white print:hidden" style="max-width:430px;margin:0 auto">
		<span>Admin view of the student page</span>
		<BackButton fallback="/admin" class="!py-1" />
	</div>
{/if}

<!-- Applicant screens carry their own header; quiz pages add the theme toggle themselves, the admin area has its own. -->
{@render children()}
