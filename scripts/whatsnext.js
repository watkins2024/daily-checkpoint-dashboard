// whatsnext.js — small helper for "What's Next?" modal and priority logic
(function(){
  if (window.WhatsNext) return;

  function showModal(title, body, onDoNow, onRemindLater) {
    let modal = document.getElementById('whatsNextModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'whatsNextModal';
      modal.style = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;z-index:2000;';
      modal.innerHTML = `
        <div style="background:#222;padding:20px;border-radius:10px;max-width:520px;color:#eee;">
          <h3 id="wnTitle" style="margin-top:0"></h3>
          <div id="wnBody" style="margin:12px 0"></div>
          <div style="display:flex;gap:10px;justify-content:flex-end">
            <button id="wnRemind" class="btn btn-ghost">Remind Later</button>
            <button id="wnDo" class="btn">Do It Now</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
      modal.querySelector('#wnDo').onclick = () => { modal.remove(); if (onDoNow) onDoNow(); };
      modal.querySelector('#wnRemind').onclick = () => { modal.remove(); if (onRemindLater) onRemindLater(); };
    }
    modal.querySelector('#wnTitle').textContent = title;
    modal.querySelector('#wnBody').innerHTML = body;
  }

  // Simple priority logic for Command Center
  function computeNext(store) {
    // Rule order (as requested):
    // 1) walk not logged today -> prompt walk
    const walks = store.get('fh.walks', []);
    const today = new Date().toISOString().slice(0,10);
    if (!walks.some(w => w.date && w.date.slice(0,10) === today)) {
      return { title: 'Log your walk', body: 'You haven\'t logged a walk today. Quick reflection helps.', action: 'walk' };
    }

    // 2) household balance >7 days old -> prompt entry
    const lastHouse = store.get('household.lastEntry', 0) || (store.get('house.timeline', [])[0] && new Date(store.get('house.timeline', [])[0].when).getTime());
    if (!lastHouse || (Date.now() - new Date(lastHouse).getTime()) > 7*24*3600*1000) {
      return { title: 'Update household balance', body: 'It looks like your household total needs an update (7+ days).', action: 'household' };
    }

    // 3) leverage action incomplete -> show micro-step
    const sprint = store.get('fh.sprint', []);
    if (sprint && sprint.length) {
      const next = sprint.find(s => !s.done);
      if (next) return { title: 'Next Leverage Step', body: next.text, action: 'leverage' };
    }

    return { title: 'All caught up', body: 'No high-priority next actions. Good work!', action: 'idle' };
  }

  window.WhatsNext = { showModal, computeNext };
})();
