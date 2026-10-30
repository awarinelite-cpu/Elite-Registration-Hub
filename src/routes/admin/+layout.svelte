<script>
	import { onMount } from 'svelte';
	import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
	import { doc, getDoc } from 'firebase/firestore';
	import { auth, firestore } from '$lib/firebase.js';
	import ThemeToggle from '$lib/ThemeToggle.svelte';
	import EliteHeader from '$lib/EliteHeader.svelte';
	import { session } from '$lib/adminSession.svelte.js';
	import { page } from '$app/state';

	let { children } = $props();
	const path = $derived(page.url.pathname);
	let state = $state('loading'); // loading | signedout | denied | ok
	let user = $state(null);
	let email = $state('');
	let password = $state('');
	let error = $state('');
	let busy = $state(false);
	let checkError = $state('');

	onMount(() =>
		onAuthStateChanged(auth, async (u) => {
			user = u;
			if (!u) return (state = 'signedout');
			try {
				const snap = await getDoc(doc(firestore, 'admins', u.uid));
				if (snap.exists()) {
					session.uid = u.uid;
					session.email = u.email || '';
					session.name = u.displayName || prettyName(u.email);
					session.photo = u.photoURL || '';
					session.role = snap.data()?.role === 'sub' ? 'sub' : 'owner';
				}
				state = snap.exists() ? 'ok' : 'denied';
			} catch (err) {
				checkError = err?.code || err?.message || 'unknown error';
				state = 'denied';
			}
		})
	);

	// "awarin.elite@x.com" -> "Awarin Elite"
	function prettyName(email) {
		const local = String(email || '').split('@')[0].replace(/[._\-+\d]+/g, ' ').trim();
		return local ? local.replace(/\b\w/g, (c) => c.toUpperCase()) : 'Admin';
	}

	async function login(e) {
		e.preventDefault();
		busy = true;
		error = '';
		try {
			await signInWithEmailAndPassword(auth, email, password);
		} catch {
			error = 'Invalid email or password.';
		}
		busy = false;
	}
</script>

<svelte:head><title>Admin — EliteReg</title></svelte:head>

{#if state !== 'ok'}
	<EliteHeader home="/admin"><ThemeToggle /></EliteHeader>
{/if}
{#if state === 'loading'}
	<div class="grid min-h-screen place-items-center text-slate-500">Loading…</div>
{:else if state === 'signedout'}
	<main class="mx-auto flex max-w-sm flex-col justify-center px-4 py-8">
		<div class="mb-4 text-center text-xl font-extrabold text-teal-800">Admin sign in</div>
		<form class="card space-y-4" onsubmit={login}>
			{#if error}<div class="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>{/if}
			<div><label class="label" for="em">Email</label><input class="input" id="em" type="email" bind:value={email} required /></div>
			<div><label class="label" for="pw">Password</label><input class="input" id="pw" type="password" bind:value={password} required /></div>
			<button class="btn w-full" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
		</form>
	</main>
{:else if state === 'denied'}
	<main class="mx-auto flex max-w-md flex-col justify-center px-4 py-8">
		<div class="card space-y-3">
			<h1 class="text-lg font-bold">{checkError ? 'Could not check admin access' : 'Not authorised'}</h1>
			{#if checkError}
				<p class="text-sm text-slate-600">This is a connection or permission error, not a missing admin record. Check your network and try again.</p>
				<code class="block break-all rounded bg-slate-100 p-2 text-xs">{checkError}</code>
				<button class="btn" onclick={() => location.reload()}>Retry</button>
			{:else}
			<p class="text-sm text-slate-600">This account is not an admin. In the Firebase console, create a Firestore document at <code class="rounded bg-slate-100 px-1">admins/{'{uid}'}</code> with this UID:</p>
			<code class="block break-all rounded bg-slate-100 p-2 text-xs">{user?.uid}</code>
			{/if}
			<button class="btn-3d-ghost btn-3d-lg" onclick={() => signOut(auth)}>Sign out</button>
		</div>
	</main>
{:else}
	<EliteHeader home="/admin" bell bellDot={session.pending > 0} profileHref="/admin/profile" photo={session.photo} />

	<main class="mx-auto max-w-5xl px-4 pb-32 pt-1">{@render children()}</main>

	<nav class="botnav print:hidden" aria-label="Main">
		<a href="/admin" class:on={path === '/admin'}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l9-7.5 9 7.5"/><path d="M5.5 9.5V20h13V9.5"/><path d="M10 20v-5.5h4V20"/></svg><span>Home</span></a>
		<a href="/admin/applications" class:on={path.startsWith('/admin/applications')}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 17h4"/></svg><span>Applications</span></a>
		<a href="/admin/forms/new" class="fab" aria-label="New form"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg></a>
		<a href="/admin/notes" class:on={path.startsWith('/admin/notes')}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3h6v1"/><path d="M9 11h6M9 15h4"/></svg><span>Notes</span></a>
		<a href="/admin/profile" class:on={path.startsWith('/admin/profile')}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8.5" r="3.6"/><path d="M5 20c.6-3.8 3.6-6 7-6s6.4 2.2 7 6"/></svg><span>Profile</span></a>
	</nav>

{/if}

<style>
	.botnav { position: fixed; z-index: 30; left: 0; right: 0; bottom: 0; display: flex; align-items: center; justify-content: space-around; gap: .15rem; padding: .55rem .6rem calc(.6rem + env(safe-area-inset-bottom, 0px)); background: var(--surface); border-top: 1px solid var(--edge); box-shadow: 0 -6px 22px rgba(14, 42, 26, .1); }
	.botnav a:not(.fab) { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: .15rem; flex: 1; max-width: 6.2rem; min-height: 3.5rem; padding: .3rem .4rem; border-radius: 1.2rem; color: #7d8a82; font-size: .8rem; font-weight: 600; text-decoration: none; }
	.botnav a:not(.fab) svg { width: 1.6rem; height: 1.6rem; }
	.botnav a.on { background: #0f4a2b; color: #fff; }
	.fab { position: relative; flex: none; display: grid; place-items: center; width: 4.1rem; height: 4.1rem; margin: -2.1rem .2rem 0; border-radius: 50%; color: #fff; text-decoration: none; background: radial-gradient(circle at 35% 30%, #1f6a3f, #0c3320); border: 3px solid #d4af37; box-shadow: 0 0 0 4px var(--surface), 0 10px 20px -6px rgba(14, 42, 26, .6); }
	.fab svg { width: 2rem; height: 2rem; }
	:global(html.dark) .botnav a.on { background: #d4a937; color: #0a2e1b; }
	@media (min-width: 900px) { .botnav { left: 50%; right: auto; width: 42rem; transform: translateX(-50%); border-radius: 1.4rem 1.4rem 0 0; border: 1px solid var(--edge); border-bottom: 0; } }
</style>
