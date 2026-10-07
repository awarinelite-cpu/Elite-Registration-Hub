import { error, json } from '@sveltejs/kit';
import { db } from '$lib/server/firebase.js';
import { closedReason } from '$lib/forms.js';

// Answer key for Reading mode only. Refused when the quiz is exam-mode-only, a draft, or closed.
export async function GET({ params }) {
	const snap = await db().collection('forms').doc(params.slug).get();
	if (!snap.exists) error(404, 'Form not found');
	const d = snap.data();
	if (d.status === 'draft') error(404, 'Form not found');
	if (d.kind !== 'quiz' || (d.quiz?.modes || 'both') === 'exam') error(403, 'Reading mode is not available for this quiz.');
	if (closedReason(d)) error(403, 'This quiz is not open.');
	const out = {};
	for (const f of d.fields || []) {
		const correct = Array.isArray(f.correct) ? f.correct : f.correct ? [f.correct] : [];
		if (correct.length) out[f.id] = { correct, explanation: f.explanation || '' };
	}
	return json(out, { headers: { 'cache-control': 'no-store' } });
}
