import { error } from '@sveltejs/kit';
import { bucket, db } from '$lib/server/firebase.js';
import { requireAdmin } from '$lib/server/adminAuth.js';

// Streams a stored upload to a signed-in admin. Students' files are never public.
export async function GET({ request, url }) {
	const admin = await requireAdmin(request);

	const path = url.searchParams.get('path') || '';
	if (!path.startsWith('uploads/') || path.includes('..')) error(400, 'Bad path');
	// sub-admins may only open files that belong to their own forms (uploads/<formId>/...)
	if (admin.role === 'sub') {
		const fid = path.split('/')[1] || '';
		const f = fid ? await db().collection('forms').doc(fid).get() : null;
		if (!f?.exists || f.data().ownerId !== admin.uid) error(403, 'Forbidden');
	}
	const file = bucket().file(path);
	const [exists] = await file.exists();
	if (!exists) error(404, 'Not found');
	const [buf] = await file.download();
	const [meta] = await file.getMetadata();
	return new Response(buf, {
		headers: { 'content-type': meta.contentType || 'application/octet-stream', 'cache-control': 'private, no-store' }
	});
}
