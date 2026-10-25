import { redirect } from '@sveltejs/kit';
import { openRegistrationForms } from '$lib/server/openForms.js';

// New Application: with a single open form go straight to it, otherwise let the applicant choose.
export async function load() {
	const forms = await openRegistrationForms();
	if (forms.length === 1) redirect(307, `/register/${forms[0].id}?new=1`);
	return { forms };
}
