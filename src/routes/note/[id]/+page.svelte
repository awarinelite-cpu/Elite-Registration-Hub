<script>
	import { parseNotes } from '$lib/parseNotes.js';
	import NoteView from '$lib/NoteView.svelte';
	let { data } = $props();
	const blocks = $derived(parseNotes(data.text));
</script>

<svelte:head>
	<title>{data.title}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<main class="mx-auto max-w-3xl p-3 sm:p-6">
	<div class="mb-3 flex items-center justify-between gap-2 print:hidden">
		<h1 class="min-w-0 break-words text-xl font-bold">{data.title}</h1>
		<button class="btn-ghost shrink-0" onclick={() => window.print()}>Print</button>
	</div>
	<div class="card !p-5 sm:!p-8">
		<NoteView {blocks} />
	</div>
</main>
