<script>
	import { page } from '$app/state';
</script>

<main class="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 text-center">
	<div class="text-5xl font-bold text-slate-300">{page.status}</div>
	<p class="mt-3 break-words text-slate-700">{page.error?.message}</p>
</main>
