/// <reference types="@sveltejs/kit" />
import { immutable, assets } from '$app/manifest';
import { version } from '$app/env';

// Caches only the static app shell (JS/CSS/icons). Pages, API calls, Firebase
// and anything with user data always go to the network, so data is never stale.
const CACHE = `elitereg-${version}`;
const toPath = (x) => (x.path.startsWith('/') ? x.path : '/' + x.path);
const ASSETS = [...immutable, ...assets].map(toPath).filter((p) => !p.endsWith('.map'));
const OFFLINE = '/offline.html';

self.addEventListener('install', (event) => {
	event.waitUntil(
		caches
			.open(CACHE)
			.then((c) => c.addAll(ASSETS))
			.then(() => self.skipWaiting())
	);
});

self.addEventListener('activate', (event) => {
	event.waitUntil(
		caches
			.keys()
			.then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
			.then(() => self.clients.claim())
	);
});

self.addEventListener('fetch', (event) => {
	const req = event.request;
	if (req.method !== 'GET') return;
	const url = new URL(req.url);
	if (url.origin !== self.location.origin) return;

	if (ASSETS.includes(url.pathname)) {
		event.respondWith(caches.match(req).then((hit) => hit || fetch(req)));
		return;
	}

	if (req.mode === 'navigate') {
		event.respondWith(fetch(req).catch(() => caches.match(OFFLINE)));
	}
});
