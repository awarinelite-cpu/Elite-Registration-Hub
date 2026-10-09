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
	<div class="card !p-5 sm:!p-8">
		<NoteView {blocks} />
	</div>
{/if}
