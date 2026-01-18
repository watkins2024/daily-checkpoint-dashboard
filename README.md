Daily Checkpoint Dashboard
==========================

> **✨ NEW: [Version 2.0](./README-V2.md) is now available!** Features advanced analytics, smart insights, keyboard shortcuts, PWA support, and a modern modular architecture. [Check it out →](./README-V2.md)

This repo hosts a fully client-side dashboard (vanilla HTML/CSS/JS) for logging walks, work, business ops, leverage planning, and household runway. Data is cached in `localStorage` for offline use and mirrored to Supabase so every page stays in sync across devices.

Key features
------------
- **Unified persistence:** the familiar `store.get/set` API now saves to a Supabase table (`dash_state`) tied to each authenticated user.
- **Password-protected access:** users sign up/sign in through Supabase Auth (email + password). The overlay appears automatically on every page.
- **Automatic saves:** no more export/sync buttons—changes debounce to Supabase within ~1.5s whenever data changes.
- **Offline friendly:** localStorage remains the hot cache and will hydrate immediately while Supabase syncs in the background.

Project structure
-----------------
- `index.html` plus feature pages (`walks.html`, `work.html`, `business.html`, `leverage.html`, `household.html`).
- `scripts/store-sync.js` — wraps Supabase + localStorage, exposes `window.store` & `window.CloudAuth`.
- `scripts/auth-ui.js` — renders a shared auth overlay, nav status pill, and sign-out button.
- `scripts/app-config.example.js` — copy to `scripts/app-config.js` with your Supabase keys (the real file is git-ignored).

Supabase setup
--------------
1. Create a Supabase project and note the **Project URL** & **anon public key**.
2. Run the following SQL in the SQL editor to create the state table with Row Level Security on:

	 ```sql
	 create table if not exists dash_state (
		 user_id uuid primary key references auth.users on delete cascade,
		 payload jsonb not null default '{}'::jsonb,
		 updated_at timestamptz not null default timezone('utc', now())
	 );

	 alter table dash_state enable row level security;

	 create policy "Individuals manage their own dashboard"
		 on dash_state for all
		 using (auth.uid() = user_id)
		 with check (auth.uid() = user_id);
	 ```

3. Optional: require email confirmation + MFA inside Supabase Auth settings.

Local configuration
-------------------
1. Copy the template config:

	 ```bash
	 cp scripts/app-config.example.js scripts/app-config.js
	 ```

2. Edit `scripts/app-config.js` and fill in:

	 ```js
	 window.APP_CONFIG = {
		 supabaseUrl: 'https://YOUR-PROJECT.supabase.co',
		 supabaseAnonKey: 'YOUR-ANON-KEY'
	 };
	 ```

Running locally
---------------
```bash
python3 -m http.server 8000
```

Open `http://localhost:8000/index.html`, sign up or sign in, and start using the dashboard. Saves will appear in the `dash_state` table within a second or two.

Deployment
----------
- Include `scripts/app-config.js` in your hosted build (populate it with the same anon key used locally).
- Because this is a static site, no build step is required—just push to GitHub Pages or your preferred static host.
- Rotate the anon key in Supabase if you suspect it has leaked; redeploy the site with the new value.

Security notes
--------------
- Only the Supabase anon key is ever shipped to the client. Keep the service-role key out of this repo.
- Row Level Security ensures each authenticated user sees only their own dashboard state.
- Signing out from the nav clears cached data in the browser.

Troubleshooting
---------------
- **Overlay keeps showing** → confirm `scripts/app-config.js` exists and has the correct Supabase URL & anon key.
- **Data not syncing** → check browser devtools for network errors; verify `dash_state` table and policy exist; confirm user is authenticated in Supabase dashboard.
- **Want a manual export anyway?** Each page still uses `store.get`—you can run `StoreSync.flush()` in the console or build ad-hoc exports without needing Drive.
