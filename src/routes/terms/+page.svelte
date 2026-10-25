<script>
	import Screen from '$lib/ui/Screen.svelte';
	import { BRAND } from '$lib/brand.js';
</script>

<svelte:head><title>Terms & Conditions — {BRAND.name}</title></svelte:head>

<Screen title="Terms & Conditions" back="/more" nav="more">
	<div class="sv-prose">
		<p>By submitting an application you confirm that:</p>
		<h3>Accurate information</h3>
		<p>All details and documents you provide are true and belong to you. False information can lead to disqualification.</p>
		<h3>Keep your login safe</h3>
		<p>Your Application Number and PIN give access to your application. Keep them private; you are responsible for activity under them.</p>
		<h3>Deadlines</h3>
		<p>Applications must be completed before the closing date of the form. Closed forms cannot accept new submissions.</p>
	</div>
</Screen>
