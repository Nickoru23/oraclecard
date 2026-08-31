/* ===== Umbral — front-end engine ===== */
(function () {
  'use strict';

  /* ---------- language ---------- */
  const store = {
    get(k, d) { try { return localStorage.getItem(k) ?? d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch {} },
  };
  function detectLang() {
    const stored = store.get('umbral.lang', null);
    if (stored === 'en' || stored === 'es' || stored === 'de') return stored;
    const nav = (navigator.language || 'es').slice(0, 2).toLowerCase();
    return nav === 'en' ? 'en' : nav === 'de' ? 'de' : 'es';
  }
  let LANG = detectLang();
  if (!window.T[LANG]) LANG = 'es';
  const t = k => window.T[LANG][k];
  window.getLang = () => LANG;
  window.t = t;   /* the ledger and the page scripts letter their own copy */

  function applyLang() {
    document.documentElement.lang = LANG;
    document.querySelectorAll('[data-t]').forEach(el => {
      const v = t(el.dataset.t);
      if (typeof v === 'string') el[el.dataset.thtml === '1' ? 'innerHTML' : 'textContent'] = v;
    });
    document.querySelectorAll('[data-tph]').forEach(el => { el.placeholder = t(el.dataset.tph); });
    document.querySelectorAll('.lang button').forEach(b =>
      b.setAttribute('aria-pressed', String(b.dataset.lang === LANG)));
    document.dispatchEvent(new CustomEvent('langchange'));
  }
  window.setLang = function (l) {
    LANG = l; store.set('umbral.lang', l); applyLang();
    if (window.Ritual) window.Ritual.langSeen(l);
  };

  /* ---------- drawing ---------- */
  function rnd(n) {
    const a = new Uint32Array(1);
    (crypto || window.msCrypto).getRandomValues(a);
    return a[0] % n;
  }
  window.drawCards = function (n) {
    const pool = window.DECK.slice(), out = [];
    for (let i = 0; i < n; i++) {
      const c = pool.splice(rnd(pool.length), 1)[0];
      out.push({ card: c, rev: rnd(100) < 32 });
    }
    return out;
  };

  /* ---------- yes / no polarity ---------- */
  const POL = {
    major: { m00:1,m01:1,m02:0,m03:1,m04:1,m05:0,m06:1,m07:1,m08:1,m09:0,m10:1,
             m11:1,m12:-1,m13:-1,m14:1,m15:-1,m16:-1,m17:1,m18:-1,m19:1,m20:1,m21:1 },
    //          A  2  3  4  5  6  7  8  9 10  P  N  Q  K
    w: [0, 1, 1, 1, 1,-1, 1, 0, 1, 0,-1, 1, 1, 1, 1],
    c: [0, 1, 1, 1,-1,-1, 0,-1,-1, 1, 1, 1, 1, 1, 1],
    s: [0, 1,-1,-1, 0,-1, 1,-1,-1,-1,-1, 0, 1, 0, 1],
    p: [0, 1, 0, 1,-1,-1, 1, 0, 1, 1, 1, 1, 1, 1, 1],
  };
  window.polarity = function (d) {
    const base = d.card.a === 'major' ? POL.major[d.card.id] : POL[d.card.id[0]][d.card.n];
    return d.rev ? -base : base;
  };

  /* ---------- rendering ---------- */
  function slot(d, pos, i) {
    const el = document.createElement('div');
    el.className = 'card-slot';
    el.innerHTML =
      `<div class="card-pos">${pos || ''}</div>
       <div class="card" role="button" tabindex="0" aria-label="${pos || ''}">
         <div class="face back">${window.cardBackSVG()}</div>
         <div class="face front${d.rev ? ' rev' : ''}">${window.cardFace(d.card, LANG, 'sm')}</div>
       </div>
       <div class="card-name"></div>`;
    const card = el.querySelector('.card'), name = el.querySelector('.card-name');
    const flip = () => {
      if (card.classList.contains('flipped')) return;
      card.classList.add('flipped');
      name.innerHTML = `${d.card.name[LANG]}${d.rev ? `<span class="rv">${t('reversed')}</span>` : ''}`;
      el.dispatchEvent(new CustomEvent('flipped', { bubbles: true }));
    };
    card.addEventListener('click', flip);
    card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); flip(); } });
    setTimeout(flip, 420 + i * 320);
    return el;
  }

  function meanings(d) {
    const c = d.card, body = d.rev ? c.rev[LANG] : c.up[LANG];
    let extra = '';
    if (c.love && c.work && !d.rev)
      extra = `<p class="small muted"><strong>${t('in_love')}:</strong> ${c.love[LANG]}<br>
               <strong>${t('in_work')}:</strong> ${c.work[LANG]}</p>`;
    return `<h4>${c.name[LANG]}${d.rev ? ` <span class="small" style="color:var(--rose)">(${t('reversed')})</span>` : ''}</h4>
            <div class="kw">${c.kw[LANG].map(k => `<span>${k}</span>`).join('')}</div>
            <p>${body}</p>${extra}`;
  }

  window.renderSpread = function (host, draws, positions, opts) {
    opts = opts || {};
    /* a fresh wrapper per draw: listeners from a previous spread stay on the
       detached node instead of firing against the new one */
    host.innerHTML = `<div class="spread-wrap">
                        <p class="center small muted" data-hint>${t('reveal')}</p>
                        <div class="deck"></div><div class="reading" hidden></div>
                      </div>`;
    const wrap = host.firstElementChild;
    const deck = wrap.querySelector('.deck'), read = wrap.querySelector('.reading');
    draws.forEach((d, i) => deck.appendChild(slot(d, positions[i], i)));

    let done = 0;
    wrap.addEventListener('flipped', () => {
      if (++done < draws.length) return;
      wrap.querySelector('[data-hint]')?.remove();
      read.hidden = false;
      read.classList.add('fade-in');
      /* the paid and free consultations replace the dictionary meanings with a
         reading written for the question — hand the panel over and stop here */
      if (opts.reader) { opts.reader(read, draws); return; }
      let html = '';
      if (opts.yesno) {
        const s = window.polarity(draws[0]);
        const k = s > 0 ? 'yes' : s < 0 ? 'no' : 'maybe';
        html += `<h4 style="font-size:2.2rem;margin-bottom:.1em">${t(k)}</h4><p>${t(k + '_d')}</p>`;
      }
      html += draws.map((d, i) =>
        (positions[i] && !opts.yesno ? `<div class="eyebrow" style="margin:1.6em 0 -.6em">${positions[i]}</div>` : '')
        + meanings(d)).join('');
      read.innerHTML = html;
    });
  };

  /* ---------- choosing your own cards ----------
     The deck is genuinely shuffled and laid face down; whichever card the
     visitor taps IS the card they get. Nothing is pre-dealt behind the scenes —
     the whole point of the ritual is that the choice is real. */
  const TABLE_SIZE = 22;

  function fill(str, n) { return String(str).replace('{n}', n); }

  window.renderPicker = function (host, need, positions, opts) {
    opts = opts || {};
    const pool = window.DECK.slice();
    /* Fisher-Yates with the same CSPRNG the automatic draw uses */
    for (let i = pool.length - 1; i > 0; i--) {
      const j = rnd(i + 1);
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    const table = pool.slice(0, TABLE_SIZE).map(c => ({ card: c, rev: rnd(100) < 32 }));

    host.innerHTML = `
      <div class="picker">
        <p class="eyebrow center">${t('pick_h')}</p>
        <p class="center muted small picker-lede">${t('pick_lede')}</p>
        <p class="center picker-count" aria-live="polite"></p>
        <div class="picker-table" role="group"></div>
      </div>
      <div class="picker-result"></div>`;

    const wrap = host.querySelector('.picker');
    const tableEl = host.querySelector('.picker-table');
    const countEl = host.querySelector('.picker-count');
    const result = host.querySelector('.picker-result');
    const chosen = [];

    function paintCount() {
      const left = need - chosen.length;
      countEl.textContent = left === 0 ? t('pick_none')
        : chosen.length === 0 ? (need === 1 ? t('pick_count_1') : fill(t('pick_count'), need))
        : (left === 1 ? t('pick_left_1') : fill(t('pick_left'), left));
    }

    table.forEach((d, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'picker-card';
      b.style.setProperty('--i', i);
      b.setAttribute('aria-label', `${t('pick_h')} ${i + 1}`);
      b.innerHTML = window.cardBackSVG();
      b.addEventListener('click', () => {
        if (b.classList.contains('taken') || chosen.length >= need) return;
        b.classList.add('taken');
        b.setAttribute('aria-disabled', 'true');
        chosen.push(d);
        paintCount();
        if (chosen.length === need) {
          wrap.classList.add('done');
          setTimeout(() => {
            wrap.remove();
            if (opts.onDone) opts.onDone(chosen, result);
            else window.renderSpread(result, chosen, positions, opts);
          }, 520);
        }
      });
      tableEl.appendChild(b);
    });

    paintCount();
  };

  /* ---------- free spreads page ---------- */
  const SPREADS = {
    daily: { n: 1, pos: 'pos_daily' },
    three: { n: 3, pos: 'pos_three' },
    yesno: { n: 1, pos: 'pos_yesno', yesno: true },
    love:  { n: 5, pos: 'pos_love' },
  };
  window.initSpreads = function () {
    const tabs = document.getElementById('sp-tabs');
    const host = document.getElementById('sp-out');
    const btn  = document.getElementById('sp-draw');
    const desc = document.getElementById('sp-desc');
    if (!tabs) return;
    let cur = 'daily';

    function paintTabs() {
      tabs.querySelectorAll('.tab').forEach(b => b.setAttribute('aria-selected', String(b.dataset.sp === cur)));
      desc.textContent = t('sp_' + cur + '_d');
    }
    function run() {
      const s = SPREADS[cur];
      window.renderPicker(host, s.n, t(s.pos), { yesno: s.yesno });
      btn.textContent = t('again');
      host.scrollIntoView({ behavior: 'smooth', block: 'start' });
      if (window.Ritual) window.Ritual.spreadLaid(cur);
    }
    tabs.addEventListener('click', e => {
      const b = e.target.closest('.tab'); if (!b) return;
      cur = b.dataset.sp; paintTabs();
      host.innerHTML = ''; btn.textContent = t('draw');
    });
    btn.addEventListener('click', run);
    document.addEventListener('langchange', () => { paintTabs(); host.innerHTML = ''; btn.textContent = t('draw'); });
    paintTabs();
  };

  /* ---------- deck browser ---------- */
  window.initDeckBrowser = function () {
    const grid = document.getElementById('deck-grid');
    if (!grid) return;
    const dlg = document.getElementById('card-modal');
    let filter = 'all';

    function paint() {
      grid.innerHTML = window.DECK
        .filter(c => filter === 'all' || c.a === 'major')
        .map(c => `<button class="deck-cell" data-id="${c.id}" aria-label="${c.name[LANG]}">
                     ${window.cardFace(c, LANG, 'sm')}</button>`).join('');
    }
    grid.addEventListener('click', e => {
      const b = e.target.closest('.deck-cell'); if (!b) return;
      const c = window.DECK.find(x => x.id === b.dataset.id);
      dlg.querySelector('[data-modal-art]').innerHTML = window.cardFace(c, LANG, 'full');
      dlg.querySelector('[data-modal-body]').innerHTML =
        `<h3>${c.name[LANG]}</h3>
         <div class="kw">${c.kw[LANG].map(k => `<span>${k}</span>`).join('')}</div>
         <h4>${t('upright')}</h4><p>${c.up[LANG]}</p>
         <h4>${t('rev_h')}</h4><p>${c.rev[LANG]}</p>
         ${c.love ? `<h4>${t('in_love')}</h4><p>${c.love[LANG]}</p>
                     <h4>${t('in_work')}</h4><p>${c.work[LANG]}</p>` : ''}`;
      dlg.showModal();
    });
    document.getElementById('deck-filters')?.addEventListener('click', e => {
      const b = e.target.closest('.tab'); if (!b) return;
      filter = b.dataset.filter;
      e.currentTarget.querySelectorAll('.tab').forEach(x =>
        x.setAttribute('aria-selected', String(x.dataset.filter === filter)));
      paint();
    });
    dlg?.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });
    document.addEventListener('langchange', paint);
    paint();
  };

  /* ---------- boot ---------- */
  document.addEventListener('DOMContentLoaded', () => {
    document.querySelector('.lang')?.addEventListener('click', e => {
      const b = e.target.closest('button'); if (b) window.setLang(b.dataset.lang);
    });

    /* mobile menu: one button, one class, and every way out a person expects */
    const bar = document.querySelector('.nav');
    const mb = document.getElementById('menu-btn');
    if (bar && mb) {
      const setOpen = on => {
        bar.classList.toggle('is-open', on);
        mb.setAttribute('aria-expanded', String(on));
      };
      mb.addEventListener('click', () => setOpen(!bar.classList.contains('is-open')));
      bar.querySelectorAll('nav a').forEach(a => a.addEventListener('click', () => setOpen(false)));
      document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && bar.classList.contains('is-open')) { setOpen(false); mb.focus(); }
      });
      document.addEventListener('click', e => {
        if (bar.classList.contains('is-open') && !bar.contains(e.target)) setOpen(false);
      });
      /* the language buttons live in the panel on a phone — switching language
         is not navigating, so the panel stays open and simply repaints */
    }
    applyLang();
    if (window.Ritual) window.Ritual.langSeen(LANG);
    window.initSpreads();
    window.initDeckBrowser();
    window.initReadingForm?.();
    window.initFree?.();
    window.initHoroscope?.();
    window.initCookie?.();
    document.dispatchEvent(new CustomEvent('artready'));
  });
})();
