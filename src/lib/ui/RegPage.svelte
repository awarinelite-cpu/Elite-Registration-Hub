<script>
	import Screen from './Screen.svelte';
	import Icon from './Icon.svelte';
	import RegWizard from './RegWizard.svelte';
	import { copyText } from '../copy.js';
	// Everything an applicant sees on a registration link: the wizard, the "closed" notice, and the success screen.
	let { data, form } = $props();
	let copied = $state('');
	async function copy(what, text) {
		await copyText(text);
		copied = what;
		setTimeout(() => (copied = ''), 1400);
	}
</script>

{#if form?.success}
	<Screen title="Application Status" back="/home">
		<section class="sv-ok">
			<span class="dot"><Icon name="check" size={22} stroke={2.6} /></span>
			<div>
				<b>Application Submitted</b>
				<p>Your form has been successfully submitted. Keep your application number for future reference.</p>
			</div>
		</section>

		<section class="sv-numcard">
			<div><small>Application Number</small><b>{form.applicationNumber}</b></div>
			<button type="button" class="sv-copy" aria-label="Copy application number" onclick={() => copy('n', form.applicationNumber)}><Icon name={copied === 'n' ? 'check' : 'copy'} size={17} /></button>
		</section>
		<section class="sv-numcard" style="background:var(--amber-soft)">
			<div><small style="color:#8a6a1f">Access PIN</small><b style="color:#5c4410;font-family:ui-monospace,monospace;letter-spacing:.12em">{form.pin}</b></div>
			<button type="button" class="sv-copy" aria-label="Copy PIN" onclick={() => copy('p', form.pin)}><Icon name={copied === 'p' ? 'check' : 'copy'} size={17} /></button>
		</section>

		<div class="sv-note warn">
			<Icon name="info" size={18} class="ico" />
			<span>Save both now: the PIN is shown only once and cannot be recovered. They are also remembered on this device, so they fill in automatically when you come back.</span>
		</div>

		<div style="display:grid;gap:10px">
			<a class="sv-btn" href="/login">Go to login</a>
			<button type="button" class="sv-btn ghost" onclick={() => copy('b', `Application Number: ${form.applicationNumber}\nAccess PIN: ${form.pin}`)}>{copied === 'b' ? 'Copied ✓' : 'Copy details'}</button>
			<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
				<button type="button" class="sv-btn ghost" onclick={() => window.print()}>Print</button>
				<a class="sv-btn ghost" href="/register/{data.form.id}?new=1" data-sveltekit-reload>Submit another</a>
			</div>
		</div>
	</Screen>
{:else if data.closed}
	<Screen title="New Application" back="/home">
		<h2 class="sv-h2">{data.form.title}</h2>
		<div class="sv-note tip"><Icon name="info" size={18} class="ico" /><span>{data.closed}</span></div>
	</Screen>
{:else}
	<RegWizard {data} {form} />
{/if}
