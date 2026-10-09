<script>
	import { parseFormText } from '$lib/parseForm.js';
	import { createForm } from '$lib/createForm.js';
	import { FIELD_TYPES, OPTION_TYPES, slugify } from '$lib/forms.js';

	let text = $state('');
	let parsed = $state(null);
	let busy = $state(false);
	let error = $state('');
	let created = $state(null);
	let copied = $state(false);

	function parse() {
		error = '';
		const p = parseFormText(text);
		if (!p.fields.length) return (error = 'No fields found. Put each field on its own line, e.g. "1. Surname:".');
		parsed = p;
	}

	async function create() {
		error = '';
		if (!parsed.title.trim()) return (error = 'Form name is required.');
		const slug = slugify(parsed.slug) || 'registration';
		const prefix = parsed.prefix.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '') || 'REG';
		const noOptions = parsed.fields.find((f) => OPTION_TYPES.includes(f.type) && !(f.options || []).length);
		if (noOptions) return (error = `"${noOptions.label}" is a dropdown/choice field, so it needs options. Type them (separated by commas) under the field.`);
		busy = true;
		try {
			const res = await createForm({ title: parsed.title.trim(), slug, prefix, fields: parsed.fields, softcopy: parsed.softcopy || [] });
			created = { ...res, link: `${location.origin}/register/${res.slug}` };
		} catch (e) {
			error = e.message || 'Could not create the form.';
		}
		busy = false;
	}

	async function copy() {
		await navigator.clipboard.writeText(created.link);
		copied = true;
		setTimeout(() => (copied = false), 1500);
	}

	function reset() {
		text = '';
		parsed = null;
		created = null;
	}
</script>

<div class="mb-4 flex items-center justify-between">
	<h1 class="text-2xl font-bold">Create form from pasted text</h1>
	<a href="/admin" class="btn-ghost">Back</a>
</div>

{#if error}<div class="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>{/if}

{#if created}
	<div class="card space-y-3 text-center">
		<div class="text-4xl">✅</div>
		<h2 class="text-lg font-bold">Form created</h2>
		<p class="text-sm text-slate-600">{parsed.title} · {parsed.fields.length} fields · prefix {created.prefix}</p>
		<code class="block break-all rounded-lg bg-slate-100 p-3 text-sm">{created.link}</code>
		<div class="flex flex-wrap justify-center gap-2">
			<button class="btn" onclick={copy}>{copied ? 'Copied ✓' : 'Copy link'}</button>
			<a class="btn-ghost" href={created.link}>Open form</a>
			<a class="btn-ghost" href="/admin/forms/{created.slug}">Edit in builder</a>
			<a class="btn-ghost" href="/admin/forms/{created.slug}/applications">Applications</a>
			<button class="btn-ghost" onclick={reset}>Create another</button>
		</div>
	</div>
{:else if !parsed}
	<div class="card space-y-3">
		<p class="text-sm text-slate-600">
			Paste your list. First line = form name. Numbered lines become fields; after a line like “SEND SOFTCOPY OF”, numbered lines become file uploads.
		</p>
		<textarea class="input font-mono" rows="16" bind:value={text} placeholder={'FUOYE DETAILS\n1. Surname:\n2. Other Name(s):\n...\n\nSEND SOFTCOPY OF\n1. Passport\n2. SSCE'}></textarea>
		<button class="btn" onclick={parse} disabled={!text.trim()}>Preview form</button>
	</div>
{:else}
	<div class="card mb-4 grid gap-4 sm:grid-cols-3">
		<div class="sm:col-span-3">
			<label class="label" for="pt">Form name</label>
			<input class="input" id="pt" bind:value={parsed.title} />
		</div>
		<div>
			<label class="label" for="ps">Link slug</label>
			<input class="input" id="ps" bind:value={parsed.slug} />
		</div>
		<div>
			<label class="label" for="pp">Number prefix</label>
			<input class="input uppercase" id="pp" bind:value={parsed.prefix} />
		</div>
		<div class="self-end pb-2 text-xs text-slate-500">If taken, a number is added automatically.</div>
	</div>

	<h2 class="mb-2 font-semibold">{parsed.fields.length} fields detected — adjust if needed</h2>
	<div class="space-y-2">
		{#each parsed.fields as f, i (f.id)}
			<div class="card flex flex-wrap items-center gap-2 !p-3">
				<span class="w-6 text-xs text-slate-400">{i + 1}</span>
				<input class="input min-w-0 flex-1" bind:value={f.label} aria-label="Label" />
				<select class="input !w-auto" bind:value={f.type} aria-label="Type">
					{#each FIELD_TYPES as t}<option value={t.value}>{t.label}</option>{/each}
				</select>
				<label class="flex items-center gap-1 text-xs"><input type="checkbox" bind:checked={f.required} class="accent-teal-700" /> Req.</label>
				<button class="btn-danger !px-2 !py-1" onclick={() => parsed.fields.splice(i, 1)} aria-label="Remove">✕</button>
				{#if OPTION_TYPES.includes(f.type)}
					<input
						class="input w-full"
						aria-label="Options"
						placeholder="Options, separated by commas"
						value={(f.options || []).join(', ')}
						oninput={(e) => (f.options = e.currentTarget.value.split(',').map((s) => s.trim()).filter(Boolean))}
					/>
				{/if}
			</div>
		{/each}
	</div>
	<p class="mt-2 text-xs text-slate-500">Dropdown/radio/checkbox fields need options: type them, separated by commas, in the box under the field.</p>
	<div class="mt-4 flex gap-2">
		<button class="btn" onclick={create} disabled={busy || !parsed.fields.length}>{busy ? 'Creating…' : 'Create form & get link'}</button>
		<button class="btn-ghost" onclick={() => (parsed = null)}>Back to text</button>
	</div>
{/if}
