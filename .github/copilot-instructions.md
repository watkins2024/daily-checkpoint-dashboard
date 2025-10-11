Purpose
-------
This file gives short, actionable guidance for an automated coding agent working on the daily-checkpoint-dashboard static site. It focuses on project-specific patterns and where to wire changes when enhancing two high-priority capabilities: (1) secure access through Supabase Auth; (2) seamless multi-device persistence backed by Supabase.

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
- Keep edits local and minimal: pages are single-file; prefer adding a small new JS module (e.g., `scripts/auth-ui.js`, new helpers inside `scripts/store-sync.js`) and include it with a <script> tag rather than refactoring large swathes of inline code.
- Reuse the `store` helper rather than directly touching localStorage in new code. Example helper signature (from pages):
  - get: `store.get(key, default)`
  - set: `store.set(key, value)`
- Use existing IDs and buttons for hooks rather than changing the DOM structure. Example hook points: the `exportData()` calls in `work.html` and `walks.html`, and the `Save` buttons that call `saveWalk()` / `saveDailySummary()` / `saveSchedule()`.

Integration points for Supabase auth + persistence
-------------------------------------------------
Make incremental changes—the pages are standalone and already use `window.store` for reads/writes. Supabase wires in via two shared scripts:

1) `scripts/store-sync.js`
- Wraps Supabase (for persistence) + `localStorage` (for offline cache).
- Exposes `window.store` (`get`, `set`, `remove`, `subscribe`, `onSyncStatus`) and `window.CloudAuth` (`signIn`, `signUp`, `signOut`, `onChange`, `requireAuth`).
- Debounces writes (`SAVE_DELAY_MS`) so most updates hit Supabase within ~1.5s.
- Emits `store:data` events whenever keys change—individual pages should listen and re-render.

2) `scripts/auth-ui.js`
- Injects a modal login form and a nav pill showing auth status; depends on `CloudAuth`.
- Automatically clears cached data on sign out.
- Make sure every page calls `DashboardAuth.init()` once DOM is ready.

Implementation tips:
- Keep Supabase config out of the repo: expect `scripts/app-config.js` (git-ignored) to define `window.APP_CONFIG.supabaseUrl/AnonKey`.
- If you add new data domains, stick to `store.set('prefix.key', value)` so everything stays inside the same JSON payload per user.
- Use `store.subscribe` or `window.addEventListener('store:data', handler)` instead of rolling bespoke sync watchers.
- For extra UX, hook `store.onSyncStatus` to surface a subtle "Saving…" indicator if needed.

Developer workflows (how to run & test locally)
----------------------------------------------
- No build step — serve statically (e.g. `python3 -m http.server 8000`) and open `http://localhost:8000/index.html`.
- Copy `scripts/app-config.example.js` → `scripts/app-config.js`, fill in Supabase URL + anon key. (File is git-ignored.)
- Create table `dash_state (user_id uuid primary key, payload jsonb, updated_at timestamptz default now())`, enable RLS, allow authenticated users to read/write their own row.
- Sign up through the overlay, enter sample data on each page, and verify Supabase `dash_state.payload` updates.
- To simulate offline mode, disable network: pages should still read from local cache and sync once network returns.

Priority task checklist for an AI coding agent (small, testable steps)
-----------------------------------------------------------------
1. Keep `scripts/store-sync.js` authoritative—extend it when adding new persistence logic instead of duplicating Supabase clients in individual pages.
2. Make sure any new page listens for `store:data` so UI refreshes after remote sync merges.
3. When adding features that require auth state (e.g., showing the user email), subscribe to `CloudAuth.onChange` instead of polling.
4. Update `README.md` / `SECRETS.md` whenever Supabase configuration or security assumptions change.

Edge cases & notes for the agent
--------------------------------
- Supabase anon keys are public; never ship service-role keys or private DB credentials in the repo.
- Respect existing key names in `store` for backwards compatibility. The Supabase payload mirrors localStorage by key.
- Debounce saves when writing high-volume data to avoid hitting Supabase rate limits.
- Use `CloudAuth.requireAuth()` to gate sensitive flows (e.g., export buttons, future integrations).

When you finish the first pass
-----------------------------
- Smoke-test a save cycle: sign in, tweak data on at least two pages, reload to confirm persistence.
- Update README/SECRETS if you change Supabase tables, policies, or config expectations.

Questions for the owner
-----------------------
- Any preference on password policy (length, symbols) for Supabase Auth sign-ups?
- Should we add optional MFA reminders or audit logs surfaced inside the dashboard UI?

If anything here is unclear or missing, tell me which area to expand (auth flow, Supabase patterns, or exact UI placement) and I will iterate.
