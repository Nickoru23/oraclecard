/* ===== The Witch Atelier — the ledger =====

   What the atelier keeps about a visitor, and where it keeps it.

   Everything in this file lives in that visitor's own browser, in one
   localStorage key, and is never sent anywhere. There is no account, no
   identifier and no request: the ledger costs nothing to run and nothing to
   host, which is the only reason it can exist on a site with no database.

   Three things are tracked.

     the day's ritual   three free things, done or not done today
     the days kept      a day on which all three were done, and the run of them
     the standing       a rank that follows the days kept, and the sigils earned

   Clearing site data clears the ledger. That is stated on the privacy page,
   and it is the honest trade for asking nobody to sign up for anything.      */

(function () {
  'use strict';

  const KEY = 'twa_ritual';
  const TASKS = ['cookie', 'card', 'spread'];     /* the three that keep a day */
  const CAL_DAYS = 28;

  /* the ranks, by days kept */
  const RANKS = [
    { id: 0, at: 0 }, { id: 1, at: 1 }, { id: 2, at: 3 },
    { id: 3, at: 7 }, { id: 4, at: 14 }, { id: 5, at: 30 },
  ];

  /* the sigils, and what earns each one */
  const SIGILS = [
    { id: 'first_light', test: s => s.kept.length >= 1 },
    { id: 'three_nights', test: s => s.best >= 3 },
    { id: 'seven_nights', test: s => s.best >= 7 },
    { id: 'moon_turn', test: s => s.best >= 28 },
    { id: 'full_table', test: s => Object.keys(s.spreads).length >= 4 },
    { id: 'open_question', test: s => (s.total.ask || 0) >= 1 },
    { id: 'thirteen', test: s => s.kept.length >= 13 },
    { id: 'three_tongues', test: s => (s.langs || []).length >= 3 },
  ];

  const today = () => {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') +
           '-' + String(d.getDate()).padStart(2, '0');
  };
  const dayBefore = (iso, n) => {
    const [y, m, d] = iso.split('-').map(Number);
    const t = new Date(y, m - 1, d - n);
    return t.getFullYear() + '-' + String(t.getMonth() + 1).padStart(2, '0') +
           '-' + String(t.getDate()).padStart(2, '0');
  };

  const BLANK = () => ({
    v: 1, day: today(), done: {}, kept: [], streak: 0, best: 0,
    total: {}, spreads: {}, langs: [], sigils: [],
  });

  function load() {
    let s;
    try { s = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { s = null; }
    if (!s || s.v !== 1) s = BLANK();
    /* fill anything an older shape is missing rather than throwing it away */
    const b = BLANK();
    for (const k in b) if (s[k] === undefined) s[k] = b[k];
    if (s.day !== today()) { s.day = today(); s.done = {}; }
    s.streak = runLength(s.kept);
    return s;
  }

  function save(s) {
    try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) { /* private mode */ }
  }

  /* the run of consecutive kept days ending today or yesterday. Ending
     yesterday still counts, so a streak is not lost until a day is missed. */
  function runLength(kept) {
    if (!kept.length) return 0;
    const set = new Set(kept);
    let cursor = today();
    if (!set.has(cursor)) {
      cursor = dayBefore(cursor, 1);
      if (!set.has(cursor)) return 0;
    }
    let n = 0;
    while (set.has(cursor)) { n++; cursor = dayBefore(cursor, 1); }
    return n;
  }

  let state = load();

  const changed = () => {
    save(state);
    document.dispatchEvent(new CustomEvent('ritualchange', { detail: snapshot() }));
  };

  function awardSigils() {
    let fresh = null;
    for (const g of SIGILS) {
      if (state.sigils.indexOf(g.id) === -1 && g.test(state)) {
        state.sigils.push(g.id);
        if (!fresh) fresh = g.id;
      }
    }
    return fresh;
  }

  function rankOf(days) {
    let r = RANKS[0];
    for (const x of RANKS) if (days >= x.at) r = x;
    return r.id;
  }
  function nextRank(days) {
    for (const x of RANKS) if (days < x.at) return x;
    return null;
  }

  function snapshot() {
    const kept = state.kept.length;
    const nx = nextRank(kept);
    return {
      day: state.day,
      done: Object.assign({}, state.done),
      tasks: TASKS.slice(),
      complete: TASKS.every(t => state.done[t]),
      streak: state.streak,
      best: state.best,
      kept: kept,
      keptDays: state.kept.slice(),
      rank: rankOf(kept),
      nextRankAt: nx ? nx.at : null,
      nextRankIn: nx ? nx.at - kept : null,
      sigils: state.sigils.slice(),
      allSigils: SIGILS.map(g => g.id),
      spreads: Object.keys(state.spreads),
      total: Object.assign({}, state.total),
    };
  }

  /* ---------- the things a page tells the ledger ---------- */

  function mark(task) {
    if (state.day !== today()) { state.day = today(); state.done = {}; }
    const first = !state.done[task];
    state.done[task] = 1;
    state.total[task] = (state.total[task] || 0) + (first ? 1 : 0);

    /* a day is kept once all three are done, and only counted once */
    if (TASKS.every(t => state.done[t]) && state.kept.indexOf(state.day) === -1) {
      state.kept.push(state.day);
      state.kept = state.kept.slice(-400);
      state.streak = runLength(state.kept);
      if (state.streak > state.best) state.best = state.streak;
    }
    const fresh = awardSigils();
    changed();
    if (fresh) document.dispatchEvent(new CustomEvent('sigil', { detail: fresh }));
    return snapshot();
  }

  function spreadLaid(kind) {
    if (kind) state.spreads[kind] = 1;
    return mark('spread');
  }

  function langSeen(lang) {
    if (lang && state.langs.indexOf(lang) === -1) {
      state.langs.push(lang);
      const fresh = awardSigils();
      changed();
      if (fresh) document.dispatchEvent(new CustomEvent('sigil', { detail: fresh }));
    }
  }

  function calendar() {
    const set = new Set(state.kept), out = [];
    for (let i = CAL_DAYS - 1; i >= 0; i--) {
      const d = dayBefore(today(), i);
      out.push({ day: d, kept: set.has(d), today: i === 0 });
    }
    return out;
  }

  window.Ritual = {
    get: snapshot,
    mark, spreadLaid, langSeen, calendar,
    TASKS: TASKS.slice(),
    RANKS: RANKS.map(r => r.id),
    SIGILS: SIGILS.map(g => g.id),
    /* only for the tests, and for a visitor who asks to be forgotten */
    forget() { state = BLANK(); save(state); changed(); },
  };
})();
