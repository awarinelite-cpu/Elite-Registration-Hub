<script>
	import { onMount } from 'svelte';
	import Screen from '$lib/ui/Screen.svelte';
	import Icon from '$lib/ui/Icon.svelte';
	import { BRAND } from '$lib/brand.js';
	import { fmtDate, notifications, markSeen } from '$lib/status.js';
	let { data } = $props();
	const list = $derived(notifications(data.me));
	onMount(() => markSeen(data.me.number, notifications(data.me).length));
</script>

<svelte:head><title>Notifications — {BRAND.name}</title></svelte:head>

<Screen title="Notifications" back="/more" nav="more">
	<div class="sv-list">
		{#each list as n (n.id)}
			<div class="sv-li" style="cursor:default;align-items:flex-start">
				<span class="sv-tile"><Icon name="bell" size={17} /></span>
				<div style="flex:1;min-width:0">
					<b>{n.title}</b>
					<p class="sv-sub" style="margin-top:2px;line-height:1.4">{n.text}</p>
					{#if n.at}<p class="sv-sub" style="margin-top:3px">{fmtDate(n.at)}</p>{/if}
				</div>
			</div>
		{/each}
	</div>
</Screen>
