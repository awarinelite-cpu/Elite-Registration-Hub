<script>
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { doc, getDoc, deleteDoc } from 'firebase/firestore';
	import { firestore } from '$lib/firebase.js';
	import { ihs } from '$lib/ihsSession.svelte.js';
	import { REPORT_TITLE, SITE_FIELD, SHEET_FIELDS, showValue } from '$lib/ihs.js';
	import { copyText } from '$lib/copyText.js';

	const id = page.params.id;
	let status = $state('loading'); // loading | ok | missing
	let report = $state(null);
	let copied = $state('');
	let busy = $state(false);

	onMount(async () => {
		try {
			const snap = await getDoc(doc(firestore, 'ihsReports', id));
			if (snap.exists() && snap.data().ownerId === ihs.uid) {
				report = snap.data();
				status = 'ok';
			} else status = 'missing';
		} catch {
			status = 'missing';
		}
	});

	// Name of Site sits big above the list; the numbered sheet below starts at 1 (DATE)
	const siteText = $derived(report ? showValue(SITE_FIELD, report[SITE_FIELD.key]) : '');
	// one row per sheet item: S/N, Item, Details (+ copy icon for the details)
	const rows = $derived(SHEET_FIELDS.map((f, i) => ({ f, sn: i + 1, text: report ? showValue(f, report[f.key]) : '' })));

	async function copy(key, text) {
		await copyText(text);
		copied = key;
		setTimeout(() => copied === key && (copied = ''), 1300);
	}

	async function remove() {
		if (!confirm('Delete this report? This cannot be undone.')) return;
		busy = true;
		try {
			await deleteDoc(doc(firestore, 'ihsReports', id));
			await goto('/ihs');
		} catch {
			busy = false;
			alert('Could not delete. Check your connection and try again.');
		}
	}

	const saved = $derived(report?.updatedAt ? new Date(report.updatedAt).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' }) : '');
</script>

<svelte:head><title>Report — IHS DMO</title></svelte:head>

{#snippet copyBtn(key, label, text)}
	<button type="button" class="cp" class:done={copied === key} aria-label="Copy {label}" title="Copy {label}" onclick={() => copy(key, text)}>
		{#if copied === key}
			<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
		{:else}
			<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V6a2 2 0 0 1 2-2h8" /></svg>
		{/if}
	</button>
{/snippet}

<a href="/ihs" class="text-sm font-semibold text-teal-800 underline">← All reports</a>

{#if status === 'loading'}
	<div class="py-10 text-center text-slate-500">Loading…</div>
{:else if status === 'missing'}
	<div class="card mt-3 text-center text-slate-600">Report not found.</div>
{:else}
	<div class="mt-1 mb-3 flex flex-wrap items-start justify-between gap-2">
		<div>
			<h1 class="text-xl font-extrabold">{REPORT_TITLE}</h1>
			{#if saved}<p class="text-xs text-slate-500">Saved {saved}</p>{/if}
		</div>
		<div class="flex gap-2">
			<a class="btn-ghost" href="/ihs/{id}/edit">Edit</a>
			<button class="btn-danger" onclick={remove} disabled={busy}>Delete</button>
		</div>
	</div>

	<!-- Name of Site: bigger than everything else, not numbered, above the list -->
	<div class="card site mb-3">
		<div class="site-label">{SITE_FIELD.label}</div>
		<div class="cell">
			<span class="site-name" class:empty={!siteText}>{siteText || '—'}</span>
			{#if siteText}{@render copyBtn(SITE_FIELD.key, SITE_FIELD.label, siteText)}{/if}
		</div>
	</div>

	<p class="mb-2 text-sm text-slate-600">Tap the copy icon beside any value to copy it, then paste it into the IHS site.</p>

	<div class="card !p-0 overflow-hidden">
		<table class="sheet">
			<thead>
				<tr><th class="sn">S/N</th><th>Item</th><th>Details</th></tr>
			</thead>
			<tbody>
				{#each rows as r (r.f.key)}
					<tr>
						<td class="sn">{r.sn}</td>
						<td class="item">{r.f.label}</td>
						<td>
							<div class="cell">
								<span class="val" class:empty={!r.text}>{r.text || '—'}</span>
								{#if r.text}{@render copyBtn(r.f.key, r.f.label, r.text)}{/if}
							</div>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
	<div class="sr-only" aria-live="polite">{copied ? 'Copied' : ''}</div>
{/if}

<style>
	.site { padding: 1rem 1.1rem; border-left: 5px solid var(--gold); }
	.site-label { font-size: .75rem; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: var(--sub); }
	.site-name { min-width: 0; overflow-wrap: anywhere; font-size: 1.75rem; line-height: 1.15; font-weight: 800; color: var(--ink); }
	.site-name.empty { color: var(--sub); font-weight: 400; }
	.sheet { width: 100%; border-collapse: collapse; font-size: .95rem; }
	.sheet th { text-align: left; padding: .7rem .8rem; background: var(--surface-2); color: var(--sub); font-size: .75rem; letter-spacing: .06em; text-transform: uppercase; }
	.sheet td { padding: .5rem .8rem; border-top: 1px solid var(--edge); vertical-align: middle; }
	.sn { width: 3rem; color: var(--sub); }
	.item { font-weight: 600; width: 40%; }
	.cell { display: flex; align-items: center; justify-content: space-between; gap: .5rem; }
	.val { min-width: 0; overflow-wrap: anywhere; font-weight: 600; }
	.val.empty { color: var(--sub); font-weight: 400; }
	.cp { flex: none; display: grid; place-items: center; width: 2.4rem; height: 2.4rem; border-radius: .7rem; border: 1px solid var(--edge); background: var(--surface); color: var(--sub); cursor: pointer; }
	.cp:hover { color: var(--accent); border-color: var(--accent); }
	.cp.done { color: #16a34a; border-color: #16a34a; background: color-mix(in srgb, #16a34a 10%, var(--surface)); }
</style>
