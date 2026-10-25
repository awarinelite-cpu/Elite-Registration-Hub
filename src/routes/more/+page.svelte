<script>
	import { onMount } from 'svelte';
	import { enhance } from '$app/forms';
	import Screen from '$lib/ui/Screen.svelte';
	import Icon from '$lib/ui/Icon.svelte';
	import Crest from '$lib/ui/Crest.svelte';
	import { BRAND } from '$lib/brand.js';
	import { notifications, seenCount } from '$lib/status.js';
	let { data } = $props();
	const me = $derived(data.me);

	let seen = $state(0);
	onMount(() => (seen = me ? seenCount(me.number) : 0));
	const unread = $derived(me ? Math.max(0, notifications(me).length - seen) : 0);

	const items = $derived([
		{ href: '/application', icon: 'file-text', label: 'My Applications' },
		...(me ? [{ href: '/more/password', icon: 'lock', label: 'Change Password' }] : []),
		{ href: '/notifications', icon: 'bell', label: 'Notifications', badge: unread },
		{ href: '/help', icon: 'headset', label: 'Help & Support' },
		{ href: '/about', icon: 'info', label: 'About Us' },
		{ href: '/privacy', icon: 'shield', label: 'Privacy Policy' },
		{ href: '/terms', icon: 'file-text', label: 'Terms & Conditions' }
	]);
</script>

<svelte:head><title>More — {BRAND.name}</title></svelte:head>

<Screen nav="more" tint sheet={false}>
	{#snippet header()}
		<header class="sv-more-head"><h1 class="sv-title">More</h1></header>
	{/snippet}

	<div style="padding:0 16px;margin-top:-6px;display:flex;flex-direction:column;gap:14px">
		<a class="sv-list sv-profile" href={me ? '/application' : '/login'} style="display:flex;border:1px solid var(--line)">
			<span class="sv-avatar"><Icon name="user" size={24} /></span>
			<span style="flex:1;min-width:0">
				<b style="display:block;font-size:16px">{me ? me.name || me.number : 'Guest'}</b>
				<span class="sv-sub">{me ? 'Applicant' : 'Log in to see your application'}</span>
			</span>
			<Icon name="chevron-right" size={18} class="sv-chev" />
		</a>

		<div class="sv-list">
			{#each items as it}
				<a class="sv-li" href={it.href}>
					<span class="sv-tile gray" style="width:32px;height:32px;border-radius:9px"><Icon name={it.icon} size={16} /></span>
					<b style="flex:1;font-weight:500">{it.label}</b>
					{#if it.badge}<span class="sv-count">{it.badge}</span>{/if}
					<Icon name="chevron-right" size={18} class="sv-chev" />
				</a>
			{/each}
			{#if me}
				<form method="POST" action="/application?/logout" use:enhance>
					<button class="sv-li sv-redtxt">
						<span class="sv-tile" style="width:32px;height:32px;border-radius:9px;background:var(--red-soft);color:var(--red)"><Icon name="log-out" size={16} /></span>
						<b style="flex:1;font-weight:500">Logout</b>
						<Icon name="chevron-right" size={18} class="sv-chev" />
					</button>
				</form>
			{:else}
				<a class="sv-li" href="/login">
					<span class="sv-tile gray" style="width:32px;height:32px;border-radius:9px"><Icon name="lock" size={16} /></span>
					<b style="flex:1;font-weight:500">Log in</b>
					<Icon name="chevron-right" size={18} class="sv-chev" />
				</a>
			{/if}
		</div>

		<div class="sv-foot">
			<Crest size={40} />
			<div><b>{BRAND.name}</b><span>{BRAND.motto}</span></div>
		</div>
	</div>
</Screen>
