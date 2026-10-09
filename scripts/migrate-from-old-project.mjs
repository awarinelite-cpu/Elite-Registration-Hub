// Copies forms, applications and uploaded files from the OLD Firebase project to the NEW one.
// Run in Google Cloud Shell (free, works from a phone browser) or on a computer:
//   npm install
//   node scripts/migrate-from-old-project.mjs old-key.json new-key.json
// Needs: billing active on the OLD project, and a service-account key file for each project.
// Key files are SECRETS: never commit them (they are git-ignored below).
// Safe to re-run: documents/files are overwritten with the same data.
import { readFileSync } from 'node:fs';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

const [oldKeyPath, newKeyPath] = process.argv.slice(2);
if (!oldKeyPath || !newKeyPath) {
	console.error('Usage: node scripts/migrate-from-old-project.mjs old-key.json new-key.json');
	process.exit(1);
}
const OLD_DB = process.env.OLD_DB || 'elitereg';
const NEW_DB = process.env.NEW_DB || '(default)';
const load = (p) => JSON.parse(readFileSync(p, 'utf8'));
const oldKey = load(oldKeyPath);
const newKey = load(newKeyPath);

const oldApp = initializeApp(
	{ credential: cert(oldKey), storageBucket: process.env.OLD_BUCKET || `${oldKey.project_id}.firebasestorage.app` },
	'old'
);
const newApp = initializeApp(
	{ credential: cert(newKey), storageBucket: process.env.NEW_BUCKET || `${newKey.project_id}.firebasestorage.app` },
	'new'
);
const oldDb = getFirestore(oldApp, OLD_DB);
const newDb = getFirestore(newApp, NEW_DB);

async function copyCollection(name) {
	const writer = newDb.bulkWriter();
	let n = 0;
	const snap = await oldDb.collection(name).get();
	for (const d of snap.docs) {
		writer.set(newDb.collection(name).doc(d.id), d.data());
		n++;
	}
	await writer.close();
	console.log(`${name}: copied ${n} documents`);
}

async function copyFiles() {
	const from = getStorage(oldApp).bucket();
	const to = getStorage(newApp).bucket();
	const [files] = await from.getFiles();
	let n = 0, failed = 0;
	for (const f of files) {
		if (f.name.endsWith('/')) continue;
		try {
			await new Promise((resolve, reject) => {
				f.createReadStream()
					.on('error', reject)
					.pipe(to.file(f.name).createWriteStream({ contentType: f.metadata.contentType, resumable: false }))
					.on('error', reject)
					.on('finish', resolve);
			});
			n++;
		} catch (e) {
			failed++;
			console.error('file failed:', f.name, e.message);
		}
	}
	console.log(`storage: copied ${n} files, ${failed} failed`);
}

// 'admins' is NOT copied: admin accounts are new Auth users with new UIDs.
await copyCollection('forms');
await copyCollection('applications');
try { await copyFiles(); } catch (e) { console.error('storage skipped:', e.message); }
console.log('Done. Sub-admin accounts must be re-created from the Team page.');
