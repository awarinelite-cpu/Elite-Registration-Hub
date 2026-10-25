<script>
	import Screen from '$lib/ui/Screen.svelte';
	import Icon from '$lib/ui/Icon.svelte';
	import { BRAND } from '$lib/brand.js';
	let { data } = $props();
	const icon = (label) => (/photo/i.test(label) ? 'user' : /scratch/i.test(label) ? 'file-text' : /certificate|declaration/i.test(label) ? 'file-text' : 'file-text');
</script>

<svelte:head><title>Required Documents — {BRAND.name}</title></svelte:head>

<Screen title="Required Documents" back="/home" nav="home">
	<p style="font-size:14px;color:#3b4d6e">Make sure you have the following documents ready before you start your application.</p>

	<div class="sv-list">
		{#each data.docs as d, i}
			<a class="sv-li sv-doc" href="/apply">
				<span class="sv-tile"><Icon name={icon(d.label)} size={18} /></span>
				<span style="flex:1;min-width:0">
					<b>{i + 1}. {d.label}</b>
					<small>({d.required ? 'Required' : 'Optional'})</small>
				</span>
				<Icon name="chevron-right" size={18} class="sv-chev" />
			</a>
		{/each}
	</div>

	<div class="sv-note tip">
		<Icon name="bulb" size={20} class="ico" />
		<span>Ensure your documents are clear, valid and in the correct format (JPG, PNG or PDF).</span>
	</div>
</Screen>
