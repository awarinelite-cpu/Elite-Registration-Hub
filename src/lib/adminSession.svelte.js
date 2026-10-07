import { collection, getDocs, query, where } from 'firebase/firestore';
import { auth, firestore } from '$lib/firebase.js';

// Set by the admin layout once the signed-in user is confirmed. role: 'owner' (main admin) | 'sub' (sub-admin)
export const session = $state({ role: '', uid: '' });
export const isOwner = () => session.role === 'owner';

/** Forms this user may see: everything for the main admin, only their own for a sub-admin. */
export async function loadForms() {
	const base = collection(firestore, 'forms');
	const snap = await getDocs(session.role === 'sub' ? query(base, where('ownerId', '==', session.uid)) : base);
	return snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
}

/** All applications this user may see (a sub-admin: only those of their own forms, queried form by form). */
export async function loadAllApplications(forms) {
	const apps = collection(firestore, 'applications');
	if (session.role !== 'sub') {
		const snap = await getDocs(apps);
		return snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => (b.submittedAt || 0) - (a.submittedAt || 0));
	}
	const parts = await Promise.all(forms.map((f) => getDocs(query(apps, where('formId', '==', f.id)))));
	return parts.flatMap((s) => s.docs.map((d) => ({ id: d.id, ...d.data() }))).sort((a, b) => (b.submittedAt || 0) - (a.submittedAt || 0));
}

export async function adminFetch(url, opts = {}) {
	const token = await auth.currentUser.getIdToken();
	const res = await fetch(url, { ...opts, headers: { ...(opts.headers || {}), authorization: `Bearer ${token}`, ...(opts.body ? { 'content-type': 'application/json' } : {}) } });
	if (!res.ok) {
		let msg = '';
		try {
			msg = (await res.json()).message;
		} catch {}
		throw new Error(msg || `Request failed (${res.status})`);
	}
	return res.json();
}
