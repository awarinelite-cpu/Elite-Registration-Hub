<script>
	import { enhance } from '$app/forms';
	let { form } = $props();
	let busy = $state(false);
</script>

<svelte:head><title>Check application — EliteReg</title></svelte:head>

<main class="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4">
	<div class="mb-4 text-center text-xl font-extrabold text-teal-700">EliteReg</div>
	<form
		method="POST"
		class="card space-y-4"
		use:enhance={() => {
			busy = true;
			return async ({ update }) => {
				await update({ reset: false });
				busy = false;
			};
		}}
	>
		<h1 class="text-lg font-bold">View or edit your application</h1>
		{#if form?.message}<div class="rounded-lg bg-red-50 p-3 text-sm text-red-700">{form.message}</div>{/if}
		<div>
			<label class="label" for="number">Application Number</label>
			<input class="input font-mono uppercase" id="number" name="number" placeholder="FUOYE-2026-0001" value={form?.number ?? ''} required />
		</div>
		<div>
			<label class="label" for="pin">Access PIN</label>
			<input class="input font-mono" id="pin" name="pin" type="password" inputmode="numeric" maxlength="6" placeholder="6-digit PIN" required />
		</div>
		<button class="btn w-full" disabled={busy}>{busy ? 'Checking…' : 'Continue'}</button>
	</form>
</main>
