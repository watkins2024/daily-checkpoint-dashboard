(function(){
  if (window.DashboardAuth) return;

  const OVERLAY_ID = 'dash-auth-overlay';
  const STATUS_ID = 'dash-auth-status';
  const SIGNOUT_ID = 'dash-signout-btn';

  function ensureStyles(){
    if (document.getElementById('dash-auth-styles')) return;
    const style = document.createElement('style');
    style.id = 'dash-auth-styles';
    style.textContent = `
      #${OVERLAY_ID}{position:fixed;inset:0;background:rgba(4,8,16,0.8);backdrop-filter:blur(14px);display:flex;align-items:center;justify-content:center;padding:24px;z-index:9999;opacity:0;pointer-events:none;transition:opacity .25s ease;}
      #${OVERLAY_ID}.active{opacity:1;pointer-events:all;}
      #${OVERLAY_ID} .auth-card{background:rgba(8,16,26,0.92);border:1px solid rgba(123,227,255,0.18);border-radius:18px;box-shadow:0 30px 60px rgba(0,0,0,0.45);padding:32px;max-width:360px;width:100%;display:grid;gap:16px;color:#d7f6ff;font-family:'Noto Sans JP',system-ui,-apple-system,'Segoe UI',Arial;}
      #${OVERLAY_ID} .auth-card h2{margin:0;font-size:22px;font-family:'Rajdhani',sans-serif;letter-spacing:0.06em;text-transform:uppercase;}
      #${OVERLAY_ID} .auth-card p{margin:0;font-size:14px;color:#95aac4;line-height:1.5;}
      #${OVERLAY_ID} label{font-size:12px;color:#8ea6c0;text-transform:uppercase;letter-spacing:0.08em;}
      #${OVERLAY_ID} input{width:100%;padding:12px 14px;border-radius:12px;border:1px solid rgba(123,227,255,0.2);background:rgba(4,12,20,0.7);color:#e8f7ff;font-size:15px;}
      #${OVERLAY_ID} input:focus{outline:none;border-color:rgba(123,227,255,0.45);box-shadow:0 0 0 3px rgba(123,227,255,0.15);}
      #${OVERLAY_ID} button{border:none;border-radius:12px;padding:12px 16px;font-size:14px;font-family:inherit;cursor:pointer;transition:transform 0.18s,box-shadow 0.18s,background 0.18s;}
      #${OVERLAY_ID} button.primary{background:linear-gradient(90deg,#7be3ff,#6cf3b1);color:#05121d;box-shadow:0 12px 30px rgba(123,227,255,0.28);font-weight:600;letter-spacing:0.04em;text-transform:uppercase;}
      #${OVERLAY_ID} button.primary:hover{transform:translateY(-1px);}
      #${OVERLAY_ID} button.secondary{background:transparent;border:1px dashed rgba(123,227,255,0.35);color:#96b2ce;}
      #${OVERLAY_ID} .auth-error{min-height:18px;font-size:12px;color:#ff9ba8;}
      #${OVERLAY_ID} .legal{font-size:11px;color:#8398b5;line-height:1.6;}
      .dash-auth-status-pill{font-size:12px;color:#9fb0c8;background:rgba(123,227,255,0.12);border:1px solid rgba(123,227,255,0.22);border-radius:999px;padding:6px 12px;display:inline-flex;align-items:center;gap:6px;}
      #${SIGNOUT_ID}{display:none;background:rgba(255,120,140,0.14);color:#ffc8d0;border:1px solid rgba(255,120,140,0.3);}
      #${SIGNOUT_ID}.visible{display:inline-flex;}
    `;
    document.head.appendChild(style);
  }

  function createOverlay(){
    if (document.getElementById(OVERLAY_ID)) return;
    const overlay = document.createElement('div');
    overlay.id = OVERLAY_ID;
    overlay.innerHTML = `
      <div class="auth-card">
        <div>
          <h2>Daily Checkpoint</h2>
          <p>Sign in to keep your dashboard encrypted in Supabase and synced across devices.</p>
        </div>
        <div class="auth-error" id="dash-auth-error"></div>
        <div>
          <label for="dash-auth-email">Email</label>
          <input id="dash-auth-email" type="email" autocomplete="email" placeholder="you@example.com" required />
        </div>
        <div>
          <label for="dash-auth-password">Password</label>
          <input id="dash-auth-password" type="password" autocomplete="current-password" placeholder="••••••••" required />
        </div>
        <button class="primary" id="dash-auth-submit">Sign in</button>
        <button class="secondary" id="dash-auth-toggle" type="button">Need an account? Create one</button>
        <p class="legal">Passwords are stored securely by Supabase Auth. Enable multi-factor auth in your Supabase project for extra protection.</p>
      </div>
    `;
    document.body.appendChild(overlay);
  }

  function ensureNavControls(){
    const nav = document.querySelector('.top-nav');
    if (!nav) return;
    if (!nav.querySelector(`#${STATUS_ID}`)) {
      const spacer = document.createElement('span');
      spacer.className = 'dash-auth-status-pill';
      spacer.id = STATUS_ID;
      spacer.textContent = 'Not signed in';
      spacer.style.marginLeft = 'auto';
      nav.appendChild(spacer);
    }
    if (!nav.querySelector(`#${SIGNOUT_ID}`)) {
      const btn = document.createElement('button');
      btn.id = SIGNOUT_ID;
      btn.className = 'nav-btn secondary';
      btn.textContent = 'Sign out';
      btn.addEventListener('click', () => {
        if (window.CloudAuth) window.CloudAuth.signOut();
      });
      const status = nav.querySelector(`#${STATUS_ID}`);
      if (status) status.insertAdjacentElement('afterend', btn);
      else nav.appendChild(btn);
    }
  }

  function setOverlayVisible(show){
    const overlay = document.getElementById(OVERLAY_ID);
    if (!overlay) return;
    overlay.classList.toggle('active', !!show);
  }

  function setStatus(text){
    const el = document.getElementById(STATUS_ID);
    if (el) el.textContent = text;
  }

  function setSignOutVisible(show){
    const btn = document.getElementById(SIGNOUT_ID);
    if (btn) btn.classList.toggle('visible', !!show);
  }

  function setError(message){
    const el = document.getElementById('dash-auth-error');
    if (el) el.textContent = message || '';
  }

  function init(options={}){
    if (!window.CloudAuth) {
      console.warn('Auth UI: CloudAuth not ready yet.');
      return;
    }

    ensureStyles();
    createOverlay();
    ensureNavControls();

    const overlay = document.getElementById(OVERLAY_ID);
    const emailInput = document.getElementById('dash-auth-email');
    const passwordInput = document.getElementById('dash-auth-password');
    const submitBtn = document.getElementById('dash-auth-submit');
    const toggleBtn = document.getElementById('dash-auth-toggle');

    let mode = 'signin';

    function updateToggle(){
      if (mode === 'signin') {
        submitBtn.textContent = 'Sign in';
        toggleBtn.textContent = 'Need an account? Create one';
        passwordInput.setAttribute('autocomplete', 'current-password');
      } else {
        submitBtn.textContent = 'Create account';
        toggleBtn.textContent = 'Already have an account? Sign in';
        passwordInput.setAttribute('autocomplete', 'new-password');
      }
    }

    toggleBtn.addEventListener('click', () => {
      mode = mode === 'signin' ? 'signup' : 'signin';
      updateToggle();
      setError('');
    });

    async function submit(){
      const email = (emailInput.value || '').trim();
      const password = passwordInput.value || '';
      if (!email || !password) {
        setError('Enter both email and password.');
        return;
      }
      submitBtn.disabled = true;
      submitBtn.textContent = mode === 'signin' ? 'Signing in…' : 'Creating…';
      setError('');
      try {
        if (mode === 'signin') {
          await window.CloudAuth.signIn(email, password);
        } else {
          await window.CloudAuth.signUp(email, password);
          setError('Account created. Please verify your email if required, then sign in.');
          mode = 'signin';
          updateToggle();
        }
      } catch (err) {
        setError(err.message || 'Authentication failed.');
      } finally {
        submitBtn.disabled = false;
        updateToggle();
      }
    }

    submitBtn.addEventListener('click', submit);
    passwordInput.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') submit(); });
    emailInput.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') submit(); });

    if (options.autoFocusEmail !== false) {
      setTimeout(() => emailInput.focus(), 150);
    }

    window.CloudAuth.onChange(user => {
      if (user) {
        setStatus(user.email || 'Signed in');
        setOverlayVisible(false);
        setSignOutVisible(true);
      } else {
        setStatus('Not signed in');
        setSignOutVisible(false);
        if (options.requireAuth !== false) setOverlayVisible(true);
      }
    });

    if (options.requireAuth !== false) {
      window.CloudAuth.requireAuth().catch(() => setOverlayVisible(true));
    }
  }

  window.DashboardAuth = { init };
})();
