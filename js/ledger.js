/* ===== The Witch Atelier — the ledger, as it is drawn =====

   Two pieces of furniture read from window.Ritual:

     the tally    a small brass count in the header, on every page
     the ledger   the full sheet on the front page: the day's three tasks, the
                  run of days kept, the standing, and the sigils earned

   Neither knows anything the ledger has not been told, and the ledger knows
   nothing that is not in this browser.                                       */

(function () {
  'use strict';

  const t = k => (window.t ? window.t(k) : k);
  const fill = (s, n) => String(s).replace('{n}', n);
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  /* where each task is done, so a row can send you there */
  const WHERE = { cookie: '/galleta.html', card: '/horoscopo.html', spread: '/#tiradas' };

  /* ---------- the marks ---------- */

  const flame = `<svg viewBox="0 0 24 24" aria-hidden="true" class="flame">
    <path d="M12 2c2.4 3.6 5.6 5.6 5.6 10A5.6 5.6 0 0 1 12 22a5.6 5.6 0 0 1-5.6-10C6.4 7.6 9.6 5.6 12 2Z" fill="currentColor"/>
    <path d="M12 11c1.2 1.8 2.4 2.6 2.4 4.6A2.4 2.4 0 0 1 12 18a2.4 2.4 0 0 1-2.4-2.4c0-2 1.2-2.8 2.4-4.6Z" fill="#1B120A" opacity=".55"/></svg>`;

  /* a struck wax seal, for a task that is done */
  const seal = `<svg viewBox="0 0 34 34" aria-hidden="true">
    <path d="M17 1.6c3 2.4 6.6 1 8.4 3.6 1.8 2.6.4 6 2.6 8.2 2.2 2.2 2.2 5.2 0 7.4-2.2 2.2-.8 5.6-2.6 8.2-1.8 2.6-5.4 1.2-8.4 3.6-3-2.4-6.6-1-8.4-3.6-1.8-2.6-.4-6-2.6-8.2-2.2-2.2-2.2-5.2 0-7.4 2.2-2.2.8-5.6 2.6-8.2C10.4 2.6 14 4 17 1.6Z" fill="#9E4038"/>
    <path d="M11.4 17.4 15.4 21.4 23 13.4" fill="none" stroke="#F2ECDE" stroke-width="2.6"
          stroke-linecap="round" stroke-linejoin="round"/></svg>`;

  /* an unstruck ring, for a task still to do */
  const ring = `<svg viewBox="0 0 34 34" aria-hidden="true">
    <circle cx="17" cy="17" r="13" fill="none" stroke="currentColor" stroke-width="1.6"
            stroke-dasharray="3 4" opacity=".7"/></svg>`;

  /* the eight sigils, struck as brass medallions */
  const DEVICE = {
    first_light: '<path d="M20 8c2 3 4.4 4.6 4.4 8A4.4 4.4 0 0 1 20 30a4.4 4.4 0 0 1-4.4-14c0-3.4 2.4-5 4.4-8Z"/>',
    three_nights: '<circle cx="13" cy="22" r="3.4"/><circle cx="20" cy="15" r="3.4"/><circle cx="27" cy="22" r="3.4"/>',
    seven_nights: '<path d="M20 7 22.4 16.6 32 19 22.4 21.4 20 31 17.6 21.4 8 19 17.6 16.6Z"/>',
    moon_turn: '<path d="M25 8a12 12 0 1 0 0 24 14 14 0 0 1 0-24Z"/>',
    full_table: '<path d="M20 6.5 24 12h-8ZM20 33.5 16 28h8ZM6.5 20 12 16v8ZM33.5 20 28 24v-8Z"/><circle cx="20" cy="20" r="4.2"/>',
    open_question: '<path d="M14.5 15.5a5.5 5.5 0 0 1 10.8 1.4c0 3.6-4.8 4-4.8 7.4" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><circle cx="20.4" cy="29.4" r="2.3"/>',
    thirteen: '<path d="M13.5 12h2.2v16h-3V15.4l-2.4 1.2-.8-2.6ZM21 12h7.6v2.6l-3.6 4.2c2.6.3 4.2 2 4.2 4.4 0 3-2.2 5-5.4 5-1.8 0-3.4-.5-4.6-1.4l1.1-2.4c1 .7 2.1 1.1 3.3 1.1 1.6 0 2.7-.9 2.7-2.3 0-1.5-1.2-2.4-3.3-2.4h-1.2v-2.2l3.4-4h-4.2Z"/>',
    three_tongues: '<rect x="9" y="12" width="22" height="3.2" rx="1.6"/><rect x="9" y="18.4" width="22" height="3.2" rx="1.6"/><rect x="9" y="24.8" width="22" height="3.2" rx="1.6"/>',
  };

  const sigilSVG = id => `<svg viewBox="0 0 40 40" aria-hidden="true">
    <circle cx="20" cy="20" r="18.4" class="sg-face"/>
    <circle cx="20" cy="20" r="15.6" class="sg-rim"/>
    <g class="sg-device">${DEVICE[id] || ''}</g></svg>`;

  /* ---------- the tally in the header ---------- */

  function paintTally() {
    const s = window.Ritual.get();
    document.querySelectorAll('[data-tally]').forEach(el => {
      el.classList.toggle('is-lit', s.streak > 0);
      el.setAttribute('title', fill(t(s.streak === 1 ? 'ritual_streak_1' : 'ritual_streak'), s.streak));
      el.innerHTML = `${flame}<b>${s.streak}</b>
        <span class="vh">${esc(fill(t(s.streak === 1 ? 'ritual_streak_1' : 'ritual_streak'), s.streak))}</span>`;
    });
  }

  function mountTally() {
    document.querySelectorAll('.nav nav').forEach(nav => {
      if (nav.querySelector('[data-tally]')) return;
      const a = document.createElement('a');
      a.className = 'tally';
      a.setAttribute('data-tally', '');
      a.href = '/#ritual';
      nav.insertBefore(a, nav.querySelector('.lang'));
    });
    paintTally();
  }

  /* ---------- the ledger sheet ---------- */

  function paintLedger() {
    const host = document.getElementById('ritual-ledger');
    if (!host) return;
    const s = window.Ritual.get();

    const rows = s.tasks.map(k => {
      const done = !!s.done[k];
      return `<li class="ritual-row${done ? ' is-done' : ''}">
        <span class="mark">${done ? seal : ring}</span>
        <span class="what">${esc(t('task_' + k))}</span>
        ${done ? `<span class="state">${esc(t('ritual_kept_mark'))}</span>`
               : `<a class="go" href="${WHERE[k]}">${esc(t('ritual_go'))}</a>`}
      </li>`;
    }).join('');

    const cal = window.Ritual.calendar().map(d =>
      `<i class="${d.kept ? 'on' : ''}${d.today ? ' now' : ''}" title="${d.day}"></i>`).join('');

    const sigils = s.allSigils.map(id => {
      const got = s.sigils.indexOf(id) !== -1;
      return `<li class="sigil${got ? ' is-earned' : ''}">
        ${sigilSVG(id)}
        <b>${esc(t('sg_' + id))}</b>
        <span>${esc(t('sg_' + id + '_d'))}</span>
      </li>`;
    }).join('');

    const standing = s.nextRankAt === null
      ? esc(t('ritual_top'))
      : esc(fill(t(s.nextRankIn === 1 ? 'ritual_next_1' : 'ritual_next'), s.nextRankIn)) +
        ' <b>' + esc(t('rank' + (s.rank + 1))) + '</b>';

    host.innerHTML = `
      <div class="ledger">
        <div class="ledger-day">
          <h3>${esc(t('ritual_today'))}</h3>
          <p class="small muted">${esc(t('ritual_lede'))}</p>
          <ul class="ritual-list">${rows}</ul>
          ${s.complete ? `<p class="ritual-complete">${seal}<span>${esc(t('ritual_done_all'))}</span></p>` : ''}
        </div>
        <div class="ledger-standing">
          <h3>${esc(t('ritual_standing'))}</h3>
          <p class="rank-name">${esc(t('rank' + s.rank))}</p>
          <p class="small muted rank-next">${standing}</p>
          <dl class="tallies">
            <div><dt>${esc(t('ritual_streak_h'))}</dt><dd>${s.streak}</dd></div>
            <div><dt>${esc(t('ritual_best_h'))}</dt><dd>${s.best}</dd></div>
            <div><dt>${esc(t('ritual_kept_h'))}</dt><dd>${s.kept}</dd></div>
          </dl>
          <p class="small muted cal-h">${esc(t('ritual_cal'))}</p>
          <div class="cal">${cal}</div>
        </div>
      </div>
      <div class="sigil-block">
        <p class="small muted">${esc(fill(t('ritual_sigils'), s.sigils.length + ' / ' + s.allSigils.length))}</p>
        <ul class="sigils">${sigils}</ul>
      </div>`;
  }

  /* ---------- a sigil, the moment it is struck ---------- */

  function toast(id) {
    const el = document.createElement('div');
    el.className = 'sigil-toast';
    el.setAttribute('role', 'status');
    el.innerHTML = `${sigilSVG(id)}<div><b>${esc(t('ritual_new_sigil'))}</b>
      <span>${esc(t('sg_' + id))}</span></div>`;
    document.body.appendChild(el);
    requestAnimationFrame(() => el.classList.add('is-in'));
    setTimeout(() => { el.classList.remove('is-in'); setTimeout(() => el.remove(), 400); }, 4200);
  }

  function paint() { paintTally(); paintLedger(); }

  document.addEventListener('DOMContentLoaded', () => { mountTally(); paintLedger(); });
  document.addEventListener('ritualchange', paint);
  document.addEventListener('langchange', paint);
  document.addEventListener('sigil', e => toast(e.detail));
})();
