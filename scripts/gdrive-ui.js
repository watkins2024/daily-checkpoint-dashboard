(function(){
  if (window.GDriveUI) return;

  const VERSION = '20241011';
  const SCRIPT_SRC = `scripts/gdrive.js?v=${VERSION}`;
  let loadPromise = null;

  function ensureLoaded() {
    if (window.GDrive) return Promise.resolve(window.GDrive);
    if (loadPromise) return loadPromise;

    loadPromise = new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[src="${SCRIPT_SRC}"]`);
      if (existing) {
        existing.addEventListener('load', () => resolve(window.GDrive));
        existing.addEventListener('error', reject);
        return;
      }
      const s = document.createElement('script');
      s.src = SCRIPT_SRC;
      s.async = true;
      s.onload = () => resolve(window.GDrive);
      s.onerror = reject;
      document.head.appendChild(s);
    });

    return loadPromise;
  }

  function attach(opts) {
    opts = opts || {};
    const signBtn = opts.signInButtonId ? document.getElementById(opts.signInButtonId) : null;
    const authLabel = opts.authLabelId ? document.getElementById(opts.authLabelId) : null;
    const syncLabel = opts.syncStatusId ? document.getElementById(opts.syncStatusId) : null;
    const syncBtn = opts.syncButtonId ? document.getElementById(opts.syncButtonId) : null;
    const autoSync = opts.autoSyncOnSignIn !== false;
    const labelFormatter = typeof opts.labelFormatter === 'function' ? opts.labelFormatter : null;

    if (syncLabel && !syncLabel.textContent) syncLabel.textContent = 'sync: idle';
    if (authLabel && !authLabel.textContent) authLabel.textContent = 'Not signed in';
    if (signBtn && !signBtn.textContent) signBtn.textContent = 'Sign in';

    let removeAuthListener = null;

    function formatUser(user) {
      if (!user) return 'Signed in';
      if (labelFormatter) return labelFormatter(user);
      return user.displayName || user.emailAddress || 'Signed in';
    }

    function updateAuthUI() {
      if (!signBtn) return;
      const gd = window.GDrive;
      const hasToken = !!(gd && typeof gd.hasToken === 'function' && gd.hasToken());
      signBtn.textContent = hasToken ? 'Sign out' : 'Sign in';
      if (authLabel) authLabel.textContent = hasToken ? formatUser(gd.getUser ? gd.getUser() : null) : 'Not signed in';
    }

    async function syncNow() {
      if (syncLabel) syncLabel.textContent = 'sync: syncing…';
      try {
        await ensureLoaded();
        if (!window.store) throw new Error('store unavailable');
        if (typeof window.store.flushPending === 'function') {
          await window.store.flushPending();
        }
        if (typeof window.store.syncFromDrive === 'function') {
          await window.store.syncFromDrive(true);
        }
        if (syncLabel) syncLabel.textContent = 'sync: idle';
        if (!statusHooked && typeof opts.onSyncIdle === 'function') {
          opts.onSyncIdle();
        }
      } catch (err) {
        console.error('manual sync error', err);
        if (syncLabel) syncLabel.textContent = 'sync: error';
      }
    }

    function bindAuth() {
      ensureLoaded().then(() => {
        if (removeAuthListener) removeAuthListener();
        if (!window.GDrive || typeof window.GDrive.addAuthListener !== 'function') return;
        removeAuthListener = window.GDrive.addAuthListener((authed) => {
          updateAuthUI();
          if (authed) {
            if (autoSync) syncNow();
          } else if (syncLabel) {
            syncLabel.textContent = 'sync: idle';
          }
        });
        updateAuthUI();
      }).catch(err => console.error('GDrive binding failed', err));
    }

    if (signBtn) {
      signBtn.addEventListener('click', () => {
        ensureLoaded().then(() => {
          if (!window.GDrive) throw new Error('GDrive helper missing');
          if (window.GDrive.hasToken && window.GDrive.hasToken()) {
            if (confirm('Sign out of Google Drive backups?')) {
              window.GDrive.signOut();
              updateAuthUI();
            }
          } else {
            window.GDrive.signIn();
          }
        }).catch(err => console.error('GDrive sign-in failed', err));
      });
    }

    if (syncBtn) {
      syncBtn.addEventListener('click', syncNow);
    }

    let statusHooked = false;
    if (window.store && typeof window.store.onSyncStatus === 'function') {
      statusHooked = true;
      window.store.onSyncStatus((state) => {
        if (syncLabel) syncLabel.textContent = 'sync: ' + state;
        if (state === 'idle' && typeof opts.onSyncIdle === 'function') {
          opts.onSyncIdle();
        }
      });
    }

    bindAuth();

    return {
      ensureLoaded,
      syncNow,
      refreshAuth: updateAuthUI
    };
  }

  window.GDriveUI = { VERSION, SRC: SCRIPT_SRC, ensureLoaded, attach };
})();
