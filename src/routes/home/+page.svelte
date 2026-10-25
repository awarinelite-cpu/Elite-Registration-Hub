<script>
	import { onMount } from 'svelte';
	import Screen from '$lib/ui/Screen.svelte';
	import Icon from '$lib/ui/Icon.svelte';
	import Crest from '$lib/ui/Crest.svelte';
	import Student from '$lib/ui/Student.svelte';
	import { BRAND } from '$lib/brand.js';
	import { notifications, seenCount } from '$lib/status.js';
	let { data } = $props();

	let seen = $state(0);
	onMount(() => (seen = data.me ? seenCount(data.me.number) : 0));
	const unread = $derived(data.me ? Math.max(0, notifications(data.me).length - seen) : 0);

	const quick = [
		{ href: '/apply', icon: 'file-text', label: 'New Application' },
		{ href: '/status', icon: 'search', label: 'Check Status' },
		{ href: '/application?edit=1', icon: 'pencil', label: 'Edit Form' },
		{ href: '/help', icon: 'headset', label: 'Help & Support' }
	];
</script>

<svelte:head><title>Home — {BRAND.name}</title></svelte:head>

<Screen nav="home" navDark tint sheet={false}>
	{#snippet header()}
		<header class="sv-home-head">
			<Crest size={42} />
			<div class="t">
				<b>{BRAND.name}</b>
				<span>{BRAND.tagline}</span>
			</div>
			<a class="sv-bell" href="/notifications" aria-label="Notifications">
				<Icon name="bell" size={22} />
				{#if unread}<i>{unread}</i>{/if}
			</a>
		</header>
	{/snippet}

	<section class="sv-welcome">
		<div>
			<h2>Welcome!</h2>
			<p>Complete your registration in just a few simple steps.</p>
			<a class="sv-btn gold" href="/apply">Start Registration <Icon name="arrow-right" size={16} /></a>
		</div>
		<Student size={112} />
	</section>

	<nav class="sv-quick" aria-label="Quick actions">
		{#each quick as q}
			<a href={q.href}>
				<span class="ic"><Icon name={q.icon} size={24} /></span>
				{q.label}
			</a>
		{/each}
	</nav>

	<a class="sv-info" href="/documents" style="display:block">
		<div class="h">
			<span class="sv-tile"><Icon name="megaphone" size={17} /></span>
			<span style="flex:1">Important Information</span>
			<Icon name="chevron-right" size={18} class="sv-chev" />
		</div>
		<p>Make sure you have all required documents and your WAEC/NECO scratch card details ready before you start.</p>
	</a>

	<section class="sv-links sv-list">
		<a class="sv-li" href={BRAND.admissionUrl} target="_blank" rel="noopener">
			<span class="sv-tile" style="width:30px;height:30px;border-radius:50%"><Icon name="link" size={15} /></span>
			<b style="flex:1;font-size:14px">Quick Links</b>
			<Icon name="chevron-right" size={18} class="sv-chev" />
		</a>
		<a class="sv-li" href={BRAND.admissionUrl} target="_blank" rel="noopener">
			<span class="sv-tile gray" style="width:26px;height:26px;border-radius:8px"><Icon name="link" size={13} /></span>
			<span style="flex:1;font-size:13px">{BRAND.school} Admission Portal</span>
			<Icon name="arrow-up-right" size={15} class="sv-chev" />
		</a>
		<a class="sv-li" href={BRAND.guidelinesUrl}>
			<span class="sv-tile gray" style="width:26px;height:26px;border-radius:8px"><Icon name="file-text" size={13} /></span>
			<span style="flex:1;font-size:13px">Registration Guidelines</span>
			<Icon name="arrow-up-right" size={15} class="sv-chev" />
		</a>
	</section>
</Screen>
