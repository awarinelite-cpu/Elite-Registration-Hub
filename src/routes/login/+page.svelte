<script>
	import { onMount } from 'svelte';
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import Screen from '$lib/ui/Screen.svelte';
	import Icon from '$lib/ui/Icon.svelte';
	import Crest from '$lib/ui/Crest.svelte';
	import { BRAND } from '$lib/brand.js';
	import { addSaved, getSaved, removeSaved, clearSaved } from '$lib/savedLogins.js';
	let { form } = $props();
	let busy = $state(false);
	let number = $state(form?.number ?? '');
	let pin = $state('');
	let saved = $state([]);
	let picking = $state(false);
	const next = $derived(page.url.searchParams.get('next') || '');

	onMount(() => (saved = getSaved()));

	// forms the applicant has submitted from this device, one "submit another" card each
	const forms = $derived([...new Map(saved.filter((s) => s.formId).map((s) => [s.formId, s.title || s.formId])).entries()]);

	function choose(e) {
		number = e.number;
		pin = e.pin;
		picking = false;
	}
	// tapping the Application Number box fills itself in (a short list appears if there are several)
	function tapNumber() {
		if (!saved.length || number) return;
		if (saved.length === 1) choose(saved[0]);
		else picking = true;
	}
	function forget(n) {
		removeSaved(n);
		saved = getSaved();
		if (!saved.length) picking = false;
	}
	function forgetAll() {
		clearSaved();
		saved = [];
		picking = false;
	}
</script>

<svelte:head><title>Log in — {BRAND.name}</title></svelte:head>

<Screen nav={null} sheet>
	{#snippet header()}
		<header class="sv-login-head">
			<div class="brandrow">
				<a href="/home" aria-label="Home"><Crest size={40} /></a>
				<div>
					<b>{BRAND.name}</b>
					<span>{BRAND.tagline}</span>
				</div>
			</div>
			<div>
				<h1>View or edit your application</h1>
				<p>Log in with your Application Number and PIN.</p>
			</div>
		</header>
	{/snippet}

	<form
		method="POST"
		class="sv-fields"
		use:enhance={({ formData }) => {
			busy = true;
			const n = String(formData.get('number') || '').trim().toUpperCase();
			const p = String(formData.get('pin') || '').trim();
			return async ({ result, update }) => {
				// a successful login is remembered on this device so the next visit fills in by itself
				if (result.type === 'redirect') addSaved({ number: n, pin: p });
				await update({ reset: false });
				busy = false;
			};
		}}
	>
		<input type="hidden" name="next" value={next} />
		{#if form?.message}<div class="sv-note err"><Icon name="info" size={18} class="ico" /><span>{form.message}</span></div>{/if}
		<div style="position:relative">
			<label class="label" for="number">Application Number</label>
			<input class="input" style="font-family:ui-monospace,monospace;text-transform:uppercase" id="number" name="number" placeholder="SVIEHT-2025-00483" bind:value={number} onfocus={tapNumber} onclick={tapNumber} autocomplete="off" required />
			{#if picking}
				<div class="sv-list" style="position:absolute;left:0;right:0;z-index:10;margin-top:4px;box-shadow:0 10px 24px rgba(11,37,84,.18)">
					{#each saved as s (s.number)}
						<div class="sv-li" style="cursor:default">
							<button type="button" style="flex:1;min-width:0;text-align:left;background:none;border:0;font:inherit;cursor:pointer" onclick={() => choose(s)}>
								<b style="display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{s.name || s.number}</b>
								<span class="sv-sub" style="font-family:ui-monospace,monospace">{s.number}</span>
							</button>
							<button type="button" class="sv-redtxt" style="background:none;border:0;font-size:12px;cursor:pointer" onclick={() => forget(s.number)}>Forget</button>
						</div>
					{/each}
				</div>
			{/if}
		</div>
		<div>
			<label class="label" for="pin">Access PIN</label>
			<input class="input" style="font-family:ui-monospace,monospace" id="pin" name="pin" type="password" inputmode="numeric" maxlength="6" placeholder="6-digit PIN" bind:value={pin} autocomplete="off" required />
		</div>
		<button class="sv-btn" disabled={busy}>{busy ? 'Checking…' : 'Continue'}{#if !busy}<Icon name="arrow-right" size={16} />{/if}</button>
	</form>

	{#if forms.length}
		<div class="sv-card" style="display:flex;flex-direction:column;gap:10px">
			<b>Submit another application</b>
			<p class="sv-sub">Applying for someone else? Start a new form below.</p>
			{#each forms as [id, title] (id)}
				<a class="sv-btn ghost" href="/register/{id}?new=1" data-sveltekit-reload>{title}</a>
			{/each}
			<button type="button" class="sv-sub" style="background:none;border:0;text-decoration:underline;cursor:pointer;text-align:left" onclick={forgetAll}>Forget saved logins on this device</button>
		</div>
	{/if}

	<p class="sv-sub" style="text-align:center">
		<a href="/home" style="text-decoration:underline">Back to home</a> &nbsp;·&nbsp; <a href="/admin" style="text-decoration:underline">Admin login</a>
	</p>
</Screen>
