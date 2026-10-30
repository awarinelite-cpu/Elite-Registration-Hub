<script>
	const FAQ = [
		['How do applicants get their application number and PIN?', 'On submit they receive an application number (e.g. FUOYE-2026-0001) and a 6-digit PIN. The PIN is shown once and stored only as a salted hash, so it cannot be recovered.'],
		['An applicant is locked out. What now?', 'Five wrong PINs lock the application for 15 minutes. Ask them to wait, then try again with the PIN they were given.'],
		['How do I share a form?', 'Open the form from Collections and share its link: /register/<slug>. Applicants need no account.'],
		['How do I change an application status?', 'Open Applications, choose the application, and set its status (submitted, reviewed, approved, rejected, done).'],
		['How do I export applications?', 'Open a form’s applications list and use the CSV export; the file opens directly in Excel.'],
		['What can a sub-admin do?', 'Sub-admins create and manage only their own forms and see only those forms’ applications. Only the main admin can open Team.']
	];
</script>

<svelte:head><title>Support — Elite Registration Hub</title></svelte:head>

<h1 class="mb-1 text-3xl font-extrabold">Support</h1>
<p class="mb-4 text-slate-600">Help and frequently asked questions.</p>
<div class="faq">
	{#each FAQ as [q, a]}
		<details><summary>{q}</summary><p>{a}</p></details>
	{/each}
</div>

<style>
	.faq { overflow: hidden; border-radius: 1rem; background: var(--surface); border: 1px solid var(--edge); box-shadow: var(--card-shadow); }
	details { border-bottom: 1px solid var(--edge); } details:last-child { border-bottom: 0; }
	summary { cursor: pointer; padding: .95rem 1rem; font-weight: 700; color: var(--ink); }
	summary:hover { background: var(--surface-2); }
	details[open] summary { color: #0f4a2b; } :global(html.dark) details[open] summary { color: #e6cd86; }
	p { margin: 0; padding: 0 1rem 1rem; color: var(--sub); line-height: 1.5; }
</style>
