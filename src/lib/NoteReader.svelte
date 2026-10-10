<script>
	import { onMount, onDestroy } from 'svelte';

	// Reads a note aloud, block by block (headings, paragraphs, list items, table rows),
	// highlighting what is being read. Works by walking the rendered note in the page.
	// selector: CSS selector of the rendered note (NoteView renders <article class="note">).
	let { selector = '.note' } = $props();

	const synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
	const KEY = 'elitereg_voice'; // same device setting as the quiz voice reader

	let supported = $state(false);
	let status = $state('idle'); // idle | reading | paused
	let idx = $state(0);
	let total = $state(0);
	let voices = $state([]);
	let voiceURI = $state('');
	let rate = $state(1);
	let open = $state(false);

	let segs = []; // { el, text }
	let token = 0; // bumps whenever playback restarts, so stale async steps stop themselves
	let keepAlive = null;

	function loadVoices() {
		if (!synth) return;
		const all = synth.getVoices();
		const en = (v) => (/^en/i.test(v.lang) ? 0 : 1);
		voices = [...all].sort((a, b) => en(a) - en(b) || a.name.localeCompare(b.name));
		if (!voiceURI || !voices.some((v) => v.voiceURI === voiceURI)) {
			const pick = ['en-NG', 'en-GB', 'en-US'].map((l) => voices.find((v) => v.lang.replace('_', '-') === l)).find(Boolean) || voices.find((v) => /^en/i.test(v.lang)) || voices[0];
			voiceURI = pick?.voiceURI || '';
		}
	}

	onMount(() => {
		supported = !!synth;
		try {
			const s = JSON.parse(localStorage.getItem(KEY) || '{}');
			if (s.uri) voiceURI = s.uri;
			if (s.rate >= 0.5 && s.rate <= 2) rate = s.rate;
		} catch {}
		loadVoices();
		synth?.addEventListener?.('voiceschanged', loadVoices);
		const stopOnHide = () => document.hidden && status === 'reading' && pause();
		document.addEventListener('visibilitychange', stopOnHide);
		return () => {
			synth?.removeEventListener?.('voiceschanged', loadVoices);
			document.removeEventListener('visibilitychange', stopOnHide);
		};
	});
	onDestroy(() => stop());

	$effect(() => {
		const uri = voiceURI;
		const r = rate;
		try {
			const old = JSON.parse(localStorage.getItem(KEY) || '{}');
			localStorage.setItem(KEY, JSON.stringify({ ...old, uri, rate: r }));
		} catch {}
	});

	// ---- collect the readable blocks from the rendered note ----
	function collect() {
		const root = document.querySelector(selector);
		if (!root) return [];
		const out = [];
		for (const el of root.querySelectorAll('h1,h2,h3,h4,h5,h6,p,li,tr')) {
			let text;
			if (el.tagName === 'TR') {
				const cells = [...el.children].map((c) => c.textContent.trim()).filter(Boolean);
				text = cells.join('. ');
			} else {
				text = el.textContent.trim();
			}
			text = text.replace(/\s+/g, ' ');
			if (/[\p{L}\p{N}]/u.test(text)) out.push({ el, text });
		}
		return out;
	}

	// Chrome stops long utterances after ~15 s, so speak in sentence-sized pieces
	function chunks(text) {
		const parts = text.match(/[^.!?;:]+[.!?;:]*\s*/g) || [text];
		const out = [];
		let cur = '';
		for (const p of parts) {
			if ((cur + p).length > 180 && cur) {
				out.push(cur);
				cur = p;
			} else cur += p;
		}
		if (cur.trim()) out.push(cur);
		// very long run-on pieces: split on commas / spaces
		return out.flatMap((c) => {
			if (c.length <= 220) return [c];
			const w = c.split(' ');
			const r = [];
			let b = '';
			for (const x of w) {
				if ((b + ' ' + x).length > 200 && b) {
					r.push(b);
					b = x;
				} else b = b ? b + ' ' + x : x;
			}
			if (b) r.push(b);
			return r;
		});
	}

	function say(text) {
		return new Promise((resolve) => {
			if (!synth) return resolve();
			const u = new SpeechSynthesisUtterance(text);
			const v = voices.find((x) => x.voiceURI === voiceURI);
			if (v) {
				u.voice = v;
				u.lang = v.lang;
			}
			u.rate = rate;
			u.onend = u.onerror = () => resolve();
			synth.speak(u);
		});
	}

	function highlight(i) {
		document.querySelectorAll('.note-reading').forEach((el) => el.classList.remove('note-reading'));
		const el = segs[i]?.el;
		if (el) {
			el.classList.add('note-reading');
			el.scrollIntoView({ behavior: 'smooth', block: 'center' });
		}
	}

	function clearHighlight() {
		document.querySelectorAll('.note-reading').forEach((el) => el.classList.remove('note-reading'));
	}

	async function readFrom(i) {
		const my = ++token;
		synth?.cancel();
		if (!segs.length) segs = collect();
		total = segs.length;
		if (!total) return;
		clearInterval(keepAlive);
		status = 'reading';
		for (let k = Math.max(0, i); k < segs.length; k++) {
			if (my !== token) return;
			idx = k;
			highlight(k);
			for (const c of chunks(segs[k].text)) {
				if (my !== token) return;
				await say(c);
			}
		}
		if (my === token) {
			stop();
		}
	}

	function start() {
		segs = collect();
		readFrom(0);
	}

	function pause() {
		token++;
		synth?.cancel();
		status = 'paused';
	}

	function resume() {
		readFrom(idx);
	}

	function stop() {
		token++;
		synth?.cancel();
		status = 'idle';
		idx = 0;
		clearHighlight();
	}

	function jump(d) {
		const n = Math.min(Math.max(0, idx + d), Math.max(0, total - 1));
		if (status === 'reading') readFrom(n);
		else {
			idx = n;
			highlight(n);
		}
	}

	// tap any paragraph while reading or paused to continue from there
	$effect(() => {
		if (status === 'idle') return;
		const root = document.querySelector(selector);
		if (!root) return;
		const onTap = (e) => {
			const i = segs.findIndex((s) => s.el === e.target.closest('h1,h2,h3,h4,h5,h6,p,li,tr'));
			if (i >= 0) readFrom(i);
		};
		root.addEventListener('click', onTap);
		return () => root.removeEventListener('click', onTap);
	});

	// changing the voice or speed takes effect straight away
	function restartIfReading() {
		if (status === 'reading') readFrom(idx);
	}
</script>

{#if supported}
	<div class="print:hidden">
		<div class="flex flex-wrap items-center gap-2">
			{#if status === 'idle'}
				<button type="button" class="btn-3d btn-3d-lg !rounded-full" onclick={start}>🔊 Listen</button>
			{:else if status === 'reading'}
				<button type="button" class="btn-3d btn-3d-lg !rounded-full" onclick={pause}>⏸ Pause</button>
			{:else}
				<button type="button" class="btn-3d btn-3d-lg !rounded-full" onclick={resume}>▶ Resume</button>
			{/if}
			{#if status !== 'idle'}
				<button type="button" class="btn-3d-ghost btn-3d-lg !rounded-full" onclick={stop}>⏹ Stop</button>
			{/if}
			<button type="button" class="btn-3d-ghost btn-3d-lg !rounded-full" onclick={() => (open = !open)} aria-expanded={open}>⚙ Voice</button>
		</div>
		{#if open}
			<div class="mt-2 grid gap-3 rounded-[1.5rem] border border-teal-300 bg-teal-50 p-3 sm:grid-cols-2">
				<div>
					<label class="label" for="nr_voice">Voice</label>
					<select class="input !rounded-full" id="nr_voice" bind:value={voiceURI} onchange={restartIfReading}>
						{#each voices as v, vi (`${vi}`)}<option value={v.voiceURI}>{v.name} ({v.lang})</option>{/each}
					</select>
				</div>
				<div>
					<label class="label" for="nr_rate">Reading speed: {rate.toFixed(1)}x</label>
					<input class="w-full accent-teal-700" id="nr_rate" type="range" min="0.5" max="2" step="0.1" bind:value={rate} onchange={restartIfReading} />
				</div>
			</div>
		{/if}
	</div>

	{#if status !== 'idle'}
		<div class="h-16 print:hidden"></div>
		<div class="fixed inset-x-0 bottom-0 z-30 flex flex-wrap items-center justify-between gap-2 border-t border-teal-300 bg-white px-4 py-2 shadow-lg print:hidden">
			<div class="min-w-0 text-sm">
				<div class="font-semibold text-teal-800">{status === 'reading' ? '🔊 Reading…' : '⏸ Paused'}</div>
				<div class="truncate text-slate-600">Part {idx + 1} of {total} · tap any line to continue from it</div>
			</div>
			<div class="flex gap-2">
				<button type="button" class="btn-3d-ghost !rounded-full !px-3 !py-1.5" onclick={() => jump(-1)} aria-label="Previous">⏮</button>
				<button type="button" class="btn-3d-ghost !rounded-full !px-3 !py-1.5" onclick={status === 'reading' ? pause : resume} aria-label={status === 'reading' ? 'Pause' : 'Resume'}>{status === 'reading' ? '⏸' : '▶'}</button>
				<button type="button" class="btn-3d-ghost !rounded-full !px-3 !py-1.5" onclick={() => jump(1)} aria-label="Next">⏭</button>
				<button type="button" class="btn-3d-ghost !rounded-full !px-3 !py-1.5" onclick={stop} aria-label="Stop">⏹</button>
			</div>
		</div>
	{/if}
{/if}

<style>
	:global(.note-reading) {
		background: rgba(20, 184, 166, 0.2);
		outline: 3px solid rgba(20, 184, 166, 0.55);
		outline-offset: 3px;
		border-radius: 0.5rem;
	}
	:global(.note p),
	:global(.note li),
	:global(.note tr),
	:global(.note .nh) {
		cursor: pointer;
	}
</style>
