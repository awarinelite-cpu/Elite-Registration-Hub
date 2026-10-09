<script>
	import { onMount } from 'svelte';
	import { adminFetch } from '$lib/adminSession.svelte.js';
	import { stamp } from '$lib/dateFmt.js';

	let notes = $state([]);
	let loading = $state(true);
	let error = $state('');

	onMount(async () => {
		try {
			notes = (await adminFetch('/api/admin/notes')).notes;
		} catch (e) {
			error = e.message;
		}
		loading = false;
	});
</script>

<div class="mb-6 flex flex-wrap items-center justify-between gap-3">
	<h1 class="text-2xl font-bold">📓 Notes</h1>
	<div class="flex gap-2"><a href="/admin" class="btn-ghost">Back</a><a href="/admin/notes/new" class="btn-3d">+ Paste notes</a></div>
</div>

{#if error}<div class="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>{/if}

{#if loading}
	<p class="text-slate-500">Loading…</p>
{:else if !notes.length}
	<div class="card text-center text-slate-600">No notes yet. Press “Paste notes” to add your first one.</div>
{:else}
	<div class="space-y-3">
		{#each notes as n (n.id)}
			<a href="/admin/notes/{n.id}" class="card card-pill flex items-center justify-between gap-3">
				<div class="min-w-0">
					<div class="truncate text-lg font-semibold">{n.title}</div>
					<div class="text-sm text-slate-500">Uploaded: {stamp(n.createdAt)} · {n.chars.toLocaleString()} characters{#if n.shared} · <span class="font-semibold text-teal-700">Shared</span>{/if}</div>
				</div>
				<span class="text-2xl text-slate-400">›</span>
			</a>
		{/each}
	</div>
{/if}
