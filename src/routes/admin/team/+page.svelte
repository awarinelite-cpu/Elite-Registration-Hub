<script>
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { session, adminFetch } from '$lib/adminSession.svelte.js';

	let subs = $state([]);
	let loading = $state(true);
	let error = $state('');
	let info = $state('');
	let busy = $state(false);
	let name = $state('');
	let email = $state('');
	let password = $state('');

	async function load() {
		try {
			subs = (await adminFetch('/api/admin/team')).subs;
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
			await adminFetch('/api/admin/team', { method: 'POST', body: JSON.stringify({ name, email, password }) });
			info = `Sub-admin created. Give them: ${email} / the password you set.`;
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
	async function remove(s) {
		if (!confirm(`Remove ${s.email}? They lose access immediately. Their ${s.forms} form(s) stay and remain visible to you.`)) return;
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
	<h1 class="text-2xl font-bold">Team (sub-admins)</h1>
	<a href="/admin" class="btn-ghost">Back</a>
</div>
<p class="mb-4 text-sm text-slate-600">Sub-admins can create and manage their own forms, quizzes and surveys. They cannot create accounts, see other users, or see anyone else's forms or applications. Only you see everything.</p>

{#if error}<div class="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>{/if}
{#if info}<div class="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-800">{info}</div>{/if}

<form class="card mb-6 grid gap-3 sm:grid-cols-3" onsubmit={create}>
	<div><label class="label" for="tn">Name</label><input class="input" id="tn" bind:value={name} placeholder="Full name" /></div>
	<div><label class="label" for="te">Email</label><input class="input" id="te" type="email" bind:value={email} required /></div>
	<div><label class="label" for="tp">Password (min 8)</label><input class="input" id="tp" type="text" bind:value={password} minlength="8" required autocomplete="off" /></div>
	<button class="btn sm:col-span-3" disabled={busy}>{busy ? 'Creating…' : '+ Create sub-admin'}</button>
</form>

{#if loading}
	<p class="text-slate-500">Loading…</p>
{:else}
	<div class="space-y-3">
		{#each subs as s (s.uid)}
			<div class="card flex flex-wrap items-center justify-between gap-3">
				<div class="min-w-0">
					<div class="font-semibold">{s.name || s.email}</div>
					<div class="break-all text-sm text-slate-500">{s.email} · {s.forms} form{s.forms === 1 ? '' : 's'}</div>
				</div>
				<div class="flex gap-2">
					<button class="btn-ghost" onclick={() => resetPw(s)}>Reset password</button>
					<button class="btn-danger" onclick={() => remove(s)}>Remove</button>
				</div>
			</div>
		{:else}
			<p class="text-slate-500">No sub-admins yet.</p>
		{/each}
	</div>
{/if}
