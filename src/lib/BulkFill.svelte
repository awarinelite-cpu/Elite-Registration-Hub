<script>
	import { onMount } from 'svelte';
	import { matchToFields } from '$lib/parseStudent.js';

	// fields: the form's field defs. Renders only for signed-in admins.
	let { fields } = $props();
	let isAdmin = $state(false);
	let text = $state('');
	let result = $state(null);

	onMount(async () => {
		// Cheap gate: only load Firebase on this public page if this browser has been used by an admin.
		try {
			if (!localStorage.getItem('elitereg_admin')) return;
			const [{ onAuthStateChanged }, { doc, getDoc }, { auth, firestore }] = await Promise.all([
				import('firebase/auth'),
				import('firebase/firestore'),
				import('$lib/firebase.js')
			]);
			onAuthStateChanged(auth, async (u) => {
				if (!u) return (isAdmin = false);
				try {
					isAdmin = (await getDoc(doc(firestore, 'admins', u.uid))).exists();
				} catch {
					isAdmin = false;
				}
			});
		} catch {
			isAdmin = false;
		}
	});

	function setValue(field, value) {
		const base = `f_${field.id}`;
		if (field.type === 'radio') {
			for (const r of document.getElementsByName(base)) r.checked = r.value === value;
			return;
		}
		const el = document.getElementById(base);
		if (!el) return;
		el.value = value;
		el.dispatchEvent(new Event('input', { bubbles: true }));
		el.dispatchEvent(new Event('change', { bubbles: true }));
	}

	function fill() {
		const r = matchToFields(fields, text);
		for (const { field, value } of r.filled) setValue(field, value);
		result = { count: r.filled.length, unmatched: r.unmatched, missing: r.missing };
	}

	function clear() {
		text = '';
		result = null;
	}
</script>

{#if isAdmin}
	<div class="card mb-5 space-y-3 border-teal-300 bg-teal-50/50">
		<div class="flex items-center justify-between">
			<h2 class="font-bold text-teal-800">Admin: bulk fill from pasted text</h2>
			<span class="rounded bg-teal-100 px-2 py-0.5 text-xs text-teal-800">Admin only</span>
		</div>
		<p class="text-xs text-slate-600">
			Paste the student's details (one <code>Label: value</code> per line), then tap <strong>Fill form</strong>. Review the fields, add any file uploads, then submit.
		</p>
		<textarea
			class="input font-mono"
			rows="10"
			placeholder={'Surname Name: NUNGSE\nOther Name(s): KITGAK ILIYA\nState: Plateau State\n…'}
			bind:value={text}
		></textarea>
		<div class="flex flex-wrap gap-2">
			<button type="button" class="btn" disabled={!text.trim()} onclick={fill}>Fill form</button>
			<button type="button" class="btn-ghost" onclick={clear}>Clear</button>
		</div>

		{#if result}
			<div class="rounded-lg bg-white p-3 text-sm">
				<p class="font-medium text-green-700">Filled {result.count} field{result.count === 1 ? '' : 's'}.</p>
				{#if result.unmatched.length}
					<p class="mt-1 text-amber-700">Not used: {result.unmatched.join(', ')}</p>
				{/if}
				{#if result.missing.length}
					<p class="mt-1 text-slate-600">Still empty on the form: {result.missing.join(', ')}</p>
				{/if}
			</div>
		{/if}
	</div>
{/if}
