Purpose
-------
This file gives short, actionable guidance for an automated coding agent working on the daily-checkpoint-dashboard static site. It focuses on discoverable, project-specific patterns and where to make changes for two high-priority user requests: (1) add a password-protection gate; (2) upload / sync user logs to Google Drive when the user logs data.

Big picture (what this project is)
---------------------------------
- A small, client-side dashboard web app: static HTML + inline CSS + vanilla JavaScript. No server code in the repo.
- Pages: `index.html` (Hub), `walks.html`, `work.html`, `business.html`, `leverage.html`, `household.html`. Each page is a mostly self-contained single-file app with UI + logic.
- Client storage: everything is persisted in browser `localStorage` via a simple helper object named `store` (see top of `work.html`, `walks.html`, `business.html`, `leverage.html`, `household.html`). Keys use prefixes by area (example keys below).

Important files & concrete examples
----------------------------------
- `index.html` — the hub/navigation.
- `work.html` — work & study UI. Examples:
  - storage keys: `work.schedule`, `work.classNotes`, `work.log`, `work.dailySummaries`.
  - functions to inspect/modify: `saveSchedule()`, `saveClassNotes(...)`, `saveDailySummary()`, `exportData()` (currently saves a JSON file client-side).
- `walks.html` — walks UI. Examples:
  - storage keys: `fh.walks`.
  - functions: `saveWalk()`, `renderWalks()`, `exportData()` (creates a local JSON download).
- `business.html`, `leverage.html`, `household.html` — similar patterns: `store.get/set` + UI + export buttons (`exportAllData()`, `exportData()`, etc.).

Data shapes (common patterns)
----------------------------
- Walks: array under `fh.walks`, item shape: {date, location, weather, mood, star, salt, notes, moonPhase}
- Work logs / summaries: objects keyed by date under `work.dailySummaries` and arrays under `work.log` with items like {noteKey, date, className, notes}
- Sprint/progress lists: arrays under `fh.sprint`, `fh.progress` etc.

Coding conventions & patterns to follow
-------------------------------------
- Keep edits local and minimal: pages are single-file; prefer adding a small new JS module (e.g., `scripts/auth.js` or `scripts/gdrive.js`) and include it with a <script> tag rather than refactoring large swathes of inline code.
- Reuse the `store` helper rather than directly touching localStorage in new code. Example helper signature (from pages):
  - get: `store.get(key, default)`
  - set: `store.set(key, value)`
- Use existing IDs and buttons for hooks rather than changing the DOM structure. Example hook points: the `exportData()` calls in `work.html` and `walks.html`, and the `Save` buttons that call `saveWalk()` / `saveDailySummary()` / `saveSchedule()`.

Integration points for password protection and Drive sync
-------------------------------------------------------
Make minimal, incremental changes. Preferred approach: implement OAuth-based Google sign-in + Drive upload for cross-device persistence. If a quick prototype is acceptable, also provide a temporary client-side password gate.

1) Google Drive sync (recommended, secure, cross-device)
- High-level plan:
  - Add a small client-side module `scripts/gdrive.js` that wraps Google Identity Services (GSI) + Drive REST calls.
  - Replace/augment existing local export flows (example: `exportData()` in `work.html` and `walks.html`) to call `gdrive.uploadJson(filename, data)` after successful sign-in.
  - Provide an `auth` UI button in the top-nav (or reuse existing Export button) to sign in via Google and obtain an access token.
- Concrete changes to implement:
  - Create `scripts/gdrive.js` with functions: `initGDrive(clientId)`, `signIn()`, `uploadJson(filename, json)`, `listBackups()`.
  - In `work.html` and `walks.html`, modify `exportData()` to: build the same JSON blob (existing code), then call `gdrive.uploadJson('work-backup-YYYY-MM-DD.json', data)`.
  - Keep existing local-download behavior as a fallback when Drive upload is not possible.
- Notes & constraints:
  - OAuth client_id must NOT be checked into source. Agent should leave a placeholder and document where to drop credentials (README or a new `SECRETS.md`). Use GSI client-side flow (no server required). Set allowed origins to `http://localhost:8000` for local testing.
  - Show the user how to register credentials and test locally (see "Developer workflows" below).

2) Password protection (option A: hosting-level, option B: client-side gate)
- Hosting-level (recommended for real security): add HTTP basic auth or use host provider features (Netlify password-protect, Vercel with middleware). Document that in the PR notes.
- Client-side quick gate (fast prototype but not secure):
  - Add a new `login.html` or a modal in `index.html` that asks for a password, verifies a salted hash using Web Crypto (SHA-256) against a stored hash in `localStorage` or a small config file, and sets a session flag like `session.isAuthenticated=true` in sessionStorage.
  - At the top of each page, add a small guard that checks `sessionStorage.isAuthenticated` and redirects to `login.html` if not set.
  - Important: document in the PR that client-side password is only an UX gate—not a replacement for server/host-level auth.

Developer workflows (how to run & test locally)
----------------------------------------------
- No build step in repo — pages are static HTML. To run locally use a static server. Example (recommended for testing Google OAuth):
  - python: `python3 -m http.server 8000` from the repo root and open `http://localhost:8000/index.html`.
  - Or use `npx serve .` if Node.js is available.
- Google OAuth testing: register OAuth client (GSI) with origin `http://localhost:8000`, copy client_id into `scripts/gdrive.js` placeholder during manual local testing (do not commit client_id). Use browser console to inspect token and upload flows.

Priority task checklist for an AI coding agent (small, testable steps)
-----------------------------------------------------------------
1. Add `scripts/gdrive.js` that implements GSI init + uploadJson (create clear TODO for inserting client_id). Modify `work.html` and `walks.html` to call `gdrive.uploadJson()` from their `exportData()` functions; keep the existing file-download fallback. (Files: `work.html`, `walks.html`, add `scripts/gdrive.js`)
2. Provide a sign-in UI element in the top-nav (small button) that calls `gdrive.signIn()` and displays signed-in user email. (Files: `index.html` top-nav include or modify each page's `.top-nav` area)
3. Implement a client-side login modal fallback (quick prototype) in `index.html` and guard each page with a session check. Add clear comments that this is not secure and hosting-level auth is preferred. (Files: `index.html`, small additions across pages)
4. Write manual test steps in PR description: how to run `python3 -m http.server 8000`, how to register OAuth client, and how to verify uploads in Google Drive.

Edge cases & notes for the agent
--------------------------------
- Avoid storing OAuth client secrets or any private keys in the repo. Leave placeholders and installation notes.
- Respect existing key names in localStorage so user data migration is seamless. When adding Drive sync, upload dumps should include the same keys/prefixes so they can be restored or merged.
- Keep operations idempotent: uploads should not create duplicates every time user edits (use timestamps in filenames or offer a single "latest" file).

When you finish the first pass
-----------------------------
- Run a quick smoke test: start static server, sign in with a test Google account, perform an export from `work.html` and confirm file appears in Drive or fallback download occurs.
- Add short README notes describing where devs must drop OAuth client_id and how to enable hosting-level auth if they need stronger security.

Questions for the owner
-----------------------
- Do you want a quick client-side password gate for immediate privacy, or should I focus on the Google OAuth + Drive sync first (recommended)?
- Which Google account or Drive folder would you like uploaded files to? I will document how to change folder destination during the OAuth flow.

If anything here is unclear or missing, tell me which area to expand (auth flow, Drive code examples, or exact UI placement) and I will iterate.
