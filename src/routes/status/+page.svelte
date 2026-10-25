<script>
	import Screen from '$lib/ui/Screen.svelte';
	import Icon from '$lib/ui/Icon.svelte';
	import { BRAND } from '$lib/brand.js';
	import { fmtDate, statusView, timeline } from '$lib/status.js';
	import { copyText } from '$lib/copy.js';
	let { data } = $props();
	const me = $derived(data.me);
	const view = $derived(statusView(me.status));
	const steps = $derived(timeline(me.status, me.submittedAt));
	const headline = $derived(
		{
			submitted: ['Application Submitted', 'Your form has been successfully submitted. Keep your application number for future reference.'],
			reviewed: ['Application Under Review', 'The admissions team has reviewed your form. Keep your application number for future reference.'],
			approved: ['Application Approved', 'Congratulations! Your application has been approved.'],
			rejected: ['Application Not Successful', 'Your application was not successful. Contact support if you need help.'],
			done: ['Application Completed', 'Your application is complete and locked.']
		}[me.status] || ['Application Submitted', 'Your form has been successfully submitted.']
	);
	let copied = $state(false);
	async function copy() {
		await copyText(me.number);
		copied = true;
		setTimeout(() => (copied = false), 1200);
	}
</script>

<svelte:head><title>Application Status — {BRAND.name}</title></svelte:head>

<Screen title="Application Status" back="/home" nav="status">
	<section class="sv-ok" style={me.status === 'rejected' ? 'background:var(--red-soft);border-color:#f6cfcd' : ''}>
		<span class="dot" style={me.status === 'rejected' ? 'background:var(--red)' : ''}><Icon name={me.status === 'rejected' ? 'info' : 'check'} size={22} stroke={2.6} /></span>
		<div>
			<b>{headline[0]}</b>
			<p>{headline[1]}</p>
		</div>
	</section>

	<section class="sv-numcard">
		<div>
			<small>Application Number</small>
			<b>{me.number}</b>
		</div>
		<button type="button" class="sv-copy" aria-label="Copy application number" onclick={copy}><Icon name={copied ? 'check' : 'copy'} size={17} /></button>
	</section>

	<section>
		{#if me.name}
			<div class="sv-kv"><span class="sv-tile"><Icon name="user" size={16} /></span><div><div class="k">Full Name</div><div class="v">{me.name}</div></div></div>
		{/if}
		{#if me.programme}
			<div class="sv-kv"><span class="sv-tile"><Icon name="graduation" size={16} /></span><div><div class="k">Programme</div><div class="v">{me.programme}</div></div></div>
		{/if}
		<div class="sv-kv"><span class="sv-tile"><Icon name="calendar" size={16} /></span><div><div class="k">Application Date</div><div class="v">{fmtDate(me.submittedAt)}</div></div></div>
		<div class="sv-kv"><span class="sv-tile"><Icon name="shield" size={16} /></span><div><div class="k">Status</div><div class="v"><span class="sv-badge {view.tone === 'green' ? '' : view.tone}">{view.label}</span></div></div></div>
	</section>

	<section class="sv-card">
		<div class="sv-tl">
			{#each steps as s}
				<div class="sv-tli {s.state}">
					<span class="pt">{#if s.state === 'done'}<Icon name="check" size={13} stroke={3} />{:else if s.state === 'bad'}<Icon name="info" size={13} stroke={3} />{/if}</span>
					<div><b>{s.title}</b><span>{s.sub}</span></div>
				</div>
			{/each}
		</div>
	</section>
</Screen>
