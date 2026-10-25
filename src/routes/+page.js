import { redirect } from '@sveltejs/kit';

// Applicants' home page is the login page (application number + PIN).
// The admin signs in directly at /admin.
export function load() {
	redirect(307, '/login');
}
