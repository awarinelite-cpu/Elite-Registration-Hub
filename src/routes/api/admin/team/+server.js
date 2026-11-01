import { error, json } from '@sveltejs/kit';
import { adminAuth, db } from '$lib/server/firebase.js';
import { requireOwner } from '$lib/server/adminAuth.js';
import { ACCOUNT_TYPES } from '$lib/ihs.js';

// Main admin only: create and manage every other account — sub-admins and IHS DMO accounts.
// There is no public sign-up; this is the only place accounts are created.

/** Finds the account behind a uid: a sub-admin (admins/{uid}, role "sub") or an IHS account (ihsUsers/{uid}). */
async function findAccount(uid) {
	if (!uid) error(400, 'Missing account.');
	const a = await db().collection('admins').doc(uid).get();
	if (a.exists && a.data().role === 'sub') return { kind: 'sub', ref: a.ref };
	const i = await db().collection('ihsUsers').doc(uid).get();
	if (i.exists) return { kind: 'ihs', ref: i.ref };
	error(404, 'Account not found.');
}

export async function GET({ request }) {
	await requireOwner(request);
	const [subSnap, ihsSnap] = await Promise.all([
		db().collection('admins').where('role', '==', 'sub').get(),
		db().collection('ihsUsers').get()
	]);
	const subs = await Promise.all(
		subSnap.docs.map(async (d) => {
			const x = d.data();
			const forms = await db().collection('forms').where('ownerId', '==', d.id).count().get();
			return { uid: d.id, email: x.email || '', name: x.name || '', createdAt: x.createdAt || 0, forms: forms.data().count };
		})
	);
	const ihs = await Promise.all(
		ihsSnap.docs.map(async (d) => {
			const x = d.data();
			const reports = await db().collection('ihsReports').where('ownerId', '==', d.id).count().get();
			return { uid: d.id, email: x.email || '', name: x.name || '', accountType: x.accountType || '', createdAt: x.createdAt || 0, reports: reports.data().count };
		})
	);
	return json({ subs: subs.sort((a, b) => b.createdAt - a.createdAt), ihs: ihs.sort((a, b) => b.createdAt - a.createdAt) });
}

export async function POST({ request }) {
	const owner = await requireOwner(request);
	const b = await request.json().catch(() => ({}));
	const email = String(b.email || '').trim().toLowerCase();
	const name = String(b.name || '').trim().slice(0, 80);
	const password = String(b.password || '');
	// "sub-admin" (default) or one of the account types in ACCOUNT_TYPES (e.g. IHS DMO)
	const accountType = String(b.accountType || 'sub-admin');
	const type = ACCOUNT_TYPES.find((t) => t.key === accountType);
	if (accountType !== 'sub-admin' && !type) error(400, 'Select a valid account type.');
	if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) error(400, 'Enter a valid email.');
	if (password.length < 8) error(400, 'Password must be at least 8 characters.');
	let user;
	try {
		user = await adminAuth().createUser({ email, password, displayName: name || undefined });
	} catch (e) {
		error(400, e?.code === 'auth/email-already-exists' ? 'That email already has an account.' : e?.message || 'Could not create account.');
	}
	try {
		const now = Date.now();
		if (type) await db().collection('ihsUsers').doc(user.uid).set({ name, email, accountType: type.key, createdBy: owner.uid, createdAt: now });
		else await db().collection('admins').doc(user.uid).set({ role: 'sub', email, name, createdBy: owner.uid, createdAt: now });
	} catch {
		// never leave a half-made account behind (it could sign in but would have no access)
		try {
			await adminAuth().deleteUser(user.uid);
		} catch {}
		error(500, 'Could not finish creating the account. Please try again.');
	}
	return json({ uid: user.uid });
}

export async function PATCH({ request }) {
	await requireOwner(request);
	const b = await request.json().catch(() => ({}));
	const uid = String(b.uid || '');
	await findAccount(uid);
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
	const { ref } = await findAccount(uid);
	await ref.delete(); // access ends immediately; their forms / saved reports are kept
	try {
		await adminAuth().deleteUser(uid);
	} catch {}
	return json({ ok: true });
}
