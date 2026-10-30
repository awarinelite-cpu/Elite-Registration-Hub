<script>
	import { onMount } from 'svelte';
	import { collection, getCountFromServer, getDocs, limit, orderBy, query, where } from 'firebase/firestore';
	import { firestore } from '$lib/firebase.js';
	import { studentName } from '$lib/forms.js';
	import { loadForms, loadAllApplications, session } from '$lib/adminSession.svelte.js';
	import Logo from '$lib/Logo.svelte';

	const APPROVED = ['approved', 'done'];
	const PENDING = ['submitted', 'reviewed'];

	let forms = $state([]);
	let recent = $state([]);
	let counts = $state({ total: null, approved: null, pending: null, rejected: null });
	let loading = $state(true);

	const hour = new Date().getHours();
	const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';

	const formOf = (id) => forms.find((f) => f.id === id);
	const nameOf = (a) => studentName(formOf(a.formId), a) || a.applicationNumber || 'Applicant';
	const day = (ms) => new Date(ms).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
	const clock = (ms) => new Date(ms).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

	// how each application status reads in the activity feed
	function look(status) {
		if (status === 'rejected') return { title: 'Application Rejected', icon: 'x', tone: 'red', badge: 'Rejected' };
		if (status === 'approved' || status === 'done') return { title: 'Application Approved', icon: 'doc', tone: 'gold', badge: 'Completed' };
		if (status === 'reviewed') return { title: 'Under Review', icon: 'hourglass', tone: 'slate', badge: 'In Progress' };
		return { title: 'Application Submitted', icon: 'doc', tone: 'green', badge: 'Completed' };
	}

	async function loadOwner() {
		const apps = collection(firestore, 'applications');
		const n = async (q) => (await getCountFromServer(q)).data().count;
		const [total, approved, pending, rejected, snap] = await Promise.all([
			n(apps),
			n(query(apps, where('status', 'in', APPROVED))),
			n(query(apps, where('status', 'in', PENDING))),
			n(query(apps, where('status', '==', 'rejected'))),
			getDocs(query(apps, orderBy('submittedAt', 'desc'), limit(6)))
		]);
		counts = { total, approved, pending, rejected };
		recent = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
	}

	// a sub-admin only sees their own forms' applications, so count those directly
	async function loadSub() {
		const list = await loadAllApplications(forms);
		const c = (st) => list.filter((a) => st.includes(a.status)).length;
		counts = { total: list.length, approved: c(APPROVED), pending: c(PENDING), rejected: c(['rejected']) };
		recent = list.slice(0, 6);
	}

	onMount(async () => {
		try {
			forms = await loadForms();
			await (session.role === 'sub' ? loadSub() : loadOwner());
		} catch {
			/* leave the numbers as dashes */
		}
		session.pending = counts.pending || 0;
		loading = false;
	});

	const show = (v) => (v === null ? '–' : v.toLocaleString());
	const ICONS = {
		doc: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 17h4"/>',
		docPlus: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M12 11.5v6M9 14.5h6"/>',
		docX: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M10 12.5l4 4M14 12.5l-4 4"/>',
		docCheck: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M9 14l2 2 4-4"/>',
		docUser: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><circle cx="12" cy="12.5" r="1.8"/><path d="M8.8 18c.4-1.8 1.7-2.7 3.2-2.7s2.8.9 3.2 2.7"/>',
		check: '<circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.7 2.7L16 9.8"/>',
		hourglass: '<path d="M7 3h10M7 21h10"/><path d="M8 3c0 4 2 5 4 7-2 2-4 3-4 7M16 3c0 4-2 5-4 7 2 2 4 3 4 7"/>',
		x: '<path d="M6 6l12 12M18 6L6 18"/>',
		search: '<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/>',
		card: '<rect x="3" y="5.5" width="18" height="13" rx="2.5"/><path d="M3 10h18M7 15h3"/>',
		headset: '<path d="M4.5 14v-2a7.5 7.5 0 0 1 15 0v2"/><rect x="3.5" y="13" width="4" height="6" rx="1.8"/><rect x="16.5" y="13" width="4" height="6" rx="1.8"/><path d="M18.5 19c0 1.5-1.5 2-4 2"/>',
		clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
		arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
		chev: '<path d="M9 6l6 6-6 6"/>'
	};

	const STATS = $derived([
		{ key: 'total', label: 'Total Applications', value: counts.total, link: 'View all', href: '/admin/applications', icon: 'doc', cls: 'st-total' },
		{ key: 'approved', label: 'Approved', value: counts.approved, link: 'View details', href: '/admin/applications?status=approved', icon: 'check', cls: 'st-approved' },
		{ key: 'pending', label: 'Pending', value: counts.pending, link: 'View details', href: '/admin/applications?status=pending', icon: 'hourglass', cls: 'st-pending' },
		{ key: 'rejected', label: 'Rejected', value: counts.rejected, link: 'View details', href: '/admin/applications?status=rejected', icon: 'docX', cls: 'st-rejected' }
	]);
	const ACTIONS = [
		{ title: 'New Registration', sub: 'Start a new application', href: '/admin/forms/new', icon: 'docPlus', cls: 'qa-dark' },
		{ title: 'Track Application', sub: 'Check your status', href: '/admin/applications?focus=1', icon: 'search', cls: 'qa-cream' },
		{ title: 'View Documents', sub: 'Access your records', href: '/admin/notes', icon: 'docCheck', cls: 'qa-gold' },
		{ title: 'Update Profile', sub: 'Manage your information', href: '/admin/profile', icon: 'docUser', cls: 'qa-cream' },
		{ title: 'Payment & Fees', sub: 'Make payment', href: '/admin/payments', icon: 'card', cls: 'qa-gold' },
		{ title: 'Support', sub: 'Get help & FAQs', href: '/admin/support', icon: 'headset', cls: 'qa-dark' }
	];
</script>

{#snippet ic(name)}
	<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">{@html ICONS[name]}</svg>
{/snippet}

<div class="dash">
	<!-- greeting banner -->
	<section class="banner">
		<div class="b-text">
			<div class="b-hi">{greeting},</div>
			<div class="b-name">{session.name || 'Admin'}</div>
			<p class="b-sub">Your one-stop platform for easy and seamless registration.</p>
		</div>
		<div class="b-mark"><Logo size={104} /></div>
		<blockquote class="b-quote">“Your goals are valid. Keep going.”</blockquote>
	</section>

	<!-- stats -->
	<section class="stats">
		{#each STATS as s (s.key)}
			<a href={s.href} class="stat {s.cls}">
				<span class="st-ic">{@render ic(s.icon)}</span>
				<span class="st-num">{loading ? '–' : show(s.value)}</span>
				<span class="st-label">{s.label}</span>
				<span class="st-link">{s.link} <i>{@render ic('arrow')}</i></span>
			</a>
		{/each}
	</section>

	<!-- quick actions -->
	<div class="sec"><h2>Quick Actions</h2><a href="/admin/tools" class="sec-link">View all <i>{@render ic('arrow')}</i></a></div>
	<section class="quick">
		{#each ACTIONS as a (a.title)}
			<a href={a.href} class="qa {a.cls}">
				<span class="qa-ic">{@render ic(a.icon)}</span>
				<span class="qa-txt"><b>{a.title}</b><small>{a.sub}</small></span>
				<span class="qa-go">{@render ic('chev')}</span>
			</a>
		{/each}
	</section>

	<!-- recent activity -->
	<div class="sec"><h2><span class="clock">{@render ic('clock')}</span>Recent Activity</h2><a href="/admin/applications" class="sec-link">View all <i>{@render ic('arrow')}</i></a></div>
	<section class="feed">
		{#if loading}
			<p class="empty">Loading…</p>
		{:else if !recent.length}
			<p class="empty">No applications yet. Share a form link and they will show up here.</p>
		{:else}
			{#each recent as a (a.id)}
				{@const l = look(a.status)}
				<a href="/admin/forms/{a.formId}/applications?q={encodeURIComponent(a.applicationNumber || '')}" class="row">
					<span class="r-ic tone-{l.tone}">{@render ic(l.icon)}</span>
					<span class="r-txt"><b>{l.title}</b><small>{nameOf(a)} · {formOf(a.formId)?.title || a.formId}</small></span>
					<span class="r-meta">
						<em class="badge-{l.tone}">{l.badge}</em>
						<small>{day(a.submittedAt)} <u>•</u> {clock(a.submittedAt)}</small>
					</span>
					<span class="r-go">{@render ic('chev')}</span>
				</a>
			{/each}
		{/if}
	</section>
</div>

<style>
	.dash { --g900: #0b3320; --g800: #0f4a2b; --gold: #c9a13b; color: var(--ink); }
	.dash :global(svg) { width: 100%; height: 100%; }
	i { display: inline-flex; width: 1em; height: 1em; font-style: normal; }
	u { text-decoration: none; margin: 0 .15rem; }

	/* banner */
	.banner { position: relative; overflow: hidden; display: grid; grid-template-columns: 1fr auto; align-items: center; gap: .6rem; padding: 1.3rem 1.2rem 1.3rem 1.4rem; border-radius: 1.3rem; color: #fff;
		background: radial-gradient(circle at 70% 20%, rgba(255,255,255,.07), transparent 45%), linear-gradient(150deg, #124a2b, #0a2e1b 65%, #08261a); border: 1px solid #1d5a38; box-shadow: var(--card-shadow); }
	.banner::after { content: ''; position: absolute; left: -10%; right: -10%; bottom: -1px; height: 3px; background: linear-gradient(90deg, transparent, #c9a13b 30%, #e6cd86 60%, transparent); }
	.b-hi { font-size: 1.2rem; font-weight: 500; opacity: .95; }
	.b-name { font-size: 2.1rem; font-weight: 800; letter-spacing: -.01em; line-height: 1.1; margin: .1rem 0 .5rem; overflow-wrap: anywhere; }
	.b-sub { margin: 0; max-width: 16rem; font-size: .98rem; line-height: 1.35; opacity: .92; }
	.b-mark { display: none; width: 6.5rem; height: 6.5rem; }
	.b-quote { grid-column: 1 / -1; margin: .6rem 0 0; font-family: Georgia, 'Times New Roman', serif; font-style: italic; font-size: 1.2rem; line-height: 1.3; color: #e6cd86; }
	@media (min-width: 520px) {
		.banner { grid-template-columns: 1fr 6.5rem 9rem; }
		.b-mark { display: block; }
		.b-quote { grid-column: auto; margin: 0; padding-left: .8rem; border-left: 2px solid rgba(201,161,59,.5); }
	}

	/* stats */
	.stats { display: grid; grid-template-columns: repeat(2, 1fr); gap: .7rem; margin-top: 1rem; }
	@media (min-width: 620px) { .stats { grid-template-columns: repeat(4, 1fr); } }
	.stat { display: flex; flex-direction: column; gap: .2rem; padding: .9rem .9rem .8rem; border-radius: 1rem; text-decoration: none; color: var(--ink); background: var(--surface); border: 1px solid var(--edge); box-shadow: var(--card-shadow); }
	.st-ic { width: 3.2rem; height: 3.2rem; padding: .8rem; border-radius: 50%; color: #fff; margin-bottom: .25rem; }
	.st-num { font-size: 2rem; font-weight: 800; line-height: 1.1; }
	.st-label { font-size: 1rem; }
	.st-link { margin-top: .35rem; display: inline-flex; align-items: center; gap: .35rem; font-size: .85rem; color: var(--sub); }
	.st-total { border-color: #2e7a4d; background: color-mix(in srgb, #1f6a3f 5%, var(--surface)); }
	.st-total .st-ic { background: linear-gradient(145deg, #1f6a3f, #0b3320); }
	.st-approved { border-color: #ecd28a; background: var(--gold-tint); }
	.st-approved .st-ic { background: linear-gradient(145deg, #e0b845, #b8901f); }
	.st-pending .st-ic { background: linear-gradient(145deg, #a39a6b, #7c7549); }
	.st-rejected .st-ic { background: linear-gradient(145deg, #7b8489, #576065); }
	:global(html.dark) .st-approved { background: color-mix(in srgb, #d4a937 14%, var(--surface)); }

	/* section heads */
	.sec { display: flex; align-items: center; justify-content: space-between; margin: 1.6rem 0 .7rem; }
	h2 { display: flex; align-items: center; gap: .55rem; margin: 0; font-size: 1.45rem; font-weight: 700; color: var(--ink); }
	.clock { width: 1.9rem; height: 1.9rem; }
	.sec-link { display: inline-flex; align-items: center; gap: .4rem; color: var(--sub); text-decoration: none; font-size: 1.02rem; }
	.sec-link:hover { color: var(--ink); }

	/* quick actions */
	.quick { display: grid; grid-template-columns: repeat(2, 1fr); gap: .7rem; }
	@media (min-width: 560px) { .quick { grid-template-columns: repeat(3, 1fr); } }
	.qa { position: relative; display: flex; flex-direction: column; justify-content: space-between; gap: .7rem; min-height: 7.4rem; padding: .9rem; border-radius: 1rem; text-decoration: none; border: 1px solid var(--edge); box-shadow: var(--card-shadow); }
	.qa-ic { width: 3rem; height: 3rem; padding: .7rem; border-radius: 50%; }
	.qa-txt { display: flex; flex-direction: column; padding-right: 1.9rem; line-height: 1.25; }
	.qa-txt b { font-size: 1.08rem; font-weight: 700; }
	.qa-txt small { font-size: .85rem; opacity: .85; }
	.qa-go { position: absolute; right: .75rem; bottom: .85rem; display: grid; place-items: center; width: 1.9rem; height: 1.9rem; padding: .45rem; border-radius: 50%; }
	.qa-dark { color: #fff; background: linear-gradient(150deg, #165530, #0a2e1b); border-color: #0a2e1b; }
	.qa-dark .qa-ic { border: 1.5px solid rgba(255,255,255,.75); color: #fff; }
	.qa-dark .qa-go { background: rgba(255,255,255,.16); }
	.qa-cream { color: var(--ink); background: var(--surface); }
	.qa-cream .qa-ic { background: linear-gradient(145deg, #5f8a45, #3f6a2c); color: #fff; }
	.qa-cream .qa-go { background: var(--surface-2); color: var(--sub); }
	.qa-gold { color: var(--ink); background: var(--gold-tint); border-color: #efdcaa; }
	.qa-gold .qa-ic { background: linear-gradient(145deg, #e0b845, #b8901f); color: #fff; }
	.qa-gold .qa-go { background: rgba(201,161,59,.22); color: #7a5c0f; }
	:global(html.dark) .qa-gold { background: color-mix(in srgb, #d4a937 14%, var(--surface)); border-color: #4a4a22; }
	:global(html.dark) .qa-gold .qa-go { color: #e6cd86; }

	/* activity */
	.feed { border-radius: 1rem; overflow: hidden; background: var(--surface); border: 1px solid var(--edge); box-shadow: var(--card-shadow); }
	.row { display: flex; align-items: center; gap: .85rem; padding: .85rem .9rem; text-decoration: none; color: var(--ink); border-bottom: 1px solid var(--edge); }
	.row:last-child { border-bottom: 0; }
	.row:hover { background: var(--surface-2); }
	.r-ic { flex: none; width: 3.2rem; height: 3.2rem; padding: .8rem; border-radius: 50%; color: #fff; }
	.tone-green { background: linear-gradient(145deg, #1f7a45, #0f5a2d); }
	.tone-gold { background: linear-gradient(145deg, #e0b845, #b8901f); }
	.tone-slate { background: linear-gradient(145deg, #6b7a99, #4b5873); }
	.tone-red { background: linear-gradient(145deg, #f25b5b, #dc2f3a); }
	.r-txt { flex: 1; min-width: 0; display: flex; flex-direction: column; line-height: 1.3; }
	.r-txt b { font-size: 1.05rem; font-weight: 700; }
	.r-txt small { color: #5a6b7e; font-size: .9rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
	.r-meta { flex: none; display: flex; flex-direction: column; align-items: flex-start; gap: .25rem; }
	.r-meta em { font-style: normal; padding: .1rem .65rem; border-radius: 9999px; font-size: .82rem; font-weight: 600; }
	.r-meta small { font-size: .82rem; color: var(--sub); white-space: nowrap; }
	.badge-green, .badge-gold { background: #dcf3e2; color: #1a6b36; }
	.badge-slate { background: #fdeccd; color: #a2640a; }
	.badge-red { background: #fde2e2; color: #c02626; }
	.r-go { flex: none; width: 1.3rem; height: 1.3rem; color: var(--sub); }
	.empty { margin: 0; padding: 1.3rem; text-align: center; color: var(--sub); }
	@media (max-width: 500px) { .r-meta small { display: none; } .r-meta { align-items: flex-end; } .r-ic { width: 2.8rem; height: 2.8rem; padding: .7rem; } }
</style>
