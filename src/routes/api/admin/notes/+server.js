import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/firebase.js';
import { requireAdmin } from '$lib/server/adminAuth.js';

const MAX_CHARS = 900000;

// Notes belong to the admin who saved them.
export async function GET({ request }) {
	const a = await requireAdmin(request);
	const q = await db().collection('notes').where('ownerId', '==', a.uid).get();
	const notes = q.docs
		.map((d) => {
			const x = d.data();
			return { id: d.id, title: x.title || 'Untitled', createdAt: x.createdAt || 0, updatedAt: x.updatedAt || 0, chars: (x.text || '').length, shared: !!x.shared };
		})
		.sort((p, q2) => q2.updatedAt - p.updatedAt);
	return json({ notes });
}

export async function POST({ request }) {
	const a = await requireAdmin(request);
	const body = await request.json().catch(() => ({}));
	const title = String(body.title || '').trim().slice(0, 150);
	const text = String(body.text || '');
	if (!title) error(400, 'Give the note a title.');
	if (!text.trim()) error(400, 'The note is empty.');
	if (text.length > MAX_CHARS) error(400, 'This note is too long to save in one piece. Split it into two notes.');
	const ref = db().collection('notes').doc();
	await ref.set({ ownerId: a.uid, title, text, createdAt: Date.now(), updatedAt: Date.now() });
	return json({ id: ref.id });
}
