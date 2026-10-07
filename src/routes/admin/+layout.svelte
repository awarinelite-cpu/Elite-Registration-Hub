<script>
	import { onMount } from 'svelte';
	import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
	import { doc, getDoc } from 'firebase/firestore';
	import { auth, firestore } from '$lib/firebase.js';
	import ThemeToggle from '$lib/ThemeToggle.svelte';

	let { children } = $props();
	let state = $state('loading'); // loading | signedout | denied | ok
	let user = $state(null);
	let email = $state('');
	let password = $state('');
	let error = $state('');
	let busy = $state(false);

	onMount(() =>
		onAuthStateChanged(auth, async (u) => {
			user = u;
			if (!u) return (state = 'signedout');
			try {
				state = (await getDoc(doc(firestore, 'admins', u.uid))).exists() ? 'ok' : 'denied';
			} catch {
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
			<h1 class="text-lg font-bold">Not authorised</h1>
			<p class="text-sm text-slate-600">This account is not an admin. In the Firebase console, create a Firestore document at <code class="rounded bg-slate-100 px-1">admins/{'{uid}'}</code> with this UID:</p>
			<code class="block break-all rounded bg-slate-100 p-2 text-xs">{user?.uid}</code>
			<button class="btn-3d-ghost btn-3d-lg" onclick={() => signOut(auth)}>Sign out</button>
		</div>
	</main>
{:else}
	<header class="border-b border-slate-200 bg-white">
		<div class="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
			<a href="/admin" class="text-lg font-extrabold text-teal-700">EliteReg <span class="text-xs font-medium text-slate-500">Admin</span></a>
			<div class="flex items-center gap-3 text-sm">
				<span class="hidden text-slate-500 sm:inline">{user?.email}</span>
				<ThemeToggle inline />
				<button class="btn-3d-ghost btn-3d-lg" onclick={() => signOut(auth)}>Sign out</button>
			</div>
		</div>
	</header>
	<main class="mx-auto max-w-5xl px-4 py-6">{@render children()}</main>
{/if}
