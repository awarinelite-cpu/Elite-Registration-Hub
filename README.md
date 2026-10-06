# EliteReg — Simple. Secure. Smart Registration.

Create Form → Share Link → Receive Applications → Manage Applicants → Export Data

SvelteKit + Firebase (Firestore, Storage, Auth) · deploys to Vercel.

## How it works
- **Admin** signs in (Firebase Auth) and creates unlimited forms with a field builder (text, dropdown, radio, checkbox, date, NIN, state, file, passport photo…).
- Each form gets a link: `/register/<slug>`. Students need **no account**.
- On submit the student gets an **Application Number** (e.g. `FUOYE-2026-0001`) and a **6-digit PIN** (shown once, stored only as a salted scrypt hash).
- Students log in at `/login` with number + PIN to view (or edit, if the form allows) their application. 5 wrong PINs locks the application for 15 minutes.
- Admin views applications per form, searches, changes status (submitted/reviewed/approved/rejected), opens uploaded files, deletes, and exports CSV (Excel-ready).

## Security model
Students never talk to Firestore/Storage directly. Submissions, PIN login, edits and uploads run in server routes with `firebase-admin`; `firestore.rules`/`storage.rules` deny all client access except signed-in admins listed in `admins/{uid}`.

## Setup
1. Create a Firebase project; enable **Firestore**, **Storage**, and **Authentication → Email/Password**.
2. Deploy `firestore.rules` and `storage.rules` (console or `firebase deploy --only firestore:rules,storage`).
3. Create your admin user in Authentication, then add a Firestore document `admins/<that user's UID>` (any field, e.g. `role: "owner"`). The admin login screen shows your UID if you're not yet authorised.
4. Copy `.env.example` → `.env` and fill it in (web app config, service-account JSON on one line, `SESSION_SECRET`).
5. `npm install && npm run dev`

## Deploy on Vercel
Import the repo, add the same variables in Project Settings → Environment Variables, deploy. Uploads pass through Vercel functions, so they are capped at 1.5 MB per file / 4 MB per submission.

## Notes
- LGA is a free-text field for now (full state→LGA dataset can be added later).
- Application numbers use the form's prefix; prefixes must be unique across forms.
