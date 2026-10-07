import { error, json } from '@sveltejs/kit';
import { adminAuth, db } from '$lib/server/firebase.js';
import { requireOwner } from '$lib/server/adminAuth.js';

// Main admin only: manage sub-admin accounts.
export async function GET({ request }) {
	await requireOwner(request);
	const snap = await db().collection('admins').where('role', '==', 'sub').get();
	const subs = await Promise.all(
		snap.docs.map(async (d) => {
			const x = d.data();
			const forms = await db().collection('forms').where('ownerId', '==', d.id).count().get();
			return { uid: d.id, email: x.email || '', name: x.name || '', createdAt: x.createdAt || 0, forms: forms.data().count };
		})
	);
	return json({ subs: subs.sort((a, b) => b.createdAt - a.createdAt) });
}

export async function POST({ request }) {
	const owner = await requireOwner(request);
	const b = await request.json().catch(() => ({}));
	const email = String(b.email || '').trim().toLowerCase();
	const name = String(b.name || '').trim().slice(0, 80);
	const password = String(b.password || '');
	if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) error(400, 'Enter a valid email.');
	if (password.length < 8) error(400, 'Password must be at least 8 characters.');
	let user;
	try {
		user = await adminAuth().createUser({ email, password, displayName: name || undefined });
	} catch (e) {
		error(400, e?.code === 'auth/email-already-exists' ? 'That email already has an account.' : e?.message || 'Could not create account.');
	}
	await db().collection('admins').doc(user.uid).set({ role: 'sub', email, name, createdBy: owner.uid, createdAt: Date.now() });
	return json({ uid: user.uid });
}

export async function PATCH({ request }) {
	await requireOwner(request);
	const b = await request.json().catch(() => ({}));
	const uid = String(b.uid || '');
	const ref = db().collection('admins').doc(uid);
	const snap = await ref.get();
	if (!snap.exists || snap.data().role !== 'sub') error(404, 'Sub-admin not found.');
	if (typeof b.password === 'string') {
		if (b.password.length < 8) error(400, 'Password must be at least 8 characters.');
		await adminAuth().updateUser(uid, { password: b.password });
	}
	if (typeof b.disabled === 'boolean') await adminAuth().updateUser(uid, { disabled: b.disabled });
	return json({ ok: true });
}

export async function DELETE({ request }) {
	await requireOwner(request);
	const b = await request.json().catch(() => ({}));
	const uid = String(b.uid || '');
	const ref = db().collection('admins').doc(uid);
	const snap = await ref.get();
	if (!snap.exists || snap.data().role !== 'sub') error(404, 'Sub-admin not found.');
	await ref.delete(); // access ends immediately; their forms stay and are visible to the main admin
	try {
		await adminAuth().deleteUser(uid);
	} catch {}
	return json({ ok: true });
}
