<script>
	import Screen from '$lib/ui/Screen.svelte';
	import Icon from '$lib/ui/Icon.svelte';
	import { BRAND } from '$lib/brand.js';
	let { data } = $props();
</script>

<svelte:head><title>New Application — {BRAND.name}</title></svelte:head>

<Screen title="New Application" back="/home" nav="application">
	{#if data.forms.length}
		<div>
			<h2 class="sv-h2">Choose your application</h2>
			<p class="sv-sub">Select the form you want to fill in.</p>
		</div>
		<div class="sv-list">
			{#each data.forms as f (f.id)}
				<a class="sv-li" href="/register/{f.id}?new=1" data-sveltekit-reload>
					<span class="sv-tile"><Icon name="file-text" size={18} /></span>
					<span style="flex:1;min-width:0">
						<b>{f.title}</b>
						{#if f.closing}<span class="sv-sub" style="display:block">Closes {f.closing}</span>{/if}
					</span>
					<Icon name="chevron-right" size={18} class="sv-chev" />
				</a>
			{/each}
		</div>
	{:else}
		<div class="sv-note info"><Icon name="info" size={18} class="ico" /><span>No application is open right now. Please check back later.</span></div>
	{/if}
</Screen>
