<script>
	import { onMount } from 'svelte';
	import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
	import { doc, getDoc } from 'firebase/firestore';
	import { auth, firestore } from '$lib/firebase.js';
	import ThemeToggle from '$lib/ThemeToggle.svelte';
	import { session } from '$lib/adminSession.svelte.js';
	import { page } from '$app/state';

	let { children } = $props();
	let state = $state('loading'); // loading | signedout | denied | ok
	let user = $state(null);
	let email = $state('');
	let password = $state('');
	let error = $state('');
	let busy = $state(false);
	let checkError = $state('');
	let menuOpen = $state(false);

	onMount(() =>
		onAuthStateChanged(auth, async (u) => {
			user = u;
			if (!u) return (state = 'signedout');
			try {
				const snap = await getDoc(doc(firestore, 'admins', u.uid));
				if (snap.exists()) {
					session.uid = u.uid;
					session.role = snap.data()?.role === 'sub' ? 'sub' : 'owner';
				}
				state = snap.exists() ? 'ok' : 'denied';
			} catch (err) {
				checkError = err?.code || err?.message || 'unknown error';
				state = 'denied';
			}
		})
	);

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
	<div class="flex justify-end px-4 pt-3"><ThemeToggle /></div>
{/if}
{#if state === 'loading'}
	<div class="grid min-h-screen place-items-center text-slate-500">Loading…</div>
{:else if state === 'signedout'}
	<main class="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4">
		<div class="mb-4 text-center text-xl font-extrabold text-teal-700">EliteReg Admin</div>
		<form class="card space-y-4" onsubmit={login}>
			{#if error}<div class="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>{/if}
			<div><label class="label" for="em">Email</label><input class="input" id="em" type="email" bind:value={email} required /></div>
			<div><label class="label" for="pw">Password</label><input class="input" id="pw" type="password" bind:value={password} required /></div>
			<button class="btn w-full" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
		</form>
	</main>
{:else if state === 'denied'}
	<main class="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4">
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
	<header class="admin-head">
		<button type="button" class="head-menu" aria-label="Open menu" onclick={() => (menuOpen = true)}>
			<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M3 6h18M3 12h18M3 18h18" /></svg>
		</button>
		<a href="/admin" class="head-brand" aria-label="EliteReg dashboard">
			<svg viewBox="0 0 40 34" width="42" height="36" aria-hidden="true">
				<path d="M12 1.5h27l-4.6 8.6H7.4z" fill="#0f8f86" />
				<path d="M7.5 12.7h22l-4.6 8.6H2.9z" fill="#0b6f69" />
				<path d="M3.1 23.9h27.4l-4.6 8.6H-1.5z" fill="#0f8f86" />
			</svg>
			<span class="head-name">EliteReg</span>
		</a>
		<span class="head-role">{session.role === 'sub' ? 'Sub-admin' : 'Admin'}</span>
	</header>

	{#if menuOpen}
		<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
		<div class="drawer-back" onclick={() => (menuOpen = false)}></div>
		<aside class="drawer" role="dialog" aria-modal="true" aria-label="Menu">
			<div class="drawer-top">
				<span class="head-name">EliteReg</span>
				<button type="button" class="head-menu" aria-label="Close menu" onclick={() => (menuOpen = false)}>✕</button>
			</div>
			<div class="drawer-user">{user?.email}</div>
			<a href="/admin" class="drawer-link" onclick={() => (menuOpen = false)}>Dashboard</a>
			{#if session.role === 'owner'}<a href="/admin/team" class="drawer-link" onclick={() => (menuOpen = false)}>Team</a>{/if}
			<div class="drawer-row"><span>Theme</span><ThemeToggle /></div>
			<button class="drawer-out" onclick={() => signOut(auth)}>Sign out</button>
		</aside>
	{/if}
	<main class="mx-auto max-w-5xl px-4 pb-28 pt-5">{@render children()}</main>

	<nav class="botnav" aria-label="Main">
		<a href="/admin" class:on={page.url.pathname === '/admin'}>
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l9-7.5 9 7.5"/><path d="M5.5 9.5V20h13V9.5"/><path d="M10 20v-5.5h4V20"/></svg>Home
		</a>
		<a href="/admin/notes" class:on={page.url.pathname.startsWith('/admin/notes')}>
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 17h4"/></svg>Notes
		</a>
		{#if session.role === 'owner'}
			<a href="/admin/team" class:on={page.url.pathname.startsWith('/admin/team')}>
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5"/><circle cx="17.5" cy="9" r="2.4"/><path d="M17 14.6c2.4.2 4 1.9 4 4.4"/></svg>Team
			</a>
		{/if}
		<button type="button" onclick={() => (menuOpen = true)}>
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>Menu
		</button>
	</nav>
{/if}

<svelte:window onkeydown={(e) => { if (menuOpen && e.key === 'Escape') menuOpen = false; }} />

<style>
	.admin-head {
		position: sticky; top: 0; z-index: 30;
		display: flex; align-items: center; justify-content: center; gap: .7rem;
		padding: .85rem 1rem;
		background: var(--hd-bg, #fff);
		box-shadow: 0 2px 10px rgba(15, 27, 61, .08);
	}
	.head-menu { position: absolute; left: .6rem; display: grid; place-items: center; width: 2.6rem; height: 2.6rem; border-radius: .75rem; color: var(--hd-text, #0f1b3d); background: transparent; border: 0; font-size: 1.2rem; cursor: pointer; }
	.head-brand { display: inline-flex; align-items: center; gap: .5rem; text-decoration: none; }
	.head-name { font-size: 1.75rem; font-weight: 800; letter-spacing: -.01em; color: var(--hd-text, #0f1b3d); line-height: 1; }
	.head-role { padding: .4rem .95rem; border-radius: 9999px; background: #d9f1ee; color: #0b7d76; font-size: 1.02rem; font-weight: 600; }
	.botnav { position: fixed; z-index: 30; left: 0; right: 0; bottom: 0; display: flex; justify-content: space-around; padding: .5rem .5rem calc(.55rem + env(safe-area-inset-bottom, 0px)); background: var(--hd-bg, #fff); box-shadow: 0 -4px 18px rgba(15, 27, 61, .1); }
	.botnav a, .botnav button { display: flex; flex-direction: column; align-items: center; gap: .2rem; flex: 1; padding: .3rem 0; border: 0; background: transparent; color: #7b8aa6; font-size: .78rem; font-weight: 600; text-decoration: none; cursor: pointer; }
	.botnav svg { width: 1.6rem; height: 1.6rem; }
	.botnav .on { color: #0e8f8c; }
	:global(html.dark) .botnav .on { color: #5eead4; }
	:global(html.dark.forest) .botnav .on { color: #f2b83a; }
	.drawer-back { position: fixed; inset: 0; z-index: 40; background: rgba(15, 27, 61, .45); }
	.drawer { position: fixed; z-index: 50; top: 0; bottom: 0; left: 0; width: min(19rem, 86vw); display: flex; flex-direction: column; gap: .35rem; padding: 1rem; background: var(--hd-bg, #fff); box-shadow: 8px 0 30px rgba(15, 27, 61, .25); }
	.drawer-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: .5rem; }
	.drawer-top .head-menu { position: static; }
	.drawer-user { margin-bottom: .6rem; padding-bottom: .8rem; border-bottom: 1px solid rgba(100, 116, 139, .25); font-size: .85rem; color: #64748b; word-break: break-all; }
	.drawer-link { padding: .75rem .9rem; border-radius: .75rem; font-weight: 600; color: var(--hd-text, #0f1b3d); text-decoration: none; }
	.drawer-link:hover { background: rgba(13, 148, 136, .1); }
	.drawer-row { display: flex; align-items: center; justify-content: space-between; padding: .5rem .9rem; font-weight: 600; color: var(--hd-text, #0f1b3d); }
	.drawer-out { margin-top: auto; padding: .8rem; border-radius: .75rem; border: 1px solid rgba(100, 116, 139, .4); background: transparent; font-weight: 700; color: var(--hd-text, #0f1b3d); cursor: pointer; }
	:global(html.dark) { --hd-bg: #0f172a; --hd-text: #f1f5f9; }
	:global(html.dark) .head-role { background: rgba(94, 234, 212, .16); color: #5eead4; }
	:global(html.dark.forest) { --hd-bg: #143533; --hd-text: #fbf7e8; }
	:global(html.dark.forest) .head-role { background: rgba(242, 184, 58, .18); color: #f2b83a; }
</style>
