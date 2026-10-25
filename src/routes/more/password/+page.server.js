import { fail, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/firebase.js';
import { checkPin, hashPin, encryptPin, readSession, SESSION_COOKIE } from '$lib/server/security.js';

const MAX_ATTEMPTS = 5;
const LOCK_MS = 15 * 60 * 1000;

export async function load({ parent }) {
	const { me } = await parent();
	if (!me) redirect(303, '/login?next=/more');
	return {};
}

// The applicant's "password" is their 6-digit access PIN.
export const actions = {
	default: async ({ request, cookies }) => {
		const number = readSession(cookies.get(SESSION_COOKIE));
		if (!number) redirect(303, '/login');
		const ref = db().collection('applications').doc(number);
		const snap = await ref.get();
		if (!snap.exists) redirect(303, '/login');
		const app = snap.data();

		const fd = await request.formData();
		const current = String(fd.get('current') || '').trim();
		const next = String(fd.get('next') || '').trim();
		const again = String(fd.get('again') || '').trim();

		if (app.lockUntil > Date.now()) {
			return fail(429, { message: `Too many attempts. Try again in ${Math.ceil((app.lockUntil - Date.now()) / 60000)} minute(s).` });
		}
		if (!/^\d{6}$/.test(next)) return fail(400, { message: 'The new PIN must be exactly 6 digits.' });
		if (next !== again) return fail(400, { message: 'The new PINs do not match.' });
		if (!checkPin(current, app.pinHash)) {
			const attempts = (app.failedAttempts || 0) + 1;
			await ref.update(attempts >= MAX_ATTEMPTS ? { failedAttempts: 0, lockUntil: Date.now() + LOCK_MS } : { failedAttempts: attempts });
			return fail(400, { message: 'Your current PIN is incorrect.' });
		}
		await ref.update({ pinHash: hashPin(next), pinEnc: encryptPin(next), failedAttempts: 0, lockUntil: 0 });
		return { saved: true, number, pin: next };
	}
};
