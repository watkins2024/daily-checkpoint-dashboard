// store-sync.js
// Supabase-backed persistence for the Daily Checkpoint dashboard.
// Responsibilities:
//  - Provide the familiar store.get/set API used across pages.
//  - Mirror data to localStorage for offline use.
//  - Persist the entire dashboard state JSON to Supabase (table `dash_state`).
//  - Emit sync status updates and data-change events.

(function(){
  if (window.StoreSync) return; // idempotent guard

  const STORE_PREFIX = 'dash.';
  const SAVE_DELAY_MS = 1500;

  const statusHandlers = [];
  const dataHandlers = [];
  let lastStatus = 'idle';
  let saveTimer = null;
  let payload = {};
  let currentUser = null;
  let supabaseClient = null;
  let hasRemoteConfigured = false;

  function localKey(k){ return `${STORE_PREFIX}${k}`; }

  function setStatus(status){
    lastStatus = status;
    statusHandlers.forEach(fn => { try { fn(status); } catch (e) { console.error(e); } });
    window.dispatchEvent(new CustomEvent('store:status', { detail: status }));
  }

  function notifyData(keys){
    const unique = Array.from(new Set(keys));
    dataHandlers.forEach(fn => { try { fn(unique); } catch (e) { console.error(e); } });
    window.dispatchEvent(new CustomEvent('store:data', { detail: { keys: unique } }));
  }

  function readLocalCache(){
    const cache = {};
    for (let i=0;i<localStorage.length;i++){
      const key = localStorage.key(i);
      if (!key || !key.startsWith(STORE_PREFIX)) continue;
      try {
        cache[key.slice(STORE_PREFIX.length)] = JSON.parse(localStorage.getItem(key));
      } catch {
        cache[key.slice(STORE_PREFIX.length)] = null;
      }
    }
    return cache;
  }

  function writeLocalCache(data){
    Object.entries(data).forEach(([key, value]) => {
      try { localStorage.setItem(localKey(key), JSON.stringify(value)); } catch (e) { console.warn('Local cache write failed', e); }
    });
    notifyData(Object.keys(data));
  }

  function clearLocalCache(){
    const keysToRemove = [];
    for (let i=0;i<localStorage.length;i++){
      const key = localStorage.key(i);
      if (key && key.startsWith(STORE_PREFIX)) keysToRemove.push(key);
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));
  }

  function scheduleSave(){
    if (!hasRemoteConfigured || !currentUser) return;
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(flushPending, SAVE_DELAY_MS);
    setStatus('saving');
  }

  async function flushPending(){
    if (!hasRemoteConfigured || !currentUser) { setStatus('idle'); return; }
    if (saveTimer) {
      clearTimeout(saveTimer);
      saveTimer = null;
    }
    setStatus('saving');
    try {
      const { error } = await supabaseClient
        .from('dash_state')
        .upsert({ user_id: currentUser.id, payload, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
      if (error) throw error;
      setStatus('idle');
    } catch (err) {
      console.error('Remote save failed', err);
      setStatus('error');
      saveTimer = setTimeout(flushPending, SAVE_DELAY_MS * 2);
    }
  }

  async function loadRemoteState(user){
    if (!hasRemoteConfigured || !user) return;
    setStatus('loading');
    try {
      const { data, error } = await supabaseClient
        .from('dash_state')
        .select('payload, updated_at')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      if (data?.payload) {
        payload = { ...data.payload };
        clearLocalCache();
        writeLocalCache(payload);
      } else {
        payload = { ...payload };
        writeLocalCache(payload);
        if (Object.keys(payload).length > 0) {
          await flushPending();
        } else {
          setStatus('idle');
        }
        return;
      }
      setStatus('idle');
    } catch (err) {
      console.error('Remote load failed', err);
      setStatus('error');
    }
  }

  function ensureSupabase(){
    if (supabaseClient || hasRemoteConfigured) return;
    const cfg = window.APP_CONFIG || {};
    const url = cfg.supabaseUrl;
    const anonKey = cfg.supabaseAnonKey;

    if (!window.supabase) {
      console.warn('Supabase client library missing. Data will stay local only.');
      hasRemoteConfigured = false;
      return;
    }
    if (!url || !anonKey || url.includes('YOUR-PROJECT')) {
      console.warn('Supabase config missing. Provide supabaseUrl and supabaseAnonKey via window.APP_CONFIG.');
      hasRemoteConfigured = false;
      return;
    }

    supabaseClient = window.supabase.createClient(url, anonKey, {
      auth: {
        persistSession: true,
        storage: window.localStorage,
        autoRefreshToken: true
      }
    });
    hasRemoteConfigured = true;
  }

  // Public Store API -------------------------------------------------------
  const storeApi = {
    get(key, defaultValue=null){
      const local = localStorage.getItem(localKey(key));
      if (local === null || local === undefined) return defaultValue;
      try { return JSON.parse(local); } catch { return defaultValue; }
    },
    set(key, value){
      payload[key] = value;
      try { localStorage.setItem(localKey(key), JSON.stringify(value)); } catch (e) { console.warn('Local save failed', e); }
      scheduleSave();
      notifyData([key]);
    },
    remove(key){
      delete payload[key];
      localStorage.removeItem(localKey(key));
      scheduleSave();
      notifyData([key]);
    },
    onSyncStatus(fn){ statusHandlers.push(fn); fn(lastStatus); },
    subscribe(fn){ dataHandlers.push(fn); },
    async flush(){ await flushPending(); },
    status(){ return lastStatus; }
  };

  // Public Auth API --------------------------------------------------------
  const authHandlers = [];

  function emitAuthChange(user){
    authHandlers.forEach(fn => { try { fn(user); } catch (e) { console.error(e); } });
    window.dispatchEvent(new CustomEvent('store:auth', { detail: user }));
  }

  const authApi = {
    async signIn(email, password){
      ensureSupabase();
      if (!hasRemoteConfigured) throw new Error('Supabase is not configured. Edit scripts/app-config.js with your project keys.');
      const { error, data } = await supabaseClient.auth.signInWithPassword({ email, password });
      if (error) throw error;
      currentUser = data.user;
      emitAuthChange(currentUser);
      await loadRemoteState(currentUser);
      return data.user;
    },
    async signUp(email, password){
      ensureSupabase();
      if (!hasRemoteConfigured) throw new Error('Supabase is not configured.');
      const { error, data } = await supabaseClient.auth.signUp({ email, password });
      if (error) throw error;
      return data.user;
    },
    async signOut(){
      if (hasRemoteConfigured && supabaseClient) {
        await supabaseClient.auth.signOut();
      }
      currentUser = null;
      payload = {};
      clearLocalCache();
      emitAuthChange(null);
      setStatus('idle');
    },
    onChange(fn){ authHandlers.push(fn); fn(currentUser); },
    getUser(){ return currentUser; },
    async requireAuth(){
      ensureSupabase();
      if (!hasRemoteConfigured) throw new Error('Supabase config missing.');
      if (currentUser) return currentUser;
      const existing = await supabaseClient.auth.getSession();
      if (existing?.data?.session?.user) {
        currentUser = existing.data.session.user;
        emitAuthChange(currentUser);
        await loadRemoteState(currentUser);
        return currentUser;
      }
      return Promise.reject(new Error('Not authenticated'));
    }
  };

  // Boot -------------------------------------------------------------------
  payload = readLocalCache();

  ensureSupabase();

  if (hasRemoteConfigured) {
    supabaseClient.auth.onAuthStateChange(async (_event, session) => {
      const user = session?.user || null;
      currentUser = user;
      emitAuthChange(user);
      if (user) {
        payload = { ...payload }; // keep local until remote load merges
        await loadRemoteState(user);
      } else {
        payload = readLocalCache();
        setStatus('idle');
      }
    });

    // restore session if available
    supabaseClient.auth.getSession().then(async ({ data }) => {
      const user = data?.session?.user || null;
      currentUser = user;
      if (user) {
        emitAuthChange(user);
        await loadRemoteState(user);
      } else {
        emitAuthChange(null);
        setStatus('idle');
      }
    }).catch(() => {
      emitAuthChange(null);
      setStatus('idle');
    });
  } else {
    setStatus('idle');
    emitAuthChange(null);
  }

  window.StoreSync = storeApi;
  window.store = storeApi;
  window.CloudAuth = authApi;
})();
