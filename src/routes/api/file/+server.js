import { error } from '@sveltejs/kit';
import { bucket, db } from '$lib/server/firebase.js';
import { readSession, SESSION_COOKIE } from '$lib/server/security.js';

// Streams one of the logged-in applicant's OWN uploads (passport, SSCE, etc). Never anyone else's.
export async function GET({ cookies, url }) {
	const number = readSession(cookies.get(SESSION_COOKIE));
	if (!number) error(401, 'Unauthorized');
	const snap = await db().collection('applications').doc(number).get();
	if (!snap.exists) error(401, 'Unauthorized');

	const path = url.searchParams.get('path') || '';
	if (!path.startsWith('uploads/') || path.includes('..')) error(400, 'Bad path');
	const owns = Object.values(snap.data().data || {}).some((v) => v && typeof v === 'object' && !Array.isArray(v) && v.path === path);
	if (!owns) error(403, 'Forbidden');

	const file = bucket().file(path);
	const [exists] = await file.exists();
	if (!exists) error(404, 'Not found');
	const [buf] = await file.download();
	const [meta] = await file.getMetadata();
	return new Response(buf, {
		headers: { 'content-type': meta.contentType || 'application/octet-stream', 'cache-control': 'private, no-store' }
	});
}
