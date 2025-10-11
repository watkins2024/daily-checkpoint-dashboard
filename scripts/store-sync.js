// store-sync.js
// Shared store wrapper: localStorage cache + Drive appDataFolder persistence
// Features:
// - store.get(key, default)
// - store.set(key, value)
// - store.onSyncStatus(fn) -> receives 'idle'|'saving'|'error'|'loading'
// - auto-load on init, auto-save on change (debounced 2000ms)
// Implementation notes:
// - Relies on window.GDrive (scripts/gdrive.js) for Drive uploads/queries.
// - Keeps localStorage as the offline cache.

(function(){
  if (window.StoreSync) return; // idempotent

  const DEBOUNCE_MS = 2000;
  const pending = new Map();
  const timers = new Map();
  let statusHandlers = [];
  let loadingFromDrive = false;

  function setStatus(s) { statusHandlers.forEach(h => { try { h(s); } catch(e){} }); }

  function localKey(k) { return `dash.${k}`; }

  const api = {
    get(k, def=null) {
      try { const raw = localStorage.getItem(localKey(k)); return raw ? JSON.parse(raw) : def; } catch { return def; }
    },
    set(k, v) {
      try { localStorage.setItem(localKey(k), JSON.stringify(v)); } catch(e) { console.error('local set failed', e); }
      // schedule remote write
      scheduleUpload(k, v);
    },
    onSyncStatus(fn) { statusHandlers.push(fn); },
    async syncFromDrive() { await initialLoad(true); },
    async flushPending() { await flushAll(); }
  };

  function scheduleUpload(k, v) {
    pending.set(k, v);
    if (timers.has(k)) clearTimeout(timers.get(k));
    timers.set(k, setTimeout(() => flushKey(k), DEBOUNCE_MS));
    setStatus('saving');
  }

  async function flushKey(k) {
    timers.delete(k);
    const v = pending.get(k);
    if (v === undefined) return;
    pending.delete(k);

    try {
      // prepare JSON blob named by key
      const filename = `${k.replace(/\W+/g,'-')}-backup-${new Date().toISOString().slice(0,10)}.json`;
      const data = { key: k, value: v, updated: new Date().toISOString() };

      if (window.GDrive) {
        await window.GDrive.withAuth(() => window.GDrive.uploadJson(filename, data));
        setStatus('idle');
      } else {
        // no GDrive - keep local only
        setStatus('idle');
      }
    } catch (err) {
      console.error('sync upload error', err);
      setStatus('error');
    }
  }

  async function flushAll() {
    const keys = Array.from(pending.keys());
    for (const key of keys) {
      if (timers.has(key)) {
        clearTimeout(timers.get(key));
        timers.delete(key);
      }
      await flushKey(key);
    }
  }

  // load all app keys from Drive (best-effort) into localStorage on init
  async function initialLoad(force=false) {
    if (loadingFromDrive && !force) return;
    loadingFromDrive = true;
    setStatus('loading');
    try {
      if (!window.GDrive || typeof window.GDrive.hasToken !== 'function' || !window.GDrive.hasToken()) {
        // nothing to do
        setStatus('idle');
        loadingFromDrive = false;
        return;
      }

    // List files in appDataFolder and fetch ones that look like backups
    const q = `name contains 'backup' and 'appDataFolder' in parents and trashed=false`;
    const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&spaces=appDataFolder&fields=files(id,name,modifiedTime)`;
      const token = await ensureToken();
      if (!token) { setStatus('idle'); loadingFromDrive = false; return; }

      const res = await fetch(url, { headers: { 'Authorization': 'Bearer ' + token } });
      if (!res.ok) { setStatus('idle'); loadingFromDrive = false; return; }
      const js = await res.json();
      const files = js.files || [];

      // fetch each file and write to localStorage by key
      const latestByKey = {};

      await Promise.all(files.map(async f => {
        try {
          const getUrl = `https://www.googleapis.com/drive/v3/files/${f.id}?alt=media`;
          const r = await fetch(getUrl, { headers: { 'Authorization': 'Bearer ' + token } });
          if (!r.ok) return;
          const body = await r.json();
          if (!body || !body.key) return;

          const existing = latestByKey[body.key];
          const incomingStamp = body.updated || f.modifiedTime || '';
          const existingStamp = existing ? (existing.updated || '') : '';
          if (!existing || incomingStamp > existingStamp) {
            latestByKey[body.key] = {
              value: body.value,
              updated: incomingStamp
            };
          }
        } catch (e) { /* ignore individual file errors */ }
      }));

      Object.entries(latestByKey).forEach(([key, payload]) => {
        try {
          localStorage.setItem(localKey(key), JSON.stringify(payload.value));
        } catch (e) { /* ignore storage errors */ }
      });

      setStatus('idle');
    } catch (err) {
      console.error('initialLoad error', err);
      setStatus('error');
    } finally {
      loadingFromDrive = false;
    }
  }

  async function ensureToken() {
    if (!window.GDrive || typeof window.GDrive.withAuth !== 'function') return null;
    if (typeof window.GDrive.hasToken === 'function' && !window.GDrive.hasToken()) return null;
    try {
      const token = await window.GDrive.withAuth((t) => t);
      return token;
    } catch (e) {
      return null;
    }
  }

  // auto-init
  setTimeout(() => { initialLoad(); }, 100);

  window.StoreSync = api;
  // convenience alias
  window.store = api;
  // debug helper
  window.StoreSync.test = function() {
    console.log('Store keys (local):');
    for (let i=0;i<localStorage.length;i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('dash.')) console.log(k, JSON.parse(localStorage.getItem(k)));
    }
    console.log('Pending uploads:', Array.from(pending.keys()));
  };

  if (window.GDrive && typeof window.GDrive.addAuthListener === 'function') {
    window.GDrive.addAuthListener((authed) => {
      if (authed) {
        initialLoad();
      }
    });
  }
})();
