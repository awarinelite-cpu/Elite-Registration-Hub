import { json } from '@sveltejs/kit';
import { db } from '$lib/server/firebase.js';
import { requireAdmin } from '$lib/server/adminAuth.js';

// Slug / prefix uniqueness across ALL forms, without letting a sub-admin read other people's forms.
export async function GET({ request, url }) {
	await requireAdmin(request);
	const slug = url.searchParams.get('slug') || '';
	const prefix = url.searchParams.get('prefix') || '';
	const exceptId = url.searchParams.get('exceptId') || '';
	let slugTaken = false;
	let prefixTaken = false;
	if (slug) slugTaken = slug !== exceptId && (await db().collection('forms').doc(slug).get()).exists;
	if (prefix) {
		const q = await db().collection('forms').where('prefix', '==', prefix).get();
		prefixTaken = q.docs.some((d) => d.id !== exceptId);
	}
	return json({ slugTaken, prefixTaken });
}
