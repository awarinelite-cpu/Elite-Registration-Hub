import { error, json } from '@sveltejs/kit';
import { db } from '$lib/server/firebase.js';
import { requireAdmin } from '$lib/server/adminAuth.js';
import { decryptPin, encryptPin, hashPin, newPin } from '$lib/server/security.js';

// Admin-only. Sub-admins may only touch applications of forms they own (same rule as firestore.rules).
async function load(request, id) {
	const admin = await requireAdmin(request);
	if (!id) error(400, 'Missing application');
	const ref = db().collection('applications').doc(String(id));
	const snap = await ref.get();
	if (!snap.exists) error(404, 'Application not found');
	if (admin.role === 'sub') {
		const f = await db().collection('forms').doc(snap.data().formId).get();
		if (!f.exists || (f.data().ownerId || '') !== admin.uid) error(403, 'Forbidden');
	}
	return { ref, app: snap.data() };
}

/** Show the PIN (null for applications made before PINs were kept: use Reset). */
export async function GET({ request, url }) {
	const { app } = await load(request, url.searchParams.get('id'));
	return json({ pin: decryptPin(app.pinEnc) });
}

/** Reset: issue a new PIN, unlock the application, return the new PIN. */
export async function POST({ request }) {
	const { id } = await request.json().catch(() => ({}));
	const { ref } = await load(request, id);
	const pin = newPin();
	await ref.update({ pinHash: hashPin(pin), pinEnc: encryptPin(pin), failedAttempts: 0, lockUntil: 0 });
	return json({ pin });
}
