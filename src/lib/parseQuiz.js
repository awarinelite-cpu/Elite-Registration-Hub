import { newFieldId, slugify } from '$lib/forms.js';

// Turns pasted MCQs into quiz fields. Understands:
//   1. Question?            (also "1)", "Q1.", "Q1:" or no numbers at all, separated by blank lines)
//   A. option               (also "A)", "(a)", "a:")
//   Answer: B               (also "Ans:", "Key:", "Correct answer:", "Answer: A, C" for several, or the option text)
//   *B. option / B. option* / "(correct)" / ✓  marks the right option inline
//   Answers: 1.B 2.C 3.A    an answer key block at the end
//   Explanation: ...        ignored
const OPT = /^\*?\s*\(?([A-Ha-h])[\).:\-]\s*(\S.*)$/;
const QSTART = /^(?:q(?:uestion)?\s*)?(\d{1,3})\s*[\).:\-]\s*(\S.*)$/i;
const ANS = /^(?:correct\s+)?(?:answers?|ans|key)\s*[:=\-]\s*(\S.*)$/i;
const KEYHEAD = /^(?:answers?|answer\s*key|key|marking\s*scheme)\s*[:\-]?\s*$/i;
const EXPL = /^(?:explanation|rationale|reason|note|solution)\s*[:\-]/i;
const LETTERS = /^\(?([A-Ha-h](?:\s*(?:,|;|&|\/|and)?\s*[A-Ha-h])*)\)?\s*(?:[.):\-]\s*.*)?$/i;
const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

function letterIdx(s) {
	return [...new Set([...s.toUpperCase().replace(/AND/g, '').matchAll(/[A-H]/g)].map((m) => m[0].charCodeAt(0) - 65))];
}

export function parseQuizText(text) {
	const lines = String(text || '').replace(/\r/g, '').split('\n').map((l) => l.trim());
	const qs = [];
	let cur = null;
	let ignoring = false;
	let title = '';

	// title: a first line that is not itself a question or an option
	const firstIdx = lines.findIndex(Boolean);
	if (firstIdx >= 0) {
		const l = lines[firstIdx];
		const next = lines.slice(firstIdx + 1).find(Boolean) || '';
		if (!QSTART.test(l) && !OPT.test(l) && !ANS.test(l) && (QSTART.test(next) || /^q(uestion)?\s*\d/i.test(next) || !/[?]$/.test(l))) {
			if (QSTART.test(next) || /^q(uestion)?\s*\d/i.test(next)) {
				title = l.replace(/[:\s]+$/, '');
				lines[firstIdx] = '';
			}
		}
	}

	const start = (label) => {
		cur = { label, options: [], correct: [], answered: false };
		qs.push(cur);
		ignoring = false;
	};

	let keyBlock = false;
	const key = {};
	for (const line of lines) {
		if (!line) {
			if (cur?.answered) cur = null;
			ignoring = false;
			continue;
		}
		if (KEYHEAD.test(line)) {
			keyBlock = true;
			cur = null;
			continue;
		}
		if (keyBlock) {
			for (const m of line.matchAll(/(\d{1,3})\s*[\).:\-]?\s*([A-Ha-h](?:\s*[,&\/]\s*[A-Ha-h])*)(?=\s|$|[;,])/g)) key[Number(m[1])] = letterIdx(m[2]);
			continue;
		}
		if (EXPL.test(line)) {
			ignoring = true;
			continue;
		}
		const a = line.match(ANS);
		if (a && /^\d{1,3}\s*[\).:\-]?\s*[A-Ha-h]\b/.test(a[1].trim())) {
			// "Answers: 1.B 2.C" on one line
			keyBlock = true;
			cur = null;
			for (const m of a[1].matchAll(/(\d{1,3})\s*[\).:\-]?\s*([A-Ha-h](?:\s*[,&\/]\s*[A-Ha-h])*)(?=\s|$|[;,])/g)) key[Number(m[1])] = letterIdx(m[2]);
			continue;
		}
		if (a && cur) {
			ignoring = false;
			const v = a[1].trim();
			const byText = cur.options.findIndex((o) => norm(o.text) === norm(v));
			if (byText >= 0) cur.correct = [byText];
			else {
				const m = v.match(LETTERS);
				if (m) cur.correct = letterIdx(m[1]).filter((i) => i < cur.options.length);
			}
			cur.answered = true;
			continue;
		}
		const o = line.match(OPT);
		if (o && cur && !cur.answered) {
			ignoring = false;
			let t = o[2].trim();
			let mark = false;
			if (/^\*/.test(line) || /^\*/.test(t)) mark = true;
			t = t.replace(/^\*\s*/, '');
			if (/(\*|✓|✔|\(correct\)|\[correct\])\s*$/i.test(t)) {
				mark = true;
				t = t.replace(/\s*(\*|✓|✔|\(correct\)|\[correct\])\s*$/i, '');
			}
			cur.options.push({ text: t.trim() });
			if (mark) cur.correct.push(cur.options.length - 1);
			continue;
		}
		if (ignoring) continue;
		const q = line.match(QSTART);
		if (!cur || cur.answered) {
			start(q ? q[2].trim() : line);
			if (q) cur.num = Number(q[1]);
			continue;
		}
		if (q && cur.options.length) {
			start(q[2].trim());
			cur.num = Number(q[1]);
			continue;
		}
		// continuation: more question text, or a wrapped option
		if (cur.options.length) cur.options[cur.options.length - 1].text += ' ' + line;
		else cur.label += ' ' + (q ? q[0] : line);
	}

	// apply a trailing answer key, if any
	qs.forEach((q, i) => {
		const k = key[q.num ?? i + 1];
		if (k && !q.correct.length) q.correct = k.filter((x) => x < q.options.length);
	});

	const good = qs.filter((q) => q.options.length >= 2);
	const dropped = qs.length - good.length;
	const fields = good.map((q) => {
		const options = q.options.map((o) => o.text);
		const correct = [...new Set(q.correct)].filter((i) => i < options.length).map((i) => options[i]);
		return {
			id: newFieldId(),
			type: correct.length > 1 ? 'checkbox' : 'radio',
			label: q.label.replace(/\s+/g, ' ').trim(),
			required: true,
			placeholder: '',
			options,
			correct: correct.length > 1 ? correct : correct[0] || '',
			points: 1
		};
	});
	return { title, slug: slugify(title || 'quiz') || 'quiz', prefix: (slugify(title || 'quiz') || 'quiz').toUpperCase().slice(0, 24), fields, dropped };
}
