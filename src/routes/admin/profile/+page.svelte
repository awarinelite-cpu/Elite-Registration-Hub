<script>
	import { signOut } from 'firebase/auth';
	import { auth } from '$lib/firebase.js';
	import { session } from '$lib/adminSession.svelte.js';
	import ThemeToggle from '$lib/ThemeToggle.svelte';

	const initials = $derived((session.name || 'A').split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase());
	const LINKS = $derived([
		{ href: '/admin/tools', title: 'All actions', sub: 'Collections, imports and search' },
		...(session.role === 'owner' ? [{ href: '/admin/team', title: 'Team', sub: 'Create and manage sub-admins' }] : []),
		{ href: '/admin/payments', title: 'Payment & Fees', sub: 'Payment details shown to applicants' },
		{ href: '/admin/support', title: 'Support', sub: 'Help and FAQs' }
	]);
</script>

<svelte:head><title>Profile — Elite Registration Hub</title></svelte:head>

<section class="me">
	<span class="av">{initials}</span>
	<div class="who"><b>{session.name}</b><small>{session.email}</small><em>{session.role === 'sub' ? 'Sub-admin' : 'Admin'}</em></div>
</section>

<div class="links">
	{#each LINKS as l (l.href)}
		<a href={l.href} class="link"><span><b>{l.title}</b><small>{l.sub}</small></span><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 6l6 6-6 6" /></svg></a>
	{/each}
	<div class="link"><span><b>Theme</b><small>Light, dark or forest</small></span><ThemeToggle /></div>
</div>
<button type="button" class="out" onclick={() => signOut(auth)}>Sign out</button>

<style>
	.me { display: flex; align-items: center; gap: 1rem; padding: 1.1rem; border-radius: 1.2rem; color: #fff; background: linear-gradient(150deg, #124a2b, #0a2e1b); border: 1px solid #1d5a38; box-shadow: var(--card-shadow); }
	.av { display: grid; place-items: center; flex: none; width: 4.2rem; height: 4.2rem; border-radius: 50%; border: 2.5px solid #c9a13b; font-size: 1.5rem; font-weight: 800; color: #e6cd86; background: rgba(255,255,255,.08); }
	.who { display: flex; flex-direction: column; min-width: 0; }
	.who b { font-size: 1.35rem; } .who small { opacity: .85; overflow-wrap: anywhere; }
	.who em { align-self: flex-start; margin-top: .3rem; font-style: normal; padding: .1rem .7rem; border-radius: 9999px; background: #c9a13b; color: #0a2e1b; font-size: .8rem; font-weight: 700; }
	.links { margin-top: 1rem; overflow: hidden; border-radius: 1rem; background: var(--surface); border: 1px solid var(--edge); box-shadow: var(--card-shadow); }
	.link { display: flex; align-items: center; justify-content: space-between; gap: .8rem; padding: .95rem 1rem; text-decoration: none; color: var(--ink); border-bottom: 1px solid var(--edge); }
	.link:last-child { border-bottom: 0; }
	a.link:hover { background: var(--surface-2); }
	.link span { display: flex; flex-direction: column; } .link small { color: var(--sub); font-size: .85rem; }
	.out { width: 100%; margin-top: 1rem; padding: .9rem; border-radius: 1rem; border: 1px solid #d9b0b0; background: var(--surface); color: #c02626; font-weight: 700; cursor: pointer; }
</style>
