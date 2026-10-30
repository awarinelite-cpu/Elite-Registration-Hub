<script>
	import { signOut, updateProfile } from 'firebase/auth';
	import { auth } from '$lib/firebase.js';
	import { session } from '$lib/adminSession.svelte.js';
	import { cloudinaryReady, uploadToCloudinary } from '$lib/cloudinary.js';
	import ThemeToggle from '$lib/ThemeToggle.svelte';

	const initials = $derived((session.name || 'A').split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase());
	const LINKS = $derived([
		{ href: '/admin/applications', title: 'Applications', sub: 'Everything submitted to your forms' },
		{ href: '/admin/notes', title: 'Notes', sub: 'Private notes and reference materials' },
		{ href: '/admin/tools', title: 'All actions', sub: 'Collections, imports and search' },
		...(session.role === 'owner' ? [{ href: '/admin/team', title: 'Team', sub: 'Create and manage sub-admins' }] : []),
		{ href: '/admin/payments', title: 'Payment & Fees', sub: 'Payment details shown to applicants' },
		{ href: '/admin/support', title: 'Support', sub: 'Help and FAQs' }
	]);

	let fileInput;
	let uploading = $state(false);
	let progress = $state(0);
	let msg = $state('');
	let err = $state('');

	let editing = $state(false);
	let nameDraft = $state('');
	let savingName = $state(false);

	/** Centre-crop to a square and shrink to 400px JPEG so the upload is small and fast. */
	async function squareAvatar(file, size = 400) {
		const url = URL.createObjectURL(file);
		try {
			const img = await new Promise((res, rej) => {
				const i = new Image();
				i.onload = () => res(i);
				i.onerror = () => rej(new Error('That file is not a readable image.'));
				i.src = url;
			});
			const side = Math.min(img.naturalWidth, img.naturalHeight);
			const out = Math.min(size, side);
			const c = document.createElement('canvas');
			c.width = c.height = out;
			c.getContext('2d').drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, 0, 0, out, out);
			const blob = await new Promise((res) => c.toBlob(res, 'image/jpeg', 0.88));
			if (!blob) throw new Error('Could not process that image.');
			return new File([blob], 'avatar.jpg', { type: 'image/jpeg' });
		} finally {
			URL.revokeObjectURL(url);
		}
	}

	async function onPick(e) {
		const input = e.currentTarget;
		const file = input.files?.[0];
		input.value = '';
		if (!file) return;
		msg = err = '';
		if (!file.type.startsWith('image/')) return (err = 'Please choose an image (JPG, PNG or WebP).');
		if (file.size > 15 * 1024 * 1024) return (err = 'That image is too large. Choose one under 15 MB.');
		if (!cloudinaryReady()) return (err = 'Image upload is not set up yet (Cloudinary variables are missing).');
		uploading = true;
		progress = 0;
		try {
			const small = await squareAvatar(file);
			const up = await uploadToCloudinary(small, { folder: 'elitereg/avatars', onProgress: (p) => (progress = p) });
			await updateProfile(auth.currentUser, { photoURL: up.url });
			session.photo = up.url;
			msg = 'Profile picture updated.';
		} catch (ex) {
			err = ex.message || 'Could not update your picture. Please try again.';
		}
		uploading = false;
	}

	async function removePhoto() {
		msg = err = '';
		uploading = true;
		try {
			await updateProfile(auth.currentUser, { photoURL: '' });
			session.photo = '';
			msg = 'Profile picture removed.';
		} catch (ex) {
			err = ex.message || 'Could not remove your picture.';
		}
		uploading = false;
	}

	function startEdit() {
		nameDraft = session.name;
		editing = true;
		msg = err = '';
	}
	async function saveName() {
		const n = nameDraft.trim().replace(/\s+/g, ' ');
		if (!n) return (err = 'Please enter a name.');
		savingName = true;
		try {
			await updateProfile(auth.currentUser, { displayName: n });
			session.name = n;
			editing = false;
			msg = 'Name updated.';
		} catch (ex) {
			err = ex.message || 'Could not save your name.';
		}
		savingName = false;
	}
</script>

<svelte:head><title>Profile — Elite Registration Hub</title></svelte:head>

<section class="me">
	<div class="av-wrap">
		<button type="button" class="av" onclick={() => fileInput.click()} disabled={uploading} aria-label="Change profile picture">
			{#if session.photo}<img src={session.photo} alt="Your profile" />{:else}<span class="ini">{initials}</span>{/if}
			{#if uploading}<span class="veil">{progress ? progress + '%' : '…'}</span>{/if}
		</button>
		<button type="button" class="cam" onclick={() => fileInput.click()} disabled={uploading} aria-label="Upload a profile picture">
			<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h3l1.6-2.5h6.8L17 8h3v11H4z" /><circle cx="12" cy="13" r="3.3" /></svg>
		</button>
		<input bind:this={fileInput} type="file" accept="image/*" class="sr-only" onchange={onPick} />
	</div>

	{#if editing}
		<form class="edit" onsubmit={(e) => { e.preventDefault(); saveName(); }}>
			<input class="name-in" bind:value={nameDraft} maxlength="60" placeholder="Your name" aria-label="Your name" />
			<div class="edit-btns">
				<button type="submit" class="mini gold" disabled={savingName}>{savingName ? 'Saving…' : 'Save'}</button>
				<button type="button" class="mini" onclick={() => (editing = false)}>Cancel</button>
			</div>
		</form>
	{:else}
		<div class="who">
			<b>{session.name}</b>
			<small>{session.email}</small>
			<span class="tags"><em>{session.role === 'sub' ? 'Sub-admin' : 'Admin'}</em></span>
		</div>
	{/if}
</section>

<div class="acts">
	<button type="button" class="act" onclick={() => fileInput.click()} disabled={uploading}>{session.photo ? 'Change picture' : 'Upload picture'}</button>
	{#if session.photo}<button type="button" class="act" onclick={removePhoto} disabled={uploading}>Remove picture</button>{/if}
	{#if !editing}<button type="button" class="act" onclick={startEdit}>Edit name</button>{/if}
</div>
{#if msg}<p class="note ok">{msg}</p>{/if}
{#if err}<p class="note bad">{err}</p>{/if}

<div class="links">
	{#each LINKS as l (l.href)}
		<a href={l.href} class="link"><span><b>{l.title}</b><small>{l.sub}</small></span><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 6l6 6-6 6" /></svg></a>
	{/each}
	<div class="link"><span><b>Theme</b><small>Light, dark or forest</small></span><ThemeToggle /></div>
</div>
<button type="button" class="out" onclick={() => signOut(auth)}>Sign out</button>

<style>
	.me { display: flex; align-items: center; gap: 1.1rem; padding: 1.2rem; border-radius: 1.2rem; color: #fff; background: linear-gradient(150deg, #124a2b, #0a2e1b); border: 1px solid #1d5a38; box-shadow: var(--card-shadow); }
	.av-wrap { position: relative; flex: none; }
	.av { position: relative; display: grid; place-items: center; width: 5.6rem; height: 5.6rem; padding: 0; overflow: hidden; border-radius: 50%; border: 3px solid #c9a13b; background: rgba(255,255,255,.08); cursor: pointer; }
	.av img { width: 100%; height: 100%; object-fit: cover; display: block; }
	.ini { font-size: 1.9rem; font-weight: 800; color: #e6cd86; }
	.veil { position: absolute; inset: 0; display: grid; place-items: center; background: rgba(8, 38, 22, .72); font-weight: 700; font-size: 1rem; }
	.cam { position: absolute; right: -.15rem; bottom: -.15rem; display: grid; place-items: center; width: 2.1rem; height: 2.1rem; border-radius: 50%; border: 2px solid #0a2e1b; background: #c9a13b; color: #0a2e1b; cursor: pointer; }
	.who { display: flex; flex-direction: column; min-width: 0; }
	.who b { font-size: 1.35rem; overflow-wrap: anywhere; } .who small { opacity: .85; overflow-wrap: anywhere; }
	.tags { margin-top: .35rem; display: flex; }
	.who em { font-style: normal; padding: .1rem .7rem; border-radius: 9999px; background: #c9a13b; color: #0a2e1b; font-size: .8rem; font-weight: 700; }
	.edit { display: flex; flex-direction: column; gap: .5rem; min-width: 0; flex: 1; }
	.name-in { width: 100%; padding: .55rem .7rem; border-radius: .7rem; border: 1px solid rgba(255,255,255,.35); background: rgba(255,255,255,.1); color: #fff; font-size: 1.05rem; }
	.name-in::placeholder { color: rgba(255,255,255,.6); }
	.edit-btns { display: flex; gap: .5rem; }
	.mini { padding: .4rem .9rem; border-radius: 9999px; border: 1px solid rgba(255,255,255,.45); background: transparent; color: #fff; font-weight: 600; cursor: pointer; }
	.mini.gold { background: #c9a13b; border-color: #c9a13b; color: #0a2e1b; }
	.acts { display: flex; flex-wrap: wrap; gap: .5rem; margin-top: .8rem; }
	.act { padding: .55rem 1rem; border-radius: 9999px; border: 1px solid var(--edge); background: var(--surface); color: var(--ink); font-weight: 600; font-size: .92rem; cursor: pointer; box-shadow: var(--card-shadow); }
	.act:disabled, .av:disabled, .cam:disabled { opacity: .6; cursor: default; }
	.note { margin: .7rem 0 0; padding: .6rem .8rem; border-radius: .7rem; font-size: .92rem; }
	.note.ok { background: #dcf3e2; color: #1a6b36; }
	.note.bad { background: #fde2e2; color: #c02626; }
	.links { margin-top: 1rem; overflow: hidden; border-radius: 1rem; background: var(--surface); border: 1px solid var(--edge); box-shadow: var(--card-shadow); }
	.link { display: flex; align-items: center; justify-content: space-between; gap: .8rem; padding: .95rem 1rem; text-decoration: none; color: var(--ink); border-bottom: 1px solid var(--edge); }
	.link:last-child { border-bottom: 0; }
	a.link:hover { background: var(--surface-2); }
	.link span { display: flex; flex-direction: column; } .link small { color: var(--sub); font-size: .85rem; }
	.out { width: 100%; margin-top: 1rem; padding: .9rem; border-radius: 1rem; border: 1px solid #d9b0b0; background: var(--surface); color: #c02626; font-weight: 700; cursor: pointer; }
</style>
