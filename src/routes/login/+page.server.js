import { fail, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/firebase.js';
import { checkPin, makeSession, SESSION_COOKIE, SESSION_SECONDS } from '$lib/server/security.js';

const MAX_ATTEMPTS = 5;
const LOCK_MS = 15 * 60 * 1000;
const GENERIC = 'Invalid application number or PIN.';

export const actions = {
	default: async ({ request, cookies }) => {
		const fd = await request.formData();
		const number = String(fd.get('number') || '').trim().toUpperCase();
		const pin = String(fd.get('pin') || '').trim();
		if (!number || !pin || number.includes('/')) return fail(400, { message: GENERIC, number });

		const ref = db().collection('applications').doc(number);
		const snap = await ref.get();
		if (!snap.exists) return fail(400, { message: GENERIC, number });
		const app = snap.data();

		if (app.lockUntil > Date.now()) {
			const mins = Math.ceil((app.lockUntil - Date.now()) / 60000);
			return fail(429, { message: `Too many attempts. Try again in ${mins} minute(s).`, number });
		}
		if (!checkPin(pin, app.pinHash)) {
			const attempts = (app.failedAttempts || 0) + 1;
			await ref.update(attempts >= MAX_ATTEMPTS ? { failedAttempts: 0, lockUntil: Date.now() + LOCK_MS } : { failedAttempts: attempts });
			return fail(400, { message: GENERIC, number });
		}

		await ref.update({ failedAttempts: 0, lockUntil: 0 });
		cookies.set(SESSION_COOKIE, makeSession(number), {
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			secure: true,
			maxAge: SESSION_SECONDS
		});
		redirect(303, '/application');
	}
};
