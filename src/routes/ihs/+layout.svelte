<script>
	import { onMount } from 'svelte';
	import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
	import { doc, getDoc } from 'firebase/firestore';
	import { auth, firestore } from '$lib/firebase.js';
	import ThemeToggle from '$lib/ThemeToggle.svelte';
	import EliteHeader from '$lib/EliteHeader.svelte';
	import { IHS_TYPE } from '$lib/ihs.js';
	import { ihs } from '$lib/ihsSession.svelte.js';

	let { children } = $props();
	let state = $state('loading'); // loading | signedout | denied | ok
	let email = $state('');
	let password = $state('');
	let error = $state('');
	let busy = $state(false);
	let checkError = $state('');

	onMount(() =>
		onAuthStateChanged(auth, async (u) => {
			if (!u) {
				ihs.uid = '';
				return (state = 'signedout');
			}
			state = 'loading';
			checkError = '';
			try {
				// the profile is written by the server when the admin creates the account; no profile = no access to this area
				const snap = await getDoc(doc(firestore, 'ihsUsers', u.uid));
				if (snap.exists() && snap.data()?.accountType === IHS_TYPE) {
					ihs.uid = u.uid;
					ihs.email = u.email || '';
					ihs.name = snap.data().name || u.displayName || '';
					state = 'ok';
				} else state = 'denied';
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
			await signInWithEmailAndPassword(auth, email.trim(), password);
		} catch {
			error = 'Invalid email or password.';
		}
		busy = false;
	}
</script>

<svelte:head><title>IHS DMO — EliteReg</title></svelte:head>

{#if state === 'ok'}
	<EliteHeader home="/ihs">
		<button type="button" class="so" onclick={() => signOut(auth)} aria-label="Sign out">Sign out</button>
		<ThemeToggle />
	</EliteHeader>
	<main class="mx-auto max-w-3xl px-4 pb-16 pt-1">{@render children()}</main>
{:else}
	<EliteHeader home="/ihs"><ThemeToggle /></EliteHeader>
	{#if state === 'loading'}
		<div class="grid min-h-[40vh] place-items-center text-slate-500">Loading…</div>
	{:else if state === 'signedout'}
		<main class="mx-auto flex max-w-sm flex-col justify-center gap-4 px-4 py-4">
			<div class="text-center text-xl font-extrabold text-teal-800">IHS DMO sign in</div>
			<form class="card space-y-4" onsubmit={login}>
				{#if error}<div class="rounded-lg bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</div>{/if}
				<div><label class="label" for="ihs-em">Email</label><input class="input" id="ihs-em" type="email" bind:value={email} autocomplete="email" required /></div>
				<div><label class="label" for="ihs-pw">Password</label><input class="input" id="ihs-pw" type="password" bind:value={password} autocomplete="current-password" required /></div>
				<button class="btn w-full" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
			</form>
			<p class="text-center text-sm text-slate-600">Accounts are created by the administrator. Contact them if you need access.</p>
		</main>
	{:else}
		<main class="mx-auto flex max-w-md flex-col justify-center px-4 py-4">
			<div class="card space-y-3">
				<h1 class="text-lg font-bold">{checkError ? 'Could not check your account' : 'Not an IHS DMO account'}</h1>
				{#if checkError}
					{#if checkError === 'permission-denied'}
						<p class="text-sm text-slate-600">The app's access rules are not up to date yet. Please tell the administrator (the latest Firestore rules must be deployed), then try again.</p>
					{:else}
						<p class="text-sm text-slate-600">This is a connection or permission error. Check your network and try again.</p>
					{/if}
					<code class="block break-all rounded bg-slate-100 p-2 text-xs">{checkError}</code>
					<button class="btn" onclick={() => location.reload()}>Retry</button>
				{:else}
					<p class="text-sm text-slate-600">This sign-in is not registered as an IHS DMO account. Sign out and use the account you created with the <b>IHS DMO</b> account type.</p>
				{/if}
				<button class="btn-3d-ghost btn-3d-lg" onclick={() => signOut(auth)}>Sign out</button>
			</div>
		</main>
	{/if}
{/if}

<style>
	.so { background: transparent; border: 1.6px solid rgba(255, 255, 255, .8); color: #fff; font-size: .8rem; font-weight: 700; padding: .45rem .8rem; border-radius: 999px; cursor: pointer; }
	.so:hover { background: rgba(255, 255, 255, .12); }
</style>
