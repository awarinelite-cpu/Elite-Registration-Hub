<script>
	import { page } from '$app/state';
	import FormEditor from '$lib/FormEditor.svelte';
</script>

{#key page.params.id}
	<FormEditor id={page.params.id} />
{/key}
