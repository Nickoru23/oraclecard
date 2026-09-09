/* ===== The Witch Atelier — zodiac sigils =====

   The unicode glyphs (♈ ♉ ♊) came out of whatever font the browser had lying
   around and looked nothing like the deck, so these are drawn. The geometry is
   original and simplified on purpose, the way the card figures are.

   The treatment used to be a cream paper roundel with a deep blue disc and gold
   ink, which is what the site looked like two designs ago. Against the night it
   read as a sticker from somewhere else. They are engraved now, like everything
   else: the night for a ground, one hairline ring with ticks on it in the same
   language as the dial in the hero, the sigil cut in starlight, and the sparks
   drawn as the stars they were always meant to be.                           */
(function () {
  const C = {
    night: '#12102A',      /* the disc */
    rim:   '#3A3468',      /* the hairline around it */
    star:  '#8FB0FF',      /* the sigil, and the sparks */
    faint: '#5C6EA8',      /* the ticks */
  };

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

  /* the graduated ring, the same idea as the band on the dial in the hero */
  const ticks = (() => {
    let d = '';
    for (let a = 0; a < 360; a += 15) {
      const r = a % 90 === 0 ? 5 : 3;
      const t = a * Math.PI / 180;
      const x = 50 + Math.cos(t), y = 50 + Math.sin(t);
      d += `M${(50 + 46 * Math.cos(t)).toFixed(1)} ${(50 + 46 * Math.sin(t)).toFixed(1)}` +
           `L${(50 + (46 - r) * Math.cos(t)).toFixed(1)} ${(50 + (46 - r) * Math.sin(t)).toFixed(1)}`;
    }
    return d;
  })();

  window.signSVG = function (id, opts) {
    opts = opts || {};
    const d = SIGIL[id];
    if (!d) return '';
    const sparks = (SPARKS[id] || []).map(([x, y], i) =>
      `<path d="${star(x, y, i ? 3.2 : 4.2, 1.1, 4)}" fill="${C.star}" opacity="${i ? 0.55 : 0.8}"/>`).join('');
    return `<svg viewBox="0 0 100 100" class="sigil" role="img" aria-label="${opts.label || id}"
                 xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="49" fill="${C.night}"/>
      <circle cx="50" cy="50" r="46" fill="none" stroke="${C.rim}" stroke-width="1"/>
      <path d="${ticks}" stroke="${C.faint}" stroke-width="1" opacity=".7"/>
      ${sparks}
      <path d="${d}" fill="none" stroke="${C.star}" stroke-width="3.4"
            stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;
  };
})();
