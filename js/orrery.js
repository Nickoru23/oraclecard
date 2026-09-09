/* ===== The Witch Atelier — the orrery =====

   The ring behind the opening line is not an ornament. It is where the Sun and
   the Moon actually are, right now, computed by js/astro.js in this browser and
   drawn here. The zodiac band is divided the way the ecliptic is divided, the
   Moon carries the shape it has tonight, and the whole thing is engraved rather
   than lit: hairlines, ticks and small caps, no glow.

   Turning it turns time. Take hold of the band and a full revolution is a year,
   so the Sun walks once round and the Moon runs thirteen laps beside it, both
   at their true positions for whatever date you have wound it to. Let go and it
   comes back to now, because now is the only date it is telling the truth
   about.

   Nothing is loaded. The astronomy is a few hundred lines of arithmetic that
   already ships for the card of the day, and this is a second use for it.

   0 degrees of Aries sits at three o'clock and longitude increases
   anticlockwise, which is how an ecliptic dial is drawn.                      */

(function () {
  'use strict';

  var REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var DAY = 86400000;
  var YEAR = 365.2422;            /* one turn of the band */

  /* the dial, in its own units */
  /* The dial is wider than the words it sits behind, and everything that moves
     rides in the annulus outside them. A ring drawn through a headline is a
     background; a ring drawn around one is an instrument. */
  var C = 500;                    /* centre */
  var R_RIM = 486, R_BAND_OUT = 468, R_BAND_IN = 414;
  var R_MOON = 388, R_SUN = 352;

  var SIGNS = ['aries', 'tauro', 'geminis', 'cancer', 'leo', 'virgo',
               'libra', 'escorpio', 'sagitario', 'capricornio', 'acuario', 'piscis'];
  /* the sign each house is named for, lettered along the band and turned with
     it, the way the names are cut into a real one */

  var xy = function (r, deg) {
    var a = deg * Math.PI / 180;
    return [C + r * Math.cos(a), C - r * Math.sin(a)];
  };
  var n2 = function (v) { return Math.round(v * 100) / 100; };
  var line = function (r1, r2, deg, w, o) {
    var a = xy(r1, deg), b = xy(r2, deg);
    return '<line x1="' + n2(a[0]) + '" y1="' + n2(a[1]) + '" x2="' + n2(b[0]) + '" y2="' + n2(b[1]) +
           '" stroke-width="' + w + '" opacity="' + o + '"/>';
  };
  var ring = function (r, w, o, dash) {
    return '<circle cx="' + C + '" cy="' + C + '" r="' + r + '" fill="none" stroke-width="' + w +
           '" opacity="' + o + '"' + (dash ? ' stroke-dasharray="' + dash + '"' : '') + '/>';
  };

  /* The Moon at the shape it has tonight, built from a half disc and the
     terminator ellipse rather than from one path of two arcs.

     The one path is the obvious way to draw this and it is wrong: the
     terminator's endpoints are exactly a diameter apart, which is the
     degenerate case for an elliptical arc, and the browser answers by scaling
     both radii up until they fit. The lit part then spills outside the disc,
     which you only see on the gibbous phases and only if you look. A half disc
     is exact, and an ellipse either adds to it or is cut out of it. */
  function halfDisc(r, waxing) {
    return 'M 0,' + -r + ' A ' + r + ',' + r + ' 0 0 ' + (waxing ? 1 : 0) + ' 0,' + r + ' Z';
  }
  var terminatorRx = function (r, lit) {
    return n2(r * Math.abs(1 - 2 * Math.max(0.005, Math.min(0.995, lit))));
  };

  /* everything that never changes, drawn once */
  function plate() {
    var s = '';
    /* the rim and the band */
    s += '<g class="or-rule" stroke="currentColor" fill="none">';
    s += ring(R_RIM, 1, 0.5) + ring(R_BAND_OUT, 1, 0.75) + ring(R_BAND_IN, 1, 0.75);
    /* five degrees a tick, thirty degrees a boundary */
    for (var d = 0; d < 360; d += 5) {
      var edge = d % 30 === 0;
      s += line(R_BAND_OUT, edge ? R_BAND_IN : R_BAND_OUT - 13, d, edge ? 1.4 : 0.9, edge ? 0.9 : 0.42);
    }
    s += ring(R_MOON, 1, 0.28, '2 7') + ring(R_SUN, 1, 0.28, '2 7');
    s += '</g>';
    s += '<g class="or-sign">';
    for (var i = 0; i < 12; i++) {
      var mid = i * 30 + 15;
      var q = xy((R_BAND_OUT + R_BAND_IN) / 2, mid);
      /* turned so the lettering follows the band and never reads upside down */
      var turn = -mid + (mid > 90 && mid < 270 ? 180 : 0);
      s += '<text x="' + n2(q[0]) + '" y="' + n2(q[1]) + '" text-anchor="middle" ' +
           'dominant-baseline="central" data-sign="' + SIGNS[i] + '" ' +
           'transform="rotate(' + n2(turn) + ' ' + n2(q[0]) + ' ' + n2(q[1]) + ')"></text>';
    }
    s += '</g>';
    return s;
  }

  function build(el) {
    el.innerHTML =
      '<svg viewBox="0 0 1000 1000" class="or-svg" aria-hidden="true" focusable="false">' +
        '<g class="or-deep">' + plate() + '</g>' +
        /* Something to take hold of. The band is drawn in hairlines, and a
           hairline is not a handle: without this you would have to land on a
           one unit stroke to turn the thing. This ring is invisible, as wide as
           the band, and leaves the middle alone so the words underneath stay
           selectable. */
        '<circle class="or-grip" cx="' + C + '" cy="' + C + '" r="' + ((R_BAND_OUT + R_BAND_IN) / 2) +
          '" fill="none" stroke="transparent" stroke-width="' + (R_BAND_OUT - R_BAND_IN + 34) + '"/>' +
        '<g class="or-near">' +
          /* index marks: each body points at the degree of the band it stands
             under, which is what you would read off a real dial. They stop at
             the band, so nothing is ever drawn across the words. */
          '<g class="or-arm" stroke="currentColor" fill="none">' +
            '<line class="or-arm-sun" stroke-width="1.2" opacity=".5"/>' +
            '<line class="or-arm-moon" stroke-width="1" opacity=".32"/>' +
          '</g>' +
          '<g class="or-sun"><circle r="17" class="or-sun-disc"/>' +
            '<circle r="26" fill="none" stroke="currentColor" stroke-width="1" opacity=".55"/></g>' +
          '<g class="or-moon">' +
            '<circle r="15" class="or-moon-dark"/>' +
            '<path class="or-moon-lit"/>' +
            '<ellipse class="or-moon-term" ry="15"/>' +
            '<circle r="15" fill="none" stroke="currentColor" stroke-width="1" opacity=".55"/></g>' +
        '</g>' +
      '</svg>';
    /* The readout is pinned to the viewport, so it cannot live inside the dial:
       the dial carries a transform, and a transformed ancestor is what a fixed
       child is fixed to. Put on the body it is fixed to the window, which is
       what "pinned to the viewport" was supposed to mean. */
    var read = document.createElement('p');
    read.className = 'or-read';
    read.setAttribute('aria-live', 'polite');
    document.body.appendChild(read);
    el.__read = read;
  }

  function init(el) {
    if (!el || el.__orrery || !window.ASTRO) return;
    el.__orrery = true;
    build(el);

    var svg = el.querySelector('.or-svg');
    var grip = el.querySelector('.or-grip');
    /* the parallax needs a surface that takes events, and the dial itself does
       not: everything but the band lets the pointer through to the words */
    var field = el.closest ? (el.closest('section') || document.body) : document.body;
    var read = el.__read;
    var gSun = el.querySelector('.or-sun');
    var gMoon = el.querySelector('.or-moon');
    var lit = el.querySelector('.or-moon-lit');
    var term = el.querySelector('.or-moon-term');
    var armS = el.querySelector('.or-arm-sun');
    var armM = el.querySelector('.or-arm-moon');
    var deep = el.querySelector('.or-deep');
    var near = el.querySelector('.or-near');

    var offset = 0;                 /* days away from now, while it is being turned */
    var target = 0;
    var raf = 0;

    function draw() {
      var when = new Date(Date.now() + offset * DAY);
      var k = window.ASTRO.sky(when);
      var sl = window.ASTRO.sunLon(when), ml = window.ASTRO.moonLon(when);
      var ps = xy(R_SUN, sl), pm = xy(R_MOON, ml);

      gSun.setAttribute('transform', 'translate(' + n2(ps[0]) + ',' + n2(ps[1]) + ')');
      gMoon.setAttribute('transform', 'translate(' + n2(pm[0]) + ',' + n2(pm[1]) +
                         ') rotate(' + n2(-ml + 90) + ')');
      lit.setAttribute('d', halfDisc(15, k.phase.waxing));
      term.setAttribute('rx', terminatorRx(15, k.phase.illumination));
      /* past half, the terminator adds to the lit side; before it, it cuts in */
      term.classList.toggle('is-dark', k.phase.illumination <= 0.5);
      var mark = function (arm, r, lon) {
        var a = xy(r + 8, lon), b2 = xy(R_BAND_IN - 4, lon);
        arm.setAttribute('x1', n2(a[0])); arm.setAttribute('y1', n2(a[1]));
        arm.setAttribute('x2', n2(b2[0])); arm.setAttribute('y2', n2(b2[1]));
      };
      mark(armS, R_SUN + 18, sl); mark(armM, R_MOON + 16, ml);

      var T = window.T && window.getLang && window.T[window.getLang()];

      /* the houses take their names from whatever language the page is in, and
         the one the Sun is standing in is the one that is lit */
      var here = k.sun.index;
      var marks = el.querySelectorAll('.or-sign text');
      for (var i = 0; i < marks.length; i++) {
        var name = T && T[SIGNS[i]] ? T[SIGNS[i]] : SIGNS[i];
        marks[i].textContent = name.slice(0, 3).toUpperCase();
        marks[i].classList.toggle('is-here', i === here);
      }

      if (T && read) {
        var names = T.sky_sun && T[k.sun.id]
          ? T.sky_sun.replace('{s}', T[k.sun.id]).replace('{d}', Math.floor(k.sun.degree) + '°')
          : '';
        var when2 = offset ? when.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' }) : '';
        read.textContent = (when2 ? when2 + '  ·  ' : '') + names;
      }
    }

    /* the spring back to now, and the parallax, share one loop */
    var px = 0, py = 0, tx = 0, ty = 0;
    function tick() {
      raf = 0;
      offset += (target - offset) * 0.16;
      if (Math.abs(target - offset) < 0.02) offset = target;
      px += (tx - px) * 0.12; py += (ty - py) * 0.12;
      deep.setAttribute('transform', 'translate(' + n2(px * 0.35) + ',' + n2(py * 0.35) + ')');
      near.setAttribute('transform', 'translate(' + n2(px) + ',' + n2(py) + ')');
      draw();
      if (Math.abs(target - offset) > 0.001 ||
          Math.abs(tx - px) > 0.1 || Math.abs(ty - py) > 0.1) run();
    }
    function run() { if (!raf) raf = requestAnimationFrame(tick); }

    /* ---------- turning it ---------- */
    var holding = false, from = 0, base = 0, pid = null;
    var angleAt = function (e) {
      var r = svg.getBoundingClientRect();
      return Math.atan2((r.top + r.height / 2) - e.clientY, e.clientX - (r.left + r.width / 2)) * 180 / Math.PI;
    };

    if (!REDUCED) {
      grip.addEventListener('pointerenter', function () { read.classList.add('is-out'); });
      grip.addEventListener('pointerleave', function () { if (!holding) read.classList.remove('is-out'); });

      grip.addEventListener('pointerdown', function (e) {
        if (e.button) return;
        e.preventDefault();
        holding = true; pid = e.pointerId;
        from = angleAt(e); base = target;
        el.classList.add('is-turning');
        read.classList.add('is-out');
        el.focus({ preventScroll: true });
        try { grip.setPointerCapture(pid); } catch (x) {}
      });
      grip.addEventListener('pointermove', function (e) {
        if (!holding) return;
        var d = angleAt(e) - from;
        while (d > 180) d -= 360;
        while (d < -180) d += 360;
        from = angleAt(e);
        base -= d / 360 * YEAR;            /* anticlockwise is forward, as the Sun goes */
        target = base; offset = base;      /* no easing while a hand is on it */
        run();
      });
      var release = function () {
        if (!holding) return;
        holding = false;
        el.classList.remove('is-turning');
        read.classList.remove('is-out');
        target = 0;                        /* now is the only true reading */
        run();
      };
      grip.addEventListener('pointerup', release);
      grip.addEventListener('pointercancel', release);
      grip.addEventListener('lostpointercapture', release);
      window.addEventListener('pointerup', release);

      /* the whole opening answers the pointer, by depth, a few units at a time */
      field.addEventListener('pointermove', function (e) {
        if (holding) return;
        var r = el.getBoundingClientRect();
        tx = ((e.clientX - r.left) / r.width - 0.5) * 26;
        ty = ((e.clientY - r.top) / r.height - 0.5) * 26;
        run();
      });
      field.addEventListener('pointerleave', function () { if (!holding) { tx = ty = 0; run(); } });
    }

    /* ---------- and without a pointer ---------- */
    el.tabIndex = 0;
    el.addEventListener('keydown', function (e) {
      var step = e.shiftKey ? 30 : 1, done = true;
      if (e.key === 'ArrowRight' || e.key === 'ArrowUp') target += step;
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') target -= step;
      else if (e.key === 'Escape' || e.key === 'Home') target = 0;
      else done = false;
      if (done) {
        e.preventDefault();
        read.classList.add('is-out');
        clearTimeout(el.__hide);
        el.__hide = setTimeout(function () { if (target === 0) read.classList.remove('is-out'); }, 2600);
        run();
      }
    });
    el.addEventListener('blur', function () { if (target === 0) read.classList.remove('is-out'); });

    draw();
    /* the sky moves slowly, so once a minute is plenty when nobody is turning it */
    setInterval(function () { if (!holding && target === 0) draw(); }, 60000);
    document.addEventListener('langchange', draw);
  }

  function start() {
    var el = document.getElementById('orrery');
    if (el) init(el);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();

  window.Orrery = { init: init };
})();
