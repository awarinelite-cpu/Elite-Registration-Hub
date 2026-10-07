<script>
	import { enhance } from '$app/forms';
	import FormFields from '$lib/FormFields.svelte';
	import { joinArray } from '$lib/forms.js';
	let { data, form } = $props();
	let busy = $state(false);
	let upBusy = $state(false);
	const fileFields = $derived(data.fields.filter((f) => f.type === 'file' || f.type === 'photo'));
	const colors = { submitted: 'bg-blue-100 text-blue-800', reviewed: 'bg-amber-100 text-amber-800', approved: 'bg-green-100 text-green-800', rejected: 'bg-red-100 text-red-800', done: 'bg-slate-200 text-slate-700' };
</script>

<svelte:head><title>My application — EliteReg</title></svelte:head>

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

	{#if form?.uploaded}<div class="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-800">Documents uploaded.</div>{/if}
	{#if form?.saved}<div class="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-800">Changes saved.</div>{/if}
	{#if form?.message}<div class="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{form.message}</div>{/if}

	{#if data.canEdit}
		<form
			method="POST"
			action="?/update"
			enctype="multipart/form-data"
			class="card space-y-4"
			use:enhance={() => {
				busy = true;
				return async ({ update }) => {
					await update({ reset: false });
					busy = false;
				};
			}}
		>
			<FormFields fields={data.fields} values={form?.values ?? data.values} errors={form?.errors} existingFiles={data.files} />
			<button class="btn w-full" disabled={busy}>{busy ? 'Saving…' : 'Save changes'}</button>
		</form>
	{:else}
		<div class="card">
			<dl class="space-y-3">
				{#each data.fields as f (f.id)}
					<div>
						<dt class="text-xs font-medium text-slate-500">{f.label}</dt>
						<dd class="text-sm">
							{#if data.files[f.id]}📎 {data.files[f.id].name}
							{:else if Array.isArray(data.values[f.id])}{joinArray(data.values[f.id], '; ') || '—'}
							{:else}{data.values[f.id] || '—'}{/if}
						</dd>
					</div>
				{/each}
			</dl>
			<p class="mt-4 text-xs text-slate-500">This application can no longer be edited.</p>
		</div>
	{/if}

	{#if data.canUpload && !data.canEdit}
		<form
			method="POST"
			action="?/uploadDocs"
			enctype="multipart/form-data"
			class="card mt-4 space-y-4"
			use:enhance={() => {
				upBusy = true;
				return async ({ update }) => {
					await update({ reset: true });
					upBusy = false;
				};
			}}
		>
			<h2 class="font-bold">Upload passport photograph &amp; documents</h2>
			<p class="text-xs text-slate-500">Add or replace your softcopy documents. Other details stay as they are.</p>
			<FormFields fields={fileFields} errors={form?.errors} existingFiles={data.files} />
			<button class="btn w-full" disabled={upBusy}>{upBusy ? 'Uploading…' : 'Upload documents'}</button>
		</form>
	{/if}
</main>
