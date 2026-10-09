import { json } from '@sveltejs/kit';
import { db } from '$lib/server/firebase.js';

// Temporary diagnostics: reports which setup step fails. Never prints secrets.
export async function GET() {
	const out = {
		has_FIREBASE_SERVICE_ACCOUNT: !!process.env.FIREBASE_SERVICE_ACCOUNT,
		database: '(default)'
	};
	try {
		const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || '');
		out.json_ok = true;
		out.key_project_id = sa.project_id;
		out.has_private_key = !!sa.private_key;
	} catch (e) {
		out.json_ok = false;
		out.json_error = String(e.message).slice(0, 120);
		return json(out);
	}
	try {
		const snap = await db().collection('forms').limit(1).get();
		out.firestore_ok = true;
		out.forms_found = snap.size;
	} catch (e) {
		out.firestore_ok = false;
		out.firestore_error = String(e.message).slice(0, 300);
	}
	return json(out);
}
