// TEMPORARY: surface real server error messages while setting up. Remove once stable.
export function handleError({ error, event }) {
	console.error(`[${event.url.pathname}]`, error);
	return { message: String(error?.message || error).slice(0, 300) };
}
