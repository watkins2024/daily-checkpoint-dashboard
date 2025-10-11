Supabase credentials & secrets
------------------------------
This dashboard now syncs data through Supabase. Keep these guardrails in mind when configuring credentials for local testing and production.

- Create a Supabase project and enable Row Level Security on the `dash_state` table (see README for schema). Only the anon public key belongs in `scripts/app-config.js`; never embed the service-role key in the frontend.
- Copy `scripts/app-config.example.js` to `scripts/app-config.js` locally and fill in `supabaseUrl` + `supabaseAnonKey`. The new file is git-ignored—do not commit it.
- Require email verification and (optionally) multi-factor auth inside your Supabase project. That keeps password resets and brute-force defence on the managed service rather than this repo.
- If the anon key is rotated, update your local `scripts/app-config.js` and redeploy the static site with the new value.
- Keep the service-role key and database connection strings outside of the repo. Use environment variables in Supabase functions or server-side tooling, not the static client.

Local testing quick start:
1. `python3 -m http.server 8000`
2. Open `http://localhost:8000/index.html`
3. Sign up/sign in via the overlay (Supabase email + password).
4. Enter dashboard data and confirm it appears in the `dash_state` table for your user.

If you need to revoke sessions quickly, use the Supabase dashboard to sign out users or rotate the anon key and update the deployed config.
