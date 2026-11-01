import { error, json } from '@sveltejs/kit';
import { adminAuth, db } from '$lib/server/firebase.js';
import { ACCOUNT_TYPES } from '$lib/ihs.js';

// Public self-service sign-up. The only thing it can ever create is an account-type profile
// (ihsUsers/{uid}) — never an admin. Access to the IHS screens depends on that server-written record.

// Best-effort throttle (per server instance): 10 sign-ups per IP per hour.
const hits = new Map();
function throttle(ip) {
	const now = Date.now();
	const list = (hits.get(ip) || []).filter((t) => now - t < 3600_000);
	if (list.length >= 10) error(429, 'Too many sign-ups from this connection. Please try again later.');
	list.push(now);
	hits.set(ip, list);
}

export async function POST({ request, getClientAddress }) {
	throttle(getClientAddress());
	const b = await request.json().catch(() => ({}));
	const name = String(b.name || '').trim().slice(0, 80);
	const email = String(b.email || '').trim().toLowerCase();
	const phone = String(b.phone || '').trim().slice(0, 30);
	const password = String(b.password || '');
	const type = ACCOUNT_TYPES.find((t) => t.key === String(b.accountType || ''));

	if (!name) error(400, 'Enter your full name.');
	if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) error(400, 'Enter a valid email address.');
	if (!type) error(400, 'Select an account type.');
	if (password.length < 8) error(400, 'Password must be at least 8 characters.');

	let user;
	try {
		user = await adminAuth().createUser({ email, password, displayName: name });
	} catch (e) {
		error(400, e?.code === 'auth/email-already-exists' ? 'That email already has an account. Sign in instead.' : e?.code === 'auth/invalid-password' ? 'Password must be at least 8 characters.' : 'Could not create the account. Please try again.');
	}
	try {
		await db().collection('ihsUsers').doc(user.uid).set({ name, email, phone, accountType: type.key, createdAt: Date.now() });
	} catch {
		// never leave a half-made account behind (it would sign in but have no access)
		try {
			await adminAuth().deleteUser(user.uid);
		} catch {}
		error(500, 'Could not finish creating the account. Please try again.');
	}
	return json({ ok: true });
}
