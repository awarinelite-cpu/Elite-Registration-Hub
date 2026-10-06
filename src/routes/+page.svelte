<svelte:head><title>EliteReg — Simple. Secure. Smart Registration.</title></svelte:head>

<main class="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-6 py-16 text-center">
	<div class="mb-4 rounded-2xl bg-teal-700 px-4 py-2 text-2xl font-extrabold tracking-tight text-white">EliteReg</div>
	<h1 class="text-3xl font-bold sm:text-4xl">Simple. Secure. Smart Registration.</h1>
	<p class="mt-4 text-slate-600">Create a form, share the link, receive applications, manage applicants and export your data.</p>

	<ol class="mt-8 grid w-full gap-3 text-sm sm:grid-cols-5">
		{#each ['Create Form', 'Share Link', 'Receive Applications', 'Manage Applicants', 'Export Data'] as step, i}
			<li class="card !p-3"><span class="block text-xs text-teal-700">Step {i + 1}</span><span class="font-semibold">{step}</span></li>
		{/each}
	</ol>

	<div class="mt-10 flex flex-wrap justify-center gap-3">
		<a href="/login" class="btn">Check my application</a>
		<a href="/admin" class="btn-ghost">Admin sign in</a>
	</div>
</main>
