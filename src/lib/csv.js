export function toCsv(rows) {
	const esc = (v) => {
		const s = v == null ? '' : String(v);
		return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
	};
	return rows.map((r) => r.map(esc).join(',')).join('\r\n');
}

export function downloadCsv(filename, rows) {
	// BOM so Excel reads UTF-8 correctly
	const blob = new Blob(['\ufeff' + toCsv(rows)], { type: 'text/csv;charset=utf-8' });
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = filename;
	a.click();
	URL.revokeObjectURL(url);
}
