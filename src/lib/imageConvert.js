// Browser-side image converter for student uploads.
// PNG/WebP/HEIC/etc -> JPEG, large images resized + compressed under the size limit.
// PDFs are returned untouched. Server-side limits stay as the safety net.
import { MAX_FILE_BYTES } from '$lib/forms.js';

const TARGET = Math.floor(MAX_FILE_BYTES * 0.92); // aim a little under the limit
const MAX_SIDE = 2000;
const MIN_SIDE = 500;

const kb = (n) => (n >= 1048576 ? (n / 1048576).toFixed(2) + ' MB' : Math.round(n / 1024) + ' KB');

async function decode(file) {
	if (typeof createImageBitmap === 'function') {
		try {
			return await createImageBitmap(file, { imageOrientation: 'from-image' });
		} catch {}
	}
	// fallback for browsers without createImageBitmap options
	return await new Promise((resolve, reject) => {
		const url = URL.createObjectURL(file);
		const img = new Image();
		img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
		img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('decode')); };
		img.src = url;
	});
}

const toJpeg = (canvas, q) => new Promise((res) => canvas.toBlob(res, 'image/jpeg', q));

/**
 * @param {File} file
 * @returns {Promise<{file: File, note: string, ok: boolean}>}
 */
export async function prepareUpload(file) {
	const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
	if (isPdf) {
		return file.size > MAX_FILE_BYTES
			? { file, ok: false, note: `PDF is ${kb(file.size)}. Max is 1.5 MB. Compress it or use a photo instead.` }
			: { file, ok: true, note: '' };
	}

	const isJpeg = file.type === 'image/jpeg';
	if (isJpeg && file.size <= MAX_FILE_BYTES) return { file, ok: true, note: '' };

	let src;
	try {
		src = await decode(file);
	} catch {
		return { file, ok: false, note: 'This image format cannot be read on this device. Please pick a JPG or PNG.' };
	}

	const w0 = src.width || src.naturalWidth;
	const h0 = src.height || src.naturalHeight;
	let scale = Math.min(1, MAX_SIDE / Math.max(w0, h0));
	let blob = null;

	for (let round = 0; round < 8; round++) {
		const w = Math.max(1, Math.round(w0 * scale));
		const h = Math.max(1, Math.round(h0 * scale));
		const canvas = document.createElement('canvas');
		canvas.width = w;
		canvas.height = h;
		const ctx = canvas.getContext('2d');
		ctx.fillStyle = '#fff'; // PNG/WebP transparency -> white
		ctx.fillRect(0, 0, w, h);
		ctx.drawImage(src, 0, 0, w, h);
		for (const q of [0.88, 0.8, 0.7, 0.6, 0.5]) {
			blob = await toJpeg(canvas, q);
			if (blob && blob.size <= TARGET) break;
		}
		if (blob && blob.size <= TARGET) break;
		if (Math.max(w, h) <= MIN_SIDE) break;
		scale *= 0.8;
	}
	if (src.close) src.close();

	if (!blob) return { file, ok: false, note: 'Could not convert this image. Please pick another.' };
	if (blob.size > MAX_FILE_BYTES) return { file, ok: false, note: 'Image is still too large after compressing. Please pick a smaller one.' };

	const name = file.name.replace(/\.[^.]+$/, '') + '.jpg';
	const out = new File([blob], name, { type: 'image/jpeg', lastModified: Date.now() });
	return { file: out, ok: true, note: `Converted to JPG (${kb(file.size)} → ${kb(out.size)}).` };
}
