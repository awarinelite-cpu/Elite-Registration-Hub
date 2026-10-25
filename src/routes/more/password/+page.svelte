<script>
	import { enhance } from '$app/forms';
	import Screen from '$lib/ui/Screen.svelte';
	import Icon from '$lib/ui/Icon.svelte';
	import { BRAND } from '$lib/brand.js';
	import { updateSaved } from '$lib/savedLogins.js';
	let { form } = $props();
	let busy = $state(false);
</script>

<svelte:head><title>Change Password — {BRAND.name}</title></svelte:head>

<Screen title="Change Password" back="/more" nav="more">
	<form
		method="POST"
		class="sv-fields"
		use:enhance={() => {
			busy = true;
			return async ({ result, update }) => {
				// keep the remembered login on this device in step with the new PIN
				if (result.type === 'success' && result.data?.saved) updateSaved(result.data.number, { pin: result.data.pin });
				await update();
				busy = false;
			};
		}}
	>
		{#if form?.saved}<div class="sv-note info" style="background:var(--green-soft);color:#14633f"><Icon name="check" size={18} class="ico" /><span>Your PIN has been changed.</span></div>{/if}
		{#if form?.message}<div class="sv-note err"><Icon name="info" size={18} class="ico" /><span>{form.message}</span></div>{/if}
		<div>
			<label class="label" for="current">Current PIN</label>
			<input class="input" id="current" name="current" type="password" inputmode="numeric" maxlength="6" autocomplete="off" required />
		</div>
		<div>
			<label class="label" for="next">New PIN</label>
			<input class="input" id="next" name="next" type="password" inputmode="numeric" maxlength="6" placeholder="6 digits" autocomplete="off" required />
		</div>
		<div>
			<label class="label" for="again">Confirm new PIN</label>
			<input class="input" id="again" name="again" type="password" inputmode="numeric" maxlength="6" autocomplete="off" required />
		</div>
		<button class="sv-btn" disabled={busy}>{busy ? 'Saving…' : 'Change PIN'}</button>
	</form>
</Screen>
