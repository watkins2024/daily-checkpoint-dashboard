OAuth & secrets (local testing only)
----------------------------------
This project uses a client-side OAuth flow to upload backups to Google Drive (appDataFolder). Follow these notes when testing locally.

- The OAuth client_id is used only in `scripts/gdrive.js` (constant `CLIENT_ID`).
- Do NOT commit client secrets or private keys to the repository. The repository currently contains the client_id you provided for local testing; if you rotate credentials, update `scripts/gdrive.js` locally.
- To test locally:
  1. Start a static server from the repo root: `python3 -m http.server 8000`.
 2. Open `http://localhost:8000/index.html` in your browser.
 3. Click "Sign in" in the top nav on `work.html` or `walks.html` to authenticate and grant Drive appData access.
 4. Use "Export to Drive" to upload a timestamped backup + a `-latest.json` file in the Drive appData folder.

- If you need to rotate the client_id, replace the `CLIENT_ID` constant in `scripts/gdrive.js` with the new value.

Notes:
- appDataFolder files are hidden in Drive UI, which keeps backups private but retrievable via the Drive API.
- For visible files, change the scope to `https://www.googleapis.com/auth/drive.file` and remove `parents: ['appDataFolder']` from upload metadata.
