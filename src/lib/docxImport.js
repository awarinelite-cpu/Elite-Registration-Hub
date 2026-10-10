// Reads a Word (.docx) file in the browser and turns it into the plain text that parseNotes() understands:
// Heading 1 becomes an all-caps line (a unit heading), other headings and short bold lines stand on their own line,
// bullets become "• item", numbered lists become "1. item", and tables become tab-separated rows.
// Pictures are skipped (notes are text only).

const clean = (s) => s.replace(/[\u00a0\s]+/g, ' ').trim();

function inlineText(el) {
	let out = '';
	for (const n of el.childNodes) {
		if (n.nodeType === 3) out += n.nodeValue;
		else if (n.nodeType === 1) {
			const tag = n.tagName.toLowerCase();
			if (tag === 'br') out += ' ';
			else if (tag === 'img' || tag === 'ul' || tag === 'ol' || tag === 'table') continue;
			else out += inlineText(n);
		}
	}
	return out;
}

/** html (from mammoth) -> plain text. Exported so it can be tested without a browser file. */
export function htmlToNoteText(html, Parser = DOMParser) {
	const doc = new Parser().parseFromString(`<body>${html}</body>`, 'text/html');
	const out = [];
	const blank = () => {
		if (out.length && out[out.length - 1] !== '') out.push('');
	};

	function list(el, ordered, depth) {
		let n = 0;
		for (const li of el.children) {
			if (li.tagName.toLowerCase() !== 'li') continue;
			const t = clean(inlineText(li));
			n++;
			if (t) out.push(`${ordered ? `${n}.` : '•'} ${t}`);
			for (const sub of li.children) {
				const st = sub.tagName.toLowerCase();
				if (st === 'ul' || st === 'ol') list(sub, st === 'ol', depth + 1);
			}
		}
	}

	function walk(parent) {
		for (const el of parent.children) {
			const tag = el.tagName.toLowerCase();
			if (/^h[1-6]$/.test(tag)) {
				let t = clean(inlineText(el));
				if (!t) continue;
				const words = t.split(' ').length;
				if (tag === 'h1' && t.length <= 90 && words <= 12) t = t.toUpperCase();
				blank();
				out.push(t);
				blank();
			} else if (tag === 'p') {
				const t = clean(inlineText(el));
				if (t) {
					out.push(t);
					blank();
				}
			} else if (tag === 'ul' || tag === 'ol') {
				blank();
				list(el, tag === 'ol', 0);
				blank();
			} else if (tag === 'table') {
				blank();
				for (const tr of el.querySelectorAll('tr')) {
					const cells = [...tr.children].map((c) => clean(c.textContent));
					if (cells.some(Boolean)) out.push(cells.join('\t'));
				}
				blank();
			} else {
				walk(el);
			}
		}
	}
	walk(doc.body);
	while (out.length && out[out.length - 1] === '') out.pop();
	return out.join('\n');
}

/** file: a .docx File -> plain text for the note box. */
export async function docxToNoteText(file) {
	if (/\.doc$/i.test(file.name) && !/\.docx$/i.test(file.name)) {
		throw new Error('Old .doc files are not supported. In Word choose Save As → Word Document (.docx), then upload that.');
	}
	if (!/\.docx$/i.test(file.name)) throw new Error('Please choose a Word document (.docx).');
	const mammoth = (await import('mammoth/mammoth.browser.js')).default;
	const arrayBuffer = await file.arrayBuffer();
	const { value } = await mammoth.convertToHtml({ arrayBuffer }, { convertImage: mammoth.images.imgElement(async () => ({ src: '' })) });
	const text = htmlToNoteText(value);
	if (!text.trim()) throw new Error('No text was found in that document (it may contain only pictures).');
	return text;
}
