/* ===== The Witch Atelier — the daily fortune =====

   The first thing anyone sees. Once a day, before the site itself, a few words
   write themselves onto the dark and the card that brought them rises under.

   How it behaves:

     once a day    the day it was last shown is kept in this browser, nothing
                   more, so a second visit the same day goes straight in
     never in the  it does not open on the reading form or on the page after
     way of money  payment, where an overlay between a person and their
                   purchase would be indefensible
     skippable     Escape, the button, or a click outside, and it is gone
     it counts     opening it is one of the three things that keep a day, and
                   it carries the streak, exactly as the page does

   The animation is the point of it, so it is described where it is written, in
   the stylesheet under "the words arriving". Nothing here is loaded: the
   fortune, the card and the drawing all already exist in the page.

   The overlay sits under the sigil toast on purpose. Marking the day can strike
   a sigil, and the toast has to be visible when it does.                     */

(function () {
  'use strict';

  const KEY = 'twa_greeted';
  /* not over the reading form or the page after payment, and not over the
     fortune's own page, which is this same reveal held still */
  const SKIP = ['/lectura', '/gracias', '/fortuna'];
  const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* one word every eighty five milliseconds, after a beat of dark */
  const LEAD = 0.28, STEP = 0.085, WORD = 1.25;

  const t = k => (window.t ? window.t(k) : '');
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const seenToday = day => {
    try { return localStorage.getItem(KEY) === day; } catch (e) { return true; }
  };
  const remember = day => {
    try { localStorage.setItem(KEY, day); } catch (e) {}
  };

  /* each word gets its own arrival, a beat after the one before it */
  function words(text) {
    return String(text).split(/\s+/).filter(Boolean).map((w, i) =>
      `<span class="df-w" style="animation-delay:${(LEAD + i * STEP).toFixed(3)}s">${esc(w)}</span>`
    ).join(' ');
  }

  let open = false;

  function show(force) {
    if (open || !window.COOKIE || !window.DECK || !window.cardObject) return;
    const day = window.COOKIE.dayKey();
    if (!force && seenToday(day)) return;
    if (!force && SKIP.some(p => location.pathname.indexOf(p) === 0)) return;

    const lang = window.getLang ? window.getLang() : 'es';
    const c = window.COOKIE.todaysCookie(lang);
    if (!c) return;

    /* the card waits for the last word to finish writing itself */
    const n = String(c.fortune).split(/\s+/).filter(Boolean).length;
    const after = (LEAD + Math.max(0, n - 1) * STEP + WORD * 0.55).toFixed(2);

    const el = document.createElement('div');
    el.className = 'df';
    el.style.setProperty('--df-card-delay', after + 's');
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-label', t('df_title') || 'Today');
    el.innerHTML =
      `<div class="df-sky" aria-hidden="true"></div>
       <div class="df-in">
         <p class="df-eyebrow">${esc(t('df_title'))}</p>
         <p class="df-words">${words(c.fortune)}</p>
         <div class="df-card">
           <p class="df-cardlabel">${esc(t('df_card'))}</p>
           <div class="df-cardart">${window.cardObject(c.card, lang, 'full')}</div>
           <p class="df-cardname">${esc(c.card.name[lang])}</p>
         </div>
         <button type="button" class="btn btn-gold df-go">${esc(t('df_enter'))}</button>
         <p class="df-note small">${esc(t('df_note'))}</p>
       </div>`;

    document.body.appendChild(el);
    document.documentElement.classList.add('df-open');
    open = true;
    if (REDUCED) el.classList.add('is-instant');
    requestAnimationFrame(() => el.classList.add('is-in'));

    /* reading it here counts exactly as cracking it on the page did */
    remember(day);
    window.COOKIE.markOpened();
    if (window.Ritual) window.Ritual.mark('cookie');

    const go = el.querySelector('.df-go');
    const close = () => {
      if (!open) return;
      open = false;
      el.classList.remove('is-in');
      document.documentElement.classList.remove('df-open');
      setTimeout(() => el.remove(), 520);
      document.removeEventListener('keydown', onKey);
    };
    const onKey = e => { if (e.key === 'Escape') close(); };
    go.addEventListener('click', close);
    el.addEventListener('click', e => { if (e.target === el || e.target === el.firstElementChild) close(); });
    document.addEventListener('keydown', onKey);

    /* the focus waits for the words, so a screen reader is not talked over and
       a keyboard is not handed a button before it exists to the eye */
    setTimeout(() => go.focus({ preventScroll: true }), REDUCED ? 60 : (Number(after) + 0.6) * 1000);
  }

  /* the fortune needs the deck, the texts and the language, so it waits for the
     page to have finished putting itself together */
  document.addEventListener('DOMContentLoaded', () => setTimeout(() => show(false), 120));

  /* the fortune page writes the same words with the same animation, and greets
     the day when it does, so it borrows both from here */
  window.DailyFortune = {
    show: () => show(true),
    words,
    seen: () => { if (window.COOKIE) remember(window.COOKIE.dayKey()); },
  };
})();
