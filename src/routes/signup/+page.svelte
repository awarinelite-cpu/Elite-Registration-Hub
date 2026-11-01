<script>
	import { goto } from '$app/navigation';
	import { signInWithEmailAndPassword } from 'firebase/auth';
	import { auth } from '$lib/firebase.js';
	import { ACCOUNT_TYPES } from '$lib/ihs.js';

	let name = $state('');
	let email = $state('');
	let phone = $state('');
	let accountType = $state('');
	let password = $state('');
	let confirm = $state('');
	let error = $state('');
	let busy = $state(false);

	async function submit(e) {
		e.preventDefault();
		error = '';
		if (password !== confirm) return (error = 'The two passwords do not match.');
		busy = true;
		try {
			const res = await fetch('/api/signup', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ name, email, phone, accountType, password })
			});
			if (!res.ok) {
				let msg = '';
				try {
					msg = (await res.json()).message;
				} catch {}
				throw new Error(msg || 'Could not create the account. Please try again.');
			}
			await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
			// every account type has its own interface; IHS DMO accounts land on theirs
			await goto('/ihs');
		} catch (err) {
			error = err?.message || 'Could not create the account.';
		}
		busy = false;
	}
</script>

<svelte:head><title>Create account — EliteReg</title></svelte:head>

<main class="mx-auto flex max-w-md flex-col gap-5 px-4 pb-10 pt-1">
	<form class="card space-y-4" onsubmit={submit}>
		<div>
			<h1 class="text-xl font-extrabold">Create your account</h1>
			<p class="mt-1 text-sm text-slate-600">Choose your account type — you will be taken to the screens that belong to it.</p>
		</div>
		{#if error}<div class="rounded-lg bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</div>{/if}
		<div>
			<label class="label" for="su-type">Account type</label>
			<select class="input" id="su-type" bind:value={accountType} required>
				<option value="" disabled>Select account type…</option>
				{#each ACCOUNT_TYPES as t (t.key)}<option value={t.key}>{t.label}</option>{/each}
			</select>
		</div>
		<div><label class="label" for="su-name">Full name</label><input class="input" id="su-name" bind:value={name} autocomplete="name" required /></div>
		<div><label class="label" for="su-email">Email</label><input class="input" id="su-email" type="email" bind:value={email} autocomplete="email" required /></div>
		<div><label class="label" for="su-phone">Phone number <span class="font-normal text-slate-500">(optional)</span></label><input class="input" id="su-phone" type="tel" bind:value={phone} autocomplete="tel" /></div>
		<div><label class="label" for="su-pw">Password</label><input class="input" id="su-pw" type="password" bind:value={password} minlength="8" autocomplete="new-password" required /><p class="mt-1 text-xs text-slate-500">At least 8 characters.</p></div>
		<div><label class="label" for="su-pw2">Confirm password</label><input class="input" id="su-pw2" type="password" bind:value={confirm} minlength="8" autocomplete="new-password" required /></div>
		<button class="btn w-full" disabled={busy}>{busy ? 'Creating account…' : 'Create account'}</button>
		<p class="text-center text-sm text-slate-600">Already have an account? <a class="font-semibold text-teal-800 underline" href="/ihs">Sign in</a></p>
	</form>
</main>
