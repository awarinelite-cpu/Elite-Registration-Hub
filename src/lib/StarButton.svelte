<script>
	import { onMount } from 'svelte';
	import { loadStars, isStarred, toggleStar } from '$lib/bookmarks.svelte.js';
	let { formId, id, small = false } = $props();
	onMount(loadStars);
	const on = $derived(isStarred(formId, id));
</script>

{#if formId && id}
	<button
		type="button"
		class="shrink-0 rounded-md px-1.5 leading-none {small ? 'text-lg' : 'text-2xl'} {on ? 'text-amber-500' : 'text-slate-400 hover:text-amber-500'}"
		aria-label={on ? 'Remove star from this question' : 'Star this question to practise it later'}
		aria-pressed={on}
		title={on ? 'Starred' : 'Star this question'}
		onclick={() => toggleStar(formId, id)}>{on ? '★' : '☆'}</button
	>
{/if}
