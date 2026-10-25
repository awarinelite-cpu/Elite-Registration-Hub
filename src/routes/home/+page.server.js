import { openRegistrationForms } from '$lib/server/openForms.js';

export async function load() {
	return { forms: await openRegistrationForms() };
}
