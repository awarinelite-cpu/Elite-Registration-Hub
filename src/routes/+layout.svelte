<script>
	import '../app.css';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import ThemeToggle from '$lib/ThemeToggle.svelte';
	import EliteHeader from '$lib/EliteHeader.svelte';
	import BackButton from '$lib/BackButton.svelte';
	import { onMount } from 'svelte';
	import { onAuthStateChanged } from 'firebase/auth';
	import { doc, getDoc } from 'firebase/firestore';
	import { auth, firestore } from '$lib/firebase.js';
	import { getIhsHint, setIhsHint } from '$lib/ihsGuard.js';
	let { children } = $props();
	// signed in as admin / sub-admin on this device? (students never sign in) -> always offer a way back to the admin area
	let staff = $state(false);
	// signed in as an IHS DMO account? Then this device may only ever see /ihs.
	let ihsOnly = $state(false);
	onMount(() =>
		onAuthStateChanged(auth, async (u) => {
			if (!u) {
				staff = ihsOnly = false;
				return setIhsHint(false);
			}
			let isIhs;
			try {
				isIhs = (await getDoc(doc(firestore, 'ihsUsers', u.uid))).exists();
			} catch {
				isIhs = getIhsHint(); // could not check (offline): keep an IHS device locked
			}
			ihsOnly = isIhs;
			staff = !isIhs;
			setIhsHint(isIhs);
		})
	);
	// the admin and IHS DMO areas draw their own header
	const inIhs = $derived(page.url.pathname.startsWith('/ihs'));
	const ownHeader = $derived(page.url.pathname.startsWith('/admin') || inIhs);
	// any other page (home, login, registration forms, notes, admin, errors…) sends an IHS account back to its own interface
	$effect(() => {
		if (ihsOnly && !inIhs) goto('/ihs', { replaceState: true });
	});
</script>

{#if ihsOnly && !inIhs}
	<div class="grid min-h-screen place-items-center text-slate-500">Redirecting…</div>
{:else}
	{#if staff && !ownHeader}
		<div class="sticky top-0 z-40 flex items-center justify-between gap-2 bg-teal-800 px-4 py-2 text-sm text-white print:hidden">
			<span>Admin view of the student page</span>
			<BackButton fallback="/admin" class="!py-1" />
		</div>
	{/if}

	<!-- same green & gold header on every public page; the admin area draws its own (with bell + profile) -->
	{#if !ownHeader}
		<EliteHeader home="/login"><ThemeToggle /></EliteHeader>
	{/if}
	{@render children()}
{/if}
