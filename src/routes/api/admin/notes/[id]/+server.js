import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/firebase.js';
import { requireAdmin } from '$lib/server/adminAuth.js';

const MAX_CHARS = 900000;

async function load(request, id) {
	const a = await requireAdmin(request);
	const ref = db().collection('notes').doc(id);
	const snap = await ref.get();
	if (!snap.exists) error(404, 'Note not found');
	const d = snap.data();
	if (d.ownerId !== a.uid && a.role !== 'owner') error(403, 'Forbidden');
	return { ref, d };
}

export async function GET({ request, params }) {
	const { d } = await load(request, params.id);
	return json({ id: params.id, title: d.title || 'Untitled', text: d.text || '', updatedAt: d.updatedAt || 0 });
}

export async function PUT({ request, params }) {
	const { ref } = await load(request, params.id);
	const body = await request.json().catch(() => ({}));
	const title = String(body.title || '').trim().slice(0, 150);
	const text = String(body.text || '');
	if (!title) error(400, 'Give the note a title.');
	if (!text.trim()) error(400, 'The note is empty.');
	if (text.length > MAX_CHARS) error(400, 'This note is too long to save in one piece. Split it into two notes.');
	await ref.update({ title, text, updatedAt: Date.now() });
	return json({ ok: true });
}

export async function DELETE({ request, params }) {
	const { ref } = await load(request, params.id);
	await ref.delete();
	return json({ ok: true });
}
