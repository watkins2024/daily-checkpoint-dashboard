// demo.js — self-contained, no-login demo mode for the Daily Checkpoint dashboard.
//
// Why this exists:
//   Every page is normally gated behind a Supabase login overlay, and with an
//   empty account every tile reads "No data". That makes it impossible to just
//   open the site on a phone and have a play. Demo mode fixes that: it seeds a
//   rich set of realistic sample data and lets you tap around every page with
//   no sign-in.
//
// How it stays safe:
//   This file loads BEFORE store-sync.js and auth-ui.js. When demo mode is on it
//   defines window.store / StoreSync / CloudAuth / DashboardAuth itself, so the
//   real scripts hit their `if (window.X) return;` guards and never run. There is
//   no Supabase client and nothing is written to the real `dash.*` localStorage
//   keys — demo data lives in sessionStorage and disappears when the tab closes.
//   When demo mode is OFF this file does nothing and the real app runs untouched.
//
// Activate:   any page with ?demo=1  (e.g. index.html?demo=1, or open demo.html)
// Deactivate: ?demo=0  — clears the flag and reloads the real app.

(function () {
  var FLAG = 'cp_demo_mode';
  var DATA = 'cp_demo_data_v1';

  // ---- Resolve demo mode from the URL or a sticky session flag -------------
  var params = new URLSearchParams(location.search);
  if (params.get('demo') === '1') {
    try { sessionStorage.setItem(FLAG, '1'); } catch (e) {}
  } else if (params.get('demo') === '0') {
    try {
      sessionStorage.removeItem(FLAG);
      sessionStorage.removeItem(DATA);
    } catch (e) {}
    return; // fall through to the real app
  }

  var demoOn = false;
  try { demoOn = sessionStorage.getItem(FLAG) === '1'; } catch (e) {}
  if (!demoOn) return; // real app, untouched

  // ===========================================================================
  // Sample data — built relative to "now" so streaks / heatmaps always look live
  // ===========================================================================
  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function ymd(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function atDay(daysAgo, hour, min) {
    var d = new Date();
    d.setDate(d.getDate() - daysAgo);
    d.setHours(hour || 0, min || 0, 0, 0);
    return d;
  }
  function iso(daysAgo, hour, min) { return atDay(daysAgo, hour, min).toISOString(); }
  function weekKey(d) {
    d = d || new Date();
    var year = d.getFullYear();
    var week = Math.ceil((d - new Date(year, 0, 1)) / (7 * 24 * 60 * 60 * 1000));
    return year + '-W' + week;
  }

  var WEATHER = ['Clear', 'Cloud', 'Cold', 'Wind', 'Rain'];
  var MOODS = ['Calm', 'Focused', 'Charged', 'Ragged'];
  var MOONS = ['Waning Gibbous', 'Last Quarter', 'Waning Crescent', 'New Moon',
               'Waxing Crescent', 'First Quarter', 'Waxing Gibbous', 'Full Moon'];
  var LOCATIONS = ['Riverbank loop', 'Headland track', 'Beach to pier', 'Forest fire-trail',
                   'Estuary path', 'Ridge lookout', 'Harbour foreshore'];

  function buildWalks() {
    var out = [];
    // A 7-day streak ending today, newest first.
    for (var i = 0; i < 7; i++) {
      out.push({
        date: iso(i, 6, 8 + (i % 5)),
        location: LOCATIONS[i % LOCATIONS.length],
        weather: WEATHER[i % WEATHER.length],
        mood: MOODS[i % MOODS.length],
        star: i % 3 === 0,
        salt: i % 2 === 0,
        notes: i === 0 ? 'Crisp dawn start, mind clear by the turnaround.'
                       : (i === 3 ? 'Pushed the pace on the back half.' : ''),
        moonPhase: MOONS[i % MOONS.length]
      });
    }
    return out;
  }

  function buildLadder() {
    // Mirrors leverage.html's hard-coded default ladder, with some milestones
    // flipped to completed so the rings show real progress.
    var ladder = [
      { name: 'Independent Cashflow (Airbnb Ops)', weight: 4, milestones: [
        { stage: 'Seed', text: 'Validate one paying client at $300–$400/mo', completed: true },
        { stage: 'Active', text: 'Standardise the offer + route and reporting', completed: true },
        { stage: 'Growing', text: 'Reach $1,200+/mo with 3 clients', completed: false },
        { stage: 'Stable', text: 'Document ops and hire a helper 5–10 hrs/wk', completed: false },
        { stage: 'Autonomous', text: 'Owner-time ≤ 10 hrs/mo; keep margin ≥ 40%', completed: false } ] },
      { name: 'Survival Buffer', weight: 3, milestones: [
        { stage: 'Seed', text: 'Open “Runway” account + first transfer', completed: true },
        { stage: 'Active', text: '1 month essentials funded', completed: true },
        { stage: 'Growing', text: '3 months funded', completed: true },
        { stage: 'Stable', text: '6 months funded', completed: false },
        { stage: 'Autonomous', text: '12+ months + written rules of use', completed: false } ] },
      { name: 'Lean Cost Index (Family Cash Design)', weight: 2, milestones: [
        { stage: 'Seed', text: 'Move 3 recurring bills to better/cheaper', completed: true },
        { stage: 'Active', text: 'Create simple “Money Map” (no budget)', completed: true },
        { stage: 'Growing', text: 'Lower baseline by 10%', completed: false },
        { stage: 'Stable', text: 'Lower baseline by 20%', completed: false },
        { stage: 'Autonomous', text: 'Maintain lean baseline 6+ months', completed: false } ] },
      { name: 'Productised Value (Add‑on Offers)', weight: 3, milestones: [
        { stage: 'Seed', text: 'Define 1 add-on (kit or mini‑service)', completed: true },
        { stage: 'Active', text: 'Sell first add‑on to an existing client', completed: false },
        { stage: 'Growing', text: '$300+/mo from add‑ons', completed: false },
        { stage: 'Stable', text: 'Automate ordering + delivery', completed: false },
        { stage: 'Autonomous', text: '2–3 add‑ons running with SOP', completed: false } ] },
      { name: 'Exchange Network', weight: 2, milestones: [
        { stage: 'Seed', text: 'Create list of 10 complementary partners', completed: true },
        { stage: 'Active', text: 'Do 2 partner exchanges (referrals ↔ perks)', completed: false },
        { stage: 'Growing', text: '5 active partners feeding leads', completed: false },
        { stage: 'Stable', text: '1 partner contract/month min', completed: false },
        { stage: 'Autonomous', text: 'Weekly lead flow via partners', completed: false } ] },
      { name: 'Systems Autonomy', weight: 2, milestones: [
        { stage: 'Seed', text: 'Back up ops + create a one‑page SOP', completed: true },
        { stage: 'Active', text: 'Simple CRM + route schedule live', completed: true },
        { stage: 'Growing', text: 'Photo report template + auto-send', completed: false },
        { stage: 'Stable', text: 'Checklist app + shared calendar', completed: false },
        { stage: 'Autonomous', text: 'Ops run if you step away 4 weeks', completed: false } ] },
      { name: 'Multi-Source Income', weight: 3, milestones: [
        { stage: 'Seed', text: 'Add one small remote/online stream', completed: true },
        { stage: 'Active', text: 'Earn from 2 sources in one month', completed: false },
        { stage: 'Growing', text: 'Maintain 3 active streams', completed: false },
        { stage: 'Stable', text: '4+ reliable payers', completed: false },
        { stage: 'Autonomous', text: 'No source >40% of income', completed: false } ] },
      { name: 'Physical Base', weight: 2, milestones: [
        { stage: 'Seed', text: 'Choose a low‑friction service radius', completed: true },
        { stage: 'Active', text: 'Lock a route plan (drive time < 45m)', completed: true },
        { stage: 'Growing', text: 'Secure storage + supplies area', completed: false },
        { stage: 'Stable', text: 'Base established and profitable', completed: false },
        { stage: 'Autonomous', text: 'Ops independent of a single location', completed: false } ] },
      { name: 'Compliance Mastery (AU)', weight: 2, milestones: [
        { stage: 'Seed', text: 'ABN + basic insurance confirmed', completed: true },
        { stage: 'Active', text: 'BAS/tax set‑aside % and workflow', completed: true },
        { stage: 'Growing', text: 'Quarterly obligations unaided', completed: false },
        { stage: 'Stable', text: 'Confident across tax/insurance processes', completed: false },
        { stage: 'Autonomous', text: 'Documented checklist + help someone', completed: false } ] },
      { name: 'Strategic Redundancy', weight: 1, milestones: [
        { stage: 'Seed', text: 'Duplicate phone tools + contacts', completed: true },
        { stage: 'Active', text: 'Backup power + comms', completed: false },
        { stage: 'Growing', text: 'Spare mower/consumables pack', completed: false },
        { stage: 'Stable', text: 'All essential gear covered', completed: false },
        { stage: 'Autonomous', text: 'Survives any single failure', completed: false } ] },
      { name: 'Repair Capability', weight: 1, milestones: [
        { stage: 'Seed', text: 'Learn basic mower maintenance', completed: true },
        { stage: 'Active', text: 'Sharpen/replace blades yourself', completed: true },
        { stage: 'Growing', text: 'Fix 2 common small issues solo', completed: false },
        { stage: 'Stable', text: '3 verified competencies', completed: false },
        { stage: 'Autonomous', text: 'Teach or document for helper', completed: false } ] },
      { name: 'Reflection Loop', weight: 2, milestones: [
        { stage: 'Seed', text: 'Write one weekly reflection', completed: true },
        { stage: 'Active', text: '4 reflections in a row', completed: true },
        { stage: 'Growing', text: 'Spot one pattern from notes', completed: true },
        { stage: 'Stable', text: 'Weekly review automatic', completed: false },
        { stage: 'Autonomous', text: 'Reflections guide decisions', completed: false } ] }
    ];
    return ladder;
  }

  function buildTimeline() {
    // 9 weekly household-balance snapshots trending upward.
    var totals = [4200, 4650, 4400, 5100, 5550, 5300, 6100, 6450, 6820];
    var out = [];
    for (var i = 0; i < totals.length; i++) {
      var daysAgo = (totals.length - 1 - i) * 7; // oldest first, newest = today
      out.push({ when: iso(daysAgo, 9, 0), total: totals[i] });
    }
    return out;
  }

  function seed() {
    var data = {};

    data['fh.walks'] = buildWalks();

    data['work.tasks'] = [
      { text: 'Mark Yr10 essays + upload grades', priority: 'high', done: false, id: Date.now() - 5 },
      { text: 'Prep Friday lesson slides', priority: 'medium', done: false, id: Date.now() - 4 },
      { text: 'Reply to parent emails', priority: 'medium', done: true, id: Date.now() - 3 },
      { text: 'Book staff PD session', priority: 'low', done: false, id: Date.now() - 2 },
      { text: 'Tidy resources drive', priority: 'low', done: true, id: Date.now() - 1 }
    ];

    data['work.dailySummaries'] = {};
    data['work.dailySummaries'][ymd(atDay(1))] = 'Solid teaching day. Yr10 engaged on the persuasive unit.';
    data['work.dailySummaries'][ymd(atDay(2))] = 'Marking backlog cleared. Felt ahead for once.';

    data['work.classNotes'] = {};
    data['work.classNotes'][ymd(atDay(0)) + '-0'] = 'Started persuasive writing — strong hooks from the back row.';
    data['work.classNotes'][ymd(atDay(0)) + '-1'] = 'Quiet group, needs more scaffolding next time.';
    data['work.classNotes'][ymd(atDay(1)) + '-0'] = 'Reviewed feedback, students revising drafts well.';

    data['work.log'] = [
      { noteKey: ymd(atDay(0)) + '-0', date: iso(0, 9, 5), timestamp: iso(0, 9, 5), className: 'English Yr10', notes: 'Started persuasive writing — strong hooks from the back row.' },
      { noteKey: ymd(atDay(0)) + '-1', date: iso(0, 9, 55), timestamp: iso(0, 9, 55), className: 'English Yr9', notes: 'Quiet group, needs more scaffolding next time.' },
      { noteKey: ymd(atDay(1)) + '-0', date: iso(1, 9, 5), timestamp: iso(1, 9, 5), className: 'English Yr10', notes: 'Reviewed feedback, students revising drafts well.' }
    ];

    data['work.schedule'] = {
      Monday: '9:05 - English Yr10 - SENGP3 WATR\n9:55 - English Yr9 - SENGP1 WATR\n11:30 - Study Skills - LIB2',
      Tuesday: '9:05 - English Yr10 - SENGP3 WATR\n10:45 - English Yr11 - SENGP4 WATR',
      Wednesday: '9:55 - English Yr9 - SENGP1 WATR\n11:30 - English Yr11 - SENGP4 WATR',
      Thursday: '9:05 - English Yr10 - SENGP3 WATR\n9:55 - English Yr9 - SENGP1 WATR',
      Friday: '9:05 - English Yr10 - SENGP3 WATR\n10:45 - English Yr11 - SENGP4 WATR\n11:30 - Study Skills - LIB2'
    };

    data['fh.clients'] = [
      { id: Date.now() - 30, addr: '14 Marine Pde, Byron', plan: 'Weekly', price: 420, contractor: 'Sam', active: true },
      { id: Date.now() - 20, addr: '8 Hill St, Lennox', plan: 'Weekly', price: 380, contractor: 'Sam', active: true },
      { id: Date.now() - 10, addr: '2/5 Reef Cl, Ballina', plan: 'Monthly', price: 400, contractor: 'Jess', active: true },
      { id: Date.now() - 5, addr: '19 Ridge Rd, Suffolk', plan: 'Weekly', price: 360, contractor: '', active: false }
    ];

    data['fh.contractors'] = [
      { id: Date.now() - 40, name: 'Sam' },
      { id: Date.now() - 35, name: 'Jess' }
    ];

    data['fh.outreach'] = { count: 4, week: weekKey() };

    data['fh.pipeline'] = [
      { id: Date.now() - 9, property: '33 Tallow Beach Rd', name: 'Dana K.', email: 'dana@example.com', stage: 'Leads' },
      { id: Date.now() - 8, property: '6 Skinners Dr', name: 'Owen P.', email: 'owen@example.com', stage: 'Contacted' },
      { id: Date.now() - 7, property: '11 Coral Ave', name: 'Mia R.', email: 'mia@example.com', stage: 'Discovery' },
      { id: Date.now() - 6, property: '4 Lighthouse Rd', name: 'Theo W.', email: 'theo@example.com', stage: 'Trial' },
      { id: Date.now() - 11, property: '14 Marine Pde', name: 'Existing', email: '', stage: 'Active' }
    ];

    var sprint = [
      { text: 'Launch website & ABN', done: true },
      { text: 'Call 5 cleaning companies (10–15% referral)', done: true },
      { text: 'Post in 3 property investor groups', done: true },
      { text: 'Deep research 20 properties', done: false },
      { text: 'Send 10 personalized emails', done: false },
      { text: 'Book 2–3 discovery calls', done: false },
      { text: 'Onboard 1–3 pilot clients', done: false },
      { text: 'Deliver first weekly reports', done: false }
    ];
    data['fh.sprint'] = sprint;

    data['fh.progress'] = [
      { date: iso(0, 8, 30), text: 'Sent 4 outreach emails to investor-group leads.' },
      { date: iso(1, 16, 10), text: 'Discovery call booked with Mia R. for next week.' },
      { date: iso(2, 11, 0), text: 'Published the one-page ops report template.' },
      { date: iso(4, 9, 20), text: 'Signed 3rd client — Reef Cl on monthly plan.' },
      { date: iso(6, 14, 0), text: 'Standardised the photo-report workflow.' }
    ];

    data['lev.ladder'] = buildLadder();
    data['lev.focus'] = 0;
    data['lev.mode'] = 'gentle';
    data['lev.actions'] = [
      { date: iso(0, 8, 0), metric: 'Survival Buffer', description: 'Step: Moved $80 into the Runway account.' },
      { date: iso(1, 19, 30), metric: 'Independent Cashflow (Airbnb Ops)', description: 'Completed: Standardised offer + reporting.' },
      { date: iso(3, 7, 45), metric: 'Reflection Loop', description: 'Evidence: Wrote weekly reflection, spotted a pattern.' },
      { date: iso(5, 12, 0), metric: 'Systems Autonomy', description: 'Step: CRM + route schedule now live.' }
    ];
    data['lev.evidence'] = {
      'Survival Buffer': [
        { date: iso(0, 8, 0), text: 'Runway balance now covers 3 months of essentials.' }
      ],
      'Independent Cashflow (Airbnb Ops)': [
        { date: iso(1, 19, 30), text: 'Three clients live, reporting standardised.' }
      ],
      'Reflection Loop': [
        { date: iso(3, 7, 45), text: 'Four weekly reflections in a row — momentum holds.' }
      ]
    };

    var timeline = buildTimeline();
    data['house.timeline'] = timeline;
    data['household.total'] = timeline[timeline.length - 1].total;
    data['household.lastEntry'] = atDay(0, 9, 0).getTime();

    data['checkpoints'] = {};
    var cp1 = ymd(atDay(1));
    data['checkpoints'][cp1] = {
      date: cp1, score: 84,
      reflection: 'Good rhythm — walk, teaching, then a real business block in the evening.',
      wins: 'Booked a discovery call. Cleared marking. Walked at dawn.',
      focus: 'Protect the morning deep-work hour.',
      savedAt: iso(1, 21, 10)
    };
    var cp2 = ymd(atDay(3));
    data['checkpoints'][cp2] = {
      date: cp2, score: 72,
      reflection: 'Scattered afternoon, but recovered with an evening reset.',
      wins: 'Shipped the report template.',
      focus: 'Batch admin into one slot.',
      savedAt: iso(3, 20, 40)
    };

    return data;
  }

  // ---- Mock store backed by sessionStorage ---------------------------------
  var state;
  try {
    var raw = sessionStorage.getItem(DATA);
    state = raw ? JSON.parse(raw) : null;
  } catch (e) { state = null; }
  if (!state) {
    state = seed();
    try { sessionStorage.setItem(DATA, JSON.stringify(state)); } catch (e) {}
  }

  function persist() {
    try { sessionStorage.setItem(DATA, JSON.stringify(state)); } catch (e) {}
  }

  var dataHandlers = [];
  function notify(keys) {
    var unique = Array.from(new Set(keys));
    dataHandlers.forEach(function (fn) { try { fn(unique); } catch (e) { console.error(e); } });
    window.dispatchEvent(new CustomEvent('store:data', { detail: { keys: unique } }));
  }

  var store = {
    get: function (key, def) {
      if (def === undefined) def = null;
      return Object.prototype.hasOwnProperty.call(state, key) ? state[key] : def;
    },
    set: function (key, value) {
      state[key] = value;
      persist();
      notify([key]);
    },
    remove: function (key) {
      delete state[key];
      persist();
      notify([key]);
    },
    onSyncStatus: function (fn) { try { fn('idle'); } catch (e) {} },
    subscribe: function (fn) { dataHandlers.push(fn); },
    flush: function () { return Promise.resolve(); },
    status: function () { return 'idle'; }
  };

  var demoUser = { id: 'demo-user', email: 'demo@checkpoint.app' };
  var auth = {
    signIn: function () { return Promise.resolve(demoUser); },
    signUp: function () { return Promise.resolve(demoUser); },
    signOut: function () { exitDemo(); return Promise.resolve(); },
    onChange: function (fn) { try { fn(demoUser); } catch (e) {} },
    getUser: function () { return demoUser; },
    requireAuth: function () { return Promise.resolve(demoUser); }
  };

  function exitDemo() {
    try {
      sessionStorage.removeItem(FLAG);
      sessionStorage.removeItem(DATA);
    } catch (e) {}
    location.href = 'index.html';
  }
  function resetDemo() {
    state = seed();
    persist();
    location.reload();
  }

  // Claim the globals so the real store-sync.js / auth-ui.js short-circuit.
  window.StoreSync = store;
  window.store = store;
  window.CloudAuth = auth;

  // ---- Demo chrome: responsive nav + a small status/control pill -----------
  function injectChrome() {
    if (document.getElementById('cp-demo-styles')) return;
    var style = document.createElement('style');
    style.id = 'cp-demo-styles';
    style.textContent =
      '@media (max-width:640px){.top-nav{overflow-x:auto;-webkit-overflow-scrolling:touch;' +
      'flex-wrap:nowrap;scrollbar-width:none}.top-nav::-webkit-scrollbar{display:none}' +
      '.top-nav a{flex:0 0 auto;white-space:nowrap}}' +
      '.cp-demo-pill{position:fixed;right:12px;bottom:12px;z-index:10000;display:flex;gap:8px;' +
      'align-items:center;background:rgba(8,16,26,0.92);border:1px solid rgba(123,227,255,0.3);' +
      'border-radius:999px;padding:7px 10px 7px 14px;box-shadow:0 8px 24px rgba(0,0,0,0.45);' +
      "font-family:system-ui,-apple-system,'Segoe UI',Roboto,Arial;font-size:12px;color:#bfe7ff}" +
      '.cp-demo-pill b{color:#6cf3b1;letter-spacing:0.08em}' +
      '.cp-demo-pill button{border:none;cursor:pointer;border-radius:999px;padding:5px 11px;' +
      'font-size:12px;font-family:inherit;font-weight:600}' +
      '.cp-demo-pill .cp-reset{background:rgba(123,227,255,0.14);color:#bfe7ff;border:1px solid rgba(123,227,255,0.3)}' +
      '.cp-demo-pill .cp-exit{background:linear-gradient(90deg,#7be3ff,#6cf3b1);color:#05121d}';
    document.head.appendChild(style);

    if (document.getElementById('cp-demo-pill')) return;
    var pill = document.createElement('div');
    pill.id = 'cp-demo-pill';
    pill.className = 'cp-demo-pill';
    pill.innerHTML = '<span><b>DEMO</b> · sample data</span>' +
      '<button class="cp-reset" type="button">Reset</button>' +
      '<button class="cp-exit" type="button">Exit</button>';
    document.body.appendChild(pill);
    pill.querySelector('.cp-reset').addEventListener('click', resetDemo);
    pill.querySelector('.cp-exit').addEventListener('click', exitDemo);
  }

  // Provide a DashboardAuth shim so auth-ui.js short-circuits and no overlay shows.
  window.DashboardAuth = {
    init: function () {
      if (document.body) injectChrome();
      else document.addEventListener('DOMContentLoaded', injectChrome);
    }
  };

  // Some pages don't call DashboardAuth.init() until DOMContentLoaded; make sure
  // the demo chrome always appears regardless of timing.
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectChrome);
  } else {
    injectChrome();
  }
})();
