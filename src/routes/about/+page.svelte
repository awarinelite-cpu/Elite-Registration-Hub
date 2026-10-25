<script>
	import Screen from '$lib/ui/Screen.svelte';
	import { BRAND } from '$lib/brand.js';
</script>

<svelte:head><title>About Us — {BRAND.name}</title></svelte:head>

<Screen title="About Us" back="/more" nav="more">
	<div class="sv-prose">
		<p><b>{BRAND.name}</b> is the simple, secure and reliable way to complete your {BRAND.school} online registration from your phone.</p>
		<p>Fill in your details step by step, upload your documents, submit, and track your application with the Application Number and PIN you receive.</p>
		<p>{BRAND.motto}.</p>
	</div>
</Screen>
