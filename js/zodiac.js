/* ===== The Witch Atelier — zodiac sigils =====
   The unicode glyphs (♈ ♉ ♊) came out of whatever font the browser had lying
   around and looked nothing like the deck. These are drawn instead, in the same
   register as the cards: a cream field, a deep roundel, a gold line-drawn sigil
   and a couple of sparkles. Original geometry — simplified on purpose, the way
   the card figures are. */
(function () {
  const C = { paper: '#EDE6D6', deep: '#16314F', pale: '#F4EFE4', gold: '#C9A227' };

  /* drawn inside a 100×100 field, sigil living roughly between 24 and 76 */
  const SIGIL = {
    aries: 'M50 74 V44 M50 44c0-11-6-18-14-18-8 0-13 6-13 14 M50 44c0-11 6-18 14-18 8 0 13 6 13 14',
    tauro: 'M50 82a13 13 0 1 1 0-26 13 13 0 0 1 0 26 M27 56c0-15 10-26 23-26s23 11 23 26',
    geminis: 'M33 28h34 M33 74h34 M41 28v46 M59 28v46',
    cancer: 'M24 42c13-14 36-14 49-3 M74 62c-13 14-36 14-49 3 M31 51a7 7 0 1 1-.1 0 M69 53a7 7 0 1 1 .1 0',
    leo: 'M40 78a12 12 0 1 1 0-24 12 12 0 0 1 0 24 M52 66c-4-16 0-30 11-33 9-2 14 6 9 13-4 6-11 6-12 13-1 8 6 13 13 11',
    virgo: 'M27 74V38c0-6 3-9 7-9s7 3 7 9v36 M41 74V38c0-6 3-9 7-9s7 3 7 9v36 M55 74V38c0-6 3-9 7-9s7 3 7 9v20c0 11-6 17-15 19 M61 61c8 3 12 8 13 16',
    libra: 'M25 71h50 M28 57h44 M31 57a19 19 0 0 1 38 0',
    escorpio: 'M21 68V42c0-6 4-9 7-9s7 3 7 9v26 M35 68V42c0-6 4-9 7-9s7 3 7 9v26 M49 68V42c0-6 4-9 7-9s7 3 7 9v24l20-19 M76 47H63 M76 47v13',
    sagitario: 'M27 74 70 31 M55 30h16v16 M41 43 58 60',
    capricornio: 'M24 70V42c0-7 4-11 9-11s9 4 9 11v18 M42 60c1 8 6 12 13 12 7 0 12-5 12-12 0-8-6-13-14-13-5 0-9 2-11 6',
    acuario: 'M25 47l12-9 12 9 12-9 12 9 M25 63l12-9 12 9 12-9 12 9',
    piscis: 'M33 26c-9 11-9 37 0 48 M67 26c9 11 9 37 0 48 M27 50h46',
  };

  const SPARKS = {
    aries: [[78, 30], [24, 66]], tauro: [[76, 68], [26, 30]],
    geminis: [[76, 40], [24, 62]], cancer: [[50, 24], [50, 78]],
    leo: [[76, 32], [26, 74]], virgo: [[78, 30], [24, 28]],
    libra: [[50, 27], [76, 74]], escorpio: [[26, 28], [76, 26]],
    sagitario: [[28, 32], [74, 70]], capricornio: [[74, 28], [26, 74]],
    acuario: [[50, 26], [50, 76]], piscis: [[50, 24], [50, 78]],
  };

  function star(cx, cy, R, r, pts, rot = -90) {
    let d = '';
    for (let i = 0; i < pts * 2; i++) {
      const rad = i % 2 ? r : R, a = (rot + i * 180 / pts) * Math.PI / 180;
      d += (i ? 'L' : 'M') + (cx + rad * Math.cos(a)).toFixed(1) + ' ' + (cy + rad * Math.sin(a)).toFixed(1);
    }
    return d + 'Z';
  }

  /* the same medallion the card roundels are built from, at badge size */
  window.signSVG = function (id, opts) {
    opts = opts || {};
    const d = SIGIL[id];
    if (!d) return '';
    const sparks = (SPARKS[id] || []).map(([x, y], i) =>
      `<path d="${star(x, y, i ? 3.4 : 4.4, 1.2, 4)}" fill="${C.gold}" opacity="${i ? 0.7 : 0.9}"/>`).join('');
    return `<svg viewBox="0 0 100 100" class="sigil" role="img" aria-label="${opts.label || id}"
                 xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="49" fill="${C.paper}"/>
      <circle cx="50" cy="50" r="48.4" fill="none" stroke="#261F18" stroke-opacity=".38" stroke-width="1.2"/>
      <circle cx="50" cy="50" r="42" fill="${C.deep}"/>
      <circle cx="50" cy="50" r="42" fill="none" stroke="${C.gold}" stroke-width="1.2" opacity=".55"/>
      ${sparks}
      <path d="${d}" fill="none" stroke="${C.gold}" stroke-width="4"
            stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;
  };
})();
