import { error, fail } from '@sveltejs/kit';
import { db } from '$lib/server/firebase.js';
import { collect, storeUploads } from '$lib/server/collect.js';
import { hashPin, newPin } from '$lib/server/security.js';
import { closedReason, migrateFormFields, studentName, isRegistration, publicFields, scoreForm } from '$lib/forms.js';

async function getForm(slug) {
	const snap = await db().collection('forms').doc(slug).get();
	if (!snap.exists) error(404, 'Form not found');
	const { title, description, status, startDate, closingDate, fields, prefix, counter, kind = 'registration', quiz = null } = snap.data();
	return { id: slug, title, description, status, startDate, closingDate, kind, quiz: quiz || {}, fields: migrateFormFields(fields, { uploads: isRegistration({ kind }) }), prefix, counter };
}

export async function load({ params }) {
	const form = await getForm(params.slug);
	if (form.status === 'draft') error(404, 'Form not found');
	return {
		form: { id: form.id, title: form.title, description: form.description, kind: form.kind, timeLimit: form.kind === 'quiz' ? Number(form.quiz.timeLimit) || 0 : 0, modes: form.kind === 'quiz' ? form.quiz.modes || 'both' : 'exam', fields: publicFields(form.fields) },
		closed: closedReason(form)
	};
}

export const actions = {
	default: async ({ request, params }) => {
		const form = await getForm(params.slug);
		const reason = closedReason(form);
		if (reason) return fail(403, { message: reason, errors: {}, values: {} });

		const fd = await request.formData();
		// when a quiz timer runs out the answers given so far are submitted, so required questions can't block it
		// quiz questions are never required: anyone can submit an unfinished exam (unanswered ones score 0 and are flagged)
		const lenient = form.kind === 'quiz' ? form.fields.map((f) => (f.correct && (!Array.isArray(f.correct) || f.correct.length) ? { ...f, required: false } : f)) : form.fields;
		const timedOut = form.kind === 'quiz' && fd.get('_timeup') === '1';
		const { values, errors, uploads } = collect(timedOut ? lenient.map((f) => ({ ...f, required: false })) : lenient, fd);
		const modes = form.quiz?.modes || 'both';
		const mode = modes === 'reading' ? 'reading' : modes === 'exam' ? 'exam' : fd.get('_mode') === 'reading' ? 'reading' : 'exam';
		if (Object.keys(errors).length) {
			// echo back non-file values so the student doesn't retype
			return fail(400, { message: errors._form || 'Please correct the highlighted fields.', errors, values });
		}

		const files = await storeUploads(form.id, uploads);
		const scored = form.kind === 'quiz' ? scoreForm(form.fields, values, form.quiz) : null;
		const result = scored ? { score: scored.score, total: scored.total, pct: scored.pct, passed: scored.passed, answered: scored.answered, questions: scored.questions } : null;
		const pin = newPin();
		const pinHash = hashPin(pin);
		const formRef = db().collection('forms').doc(form.id);

		const applicationNumber = await db().runTransaction(async (t) => {
			const snap = await t.get(formRef);
			const next = (snap.data().counter || 0) + 1;
			const num = `${snap.data().prefix}-${String(next).padStart(4, '0')}`;
			const appRef = db().collection('applications').doc(num);
			if ((await t.get(appRef)).exists) throw new Error('Application number collision');
			t.update(formRef, { counter: next });
			t.set(appRef, {
				formId: form.id,
				applicationNumber: num,
				pinHash,
				status: 'submitted',
				submittedAt: Date.now(),
				updatedAt: Date.now(),
				failedAttempts: 0,
				lockUntil: 0,
				...(result ? { result, mode } : {}),
				data: { ...values, ...files }
			});
			return num;
		});

		// PIN is shown exactly once and never stored in plain text.
		const show = form.quiz?.showResult || 'answers';
		return {
			success: true,
			applicationNumber,
			pin,
			title: form.title,
			kind: form.kind,
			name: studentName(form, { data: values }),
			result: result && show !== 'none' ? result : null,
			review: scored && (show === 'answers' || mode === 'reading') ? scored.items.map(({ label, given, answer, ok, unanswered, explanation }) => ({ label, given, answer, ok, unanswered, explanation })) : null
		};
	}
};
