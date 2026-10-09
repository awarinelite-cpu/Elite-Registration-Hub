<script>
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { adminFetch } from '$lib/adminSession.svelte.js';
	import { parseNotes } from '$lib/parseNotes.js';
	import NoteView from '$lib/NoteView.svelte';

	let note = $state(null);
	let error = $state('');
	const blocks = $derived(note ? parseNotes(note.text) : []);

	onMount(async () => {
		try {
			note = await adminFetch(`/api/admin/notes/${page.params.id}`);
		} catch (e) {
			error = e.message;
		}
	});

	let copied = $state(false);
	const link = $derived(note?.shared ? `${location.origin}/note/${page.params.id}` : '');

	async function setShared(on) {
		try {
			await adminFetch(`/api/admin/notes/${page.params.id}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ shared: on }) });
			note.shared = on;
		} catch (e) {
			error = e.message;
		}
	}

	async function copyLink() {
		try {
			await navigator.clipboard.writeText(link);
		} catch {
			const t = document.createElement('textarea');
			t.value = link;
			document.body.appendChild(t);
			t.select();
			document.execCommand('copy');
			t.remove();
		}
		copied = true;
		setTimeout(() => (copied = false), 1500);
	}

	async function remove() {
		if (!confirm(`Delete "${note.title}"? This cannot be undone.`)) return;
		try {
			await adminFetch(`/api/admin/notes/${page.params.id}`, { method: 'DELETE' });
			await goto('/admin/notes');
		} catch (e) {
			error = e.message;
		}
	}
</script>

<div class="mb-4 flex flex-wrap items-center justify-between gap-2 print:hidden">
	<a href="/admin/notes" class="btn-ghost">Back</a>
	{#if note}
		<div class="flex flex-wrap gap-2">
			{#if note.shared}
				<button class="btn-3d" onclick={copyLink}>{copied ? 'Copied ✓' : 'Copy link'}</button>
			{:else}
				<button class="btn-3d" onclick={() => setShared(true)}>Share</button>
			{/if}
			<button class="btn-ghost" onclick={() => window.print()}>Print</button>
			<a class="btn-ghost" href="/admin/notes/{page.params.id}/edit">Edit</a>
			<button class="btn-danger" onclick={remove}>Delete</button>
		</div>
	{/if}
</div>

{#if error}
	<div class="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>
{:else if !note}
	<p class="text-slate-500">Loading…</p>
{:else}
	{#if note.shared}
		<div class="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-teal-50 p-3 text-sm text-teal-900 print:hidden">
			<span class="min-w-0 break-all">Anyone with the link can read this note: <code>{link}</code></span>
			<button class="btn-ghost" onclick={() => setShared(false)}>Stop sharing</button>
		</div>
	{/if}
	<div class="card !p-5 sm:!p-8">
		<NoteView {blocks} />
	</div>
{/if}
