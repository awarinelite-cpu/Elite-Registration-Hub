<script>
	import { onMount } from 'svelte';
	import { enhance } from '$app/forms';
	import { updateSaved } from '$lib/savedLogins.js';
	import FormFields from '$lib/FormFields.svelte';
	import ApplicationView from '$lib/ApplicationView.svelte';
	import { buildDetailItems } from '$lib/forms.js';
	let { data, form } = $props();

	// if this login was remembered on this device, add the form + name so the home page can list it properly
	onMount(() => updateSaved(data.applicationNumber, { formId: data.formId, title: data.title, name: data.name }));

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
		try {
			window.open(URL.createObjectURL(await fetchFile(file)), '_blank');
		} catch {
			alert('Could not load file.');
		}
	}
	async function downloadFile(file, fieldId) {
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

	{#if form?.saved && !editing}<div class="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-800">Changes saved.</div>{/if}
	{#if form?.message}<div class="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{form.message}</div>{/if}

	{#if editing}
		<form
			method="POST"
			action="?/update"
			enctype="multipart/form-data"
			class="card space-y-4"
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
			<div class="flex items-center justify-between gap-2">
				<h2 class="font-bold">Edit application</h2>
				<button type="button" class="btn-ghost" onclick={() => (editing = false)}>Cancel</button>
			</div>
			<FormFields fields={data.fields} values={form?.values ?? data.values} errors={form?.errors} existingFiles={data.files} />
			<button class="btn w-full" disabled={busy}>{busy ? 'Saving…' : 'Save changes'}</button>
		</form>
	{:else}
		{#if data.canEdit}
			<button class="btn mb-4 w-full" onclick={() => (editing = true)}>✏️ Edit application</button>
		{:else}
			<p class="mb-4 rounded-lg bg-slate-100 p-3 text-sm text-slate-700">
				This application has been marked <strong>done</strong>, so it is locked and can't be edited. Contact the admin if you need a change.
			</p>
		{/if}
		<ApplicationView {items} {openFile} {downloadFile} {downloading} />
	{/if}
</main>
