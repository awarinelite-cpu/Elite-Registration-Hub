<script>
	import { onMount } from 'svelte';
	import { enhance } from '$app/forms';
	import { updateSaved } from '$lib/savedLogins.js';
	import FormFields from '$lib/FormFields.svelte';
	import ApplicationView from '$lib/ApplicationView.svelte';
	import RetryQuiz from '$lib/RetryQuiz.svelte';
	import TopicBreakdown from '$lib/TopicBreakdown.svelte';
	import { buildDetailItems } from '$lib/forms.js';
	import { downloadUrl } from '$lib/cloudinary.js';
	import { page } from '$app/state';
	import Screen from '$lib/ui/Screen.svelte';
	import Icon from '$lib/ui/Icon.svelte';
	import ThemeToggle from '$lib/ThemeToggle.svelte';
	import { applicationSections } from '$lib/sections.js';
	import { fmtDate, statusView } from '$lib/status.js';
	import { copyText } from '$lib/copy.js';
	import { BRAND } from '$lib/brand.js';
	let { data, form } = $props();

	// if this login was remembered on this device, add the form + name so the home page can list it properly
	onMount(() => {
		updateSaved(data.applicationNumber, { formId: data.formId, title: data.title, name: data.name });
		// "Edit Form" on the home screen opens straight into edit mode
		if (page.url.searchParams.get('edit') === '1' && data.canEdit) editing = true;
	});

	let editing = $state(false);
	let busy = $state(false);
	let downloading = $state('');
	const items = $derived(buildDetailItems(data.fields, data.data));
	const colors = { submitted: 'bg-blue-100 text-blue-800', reviewed: 'bg-amber-100 text-amber-800', approved: 'bg-green-100 text-green-800', rejected: 'bg-red-100 text-red-800', done: 'bg-slate-200 text-slate-700' };

	async function fetchFile(file) {
		const res = await fetch(`/api/file?path=${encodeURIComponent(file.path)}`);
		if (!res.ok) throw new Error('failed');
		return res.blob();
	}
	async function openFile(file) {
		if (file.url) return void window.open(file.url, '_blank', 'noopener');
		try {
			window.open(URL.createObjectURL(await fetchFile(file)), '_blank');
		} catch {
			alert('Could not load file.');
		}
	}
	async function downloadFile(file, fieldId) {
		if (file.url) return void window.open(downloadUrl(file.url, `${data.applicationNumber}_${file.name}`), '_self');
		downloading = fieldId;
		try {
			const url = URL.createObjectURL(await fetchFile(file));
			const a = document.createElement('a');
			a.href = url;
			a.download = `${data.applicationNumber}_${file.name}`;
			document.body.appendChild(a);
			a.click();
			a.remove();
			setTimeout(() => URL.revokeObjectURL(url), 10000);
		} catch {
			alert('Could not download file.');
		} finally {
			downloading = '';
		}
	}

	const isReg = data.kind === 'registration';
	const sections = $derived(applicationSections(data.fields, data.data));
	const view = $derived(statusView(data.status));
	let open = $state('');
	let copied = $state(false);
	async function copyNumber() {
		await copyText(data.applicationNumber);
		copied = true;
		setTimeout(() => (copied = false), 1200);
	}
	const isFile = (v) => v && typeof v === 'object' && !Array.isArray(v);
</script>

<svelte:head><title>My Application — {BRAND.name}</title></svelte:head>

{#if isReg && editing}
	<Screen title="Edit Application" onback={() => (editing = false)}>
		<form
			id="editform"
			method="POST"
			action="?/update"
			enctype="multipart/form-data"
			class="sv-fields"
			use:enhance={() => {
				busy = true;
				return async ({ result, update }) => {
					await update({ reset: false });
					busy = false;
					if (result.type === 'success') editing = false;
					window.scrollTo({ top: 0, behavior: 'smooth' });
				};
			}}
		>
			{#if form?.message}<div class="sv-note err"><Icon name="info" size={18} class="ico" /><span>{form.message}</span></div>{/if}
			<FormFields fields={data.fields} values={form?.values ?? data.values} errors={form?.errors} existingFiles={data.files} />
		</form>
		{#snippet footer()}
			<button type="button" class="sv-btn ghost" onclick={() => (editing = false)}>Cancel</button>
			<button class="sv-btn" form="editform" disabled={busy}>{busy ? 'Saving…' : 'Save changes'}</button>
		{/snippet}
	</Screen>
{:else if isReg}
	<Screen title="My Application" back="/home">
		<section class="sv-appcard">
			<small>Application Number</small>
			<div class="num">
				<b>{data.applicationNumber}</b>
				<button type="button" class="sv-copy" aria-label="Copy application number" onclick={copyNumber}><Icon name={copied ? 'check' : 'copy'} size={17} /></button>
			</div>
			<div class="sv-sub" style="margin-bottom:8px">Submitted on: {fmtDate(data.submittedAt)}</div>
			<span class="sv-badge {view.tone === 'green' ? '' : view.tone}">{view.label}</span>
		</section>

		{#if form?.saved}<div class="sv-note info" style="background:var(--green-soft);color:#14633f"><Icon name="check" size={18} class="ico" /><span>Changes saved.</span></div>{/if}
		{#if form?.message}<div class="sv-note err"><Icon name="info" size={18} class="ico" /><span>{form.message}</span></div>{/if}
		{#if !data.canEdit}<div class="sv-note info"><Icon name="lock" size={18} class="ico" /><span>This application is marked <b>done</b>, so it is locked. Contact the admin if you need a change.</span></div>{/if}

		{#each sections as sec (sec.key)}
			<section class="sv-sec" class:open={open === sec.key}>
				<button type="button" aria-expanded={open === sec.key} onclick={() => (open = open === sec.key ? '' : sec.key)}>
					<span class="sv-tile"><Icon name={sec.icon} size={18} /></span>
					<span style="flex:1;min-width:0">
						<b>{sec.title}</b>
						<span class={sec.complete ? 'ok' : 'no'}>{sec.complete ? 'Completed' : 'Incomplete'}</span>
					</span>
					<span class="chev sv-chev"><Icon name="chevron-right" size={18} /></span>
				</button>
				{#if open === sec.key}
					<div class="body">
						{#each sec.items as it (it.id)}
							{@const v = it.v}
							<div class="it">
								<span class="k">{it.label}</span>
								<span class="v">
									{#if isFile(v)}
										<button type="button" onclick={() => openFile(v)}>{v.name}</button>
										<button type="button" aria-label="Download {it.label}" disabled={downloading === it.id} onclick={() => downloadFile(v, it.id)} style="margin-left:8px;text-decoration:none"><Icon name="upload" size={14} class="" /></button>
									{:else}
										{typeof v === 'string' ? v || '—' : it.text || '—'}
										{#if it.parts}{#each it.parts as p}<span class="sub">{p.label}: {p.value}</span>{/each}{/if}
									{/if}
								</span>
							</div>
						{/each}
					</div>
				{/if}
			</section>
		{/each}
		<p class="sv-sub" style="text-align:center">{data.title}</p>
		{#snippet footer()}
			{#if data.canEdit}
				<button class="sv-btn" onclick={() => (editing = true)}>Edit Application</button>
			{:else}
				<a class="sv-btn ghost" href="/status">View status</a>
			{/if}
		{/snippet}
	</Screen>
{:else}
	<div class="flex justify-end px-4 pt-3 print:hidden"><ThemeToggle /></div>
	<main class="mx-auto max-w-2xl px-4 py-8">
		<div class="mb-4 flex items-start justify-between gap-3">
			<div>
				<h1 class="text-xl font-bold">{data.title}</h1>
				<p class="font-mono text-sm text-slate-600">{data.applicationNumber}</p>
			</div>
			<form method="POST" action="?/logout"><button class="btn-ghost">Log out</button></form>
		</div>

		<div class="mb-4 flex flex-wrap items-center gap-2 text-sm">
			<span class="badge {colors[data.status]}">{data.status}</span>
			<span class="text-slate-500">Submitted {new Date(data.submittedAt).toLocaleString()}</span>
		</div>

		{#if data.kind === 'quiz'}
			<a class="btn mb-4 block w-full text-center" href="/register/{data.formId}?new=1" data-sveltekit-reload>🔄 Retake exam</a>
		{/if}

		{#if data.result}
			<div class="mb-4 rounded-xl border p-4 {data.result.passed === false ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}">
				<div class="text-xs font-semibold uppercase tracking-wide text-slate-600">Your score</div>
				<div class="text-3xl font-bold">{data.result.score} / {data.result.total}</div>
				<div class="text-sm text-slate-700">
					{data.result.pct}%{#if data.result.passed === true} — Passed ✅{:else if data.result.passed === false} — Not passed{/if}
					{#if data.result.questions && data.result.answered < data.result.questions}<div class="mt-1 text-sm font-medium text-slate-700">{data.result.questions - data.result.answered} of {data.result.questions} questions not answered</div>{/if}
				</div>
			</div>
		{/if}
		{#if data.review}
			<ul class="qreview mb-4 space-y-2 text-sm">
				{#each data.review as r, i}
					<li class="rounded-lg border p-3 {r.unanswered ? 'border-slate-200' : r.ok ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}">
						<div class="font-semibold">{r.unanswered ? '–' : r.ok ? '✓' : '✗'} {i + 1}. {r.label}</div>
						{#if r.unanswered}<div class="text-slate-600">Not answered</div>{:else}<div class="text-slate-700">Your answer: {r.given}</div>{/if}
						{#if !r.ok}<div class="text-slate-700">Correct answer: {r.answer}</div>{/if}
						{#if r.explanation}<div class="mt-1 text-xs text-slate-600">{r.explanation}</div>{/if}
					</li>
				{/each}
			</ul>
			<TopicBreakdown fields={data.fields} review={data.review} />
			<RetryQuiz formId={data.formId} fields={data.fields} review={data.review} />
		{/if}
		<ApplicationView {items} {openFile} {downloadFile} {downloading} />
	</main>
{/if}
