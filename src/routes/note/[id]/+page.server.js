import { error } from '@sveltejs/kit';
import { db } from '$lib/server/firebase.js';

// Public read-only note: only visible while the owner has switched sharing on.
export async function load({ params, setHeaders }) {
	const snap = await db().collection('notes').doc(params.id).get();
	const d = snap.exists ? snap.data() : null;
	if (!d || !d.shared) error(404, 'Note not found');
	setHeaders({ 'x-robots-tag': 'noindex' });
	return { title: d.title || 'Untitled', text: d.text || '' };
}
