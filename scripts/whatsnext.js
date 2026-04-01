// whatsnext.js — priority engine for "What's Next?" across all dashboard areas
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

  function getWeekKey(){
    var d = new Date();
    var year = d.getFullYear();
    var week = Math.ceil((d - new Date(year,0,1)) / (7*24*60*60*1000));
    return year + '-W' + week;
  }

  // Priority engine — checks all areas in order of urgency
  function computeNext(store) {
    if (!store || !store.get) return { title: 'All caught up', body: '', action: 'idle' };

    var today = new Date().toISOString().slice(0,10);
    var hour = new Date().getHours();

    // 1. Morning: walk not logged today -> prompt walk (before noon)
    if (hour < 14) {
      var walks = store.get('fh.walks', []);
      if (!walks.some(function(w){ return w.date && w.date.slice(0,10) === today; })) {
        return { title: 'Log your walk', body: 'You haven\'t logged a walk today. A quick dawn walk and reflection helps build momentum.', action: 'walk' };
      }
    }

    // 2. Work tasks incomplete (during work hours)
    if (hour >= 7 && hour < 18) {
      var tasks = store.get('work.tasks', []);
      var pending = tasks.filter(function(t){ return !t.done; });
      var highPriority = pending.filter(function(t){ return t.priority === 'high'; });
      if (highPriority.length > 0) {
        return { title: 'High priority task', body: highPriority[0].text + ' (' + highPriority.length + ' high priority remaining)', action: 'work' };
      }
    }

    // 3. Business outreach (if less than 2 outreach this week)
    var outreach = store.get('fh.outreach', {count:0, week:''});
    var weekKey = getWeekKey();
    var outreachCount = outreach.week === weekKey ? outreach.count : 0;
    if (outreachCount < 2) {
      var sprint = store.get('fh.sprint', []);
      var nextSprint = null;
      for (var i = 0; i < sprint.length; i++) {
        if (!sprint[i].done) { nextSprint = sprint[i]; break; }
      }
      if (nextSprint) {
        return { title: 'Business sprint', body: nextSprint.text + ' (' + outreachCount + ' outreach this week)', action: 'business' };
      }
    }

    // 4. Leverage action — no action logged today
    var levActions = store.get('lev.actions', []);
    var levToday = levActions.some(function(a){ return a.date && a.date.slice(0,10) === today; });
    if (!levToday) {
      var ladder = store.get('lev.ladder', []);
      if (ladder.length > 0) {
        var focusIdx = store.get('lev.focus', 0);
        var focusMetric = ladder[focusIdx] || ladder[0];
        return { title: 'Leverage step', body: 'Take one step on "' + focusMetric.name + '". Small moves compound.', action: 'leverage' };
      }
    }

    // 5. Household balance >7 days old
    var lastHouse = store.get('household.lastEntry', 0);
    if (!lastHouse || (Date.now() - lastHouse) > 7*24*3600*1000) {
      return { title: 'Update household balance', body: 'It\'s been ' + (lastHouse ? Math.floor((Date.now() - lastHouse)/86400000) + ' days' : 'a while') + ' since your last household update.', action: 'household' };
    }

    // 6. Walk not logged (afternoon reminder if still not done)
    var walksAll = store.get('fh.walks', []);
    if (!walksAll.some(function(w){ return w.date && w.date.slice(0,10) === today; })) {
      return { title: 'Log your walk', body: 'Still no walk logged today. Even a short one counts.', action: 'walk' };
    }

    // 7. Daily work summary not written
    var summaries = store.get('work.dailySummaries', {});
    if (!summaries[today] && hour >= 15) {
      return { title: 'Write daily summary', body: 'Reflect on your work day while it\'s fresh.', action: 'work' };
    }

    // 8. End-of-day checkpoint
    if (hour >= 19) {
      return { title: 'Daily checkpoint', body: 'Review your day and set tomorrow\'s focus.', action: 'checkpoint' };
    }

    // 9. Remaining work tasks
    var allTasks = store.get('work.tasks', []);
    var remaining = allTasks.filter(function(t){ return !t.done; });
    if (remaining.length > 0) {
      return { title: 'Finish tasks', body: remaining.length + ' task' + (remaining.length > 1 ? 's' : '') + ' remaining: ' + remaining[0].text, action: 'work' };
    }

    return { title: 'All caught up', body: 'No high-priority next actions. Good work!', action: 'idle' };
  }

  window.WhatsNext = { showModal: showModal, computeNext: computeNext };
})();
