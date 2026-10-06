<script>
	import { enhance } from '$app/forms';
	import FormFields from '$lib/FormFields.svelte';
	let { data, form } = $props();
	let busy = $state(false);
	let copied = $state(false);

	async function copy(text) {
		await navigator.clipboard?.writeText(text);
		copied = true;
		setTimeout(() => (copied = false), 1500);
	}
</script>

<svelte:head><title>{data.form.title} — EliteReg</title></svelte:head>

<main class="mx-auto max-w-2xl px-4 py-8">
	{#if form?.success}
		<div class="card text-center">
			<div class="mb-2 text-4xl">✅</div>
			<h1 class="text-xl font-bold">Application submitted</h1>
			<p class="mt-1 text-sm text-slate-600">{form.title}</p>

			<div class="mt-5 grid gap-3 text-left sm:grid-cols-2">
				<div class="rounded-lg bg-slate-100 p-3">
					<div class="text-xs text-slate-500">Application Number</div>
					<div class="font-mono text-lg font-bold">{form.applicationNumber}</div>
				</div>
				<div class="rounded-lg bg-slate-100 p-3">
					<div class="text-xs text-slate-500">Access PIN</div>
					<div class="font-mono text-lg font-bold">{form.pin}</div>
				</div>
			</div>
			<p class="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
				Save both now — the PIN is shown only once and cannot be recovered. You need them to view or edit your application.
			</p>
			<div class="mt-4 flex flex-wrap justify-center gap-2">
				<button class="btn-ghost" onclick={() => copy(`Application Number: ${form.applicationNumber}\nAccess PIN: ${form.pin}`)}>
					{copied ? 'Copied ✓' : 'Copy details'}
				</button>
				<button class="btn-ghost" onclick={() => window.print()}>Print</button>
				<a class="btn" href="/login">Go to login</a>
			</div>
		</div>
	{:else}
		<header class="mb-5">
			<h1 class="text-2xl font-bold">{data.form.title}</h1>
			{#if data.form.description}<p class="mt-1 text-slate-600">{data.form.description}</p>{/if}
		</header>

		{#if data.closed}
			<div class="card border-amber-300 bg-amber-50 text-amber-900">{data.closed}</div>
		{:else}
			<form
				method="POST"
				enctype="multipart/form-data"
				class="card space-y-4"
				use:enhance={() => {
					busy = true;
					return async ({ update }) => {
						await update({ reset: false });
						busy = false;
						window.scrollTo({ top: 0, behavior: 'smooth' });
					};
				}}
			>
				{#if form?.message}<div class="rounded-lg bg-red-50 p-3 text-sm text-red-700">{form.message}</div>{/if}
				<FormFields fields={data.form.fields} values={form?.values} errors={form?.errors} />
				<button class="btn w-full" disabled={busy}>{busy ? 'Submitting…' : 'SUBMIT APPLICATION'}</button>
			</form>
		{/if}

		<p class="mt-4 text-center text-sm text-slate-500">Already applied? <a href="/login" class="text-teal-700 underline">Check your application</a></p>
	{/if}
</main>
