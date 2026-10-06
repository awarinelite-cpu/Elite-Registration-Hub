import { error } from '@sveltejs/kit';
import { adminAuth, bucket, db } from '$lib/server/firebase.js';

// Streams a stored upload to a signed-in admin. Students' files are never public.
export async function GET({ request, url }) {
	const token = request.headers.get('authorization')?.replace(/^Bearer /, '');
	if (!token) error(401, 'Unauthorized');
	let uid;
	try {
		uid = (await adminAuth().verifyIdToken(token)).uid;
	} catch {
		error(401, 'Unauthorized');
	}
	if (!(await db().collection('admins').doc(uid).get()).exists) error(403, 'Forbidden');

	const path = url.searchParams.get('path') || '';
	if (!path.startsWith('uploads/') || path.includes('..')) error(400, 'Bad path');
	const file = bucket().file(path);
	const [exists] = await file.exists();
	if (!exists) error(404, 'Not found');
	const [buf] = await file.download();
	const [meta] = await file.getMetadata();
	return new Response(buf, {
		headers: { 'content-type': meta.contentType || 'application/octet-stream', 'cache-control': 'private, no-store' }
	});
}
