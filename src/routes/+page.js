import { redirect } from '@sveltejs/kit';

// The landing page is for the admin only. Applicants arrive through their form link
// (/register/<slug>) or /login (check my application), so "/" goes straight to the admin gate.
export function load() {
	redirect(307, '/admin');
}
