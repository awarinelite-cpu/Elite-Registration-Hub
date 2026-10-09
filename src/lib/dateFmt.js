// "9 Oct 2026, 10:32 PM" (empty when the time was never recorded)
export const stamp = (ms) =>
	ms ? new Date(ms).toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : '';
