/* ===== The Witch Atelier — the deck =====

   Drawn, not photographed, and drawn in code, so the whole deck is a few tens
   of kilobytes and asks for nothing.

   Two earlier passes tried to draw people, and both failed the same way: a
   figure drawn in a few dozen path commands reads as a stick figure, and a
   stick figure reads as amateur at any size. So this one does not draw people
   at all. Each card is a sigil, geometry that stands for the card rather than
   illustrating it, and geometry is the one thing code draws better than a
   hurried hand.

   Every card is the same object:

     a night field, indigo at the top and near black at the foot
     a scatter of stars, fixed per card so it never reflows
     a gold sigil at the centre, over a soft bloom
     a constellation reaching out from it
     a double gold frame with a diamond at each corner
     the number above in Roman, the name below in small caps

   The glow is faked with two strokes rather than an SVG filter: a wide
   translucent one under a thin bright one. Seventy eight blurred filters in a
   grid is a real cost, and this is free.                                     */

(function () {
  'use strict';

  const C = {
    top:   '#191441',
    bottom:'#0A0819',
    gold:  '#D9B872',
    goldHi:'#F4E3B8',
    cyan:  '#4FD8D3',
    violet:'#A98BFF',
    star:  '#EDEAFF',
    ink:   '#05040F',
  };

  const N = n => (Math.round(n * 10) / 10);

  /* a stroked path, with a wide soft copy under it standing in for a glow */
  const G = (d, w, c, g) => {
    w = w || 2.2; c = c || C.gold; g = g || C.violet;
    return `<path d="${d}" fill="none" stroke="${g}" stroke-width="${w + 5}" opacity=".15"
              stroke-linecap="round" stroke-linejoin="round"/>` +
           `<path d="${d}" fill="none" stroke="${c}" stroke-width="${w}"
              stroke-linecap="round" stroke-linejoin="round"/>`;
  };
  const RING = (x, y, r, w, c, g) => G(
    `M${N(x - r)} ${N(y)}a${N(r)} ${N(r)} 0 1 0 ${N(r * 2)} 0a${N(r)} ${N(r)} 0 1 0 ${N(-r * 2)} 0`, w, c, g);
  /* a ring left open, for the card that has not closed anything yet */
  const RING_OPEN = (x, y, r, w, gap) => {
    const c = 2 * Math.PI * r, g = gap || 66;
    const a = `<circle cx="${N(x)}" cy="${N(y)}" r="${N(r)}" fill="none"
      stroke-dasharray="${N(c - g)} ${N(g)}" stroke-dashoffset="${N(c * 0.75 - g / 2)}"
      stroke-linecap="round"`;
    return `${a} stroke="${C.violet}" stroke-width="${(w || 2.2) + 5}" opacity=".15"/>` +
           `${a} stroke="${C.gold}" stroke-width="${w || 2.2}"/>`;
  };
  const DOT = (x, y, r, c) => `<circle cx="${N(x)}" cy="${N(y)}" r="${N(r)}" fill="${c || C.gold}"/>`;
  const LINE = (x1, y1, x2, y2, w, c, g) => G(`M${N(x1)} ${N(y1)}L${N(x2)} ${N(y2)}`, w, c, g);

  function star(cx, cy, R, r, pts, rot) {
    let d = '';
    rot = rot === undefined ? -90 : rot;
    for (let i = 0; i < pts * 2; i++) {
      const rad = i % 2 ? r : R, a = (rot + i * 180 / pts) * Math.PI / 180;
      d += (i ? 'L' : 'M') + N(cx + rad * Math.cos(a)) + ' ' + N(cy + rad * Math.sin(a));
    }
    return d + 'Z';
  }
  const STAR = (x, y, R, pts, w, c) => G(star(x, y, R, R * 0.42, pts || 8), w || 1.8, c || C.gold);
  const poly = (cx, cy, r, n, rot) => {
    let d = '';
    for (let i = 0; i < n; i++) {
      const a = ((rot || -90) + i * 360 / n) * Math.PI / 180;
      d += (i ? 'L' : 'M') + N(cx + r * Math.cos(a)) + ' ' + N(cy + r * Math.sin(a));
    }
    return d + 'Z';
  };

  /* the field a card is printed on, its stars fixed by the card's own seed */
  function field(seed) {
    let v = seed * 9301 + 49297;
    const rnd = () => ((v = (v * 9301 + 49297) % 233280) / 233280);
    let s = '';
    for (let i = 0; i < 40; i++) {
      const x = 18 + rnd() * 264, y = 26 + rnd() * 458, r = 0.5 + rnd() * 1.5;
      s += `<circle cx="${N(x)}" cy="${N(y)}" r="${N(r)}" fill="${C.star}" opacity="${N(0.25 + rnd() * 0.6)}"/>`;
    }
    return s;
  }

  /* the constellation that reaches out of every sigil, so no card is a lone
     shape floating in the middle of a rectangle */
  function constellation(seed) {
    let v = seed * 7717 + 104729;
    const rnd = () => ((v = (v * 7717 + 104729) % 233280) / 233280);
    const pts = [];
    for (let i = 0; i < 5; i++) {
      const a = rnd() * Math.PI * 2, r = 96 + rnd() * 40;
      pts.push([150 + Math.cos(a) * r * 0.78, 250 + Math.sin(a) * r]);
    }
    let s = '';
    for (let i = 1; i < pts.length; i++)
      s += `<path d="M${N(pts[i - 1][0])} ${N(pts[i - 1][1])}L${N(pts[i][0])} ${N(pts[i][1])}"
              stroke="${C.cyan}" stroke-width="0.7" opacity=".34" fill="none"/>`;
    pts.forEach(p => { s += DOT(p[0], p[1], 1.7, C.cyan); });
    return s;
  }

  /* ---------- the twenty two trumps ----------
     One device each, chosen so the card is recognisable as geometry: the
     Wheel is a wheel, Justice is a balance, the Tower is struck. Nothing here
     tries to be a picture of a person.                                       */

  const X = 150, Y = 250;                       /* the centre of every sigil */
  const T = {};

  /* 0 · a circle open at the top, and the step out of it */
  T.m00 = () => RING_OPEN(X, Y, 60, 2.2, 74) +
    LINE(X - 16, Y - 62, X + 18, Y - 92, 2) + STAR(X + 26, Y - 99, 12, 5, 1.6, C.cyan);
  /* 1 · the axis, and the four things on the table */
  T.m01 = () => LINE(X, Y - 74, X, Y + 74, 2.4) +
    RING(X, Y - 74, 8, 1.8) + G(poly(X - 46, Y + 6, 15, 3, -90), 1.8) +
    RING(X + 46, Y + 6, 15, 1.8) + G(poly(X - 46, Y + 50, 15, 4, -45), 1.8) +
    STAR(X + 46, Y + 50, 15, 5, 1.6);
  /* 2 · the crescent between two pillars */
  T.m02 = () => LINE(X - 52, Y - 72, X - 52, Y + 72, 2.2) + LINE(X + 52, Y - 72, X + 52, Y + 72, 2.2) +
    G(`M${X} ${Y - 44}a44 44 0 1 0 0 88a34 34 0 1 1 0 -88Z`, 2.2) +
    DOT(X - 52, Y - 72, 3) + DOT(X + 52, Y - 72, 3);
  /* 3 · the seeded circle */
  T.m03 = () => RING(X, Y, 62, 2.2) + (() => {
    let s = ''; for (let i = 0; i < 12; i++) {
      const a = (i * 30 - 90) * Math.PI / 180;
      s += DOT(X + Math.cos(a) * 34, Y + Math.sin(a) * 34, 3.4);
    } return s;
  })() + RING(X, Y, 12, 1.6, C.cyan);
  /* 4 · the square, crowned */
  T.m04 = () => G(`M${X - 50} ${Y - 34}h100v88h-100Z`, 2.2) +
    G(`M${X - 50} ${Y - 34}l16 -26 18 20 16 -30 16 30 18 -20 16 26`, 2) + LINE(X, Y - 6, X, Y + 30, 1.6, C.cyan);
  /* 5 · three bars and a key */
  T.m05 = () => LINE(X - 54, Y - 44, X + 54, Y - 44, 2.2) + LINE(X - 44, Y - 12, X + 44, Y - 12, 2.2) +
    LINE(X - 34, Y + 20, X + 34, Y + 20, 2.2) + LINE(X, Y - 68, X, Y + 66, 2) +
    RING(X, Y + 62, 12, 1.8, C.cyan);
  /* 6 · two circles overlapping, and the star where they meet */
  T.m06 = () => RING(X - 26, Y, 50, 2.2) + RING(X + 26, Y, 50, 2.2) + STAR(X, Y, 17, 6, 1.8, C.cyan);
  /* 7 · the chevron between two wheels */
  T.m07 = () => RING(X - 56, Y + 44, 20, 2) + RING(X + 56, Y + 44, 20, 2) +
    G(`M${X - 54} ${Y + 4}l54 -62 54 62`, 2.4) + LINE(X - 40, Y + 22, X + 40, Y + 22, 2);
  /* 8 · Strength here, not Justice: the lemniscate over the crescent */
  T.m08 = () => G(`M${X} ${Y - 18}c-22 -26 -52 -26 -52 0c0 26 30 26 52 0c22 -26 52 -26 52 0c0 26 -30 26 -52 0Z`, 2.2) +
    G(`M${X - 40} ${Y + 34}a44 44 0 0 0 80 0`, 2.2, C.cyan);
  /* 9 · the lantern under the hood */
  T.m09 = () => G(`M${X - 46} ${Y + 16}a46 60 0 0 1 92 0`, 2.2) +
    G(`M${X - 20} ${Y + 16}h40v46h-40Z`, 2) + STAR(X, Y + 39, 13, 6, 1.6, C.cyan) +
    LINE(X, Y - 42, X, Y - 62, 1.8);
  /* 10 · the wheel */
  T.m10 = () => RING(X, Y, 66, 2.2) + RING(X, Y, 26, 1.8) + (() => {
    let s = ''; for (let i = 0; i < 8; i++) {
      const a = (i * 45) * Math.PI / 180;
      s += LINE(X + Math.cos(a) * 26, Y + Math.sin(a) * 26, X + Math.cos(a) * 66, Y + Math.sin(a) * 66, 1.6);
    } return s;
  })();
  /* 11 · Justice here: the balance, level */
  T.m11 = () => LINE(X, Y - 62, X, Y + 66, 2.2) + LINE(X - 62, Y - 30, X + 62, Y - 30, 2.2) +
    G(`M${X - 62} ${Y - 30}a22 22 0 0 0 44 0`, 2) + G(`M${X + 18} ${Y - 30}a22 22 0 0 0 44 0`, 2) +
    DOT(X, Y - 62, 4) + LINE(X - 26, Y + 66, X + 26, Y + 66, 1.8, C.cyan);
  /* 12 · hung from the beam */
  T.m12 = () => LINE(X - 66, Y - 62, X + 66, Y - 62, 2.2) + LINE(X, Y - 62, X, Y - 22, 2) +
    G(poly(X, Y + 22, 52, 3, 90), 2.2) + RING(X, Y + 4, 9, 1.6, C.cyan);
  /* 13 · the scythe over the horizon */
  T.m13 = () => G(`M${X - 62} ${Y - 34}a76 76 0 0 1 118 22`, 2.4) +
    LINE(X - 62, Y - 34, X + 46, Y + 62, 2.2) + LINE(X - 68, Y + 62, X + 68, Y + 62, 1.6, C.cyan);
  /* 14 · what is poured between two vessels */
  T.m14 = () => G(poly(X - 42, Y - 30, 30, 3, -90), 2.2) + G(poly(X + 42, Y + 30, 30, 3, 90), 2.2) +
    (() => { let s = ''; for (let i = 0; i < 7; i++) s += DOT(X - 30 + i * 10, Y - 18 + i * 8, 2.2, C.cyan); return s; })();
  /* 15 · the star inverted, bound in a circle */
  T.m15 = () => RING(X, Y, 64, 2.2) + G(star(X, Y, 46, 19, 5, 90), 2.2) +
    LINE(X - 34, Y + 62, X + 34, Y + 62, 1.8, C.cyan);
  /* 16 · the tower, struck */
  T.m16 = () => G(`M${X - 32} ${Y + 74}L${X - 24} ${Y - 26}h48L${X + 32} ${Y + 74}Z`, 2.2) +
    G(`M${X - 25} ${Y - 26}v-15h9v9h10v-9h9v9h10v-9h9v15`, 2) +
    G(`M${X + 16} ${Y - 92}l-26 42h20l-16 34`, 2.4, C.cyan, C.cyan) +
    LINE(X - 44, Y + 74, X + 44, Y + 74, 1.6);
  /* 17 · the great star, and the seven */
  T.m17 = () => STAR(X, Y - 10, 46, 8, 2.4) + (() => {
    let s = ''; for (let i = 0; i < 7; i++) {
      const a = (i * 51.4 - 90) * Math.PI / 180;
      s += STAR(X + Math.cos(a) * 78, Y - 10 + Math.sin(a) * 84, 10, 6, 1.3, C.cyan);
    } return s;
  })();
  /* 18 · the crescent, and the path under it */
  T.m18 = () => G(`M${X + 22} ${Y - 62}a62 62 0 1 0 0 96a48 48 0 1 1 0 -96Z`, 2.2) +
    (() => { let s = ''; for (let i = 0; i < 6; i++) s += DOT(X - 58 + i * 23, Y + 62 - (i % 2) * 9, 2.6, C.cyan); return s; })();
  /* 19 · the sun */
  T.m19 = () => RING(X, Y, 40, 2.4) + (() => {
    let s = ''; for (let i = 0; i < 12; i++) {
      const a = (i * 30) * Math.PI / 180;
      s += LINE(X + Math.cos(a) * 52, Y + Math.sin(a) * 52, X + Math.cos(a) * 72, Y + Math.sin(a) * 72, 2);
    } return s;
  })();
  /* 20 · the call, and what rises to it */
  T.m20 = () => G(`M${X - 66} ${Y - 52}l100 -18v36Z`, 2.2) +
    (() => { let s = ''; for (let i = 0; i < 3; i++) s += G(`M${X - 40 + i * 40 - 20} ${Y + 60}l20 -26 20 26`, 2, C.cyan); return s; })();
  /* 21 · the wreath, and the four that hold its corners */
  T.m21 = () => G(`M${X} ${Y - 78}a54 78 0 1 0 .1 0Z`, 2.2) +
    STAR(X, Y, 22, 4, 1.8, C.cyan) +
    [[-1,-1],[1,-1],[-1,1],[1,1]].map(p => STAR(X + p[0] * 84, Y + p[1] * 86, 11, 4, 1.5)).join('');

  /* ---------- the four suits ----------
     One glyph each, drawn once and placed by transform, the way a block cutter
     cut one and stamped it as many times as the number asked for.            */

  const SUIT = {
    wands: s => `<g transform="translate(0,0) scale(${s})">` +
      G('M0 -30L0 30', 2.2) + G('M0 -30c-9 -10 -3 -20 0 -24c3 4 9 14 0 24Z', 1.8, C.goldHi) +
      G('M-7 22h14', 1.6) + '</g>',
    cups: s => `<g transform="scale(${s})">` +
      G('M-18 -22h36l-4 20a14 14 0 0 1 -28 0Z', 2) + G('M0 12v14', 2) + G('M-13 26h26', 2) +
      RING(0, -26, 4.5, 1.4, C.cyan) + '</g>',
    swords: s => `<g transform="scale(${s})">` +
      G('M0 -32L7 -6L0 26L-7 -6Z', 2) + G('M-13 -6h26', 2) + RING(0, 30, 4.5, 1.5, C.cyan) + '</g>',
    pentacles: s => `<g transform="scale(${s})">` +
      RING(0, 0, 24, 2) + G(star(0, 0, 15, 6.2, 5), 1.6, C.goldHi) + '</g>',
  };
  const place = (glyph, x, y) => `<g transform="translate(${N(x)} ${N(y)})">${glyph}</g>`;

  /* how many, and where. The classic ranks, kept airy so the card breathes. */
  const ROWS = {
    2: [1, 1], 3: [1, 1, 1], 4: [2, 2], 5: [2, 1, 2], 6: [2, 2, 2],
    7: [2, 2, 2, 1], 8: [2, 2, 2, 2], 9: [3, 3, 3], 10: [2, 2, 2, 2, 2],
  };
  const BOX = { top: 108, bot: 396 };

  function ranged(n, suit) {
    const rows = ROWS[n], gap = (BOX.bot - BOX.top) / rows.length;
    const s = Math.min(1.05, 4.2 / rows.length);
    let out = '';
    rows.forEach((count, i) => {
      const y = BOX.top + gap * (i + 0.5);
      const glyph = SUIT[suit](s);
      if (count === 1) out += place(glyph, X, y);
      else if (count === 2) { out += place(glyph, X - 48, y); out += place(glyph, X + 48, y); }
      else { out += place(glyph, X - 58, y); out += place(glyph, X, y); out += place(glyph, X + 58, y); }
    });
    return out;
  }

  /* the ace: the glyph held large, over a bloom, in a ring */
  const ace = suit => RING(X, Y, 88, 1.4, C.gold, C.cyan) +
    place(SUIT[suit](2.2), X, Y) +
    (() => { let s = ''; for (let i = 0; i < 8; i++) {
      const a = (i * 45 - 90) * Math.PI / 180;
      s += DOT(X + Math.cos(a) * 96, Y + Math.sin(a) * 100, 2, C.cyan); } return s; })();

  /* the courts: the suit under its rank */
  const RANK = {
    11: () => STAR(X, Y - 82, 13, 5, 1.6, C.cyan),
    12: () => G(`M${X - 24} ${Y - 70}l24 -22 24 22`, 2.2, C.cyan),
    13: () => G(`M${X - 30} ${Y - 86}a30 30 0 0 0 60 0`, 2.2, C.cyan),
    14: () => G(`M${X - 32} ${Y - 70}v-16l16 10 16 -20 16 20 16 -10v16Z`, 2, C.cyan),
  };
  const court = (n, suit) => RANK[n]() + place(SUIT[suit](2), X, Y + 16) +
    LINE(X - 44, Y + 84, X + 44, Y + 84, 1.2, C.gold, C.gold);

  const minor = card => card.n === 1 ? ace(card.suit)
    : card.n >= 11 ? court(card.n, card.suit)
    : ranged(card.n, card.suit);

  /* ---------- the card itself ---------- */

  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X',
    'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX', 'XXI'];
  const FACE = 'Palatino Linotype,Palatino,Georgia,serif';

  const frame = () =>
    `<rect x="12" y="12" width="276" height="486" rx="9" fill="none" stroke="${C.gold}"
       stroke-width="1.3" opacity=".55"/>
     <rect x="19.5" y="19.5" width="261" height="471" rx="6" fill="none" stroke="${C.gold}"
       stroke-width=".7" opacity=".3"/>` +
    [[19.5, 19.5], [280.5, 19.5], [19.5, 490.5], [280.5, 490.5]]
      .map(p => `<path d="M${p[0]} ${p[1] - 5}l5 5l-5 5l-5 -5Z" fill="${C.gold}" opacity=".75"/>`).join('');

  const lettering = name => {
    const n = name.length;
    const size = n <= 15 ? 15 : n <= 21 ? 12.5 : 11;
    const track = n <= 15 ? 2.6 : n <= 21 ? 1.4 : .8;
    return `<path d="M56 446H244" stroke="${C.gold}" stroke-width=".7" opacity=".38" fill="none"/>
      <text x="150" y="470" text-anchor="middle" fill="${C.goldHi}" font-family="${FACE}"
        font-size="${size}" letter-spacing="${track}">${name}</text>`;
  };

  window.cardSVG = function (card, lang) {
    lang = lang || 'es';
    const name = esc(card.name[lang] || card.name.es).toUpperCase();
    const major = card.a === 'major';
    const seed = major ? card.n + 3 : card.id.charCodeAt(0) + card.n * 7;
    const num = major ? (card.n === 0 ? '' : ROMAN[card.n])
                      : (card.n <= 10 ? ROMAN[card.n] : '');
    const sigil = major ? (T[card.id] || T.m00)() : minor(card);

    return `<svg viewBox="0 0 300 510" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${name}">
  <defs>
    <linearGradient id="g${card.id}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${C.top}"/><stop offset="1" stop-color="${C.bottom}"/>
    </linearGradient>
    <radialGradient id="b${card.id}" cx="50%" cy="49%" r="46%">
      <stop offset="0" stop-color="${C.violet}" stop-opacity=".30"/>
      <stop offset="1" stop-color="${C.violet}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="300" height="510" rx="12" fill="url(#g${card.id})"/>
  ${field(seed)}
  <rect width="300" height="510" fill="url(#b${card.id})"/>
  ${constellation(seed)}
  <g class="art">${sigil}</g>
  ${frame()}
  ${num ? `<text x="150" y="56" text-anchor="middle" fill="${C.gold}" font-family="${FACE}"
      font-size="17" letter-spacing="3">${num}</text>` : STAR(150, 48, 9, 6, 1.3, C.cyan)}
  ${lettering(name)}
</svg>`;
  };

  /* the back: the same night, and one mandala that belongs to no card */
  window.cardBackSVG = function () {
    let orbit = '';
    for (let i = 0; i < 12; i++) {
      const a = (i * 30 - 90) * Math.PI / 180;
      orbit += DOT(150 + Math.cos(a) * 96, 255 + Math.sin(a) * 96, 2.2, C.cyan);
    }
    return `<svg viewBox="0 0 300 510" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <defs>
    <linearGradient id="gb" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#1E1750"/><stop offset="1" stop-color="#0A0819"/>
    </linearGradient>
    <radialGradient id="bb" cx="50%" cy="50%" r="52%">
      <stop offset="0" stop-color="${C.cyan}" stop-opacity=".22"/>
      <stop offset="1" stop-color="${C.cyan}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="300" height="510" rx="12" fill="url(#gb)"/>
  ${field(97)}
  <rect width="300" height="510" fill="url(#bb)"/>
  ${orbit}
  ${RING(150, 255, 74, 1.6)}
  ${RING(150, 255, 52, 1)}
  ${G(star(150, 255, 46, 18, 8), 1.8, C.gold)}
  ${G(star(150, 255, 26, 10, 8, -67.5), 1.4, C.cyan)}
  ${DOT(150, 255, 5, C.goldHi)}
  ${frame()}
</svg>`;
  };

  window.cardSVG2 = window.cardSVG;
})();
