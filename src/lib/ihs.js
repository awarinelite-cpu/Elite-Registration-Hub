// IHS DMO — shared definitions (used by the admin Team page, the team API and the report screens).

/** Account types the admin can create (Team page). Add more here later; the server only accepts keys from this list. */
export const ACCOUNT_TYPES = [{ key: 'ihs-dmo', label: 'IHS DMO' }];
export const IHS_TYPE = 'ihs-dmo';

/**
 * "Diesel Monitoring Officer Report Sheet" — the 15 items of the Word sheet, preceded by "Name of Site" (S/N 1).
 * `label` is the item name shown in the form and in the saved table (the three "Phone No" rows say whose phone it is).
 */
export const REPORT_TITLE = 'Diesel Monitoring Officer Report Sheet';
export const REPORT_FIELDS = [
	{ key: 'siteName', label: 'Name of Site', type: 'text', required: true, placeholder: 'e.g. Ikeja Cluster Site' },
	{ key: 'date', label: 'DATE', type: 'date', required: true },
	{ key: 'truckNo', label: 'Truck No', type: 'text', required: true, placeholder: 'e.g. LND-123-XY' },
	{ key: 'volumeBrought', label: 'Volume Brought to Cluster', type: 'decimal', placeholder: 'Litres' },
	{ key: 'volumeSupplied', label: 'Volume Supplied', type: 'decimal', placeholder: 'Litres' },
	{ key: 'vendor', label: 'Vendor', type: 'text' },
	{ key: 'density', label: 'Density', type: 'decimal', placeholder: 'e.g. 0.835' },
	{ key: 'dvrName', label: 'DVR Name', type: 'text' },
	{ key: 'dvrPhone', label: 'Phone No (DVR)', type: 'tel' },
	{ key: 'ihsFseName', label: 'IHS FSE Name', type: 'text' },
	{ key: 'ihsFsePhone', label: 'Phone No (IHS FSE)', type: 'tel' },
	{ key: 'smcFseName', label: 'SMC FSE Name', type: 'text' },
	{ key: 'smcFsePhone', label: 'Phone No (SMC FSE)', type: 'tel' },
	{ key: 'siteId', label: 'Site ID', type: 'text' },
	{ key: 'sbc', label: 'SBC', type: 'text' },
	{ key: 'clo', label: 'CLO', type: 'text' }
];

const todayISO = () => {
	const d = new Date();
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** A blank report (date defaults to today). */
export const blankReport = () => Object.fromEntries(REPORT_FIELDS.map((f) => [f.key, f.key === 'date' ? todayISO() : '']));

/** Keep only the report fields, trimmed strings. */
export function cleanReport(src) {
	return Object.fromEntries(REPORT_FIELDS.map((f) => [f.key, String(src?.[f.key] ?? '').trim().slice(0, 200)]));
}

/** Returns an error message, or '' when the report can be saved. */
export function validateReport(r) {
	for (const f of REPORT_FIELDS) if (f.required && !r[f.key]) return `${f.label} is required.`;
	for (const f of REPORT_FIELDS) {
		if (f.type === 'decimal' && r[f.key] && !/^\d[\d,]*(\.\d+)?$/.test(r[f.key])) return `${f.label} must be a number (e.g. 33000 or 0.835).`;
	}
	return '';
}

/** "2026-11-01" -> "01/11/2026" for display (the stored value stays ISO). Copying uses the same text. */
export function showValue(f, v) {
	if (!v) return '';
	if (f.type === 'date') {
		const [y, m, d] = String(v).split('-');
		return y && m && d ? `${d}/${m}/${y}` : String(v);
	}
	return String(v);
}

/** Saved time of day for a report, e.g. "6:09 pm" (from the timestamp saved with it). */
export function showTime(ts) {
	if (!ts) return '';
	return new Date(ts).toLocaleTimeString('en-NG', { hour: 'numeric', minute: '2-digit' });
}
