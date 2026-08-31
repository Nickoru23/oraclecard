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

  function mount(el, opts) {
    if (!el || el.__c3d) return;
    el.__c3d = true;
    const o = Object.assign({ flip: false, tilt: MAX_TILT, sheen: true }, opts);

    let rx = 0, ry = 0, sc = 1;         /* where it is */
    let tx = 0, ty = 0, tsc = 1;        /* where it wants to be */
    let vx = 0, vy = 0;                 /* how fast it is spinning */
    let dragging = false, moved = false, raf = 0;
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
        if (dragging) {
          const dx = e.clientX - px, dy = e.clientY - py;
          if (Math.abs(dx) + Math.abs(dy) > 3) moved = true;
          ry += dx * 0.55; rx -= dy * 0.55;
          vx = dx * 0.55; vy = -dy * 0.55;
          px = e.clientX; py = e.clientY;
          paint();
          return;
        }
        tx = -ny * o.tilt; ty = nx * o.tilt; run();
      });

      el.addEventListener('pointerenter', () => { tsc = 1.035; run(); });
      el.addEventListener('pointerleave', () => {
        if (dragging) return;
        tx = 0; ty = 0; tsc = 1; run();
      });

      el.addEventListener('pointerdown', e => {
        if (e.button !== undefined && e.button !== 0) return;
        /* Without this the browser starts a text selection and the drag smears
           a highlight across the whole page. Focus has to be taken by hand
           afterwards, because preventDefault is what would have given it. */
        e.preventDefault();
        if (typeof el.focus === 'function') el.focus({ preventScroll: true });
        dragging = true; moved = false; pid = e.pointerId;
        px = e.clientX; py = e.clientY; vx = vy = 0;
        el.classList.add('is-held');
        try { el.setPointerCapture(pid); } catch (x) {}
      });

      const release = () => {
        if (!dragging) return;
        dragging = false;
        el.classList.remove('is-held');
        try { el.releasePointerCapture(pid); } catch (x) {}
        tx = 0; ty = 0; tsc = 1; run();
      };
      /* the release is listened for on the window as well as the card. A drag
         that ends off the element, or one whose pointer capture was taken away
         by something else, would otherwise leave the card spinning forever. */
      el.addEventListener('pointerup', release);
      el.addEventListener('pointercancel', release);
      el.addEventListener('lostpointercapture', release);
      window.addEventListener('pointerup', release);
      window.addEventListener('pointercancel', release);
      /* a drag must not also count as a click on the card underneath */
      el.addEventListener('click', e => { if (moved) { e.stopPropagation(); e.preventDefault(); } }, true);
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
     its fan on every draw, and a spread appears long after load. */
  const SELECTOR = '.card, .deck-cell, .picker-card, .hero-fan .f, [data-modal-art]';

  function sweep(root) {
    (root || document).querySelectorAll(SELECTOR).forEach(el => {
      if (el.matches('.hero-fan .f, [data-modal-art]')) mount(el, { tilt: 10, sheen: true });
      else if (el.matches('.picker-card')) mount(el, { tilt: 12, sheen: true });
      else mount(el, { tilt: MAX_TILT, sheen: true });
    });
  }

  const start = () => {
    sweep();
    /* anything drawn later is picked up as it arrives */
    new MutationObserver(muts => {
      for (const m of muts) {
        for (const n of m.addedNodes) {
          if (n.nodeType !== 1) continue;
          if (n.matches && n.matches(SELECTOR)) sweep(n.parentNode);
          else sweep(n);
        }
      }
    }).observe(document.body, { childList: true, subtree: true });
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();

  window.Card3D = { mount, sweep };
})();
