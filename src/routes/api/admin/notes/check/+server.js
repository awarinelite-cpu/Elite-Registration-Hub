import { json } from '@sveltejs/kit';
import { db } from '$lib/server/firebase.js';
import { requireAdmin } from '$lib/server/adminAuth.js';
import { findDuplicates } from '$lib/server/noteDup.js';

// Before a new note is saved: does it look like a note this admin already has?
export async function POST({ request }) {
	const a = await requireAdmin(request);
	const body = await request.json().catch(() => ({}));
	const q = await db().collection('notes').where('ownerId', '==', a.uid).get();
	const notes = q.docs.map((d) => {
		const x = d.data();
		return { id: d.id, title: x.title || 'Untitled', text: x.text || '', createdAt: x.createdAt || 0 };
	});
	return json({ matches: findDuplicates({ title: String(body.title || ''), text: String(body.text || '') }, notes) });
}
