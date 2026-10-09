<script>
	import { onMount, onDestroy } from 'svelte';

	// Reads each MCQ question and its options aloud, listens for "Option B" (or a tap on an option),
	// says "Option B chosen" and moves to the next question.
	// questions: the scored quiz fields; root: the <form> element that holds them.
	let { questions = [], root = null } = $props();

	const L = 'ABCDEFGH';
	const qlist = $derived(questions.filter((q) => (q.type === 'radio' || q.type === 'checkbox') && (q.options || []).length));

	const synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
	const SR = typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : null;

	let supported = $state(false);
	let micOk = $state(true);
	let active = $state(false);
	let status = $state('idle'); // idle | reading | listening | tap
	let idx = $state(0);
	let heard = $state('');
	let voices = $state([]);
	let voiceURI = $state('');
	let rate = $state(1);

	let token = 0; // bumps whenever the flow restarts, so stale async steps stop themselves
	let rec = null;
	let listening = false;
	let internal = false; // true while the reader itself clicks an option
	const KEY = 'elitereg_voice';

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
		micOk = !!SR;
		try {
			const s = JSON.parse(localStorage.getItem(KEY) || '{}');
			if (s.uri) voiceURI = s.uri;
			if (s.rate >= 0.5 && s.rate <= 2) rate = s.rate;
		} catch {}
		loadVoices();
		synth?.addEventListener?.('voiceschanged', loadVoices);
		return () => synth?.removeEventListener?.('voiceschanged', loadVoices);
	});
	// listen for taps on options (and for submit) once the form element exists
	$effect(() => {
		if (!root) return;
		const el = root;
		el.addEventListener('change', onChange);
		el.addEventListener('submit', stop);
		return () => {
			el.removeEventListener('change', onChange);
			el.removeEventListener('submit', stop);
		};
	});
	onDestroy(() => stop());

	$effect(() => {
		// remember the chosen voice and speed on this device
		const uri = voiceURI;
		const r = rate;
		try {
			localStorage.setItem(KEY, JSON.stringify({ uri, rate: r }));
		} catch {}
	});

	// ---- speaking ----
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

	// ---- listening ----
	const HOMO = { a: 'a', eh: 'a', ay: 'a', hey: 'a', b: 'b', be: 'b', bee: 'b', c: 'c', see: 'c', sea: 'c', d: 'd', dee: 'd', e: 'e', ee: 'e', f: 'f', ef: 'f', g: 'g', h: 'h' };
	const NUM = { 1: 'a', one: 'a', 2: 'b', two: 'b', to: 'b', too: 'b', 3: 'c', three: 'c', 4: 'd', four: 'd', for: 'd', 5: 'e', five: 'e' };
	function parse(raw) {
		const t = String(raw).toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
		if (!t) return null;
		if (/\b(repeat|again|read again)\b/.test(t)) return { cmd: 'repeat' };
		if (/\b(next|skip)\b/.test(t)) return { cmd: 'next' };
		if (/\b(previous|go back|back)\b/.test(t)) return { cmd: 'prev' };
		if (/\b(stop|pause|quit)\b/.test(t)) return { cmd: 'stop' };
		const m = t.match(/\b(?:options?|answer|choose|select|pick)\s+(\w+)/);
		if (m) {
			const l = HOMO[m[1]] || NUM[m[1]];
			if (l) return { letter: l };
		}
		const words = t.split(' ');
		if (words.length <= 2) for (const w of words) if (HOMO[w]) return { letter: HOMO[w] };
		return null;
	}

	function stopListening() {
		listening = false;
		try {
			rec?.abort();
		} catch {}
		rec = null;
	}

	function startListening(my) {
		if (!SR || !micOk) {
			status = 'tap';
			return;
		}
		status = 'listening';
		listening = true;
		const r = new SR();
		rec = r;
		r.lang = 'en-US';
		r.interimResults = false;
		r.maxAlternatives = 3;
		r.continuous = false;
		r.onresult = (e) => {
			if (my !== token || rec !== r) return;
			const res = e.results[e.results.length - 1];
			heard = res[0]?.transcript || '';
			for (let i = 0; i < res.length; i++) {
				const p = parse(res[i].transcript);
				if (p) return handle(p, my);
			}
		};
		r.onerror = (e) => {
			if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
				micOk = false;
				listening = false;
				status = 'tap';
			}
		};
		r.onend = () => {
			if (active && listening && my === token && rec === r) setTimeout(() => active && listening && my === token && startListening(my), 150);
		};
		try {
			r.start();
		} catch {}
	}

	// ---- flow ----
	const wrapOf = (q) => document.getElementById(`f_${q.id}`);
	function highlight(i) {
		document.querySelectorAll('.voice-current').forEach((el) => el.classList.remove('voice-current'));
		const el = qlist[i] && wrapOf(qlist[i])?.closest('.qbig');
		if (el) {
			el.classList.add('voice-current');
			el.scrollIntoView({ behavior: 'smooth', block: 'center' });
		}
	}

	async function readQuestion(i) {
		const my = ++token;
		stopListening();
		synth?.cancel();
		if (i >= qlist.length) return finish(my);
		idx = Math.max(0, i);
		const q = qlist[idx];
		active = true;
		status = 'reading';
		heard = '';
		highlight(idx);
		const parts = [`Question ${idx + 1}.`, q.label, ...q.options.map((o, k) => `Option ${L[k]}. ${o}`)];
		for (const p of parts) {
			if (my !== token) return;
			await say(p);
		}
		if (my !== token) return;
		startListening(my);
	}

	async function finish(my) {
		status = 'reading';
		await say('That was the last question. Please review your answers, then press submit.');
		if (my === token) stop();
	}

	// a choice was made (by voice or by tapping): confirm out loud, then go on
	async function afterChoose(i, k) {
		const my = ++token;
		stopListening();
		synth?.cancel();
		active = true;
		idx = i;
		status = 'reading';
		await say(`Option ${L[k]} chosen.`);
		if (my !== token) return;
		if (qlist[i].type === 'checkbox') {
			await say('Choose more, or say next.');
			if (my === token) startListening(my);
		} else {
			readQuestion(i + 1);
		}
	}

	function handle(p, my) {
		stopListening();
		if (p.cmd === 'repeat') return readQuestion(idx);
		if (p.cmd === 'next') return readQuestion(idx + 1);
		if (p.cmd === 'prev') return readQuestion(Math.max(0, idx - 1));
		if (p.cmd === 'stop') return stop();
		const q = qlist[idx];
		const k = L.toLowerCase().indexOf(p.letter);
		if (!q || k < 0 || k >= q.options.length) {
			(async () => {
				await say(`There is no option ${p.letter.toUpperCase()}.`);
				if (my === token) startListening(my);
			})();
			return;
		}
		const inputs = wrapOf(q)?.querySelectorAll('input');
		const el = inputs?.[k];
		if (!el) return;
		internal = true;
		try {
			if (q.type === 'checkbox' || !el.checked) el.click();
		} finally {
			internal = false;
		}
		if (q.type !== 'checkbox' && !el.checked) {
			// locked (answer already shown in Reading mode): just move on
			readQuestion(idx + 1);
			return;
		}
		afterChoose(idx, k);
	}

	// the person tapped an option themselves
	function onChange(e) {
		if (!active || internal) return;
		const el = e.target;
		if (!(el instanceof HTMLInputElement) || !el.name.startsWith('f_')) return;
		if (el.type === 'checkbox' && !el.checked) return;
		const qi = qlist.findIndex((q) => `f_${q.id}` === el.name);
		if (qi < 0) return;
		const k = [...(document.getElementById(el.name)?.querySelectorAll('input') || [])].indexOf(el);
		if (k < 0) return;
		afterChoose(qi, k);
	}

	function start() {
		if (!qlist.length) return;
		// begin at the first unanswered question
		let first = qlist.findIndex((q) => ![...(wrapOf(q)?.querySelectorAll('input') || [])].some((i) => i.checked));
		if (first < 0) first = 0;
		active = true;
		readQuestion(first);
	}

	function stop() {
		token++;
		stopListening();
		synth?.cancel();
		active = false;
		status = 'idle';
		document.querySelectorAll('.voice-current').forEach((el) => el.classList.remove('voice-current'));
	}

	const statusText = $derived(
		status === 'reading' ? '🔊 Reading…' : status === 'listening' ? '🎤 Listening… say "Option A", "B", "C" or "D"' : status === 'tap' ? '👆 Tap an option to answer' : ''
	);
</script>

<div class="space-y-3 rounded-xl border border-teal-300 bg-teal-50 p-3 print:hidden">
	<div class="flex flex-wrap items-center justify-between gap-2">
		<div class="font-semibold text-teal-800">🔊 Voice reader</div>
		{#if supported}
			<button type="button" class="btn !px-4 !py-2" onclick={() => (active ? stop() : start())}>{active ? '⏹ Stop' : '▶ Start reading'}</button>
		{:else}
			<span class="text-xs text-red-600">Voice is not supported in this browser.</span>
		{/if}
	</div>
	{#if supported}
		<div class="grid gap-3 sm:grid-cols-2">
			<div>
				<label class="label" for="vr_voice">Voice</label>
				<select class="input" id="vr_voice" bind:value={voiceURI}>
					{#each voices as v, vi (`${vi}`)}<option value={v.voiceURI}>{v.name} ({v.lang})</option>{/each}
				</select>
			</div>
			<div>
				<label class="label" for="vr_rate">Reading speed: {rate.toFixed(1)}x</label>
				<input class="w-full accent-teal-700" id="vr_rate" type="range" min="0.5" max="2" step="0.1" bind:value={rate} />
			</div>
		</div>
		<p class="text-xs text-slate-600">
			Say “Option B” or tap an option, and the next question is read. You can also say “repeat”, “next”, “previous” or “stop”.
			{#if !micOk}<span class="font-semibold text-amber-700">Voice answers need the microphone (Chrome or Edge). Tapping an option still works.</span>{/if}
		</p>
	{/if}
</div>

{#if active}
	<div class="h-16"></div>
	<div class="fixed inset-x-0 bottom-0 z-30 flex flex-wrap items-center justify-between gap-2 border-t border-teal-300 bg-white px-4 py-2 shadow-lg print:hidden">
		<div class="min-w-0 text-sm">
			<div class="font-semibold text-teal-800">Question {idx + 1} of {qlist.length}</div>
			<div class="truncate text-slate-600">{statusText}{#if heard && status === 'listening'} · heard: “{heard}”{/if}</div>
		</div>
		<div class="flex gap-2">
			<button type="button" class="btn-ghost !px-3 !py-1.5" onclick={() => readQuestion(Math.max(0, idx - 1))}>⏮</button>
			<button type="button" class="btn-ghost !px-3 !py-1.5" onclick={() => readQuestion(idx)}>🔁</button>
			<button type="button" class="btn-ghost !px-3 !py-1.5" onclick={() => readQuestion(idx + 1)}>⏭</button>
			<button type="button" class="btn-ghost !px-3 !py-1.5" onclick={stop}>⏹</button>
		</div>
	</div>
{/if}

<style>
	:global(.voice-current) {
		outline: 3px solid #14b8a6;
		outline-offset: 6px;
		border-radius: 0.75rem;
	}
</style>
