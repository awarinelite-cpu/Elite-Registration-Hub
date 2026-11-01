<script>
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { session, adminFetch } from '$lib/adminSession.svelte.js';
	import { ACCOUNT_TYPES } from '$lib/ihs.js';

	let subs = $state([]);
	let ihsUsers = $state([]);
	let loading = $state(true);
	let error = $state('');
	let info = $state('');
	let busy = $state(false);
	let accountType = $state('sub-admin');
	let name = $state('');
	let email = $state('');
	let password = $state('');

	const typeLabel = (key) => (key === 'sub-admin' ? 'Sub-admin' : ACCOUNT_TYPES.find((t) => t.key === key)?.label || key);

	async function load() {
		try {
			const d = await adminFetch('/api/admin/team');
			subs = d.subs;
			ihsUsers = d.ihs || [];
		} catch (e) {
			error = e.message;
		}
		loading = false;
	}
	onMount(() => {
		if (session.role !== 'owner') return goto('/admin', { replaceState: true });
		load();
	});

	async function create(e) {
		e.preventDefault();
		error = info = '';
		busy = true;
		try {
			await adminFetch('/api/admin/team', { method: 'POST', body: JSON.stringify({ accountType, name, email, password }) });
			info = `${typeLabel(accountType)} account created. Give them: ${email} / the password you set.${accountType === 'sub-admin' ? '' : ' They sign in at /ihs.'}`;
			name = email = password = '';
			await load();
		} catch (e2) {
			error = e2.message;
		}
		busy = false;
	}
	async function resetPw(s) {
		const pw = prompt(`New password for ${s.email} (min 8 characters):`);
		if (!pw) return;
		error = info = '';
		try {
			await adminFetch('/api/admin/team', { method: 'PATCH', body: JSON.stringify({ uid: s.uid, password: pw }) });
			info = `Password changed for ${s.email}.`;
		} catch (e) {
			error = e.message;
		}
	}
	async function remove(s, what) {
		if (!confirm(`Remove ${s.email}? They lose access immediately. Their ${what} stay in the database.`)) return;
		error = info = '';
		try {
			await adminFetch('/api/admin/team', { method: 'DELETE', body: JSON.stringify({ uid: s.uid }) });
			await load();
		} catch (e) {
			error = e.message;
		}
	}
</script>

<div class="mb-4 flex items-center justify-between">
	<h1 class="text-2xl font-bold">Team & accounts</h1>
	<a href="/admin" class="btn-ghost">Back</a>
</div>
<p class="mb-4 text-sm text-slate-600">Only you can create accounts — there is no public sign-up. Sub-admins manage their own forms. IHS DMO accounts sign in at <b>/ihs</b> and only see the Diesel Monitoring Officer report sheet.</p>

{#if error}<div class="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>{/if}
{#if info}<div class="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-800">{info}</div>{/if}

<form class="card mb-6 grid gap-3 sm:grid-cols-2" onsubmit={create}>
	<div class="sm:col-span-2">
		<label class="label" for="tt">Account type</label>
		<select class="input" id="tt" bind:value={accountType} required>
			<option value="sub-admin">Sub-admin</option>
			{#each ACCOUNT_TYPES as t (t.key)}<option value={t.key}>{t.label}</option>{/each}
		</select>
	</div>
	<div><label class="label" for="tn">Name</label><input class="input" id="tn" bind:value={name} placeholder="Full name" /></div>
	<div><label class="label" for="te">Email</label><input class="input" id="te" type="email" bind:value={email} required /></div>
	<div class="sm:col-span-2"><label class="label" for="tp">Password (min 8)</label><input class="input" id="tp" type="text" bind:value={password} minlength="8" required autocomplete="off" /></div>
	<button class="btn sm:col-span-2" disabled={busy}>{busy ? 'Creating…' : `+ Create ${typeLabel(accountType)} account`}</button>
</form>

{#if loading}
	<p class="text-slate-500">Loading…</p>
{:else}
	<h2 class="mb-2 font-bold">Sub-admins</h2>
	<div class="mb-6 space-y-3">
		{#each subs as s (s.uid)}
			<div class="card flex flex-wrap items-center justify-between gap-3">
				<div class="min-w-0">
					<div class="font-semibold">{s.name || s.email}</div>
					<div class="break-all text-sm text-slate-500">{s.email} · {s.forms} form{s.forms === 1 ? '' : 's'}</div>
				</div>
				<div class="flex gap-2">
					<button class="btn-ghost" onclick={() => resetPw(s)}>Reset password</button>
					<button class="btn-danger" onclick={() => remove(s, `${s.forms} form(s) (visible to you)`)}>Remove</button>
				</div>
			</div>
		{:else}
			<p class="text-slate-500">No sub-admins yet.</p>
		{/each}
	</div>

	<h2 class="mb-2 font-bold">IHS DMO accounts</h2>
	<div class="space-y-3">
		{#each ihsUsers as s (s.uid)}
			<div class="card flex flex-wrap items-center justify-between gap-3">
				<div class="min-w-0">
					<div class="font-semibold">{s.name || s.email}</div>
					<div class="break-all text-sm text-slate-500">{s.email} · {typeLabel(s.accountType)} · {s.reports} report{s.reports === 1 ? '' : 's'}</div>
				</div>
				<div class="flex gap-2">
					<button class="btn-ghost" onclick={() => resetPw(s)}>Reset password</button>
					<button class="btn-danger" onclick={() => remove(s, `${s.reports} saved report(s)`)}>Remove</button>
				</div>
			</div>
		{:else}
			<p class="text-slate-500">No IHS DMO accounts yet.</p>
		{/each}
	</div>
{/if}
