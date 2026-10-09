<script>
	import { page } from '$app/state';
	import NoteEditor from '$lib/NoteEditor.svelte';
</script>

{#key page.params.id}<NoteEditor id={page.params.id} />{/key}
