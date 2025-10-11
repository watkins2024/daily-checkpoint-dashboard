// Minimal Google Drive helper for the dashboard
// TODO: do NOT commit client secrets. This file intentionally contains a client_id
// placeholder which is safe for local testing only. Replace with your own OAuth client id.

const GDrive = (function(){
  // Insert the project's client_id (provided by the user)
  const CLIENT_ID = '699923729313-4r6mbch2jea93rp6ejo0kjochskhe1ft.apps.googleusercontent.com';
  const SCOPES = 'https://www.googleapis.com/auth/drive.appdata'; // appDataFolder (hidden)

  let tokenClient = null;
  let accessToken = null;
  let userInfo = null;

  function init() {
    // load GSI script dynamically if not already present
    if (!window.google || !window.google.accounts) {
      const s = document.createElement('script');
      s.src = 'https://accounts.google.com/gsi/client';
      s.onload = () => console.log('GSI loaded');
      document.head.appendChild(s);
    }

    tokenClient = window.google && window.google.accounts && window.google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPES,
      callback: (resp) => {
        if (resp.error) return console.error('Token error', resp);
        accessToken = resp.access_token;
        // Note: we do not fetch profile info here because appDataFolder is not profile scope
        // But we can call tokeninfo to get sub if needed
        if (typeof onAuthChange === 'function') onAuthChange(true);
      }
    });
  }

  // Exposed hook; pages can override to receive auth state changes
  let onAuthChange = null;

  function signIn() {
    if (!tokenClient) init();
    tokenClient.requestAccessToken({prompt: 'consent'});
  }

  function signOut() {
    accessToken = null;
    if (typeof onAuthChange === 'function') onAuthChange(false);
  }

  // Upload JSON to Drive. Uses appDataFolder by default.
  // Behavior: creates timestamped file and updates/creates a "latest" file.
  async function uploadJson(filename, data) {
    if (!accessToken) throw new Error('Not authenticated');

    const json = typeof data === 'string' ? data : JSON.stringify(data, null, 2);

    // 1) Create timestamped file in appDataFolder
    const metadata = {
      name: filename,
      parents: ['appDataFolder']
    };

    const multipart = buildMultipart(metadata, json);
    const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + accessToken
      },
      body: multipart
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error('Upload failed: ' + text);
    }

    const created = await res.json();

    // 2) Update/create a single 'latest' file: search for existing file in appDataFolder named <area>-latest.json
    const latestName = filename.replace(/-\d{4}-\d{2}-\d{2}$/, '') + '-latest.json';
    const existing = await findFileInAppData(latestName);

    if (existing) {
      // update existing file
      const updateRes = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${existing.id}?uploadType=multipart`, {
        method: 'PATCH',
        headers: { 'Authorization': 'Bearer ' + accessToken },
        body: buildMultipart({ name: latestName }, json)
      });
      if (!updateRes.ok) {
        const text = await updateRes.text();
        throw new Error('Update failed: ' + text);
      }
    } else {
      // create new latest
      const createRes = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + accessToken },
        body: buildMultipart({ name: latestName, parents: ['appDataFolder'] }, json)
      });
      if (!createRes.ok) {
        const text = await createRes.text();
        throw new Error('Create latest failed: ' + text);
      }
    }

    return created;
  }

  function buildMultipart(metadata, jsonString) {
    const boundary = '-------dash-backup-' + Math.random().toString(36).slice(2);
    const delim = '\r\n--' + boundary + '\r\n';
    const close = '\r\n--' + boundary + '--';

    const head = 'Content-Type: application/json; charset=UTF-8\r\n\r\n' + JSON.stringify(metadata) + '\r\n';
    const body = 'Content-Type: application/json\r\n\r\n' + jsonString + '\r\n';

    const multipart = new Blob([
      '--' + boundary + '\r\n',
      'Content-Type: application/json; charset=UTF-8\r\n\r\n',
      JSON.stringify(metadata),
      '\r\n--' + boundary + '\r\n',
      'Content-Type: application/json\r\n\r\n',
      jsonString,
      '\r\n--' + boundary + '--\r\n'
    ], { type: 'multipart/related; boundary=' + boundary });

    // fetch will set Content-Type automatically if body is a Blob, but we need boundary info as header
    // to make it work we must return the Blob and include Content-Type header with boundary where used.
    // To keep the API simple we return an object with blob and boundary so callers can set header.
    // However, here we will return a special object and the caller (uploadJson) will pass it directly as body
    // and set no Content-Type — browsers include it with boundary.
    return multipart;
  }

  async function findFileInAppData(name) {
    // search files in appDataFolder
    const q = `name='${name}' and 'appDataFolder' in parents and trashed=false`;
    const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&spaces=appDataFolder&fields=files(id,name)`;
    const res = await fetch(url, { headers: { 'Authorization': 'Bearer ' + accessToken } });
    if (!res.ok) return null;
    const js = await res.json();
    return js.files && js.files[0];
  }

  // Simple helper to request token and then call fn
  async function withAuth(fn) {
    if (!accessToken) {
      await new Promise((resolve, reject) => {
        const cb = (resp) => {
          if (resp && resp.error) return reject(resp);
          accessToken = resp && resp.access_token;
          if (typeof onAuthChange === 'function') onAuthChange(true);
          resolve();
        };
        // requestAccessToken's callback is the global token client callback
        tokenClient = window.google.accounts.oauth2.initTokenClient({ client_id: CLIENT_ID, scope: SCOPES, callback: cb });
        tokenClient.requestAccessToken({ prompt: 'consent' });
      });
    }
    return fn();
  }

  return { init, signIn, signOut, uploadJson, withAuth, setOnAuthChange: (fn) => { onAuthChange = fn } };
})();

// Auto-init if script loaded
if (typeof GDrive !== 'undefined') GDrive.init();

// expose on window for non-module usage
window.GDrive = GDrive;
