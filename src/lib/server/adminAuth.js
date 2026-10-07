import { error } from '@sveltejs/kit';
import { adminAuth, db } from '$lib/server/firebase.js';

/** Verifies the Firebase ID token and returns { uid, role: 'owner' | 'sub', data }. Throws 401/403. */
export async function requireAdmin(request) {
	const token = request.headers.get('authorization')?.replace(/^Bearer /, '');
	if (!token) error(401, 'Unauthorized');
	let uid;
	try {
		uid = (await adminAuth().verifyIdToken(token)).uid;
	} catch {
		error(401, 'Unauthorized');
	}
	const snap = await db().collection('admins').doc(uid).get();
	if (!snap.exists) error(403, 'Forbidden');
	const data = snap.data() || {};
	return { uid, role: data.role === 'sub' ? 'sub' : 'owner', data };
}

export async function requireOwner(request) {
	const a = await requireAdmin(request);
	if (a.role !== 'owner') error(403, 'Only the main admin can do this');
	return a;
}
