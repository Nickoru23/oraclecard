/* ===== The Witch Atelier — the cards, in three dimensions =====

   A card on this site is a physical object. It has a front and a back, it
   catches the light as it turns, and it can be picked up and spun. Everything
   here is transform and pointer maths, no library and no requests.

   What a card answers to:

     hover / pointer   it tilts toward the pointer and the sheen follows it
     click / Enter     it turns over
     drag              it spins freely on both axes and carries momentum
     arrow keys        it turns in steps, so it works without a pointer
     Escape            it comes back to rest

   The transform is composed out of custom properties rather than written
   whole, so a tilt and a flip and a spin can all be true at once without any
   of them clobbering the others:

     rotateX(--rx)  rotateY(--ry + --flip)  scale(--sc)

   Under prefers-reduced-motion the card still turns over, because that is the
   point of it, but it stops tilting and drifting.                            */

(function () {
  'use strict';

  const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const MAX_TILT = 15;          /* degrees, at the corner of the card */
  const FRICTION = 0.90;        /* how quickly a spin runs down */
  const SETTLE = 0.17;          /* how firmly a resting card returns to square */

  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;

  /* One release for the whole page. A drag that ends off its card, or one whose
     pointer capture is taken away, has to be caught on the window, but only one
     card can be dragged at a time, so the card being dragged puts its release
     here rather than each card adding listeners of its own. Two per card would
     never come off again, and the deck and the card of the day both redraw
     themselves on a language change, so every switch would leave another set
     behind holding on to the cards it had just discarded. */
  let releasing = null;
  const letGo = () => { const r = releasing; releasing = null; if (r) r(); };
  window.addEventListener('pointerup', letGo);
  window.addEventListener('pointercancel', letGo);

  function mount(el, opts) {
    if (!el || el.__c3d) return;
    el.__c3d = true;
    const o = Object.assign({ flip: false, tilt: MAX_TILT, sheen: true }, opts);

    let rx = 0, ry = 0, sc = 1;         /* where it is */
    let tx = 0, ty = 0, tsc = 1;        /* where it wants to be */
    let vx = 0, vy = 0;                 /* how fast it is spinning */
    let dragging = false, moved = false, raf = 0, settling = false;
    let px = 0, py = 0, pid = null;

    if (o.sheen) el.classList.add('has-sheen');
    el.classList.add('is-3d');

    const paint = () => {
      el.style.setProperty('--rx', rx.toFixed(2) + 'deg');
      el.style.setProperty('--ry', ry.toFixed(2) + 'deg');
      el.style.setProperty('--sc', sc.toFixed(3));
    };

    /* one loop for the whole card: it eases toward its target while at rest,
       and coasts on its own momentum after a throw */
    function tick() {
      raf = 0;
      if (dragging) { paint(); return; }
      if (Math.abs(vx) > 0.02 || Math.abs(vy) > 0.02) {
        ry += vx; rx += vy;
        vx *= FRICTION; vy *= FRICTION;
      } else {
        vx = vy = 0;
        rx += (tx - rx) * SETTLE;
        ry += (ty - ry) * SETTLE;
      }
      sc += (tsc - sc) * SETTLE;
      paint();
      if (Math.abs(vx) > 0.02 || Math.abs(vy) > 0.02 ||
          Math.abs(tx - rx) > 0.02 || Math.abs(ty - ry) > 0.02 ||
          Math.abs(tsc - sc) > 0.002) run();
    }
    const run = () => { if (!raf) raf = requestAnimationFrame(tick); };

    /* ---------- the pointer ---------- */
    function aim(e) {
      const r = el.getBoundingClientRect();
      const nx = (e.clientX - r.left) / r.width - 0.5;
      const ny = (e.clientY - r.top) / r.height - 0.5;
      if (o.sheen) {
        el.style.setProperty('--mx', (nx * 100 + 50).toFixed(1) + '%');
        el.style.setProperty('--my', (ny * 100 + 50).toFixed(1) + '%');
      }
      return { nx, ny };
    }

    if (!REDUCED) {
      el.addEventListener('pointermove', e => {
        const { nx, ny } = aim(e);
        /* Still here after a finger moved, so the browser did not take this
           for a scroll: it is a drag on the card, and the card takes it now. */
        if (settling) {
          const ax = Math.abs(e.clientX - px), ay = Math.abs(e.clientY - py);
          if (ax + ay < 4) return;
          /* Down the page is the page's gesture, across is the card's. Taking
             every first move meant one move of a scroll spun the card, and
             the browser then cancelled the pointer and left it spinning. */
          if (ay > ax) { settling = false; return; }
          settling = false; dragging = true;
          if (typeof el.focus === 'function') el.focus({ preventScroll: true });
          el.classList.add('is-held');
          try { el.setPointerCapture(pid); } catch (x) {}
        }
        if (dragging) {
          const dx = e.clientX - px, dy = e.clientY - py;
          if (Math.abs(dx) + Math.abs(dy) > 3) moved = true;
          ry += dx * 0.55; rx -= dy * 0.55;
          vx = dx * 0.55; vy = -dy * 0.55;
          px = e.clientX; py = e.clientY;
          paint();
          return;
        }
        /* The tilt follows a pointer that hovers, and a finger never hovers:
           it is either dragging the card or on its way past. Running this for
           touch meant every card under a scrolling thumb leaned over as the
           page went by, which is the two gestures fighting for the same
           finger. Touch gets the drag and the turn, and no tilt. */
        if (e.pointerType === 'touch') return;
        tx = -ny * o.tilt; ty = nx * o.tilt; run();
      });

      el.addEventListener('pointerenter', e => {
        if (e.pointerType === 'touch') return;
        tsc = 1.035; run();
      });
      el.addEventListener('pointerleave', () => {
        if (dragging) return;
        tx = 0; ty = 0; tsc = 1; run();
      });

      el.addEventListener('pointerdown', e => {
        if (e.button !== undefined && e.button !== 0) return;
        pid = e.pointerId;
        px = e.clientX; py = e.clientY; vx = vy = 0;
        moved = false; releasing = release;

        /* A finger has not said yet whether it means to turn the card or to
           scroll the page past it, and preventing the default here answered
           for it: the page stopped scrolling wherever a card happened to be
           under the thumb, which on a grid of seventy eight is most of it.
           So touch waits. touch-action is pan-y, so the browser keeps the
           vertical gesture and hands us the horizontal one, and the card
           takes the pointer at the first move it is still receiving. Mouse
           and pen have no such ambiguity and are grabbed at once. */
        if (e.pointerType === 'touch') { settling = true; return; }

        /* Without this the browser starts a text selection and the drag smears
           a highlight across the whole page. Focus has to be taken by hand
           afterwards, because preventDefault is what would have given it. */
        e.preventDefault();
        if (typeof el.focus === 'function') el.focus({ preventScroll: true });
        dragging = true;
        el.classList.add('is-held');
        try { el.setPointerCapture(pid); } catch (x) {}
      });

      const release = () => {
        if (releasing === release) releasing = null;
        settling = false;
        if (!dragging) return;
        dragging = false;
        el.classList.remove('is-held');
        try { el.releasePointerCapture(pid); } catch (x) {}
        tx = 0; ty = 0; tsc = 1; run();
      };
      /* these three die with the card; the window is covered by letGo above */
      el.addEventListener('pointerup', release);
      /* The browser cancels the pointer when it claims the gesture for a
         scroll. Whatever the card did with the moves it saw before that was
         not asked for, so it is undone rather than coasted on. */
      el.addEventListener('pointercancel', () => {
        vx = vy = 0; rx = 0; ry = 0; moved = false;
        release();
      });
      el.addEventListener('lostpointercapture', release);
      /* a drag must not also count as a click on the card underneath */
      el.addEventListener('click', e => { if (moved) { e.stopPropagation(); e.preventDefault(); } }, true);
    }

    /* ---------- the focus ring ----------
       Chrome shows one for a div that script has focused, but not for a button
       somebody clicked, so a card held in a plain div would sprout a ring on
       every click while a deck cell, which is a button, never does. The ring is
       kept for the keyboard, which is who it is for, and dropped when a pointer
       is what put the focus there. */
    el.addEventListener('pointerdown', () => el.classList.add('by-pointer'));
    el.addEventListener('keydown', () => el.classList.remove('by-pointer'));
    el.addEventListener('blur', () => el.classList.remove('by-pointer'));

    /* ---------- turning it over ----------
       A card marked data-turn is turned by a click or by Enter, the way a card
       in a spread is. A drag is not a click, so spinning one does not flip it. */
    if (el.hasAttribute('data-turn')) {
      const turn = () => el.classList.toggle('is-turned');
      el.addEventListener('click', () => { if (!moved) turn(); });
      el.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); turn(); }
      });
    }

    /* ---------- the keyboard ---------- */
    if (!el.hasAttribute('tabindex') && !/^(A|BUTTON)$/.test(el.tagName)) el.tabIndex = 0;
    el.addEventListener('keydown', e => {
      const step = e.shiftKey ? 45 : 15;
      let done = true;
      switch (e.key) {
        case 'ArrowLeft':  ty = (ty || 0) - step; break;
        case 'ArrowRight': ty = (ty || 0) + step; break;
        case 'ArrowUp':    tx = (tx || 0) - step; break;
        case 'ArrowDown':  tx = (tx || 0) + step; break;
        case 'Escape':     tx = 0; ty = 0; vx = vy = 0; break;
        default: done = false;
      }
      if (done) { e.preventDefault(); tx = clamp(tx, -180, 180); ty = clamp(ty, -180, 180); run(); }
    });

    /* let a flipping card be turned by anything, not only a click on it */
    el.addEventListener('c3d:reset', () => { tx = 0; ty = 0; vx = vy = 0; tsc = 1; run(); });
    paint();
  }

  /* ---------- who gets it ----------
     Every card face on the site, wherever it is drawn, and whenever it is
     drawn: the deck browser repaints on a language change, the picker builds
     its fan on every draw, and a spread appears long after load.

     These names exist only to give some of them a gentler tilt. What actually
     decides whether something is a card is the rule below it. */
  const SELECTOR = '.card, .deck-cell, .picker-card, .hero-fan .f, [data-modal-art]';

  function sweep(root) {
    (root || document).querySelectorAll(SELECTOR).forEach(el => {
      if (el.matches('.hero-fan .f, [data-modal-art]')) mount(el, { tilt: 10, sheen: true });
      else if (el.matches('.picker-card')) mount(el, { tilt: 12, sheen: true });
      else mount(el, { tilt: MAX_TILT, sheen: true });
    });
  }

  /* Anything holding a card object is a card. window.cardObject draws every two
     sided card on the site into a .c3d-faces, so whatever contains one is the
     thing that tilts and turns, wherever it was drawn and whoever drew it. That
     is what keeps the greeting, the fortune page and the card of the day
     behaving like the deck without any of them being named here. */
  function faces(root) {
    (root || document).querySelectorAll('.c3d-faces').forEach(f => {
      const holder = f.parentElement;
      if (holder && !holder.__c3d) mount(holder, { tilt: 12, sheen: true });
    });
  }

  const scan = root => { sweep(root); faces(root); };

  const start = () => {
    scan();
    /* anything drawn later is picked up as it arrives. The scan starts at the
       element whose children changed rather than at the node that arrived, so a
       card that is itself the new node is still found. */
    new MutationObserver(muts => {
      for (const m of muts) {
        if (!m.addedNodes.length) continue;
        const at = m.target && m.target.nodeType === 1 ? m.target : null;
        scan(at);
      }
    }).observe(document.body, { childList: true, subtree: true });
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();

  window.Card3D = { mount, sweep: scan };
})();
