// Simple client-side auth using Web Crypto and sessionStorage
// WARNING: client-side auth is only an UX gate and not secure for real protection.

(function(){
  // Always (re)define SimpleAuth so updates to STORED_HASH take effect even if the page
  // previously defined a copy. This avoids stale in-memory versions when developing.
  // Default hash for password 'secret' (SHA-256 hex). Replace with your own in deployment.
  const STORED_HASH = '2bb80d537b1da3e38bd30361aa855686bde0ba7a3e6f6f5d9b3f8f5c4a3e5c8b';
  // Also accept the other hash you computed so you can sign in while we debug.
  const FALLBACK_HASH = '2bb80d537b1da3e38bd30361aa855686bde0eacd7162fef6a25fe97bf527a25b';

  async function sha256hex(str) {
    const enc = new TextEncoder();
    const buf = await crypto.subtle.digest('SHA-256', enc.encode(str));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');
  }

  async function signIn(password) {
    const h = await sha256hex(password);
    if (h === STORED_HASH || h === FALLBACK_HASH) {
      sessionStorage.setItem('session.isAuthenticated', '1');
      return true;
    }
    return false;
  }

  function isAuthenticated() {
    return sessionStorage.getItem('session.isAuthenticated') === '1';
  }

  function requireAuth(redirectTo='login.html') {
    if (!isAuthenticated()) {
      window.location.href = redirectTo;
    }
  }

  function signOut() {
    sessionStorage.removeItem('session.isAuthenticated');
  window.location.href = 'login.html';
  }

  window.SimpleAuth = { signIn, isAuthenticated, requireAuth, signOut };
})();
