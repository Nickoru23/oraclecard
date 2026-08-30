/* ===== The Witch Atelier — the atelier deck =====

   Original artwork, drawn in the idiom of the Tarot de Marseille type I: the
   Jean Dodal, printed in Lyon between 1701 and 1715, of which the Bibliotheque
   nationale de France holds one of the two surviving copies. Nothing here is
   traced or copied. What is borrowed is the grammar of the woodblock, which is
   long out of copyright and was never anyone's to own:

     a cream stock, a heavy black keyline, and a second hairline inside it
     flat colour dropped into black outlines, no shading and no gradient
     six inks and no more, because a block press could carry no more
     the number set in Roman above the scene, the name lettered below it
     pips built the way a block cutter built them, batons woven into a lattice,
       swords curved into a basket, cups and coins ranged in rows

   Every card is drawn at 300 by 510 and costs nothing to serve. This is what
   keeps the whole deck under a hundred kilobytes with not one request.        */

(function () {

  /* the six inks of the block, plus the stock they sit on */
  const C = {
    stock:  '#EFE6D2',
    ink:    '#211C16',
    red:    '#B4453C',
    blue:   '#4A6E8A',
    gold:   '#D2A340',
    flesh:  '#E9CBA6',
    green:  '#6D8757',
    white:  '#F7F2E6',
  };

  /* ---------- the block cutter's primitives ----------
     Everything is a filled shape carrying a black outline. The weights are the
     three a cutter actually has: the contour, the interior line, the hatch. */
  const W = { out: 3, in: 2, hair: 1.2 };

  const K = (extra = '') =>
    `stroke="${C.ink}" stroke-linejoin="round" stroke-linecap="round" ${extra}`;

  const P  = (d, fill = 'none', w = W.out) => `<path d="${d}" fill="${fill}" ${K(`stroke-width="${w}"`)}/>`;
  const CI = (x, y, r, fill = 'none', w = W.out) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}" ${K(`stroke-width="${w}"`)}/>`;
  const EL = (x, y, rx, ry, fill = 'none', w = W.out) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${fill}" ${K(`stroke-width="${w}"`)}/>`;
  const R  = (x, y, w_, h, fill = 'none', w = W.out) => `<rect x="${x}" y="${y}" width="${w_}" height="${h}" fill="${fill}" ${K(`stroke-width="${w}"`)}/>`;
  const L  = (x1, y1, x2, y2, w = W.in) => `<path d="M${x1} ${y1}L${x2} ${y2}" fill="none" ${K(`stroke-width="${w}"`)}/>`;
  const G  = (body, tx = 0, ty = 0, s = 1) =>
    `<g transform="translate(${tx} ${ty})${s !== 1 ? ` scale(${s})` : ''}">${body}</g>`;

  /* a star of n points, the one ornament the block repeats everywhere */
  function starPath(cx, cy, R_, r_, pts, rot = -90) {
    let d = '';
    for (let i = 0; i < pts * 2; i++) {
      const rad = i % 2 ? r_ : R_, a = (rot + i * 180 / pts) * Math.PI / 180;
      d += (i ? 'L' : 'M') + (cx + rad * Math.cos(a)).toFixed(1) + ' ' + (cy + rad * Math.sin(a)).toFixed(1);
    }
    return d + 'Z';
  }
  const STAR = (x, y, r, fill = C.gold, pts = 8, w = W.in) => P(starPath(x, y, r, r * 0.42, pts), fill, w);

  /* ---------- the figure ----------
     A Marseille figure is built from a very few parts, always the same ones.
     Head, hair, a bell of a robe, two sleeves, two feet. The face is three
     marks. Keeping it this blunt is what makes it read as cut, not drawn. */

  const face = (x, y, s = 1) => G(
    L(-5, -3, -3.4, -3, W.hair) + L(5, -3, 3.4, -3, W.hair) +
    P('M0 -2 L0 3 L2.6 3.6', 'none', W.hair) +
    P('M-3.6 8 Q0 10.4 3.6 8', 'none', W.hair), x, y, s);

  const head = (x, y, r = 15, fill = C.flesh) => CI(x, y, r, fill) + face(x, y, r / 15);

  /* hair, drawn as the cutter drew it: a scalloped mass, never strands */
  const hair = (x, y, r = 15, fill = C.gold) => P(
    `M${x - r - 1} ${y + 2} Q${x - r - 2} ${y - r - 8} ${x} ${y - r - 6}
     Q${x + r + 2} ${y - r - 8} ${x + r + 1} ${y + 2}
     Q${x + r - 2} ${y - r + 4} ${x} ${y - r + 2}
     Q${x - r + 2} ${y - r + 4} ${x - r - 1} ${y + 2}Z`, fill, W.in);

  /* the bell: shoulders down to a hem, the shape under nearly every figure */
  const bell = (x, top, halfTop, bottom, halfBot, fill) => P(
    `M${x - halfTop} ${top} Q${x - halfTop - 4} ${(top + bottom) / 2} ${x - halfBot} ${bottom}
     L${x + halfBot} ${bottom} Q${x + halfTop + 4} ${(top + bottom) / 2} ${x + halfTop} ${top}Z`, fill);

  const sleeve = (x, y, dx, dy, fill, wdt = 13) => P(
    `M${x} ${y} Q${x + dx * 0.6} ${y + dy * 0.35} ${x + dx} ${y + dy}
     L${x + dx + (dy > 0 ? wdt : wdt)} ${y + dy + 6}
     Q${x + dx * 0.6 + wdt * 0.6} ${y + dy * 0.35 + 8} ${x + wdt * 0.5} ${y + 10}Z`, fill, W.in);

  const hand = (x, y, r = 5) => CI(x, y, r, C.flesh, W.in);

  const feet = (x, y, spread = 11) =>
    P(`M${x - 2} ${y - 6} L${x - 2} ${y} L${x - spread} ${y} L${x - spread} ${y - 4}Z`, C.flesh, W.in) +
    P(`M${x + 2} ${y - 6} L${x + 2} ${y} L${x + spread} ${y} L${x + spread} ${y - 4}Z`, C.flesh, W.in);

  /* headgear */
  const crown = (x, y, w = 34, fill = C.gold) => P(
    `M${x - w / 2} ${y} L${x - w / 2} ${y - 8} L${x - w / 3} ${y - 2} L${x - w / 6} ${y - 13}
     L${x} ${y - 4} L${x + w / 6} ${y - 13} L${x + w / 3} ${y - 2} L${x + w / 2} ${y - 8}
     L${x + w / 2} ${y}Z`, fill, W.in);

  const tiara = (x, y, fill = C.gold) => P(
    `M${x - 15} ${y} L${x - 13} ${y - 14} L${x - 10} ${y - 26} L${x - 6} ${y - 36}
     Q${x} ${y - 44} ${x + 6} ${y - 36} L${x + 10} ${y - 26} L${x + 13} ${y - 14}
     L${x + 15} ${y}Z`, fill, W.in) +
    L(x - 13, y - 13, x + 13, y - 13, W.hair) + L(x - 10, y - 25, x + 10, y - 25, W.hair);

  /* the wide figure-of-eight brim the Bateleur and the Force both wear */
  const brim = (x, y, fill = C.red) => P(
    `M${x - 30} ${y} Q${x - 34} ${y - 12} ${x - 16} ${y - 13} Q${x} ${y - 22} ${x + 16} ${y - 13}
     Q${x + 34} ${y - 12} ${x + 30} ${y} Q${x} ${y + 9} ${x - 30} ${y}Z`, fill, W.in);

  const halo = (x, y, r = 24) => CI(x, y, r, 'none', W.in);

  /* wings, for Temperance, the Devil and the angel of the Judgement */
  const wing = (x, y, dir = 1, fill = C.white, sc = 1) => G(
    P(`M0 0 Q${28 * dir} -16 ${46 * dir} -4 Q${34 * dir} 2 ${44 * dir} 12
       Q${30 * dir} 12 ${36 * dir} 24 Q${18 * dir} 18 0 0Z`, fill, W.in), x, y, sc);

  /* a staff or sceptre, the commonest thing a hand holds */
  const staff = (x1, y1, x2, y2, fill = C.gold, knob = 0) =>
    P(`M${x1} ${y1}L${x2} ${y2}`, 'none', 4) +
    (knob ? CI(x1, y1, knob, fill, W.in) : '');

  /* ground, water, cloud: the three settings the deck ever uses */
  const ground = (y = 420, fill = C.green) => P(
    `M20 ${y + 6} Q80 ${y - 8} 150 ${y + 2} Q220 ${y + 12} 280 ${y - 4} L280 444 L20 444Z`, fill, W.in);

  const water = (y = 398) => P(
    `M20 ${y} Q70 ${y - 10} 120 ${y} Q170 ${y + 10} 220 ${y} Q255 ${y - 7} 280 ${y}
     L280 444 L20 444Z`, C.blue, W.in) +
    L(48, y + 16, 104, y + 16, W.hair) + L(150, y + 24, 214, y + 24, W.hair) +
    L(76, y + 34, 132, y + 34, W.hair);

  const cloud = (x, y, s = 1) => G(P(
    `M-52 0 Q-62 -18 -42 -24 Q-38 -44 -14 -38 Q0 -54 20 -40 Q44 -44 46 -22
     Q62 -14 50 2 Q0 10 -52 0Z`, C.white, W.in), x, y, s);

  /* ---------- the twenty two trumps ----------
     One entry each, composed from the parts above. The order and the attributes
     follow the Marseille pattern, so a reader who knows the deck finds what
     they expect: the Bateleur behind his table, the Pendu by one foot, the
     Etoile pouring two jugs into the river.                                   */

  const T = {};

  /* 0 · Le Mat, the fool who is not numbered */
  T.m00 = () => ground(418) +
    P('M118 300 L212 168', 'none', 4) +                       /* the stick */
    P('M206 158 Q224 152 226 168 Q214 180 202 174Z', C.red, W.in) +  /* the bundle */
    bell(150, 268, 20, 400, 34, C.blue) +
    P('M130 268 L150 300 L170 268', C.red, W.in) +
    sleeve(136, 272, -20, 26, C.red) + hand(114, 302) +
    sleeve(166, 268, 28, -74, C.red) + hand(200, 196) +
    head(150, 244, 16) + hair(150, 244, 16) +
    P('M134 232 Q150 210 166 232 Q158 224 150 226 Q142 224 134 232Z', C.gold, W.in) +
    STAR(150, 208, 7, C.gold, 5) +
    feet(150, 412) +
    /* the animal at his heel, worrying the hem */
    P('M96 396 Q80 380 88 366 Q96 356 108 362 Q118 350 126 364 Q134 380 120 396Z', C.white, W.in) +
    P('M90 366 L82 352 L96 358Z', C.white, W.in) + CI(102, 374, 2.4, C.ink, W.hair) +
    P('M120 392 Q136 386 142 396', 'none', W.in);

  /* 1 · Le Bateleur, everything laid out on the table */
  T.m01 = () =>
    R(64, 340, 172, 14, C.gold, W.in) +
    P('M78 354 L86 424 M222 354 L214 424', 'none', W.in) +
    bell(150, 258, 22, 340, 30, C.red) +
    sleeve(128, 264, -24, 44, C.blue) + hand(100, 314) +
    sleeve(172, 258, 22, -58, C.blue) + hand(198, 202) +
    P('M198 176 L200 214', 'none', 4) + CI(199, 172, 5, C.gold, W.in) +
    head(150, 236, 15) + brim(150, 222) +
    /* the tools: a cup, a coin, a blade */
    P('M96 326 L112 326 L108 340 L100 340Z', C.gold, W.in) + L(96, 326, 112, 326, W.hair) +
    CI(140, 333, 7, C.gold, W.in) + CI(140, 333, 3, 'none', W.hair) +
    P('M166 340 L196 326 L200 331 L170 342Z', C.white, W.in) +
    P('M212 338 L228 338 L226 328 L214 328Z', C.blue, W.in);

  /* 2 · La Papesse, the book open on her lap */
  T.m02 = () =>
    P('M78 160 L78 400 M222 160 L222 400', 'none', W.in) +
    P('M78 160 Q150 132 222 160', C.blue, W.in) +
    bell(150, 262, 26, 404, 48, C.blue) +
    P('M124 262 Q150 250 176 262 L176 300 Q150 292 124 300Z', C.white, W.in) +
    head(150, 238, 15) + tiara(150, 224, C.gold) +
    sleeve(126, 272, -14, 40, C.red) + sleeve(174, 272, 14, 40, C.red) +
    R(120, 316, 60, 34, C.white, W.in) + L(150, 316, 150, 350, W.in) +
    L(128, 326, 144, 326, W.hair) + L(156, 326, 172, 326, W.hair) +
    L(128, 336, 144, 336, W.hair) + L(156, 336, 172, 336, W.hair);

  /* 3 · L'Imperatrice, sceptre and shield */
  T.m03 = () =>
    bell(150, 264, 26, 406, 50, C.red) +
    P('M126 264 Q150 254 174 264 L172 306 Q150 298 128 306Z', C.gold, W.in) +
    head(150, 240, 15) + hair(150, 240, 15) + crown(150, 224, 38) +
    sleeve(126, 274, -22, 34, C.blue) + hand(102, 316) +
    sleeve(174, 272, 20, 30, C.blue) + hand(198, 308) +
    staff(198, 300, 198, 196, C.gold) + CI(198, 190, 8, C.gold, W.in) +
    P('M198 182 L198 174', 'none', W.in) +
    P('M78 316 L120 316 L120 348 Q99 368 78 348Z', C.gold, W.in) +
    P('M92 326 Q99 318 106 326 Q112 336 99 346 Q86 336 92 326Z', C.ink, W.hair);

  /* 4 · L'Empereur, seated in profile with the legs crossed into a four */
  T.m04 = () =>
    P('M104 340 L104 412 M196 340 L196 412', 'none', W.in) +
    R(96, 320, 108, 22, C.gold, W.in) +
    bell(150, 262, 24, 336, 40, C.blue) +
    head(154, 238, 15) + hair(154, 238, 15) + crown(154, 222, 36) +
    sleeve(130, 272, -20, 28, C.red) + hand(108, 306) +
    sleeve(178, 268, 20, -46, C.red) + hand(202, 226) +
    staff(202, 220, 202, 320, C.gold) + CI(202, 214, 7, C.gold, W.in) +
    /* the crossed legs the pattern is known for */
    P('M136 336 Q128 372 152 380 Q176 386 172 412', 'none', 4) +
    P('M166 336 Q178 360 150 372', 'none', 4) +
    P('M74 330 L112 330 L112 362 Q93 380 74 362Z', C.gold, W.in) +
    P('M84 340 Q93 332 102 340 Q108 350 93 360 Q78 350 84 340Z', C.ink, W.hair);

  /* 5 · Le Pape, the hand raised over two heads */
  T.m05 = () =>
    P('M84 200 L84 400 M216 200 L216 400', 'none', W.in) +
    bell(150, 258, 26, 384, 46, C.red) +
    P('M126 258 Q150 248 174 258 L172 302 Q150 294 128 302Z', C.white, W.in) +
    head(150, 234, 15) + tiara(150, 220, C.gold) +
    sleeve(126, 268, -18, 30, C.red) + hand(104, 306) +
    staff(104, 300, 104, 186, C.gold) +
    L(88, 202, 120, 202, W.in) + L(92, 218, 116, 218, W.in) + L(96, 234, 112, 234, W.in) +
    sleeve(176, 262, 20, -34, C.red) +
    P('M194 226 L194 206 M202 228 L202 208 M186 230 L188 216', 'none', W.in) +
    hand(196, 234, 8) +
    /* the two who kneel */
    CI(112, 396, 12, C.flesh, W.in) + bell(112, 406, 12, 444, 20, C.blue) +
    CI(188, 396, 12, C.flesh, W.in) + bell(188, 406, 12, 444, 20, C.gold);

  /* 6 · L'Amoureux, three below and the archer above */
  T.m06 = () => ground(422) +
    cloud(150, 130, 0.72) + CI(150, 108, 12, C.flesh, W.in) +
    wing(138, 118, -1, C.white, 0.5) + wing(162, 118, 1, C.white, 0.5) +
    P('M124 128 Q150 108 176 128', 'none', W.in) + L(150, 118, 150, 148, W.hair) +
    P('M144 148 L150 138 L156 148Z', C.red, W.in) +
    bell(150, 268, 20, 416, 30, C.gold) + head(150, 246, 14) + hair(150, 246, 14, C.ink) +
    bell(96, 282, 18, 418, 26, C.red) + head(96, 262, 13) + hair(96, 262, 13) +
    bell(204, 282, 18, 418, 26, C.blue) + head(204, 262, 13) + hair(204, 262, 13, C.ink) +
    sleeve(134, 276, -22, 14, C.gold) + sleeve(166, 276, 22, 14, C.gold);

  /* 7 · Le Chariot, under its canopy, drawn by two */
  T.m07 = () =>
    P('M92 214 L92 250 M208 214 L208 250', 'none', W.in) +
    P('M78 216 Q150 178 222 216Z', C.blue, W.in) + STAR(150, 196, 8, C.gold, 6) +
    R(96, 300, 108, 60, C.gold, W.in) + L(96, 320, 204, 320, W.hair) +
    P('M132 330 Q150 316 168 330 Q168 348 150 350 Q132 348 132 330Z', C.red, W.in) +
    bell(150, 250, 22, 300, 28, C.red) + head(150, 228, 15) + crown(150, 212, 34) +
    sleeve(128, 258, -20, 24, C.blue) + sleeve(172, 258, 20, 24, C.blue) +
    staff(178, 288, 190, 232, C.gold) +
    CI(110, 386, 22, C.white, W.in) + CI(110, 386, 9, 'none', W.hair) +
    CI(190, 386, 22, C.white, W.in) + CI(190, 386, 9, 'none', W.hair) +
    /* the two horses, shown as the block shows them, head and shoulder only */
    P('M62 360 Q46 344 56 328 Q68 318 80 330 L86 360Z', C.flesh, W.in) +
    P('M214 360 L220 330 Q232 318 244 328 Q254 344 238 360Z', C.flesh, W.in) +
    CI(64, 336, 2.4, C.ink, W.hair) + CI(236, 336, 2.4, C.ink, W.hair);

  /* 8 · La Justice, sword up and the scales level */
  T.m08 = () =>
    R(96, 336, 108, 20, C.gold, W.in) +
    bell(150, 258, 24, 400, 44, C.red) +
    P('M126 258 Q150 248 174 258 L172 300 Q150 292 128 300Z', C.gold, W.in) +
    head(150, 234, 15) + hair(150, 234, 15) + crown(150, 218, 36) +
    sleeve(176, 264, 22, -30, C.blue) + hand(204, 232) +
    P('M204 226 L204 140', 'none', 5) + P('M192 148 L216 148', 'none', W.in) +
    P('M204 132 L198 148 L210 148Z', C.white, W.in) +
    sleeve(124, 266, -22, 22, C.blue) + hand(98, 292) +
    P('M98 286 L98 268 M64 268 L132 268', 'none', W.in) +
    P('M64 268 L64 290 M132 268 L132 290', 'none', W.hair) +
    P('M52 290 Q64 306 76 290Z', C.gold, W.in) + P('M120 290 Q132 306 144 290Z', C.gold, W.in);

  /* 9 · L'Hermite, the lantern held out and half hooded */
  T.m09 = () =>
    bell(150, 250, 26, 412, 48, C.blue) +
    P('M124 250 Q150 228 176 250 Q176 286 150 294 Q124 286 124 250Z', C.red, W.in) +
    CI(150, 244, 15, C.flesh, W.in) + face(150, 244) +
    P('M132 240 Q150 220 168 240', 'none', W.in) +
    P('M138 268 Q150 296 162 268', C.white, W.in) +              /* the beard */
    sleeve(126, 264, -20, 30, C.blue) + hand(102, 302) +
    staff(102, 296, 96, 424, C.gold) +
    sleeve(174, 262, 24, -18, C.blue) + hand(202, 248) +
    R(186, 250, 34, 40, C.gold, W.in) + P('M186 250 L203 232 L220 250Z', C.red, W.in) +
    STAR(203, 270, 11, C.white, 6) + L(203, 232, 203, 224, W.in);

  /* 10 · La Roue de Fortune, one rising, one falling, one crowned on top */
  T.m10 = () =>
    P('M96 400 L150 300 L204 400Z', 'none', W.in) +
    CI(150, 268, 76, C.stock, W.out) + CI(150, 268, 54, 'none', W.in) + CI(150, 268, 12, C.gold, W.in) +
    [0, 45, 90, 135].map(a => {
      const r = a * Math.PI / 180;
      return L(150 - 76 * Math.cos(r), 268 - 76 * Math.sin(r), 150 + 76 * Math.cos(r), 268 + 76 * Math.sin(r), W.hair);
    }).join('') +
    /* rising on the right */
    P('M214 292 Q236 286 232 262 Q226 244 210 252 Q198 268 214 292Z', C.gold, W.in) +
    CI(222, 250, 8, C.gold, W.in) + P('M226 240 L232 230 M216 240 L210 230', 'none', W.hair) +
    /* falling on the left */
    P('M86 292 Q64 286 68 262 Q74 244 90 252 Q102 268 86 292Z', C.blue, W.in) +
    CI(78, 250, 8, C.blue, W.in) + P('M74 240 L68 230 M84 240 L90 230', 'none', W.hair) +
    /* crowned, and holding the seat */
    P('M132 186 Q150 168 168 186 Q166 204 150 206 Q134 204 132 186Z', C.red, W.in) +
    CI(150, 168, 11, C.red, W.in) + crown(150, 154, 26, C.gold) +
    P('M168 184 L188 172', 'none', W.in);

  /* 11 · La Force, the jaws held shut with bare hands */
  T.m11 = () => ground(424) +
    bell(150, 262, 24, 418, 42, C.blue) +
    head(146, 238, 15) + brim(146, 224, C.red) +
    sleeve(124, 270, -6, 44, C.gold) + sleeve(170, 268, 22, 40, C.gold) +
    /* the lion, in profile, the way the block puts it */
    P('M104 372 Q84 356 96 336 Q112 320 138 328 Q160 336 158 360 Q154 384 128 386 Q110 386 104 372Z', C.gold, W.in) +
    P('M96 336 Q76 330 74 344 Q72 360 88 358', C.gold, W.in) +
    CI(112, 344, 2.6, C.ink, W.hair) + P('M96 356 Q104 364 114 358', 'none', W.hair) +
    P('M112 322 Q120 306 132 316', 'none', W.in) +
    hand(122, 330, 7) + hand(140, 344, 7) +
    P('M158 360 Q182 366 190 388', 'none', W.in);

  /* 12 · Le Pendu, by one foot, the free leg crossed behind */
  T.m12 = () =>
    P('M72 172 L72 424 M228 172 L228 424', 'none', 5) +
    L(72, 190, 228, 190, W.out) +
    P('M64 220 L80 220 M64 260 L80 260 M64 300 L80 300', 'none', W.in) +
    P('M220 220 L236 220 M220 260 L236 260 M220 300 L236 300', 'none', W.in) +
    P('M150 190 L150 224', 'none', W.in) +
    bell(150, 262, 22, 350, 32, C.blue) +
    P('M132 262 L150 286 L168 262', C.red, W.in) +
    /* the tied leg runs up, the other crosses behind it */
    P('M150 224 L150 262', 'none', 4) +
    P('M142 350 L142 224', 'none', 5) +
    P('M158 350 Q186 336 178 300 Q172 276 150 282', 'none', 5) +
    sleeve(132, 300, -16, 40, C.blue) + hand(112, 346) +
    sleeve(168, 300, 16, 40, C.blue) + hand(188, 346) +
    head(150, 380, 16) + hair(150, 380, 16) +
    STAR(104, 240, 6, C.gold, 5) + STAR(196, 240, 6, C.gold, 5);

  /* 13 · the trump the pattern leaves unnamed */
  T.m13 = () =>
    P('M20 402 Q80 388 150 398 Q220 408 280 394 L280 444 L20 444Z', C.ink, W.in) +
    P('M96 300 L216 176', 'none', 5) +
    P('M212 168 Q244 160 246 190 Q226 200 208 186Z', C.white, W.in) +
    /* the figure: ribs, pelvis, skull */
    P('M138 268 L162 268 L166 330 Q150 342 134 330Z', C.white, W.in) +
    L(138, 284, 162, 284, W.hair) + L(137, 298, 163, 298, W.hair) + L(136, 312, 164, 312, W.hair) +
    P('M134 330 L132 396 M166 330 L168 396', 'none', 4) +
    P('M126 396 L146 396 M154 396 L174 396', 'none', W.in) +
    P('M134 268 Q118 276 112 296', 'none', 4) +
    P('M166 268 Q186 250 202 194', 'none', 4) +
    CI(150, 240, 19, C.white, W.in) +
    CI(143, 238, 3.4, C.ink, W.hair) + CI(157, 238, 3.4, C.ink, W.hair) +
    P('M147 248 L150 253 L153 248Z', C.ink, W.hair) +
    L(142, 258, 158, 258, W.hair) + L(146, 254, 146, 262, W.hair) + L(154, 254, 154, 262, W.hair) +
    /* what the scythe has already taken */
    CI(72, 400, 11, C.flesh, W.in) + crown(72, 388, 22, C.gold) +
    P('M226 404 L226 384 M234 406 L236 386 M218 406 L216 388', 'none', W.in) + hand(228, 410, 8);

  /* 14 · Temperance, pouring between two vessels */
  T.m14 = () => ground(424) +
    wing(126, 250, -1, C.white, 0.86) + wing(174, 250, 1, C.white, 0.86) +
    bell(150, 262, 22, 418, 38, C.white) +
    P('M128 262 Q150 252 172 262 L170 300 Q150 292 130 300Z', C.blue, W.in) +
    head(150, 238, 15) + hair(150, 238, 15) +
    P('M132 218 Q150 206 168 218', 'none', W.in) + STAR(150, 202, 7, C.gold, 5) +
    sleeve(126, 272, -18, 22, C.white) + sleeve(174, 272, 18, 22, C.white) +
    P('M84 302 L112 302 L106 336 L90 336Z', C.red, W.in) + L(84, 302, 112, 302, W.hair) +
    P('M188 322 L216 322 L210 356 L194 356Z', C.gold, W.in) + L(188, 322, 216, 322, W.hair) +
    P('M108 310 Q150 318 192 330', 'none', W.in) +
    P('M112 318 Q152 326 190 338', 'none', W.hair);

  /* 15 · Le Diable, on the pedestal, and the two chained below */
  T.m15 = () =>
    R(112, 388, 76, 20, C.ink, W.in) +
    bell(150, 262, 20, 388, 26, C.red) +
    wing(126, 252, -1, C.ink, 0.7) + wing(174, 252, 1, C.ink, 0.7) +
    head(150, 236, 16, C.red) +
    P('M134 224 L124 200 L142 216Z', C.ink, W.in) + P('M166 224 L176 200 L158 216Z', C.ink, W.in) +
    P('M136 208 Q150 194 164 208', 'none', W.in) +
    sleeve(128, 268, -18, -40, C.red) + hand(106, 224) +
    P('M106 218 L106 176', 'none', 4) + P('M98 182 L114 182', 'none', W.in) +
    sleeve(172, 268, 18, -40, C.red) + hand(194, 224) +
    /* the two who are held, and the chains that hold them */
    CI(84, 380, 13, C.flesh, W.in) + P('M84 344 L84 366', 'none', W.hair) +
    bell(84, 392, 13, 440, 20, C.blue) + P('M74 366 L94 366', 'none', W.in) +
    CI(216, 380, 13, C.flesh, W.in) + P('M216 344 L216 366', 'none', W.hair) +
    bell(216, 392, 13, 440, 20, C.gold) + P('M206 366 L226 366', 'none', W.in) +
    P('M118 396 L84 366 M182 396 L216 366', 'none', W.hair);

  /* 16 · La Maison Dieu, the crown struck off the top */
  T.m16 = () => ground(424) +
    P('M104 424 L112 232 L188 232 L196 424Z', C.red, W.in) +
    L(110, 300, 190, 300, W.hair) + L(107, 362, 193, 362, W.hair) +
    R(132, 320, 22, 34, C.ink, W.in) + R(168, 386, 20, 32, C.ink, W.in) +
    P('M112 232 Q150 208 188 232Z', C.gold, W.in) +
    /* the crown, off and in the air */
    G(crown(150, 0, 60, C.gold), 0, 186) +
    STAR(88, 214, 9, C.gold, 6) + STAR(212, 206, 11, C.gold, 6) +
    STAR(66, 268, 7, C.gold, 5) + STAR(236, 274, 8, C.gold, 5) +
    STAR(198, 168, 6, C.gold, 5) +
    /* the two thrown down */
    CI(72, 372, 12, C.flesh, W.in) + P('M62 384 Q72 414 60 424 M84 386 Q92 410 86 424', 'none', 4) +
    P('M60 366 Q72 352 84 366', C.blue, W.in) +
    CI(230, 386, 12, C.flesh, W.in) + P('M240 398 Q246 418 236 428 M220 398 Q212 414 216 428', 'none', 4);

  /* 17 · L'Etoile, the great star and two jugs into the river */
  T.m17 = () => water(392) +
    STAR(150, 152, 34, C.gold, 8) + CI(150, 152, 11, C.stock, W.in) +
    STAR(72, 200, 15, C.blue, 8, W.hair) + STAR(228, 200, 15, C.blue, 8, W.hair) +
    STAR(52, 268, 12, C.red, 8, W.hair) + STAR(248, 268, 12, C.red, 8, W.hair) +
    STAR(92, 254, 10, C.gold, 8, W.hair) + STAR(208, 254, 10, C.gold, 8, W.hair) +
    /* she kneels at the bank */
    P('M150 300 Q166 316 164 348 Q160 380 128 386 Q108 388 106 372', C.flesh, W.in) +
    head(150, 288, 14) + hair(150, 288, 14) +
    P('M120 320 L96 350', 'none', 4) + P('M180 318 L206 344', 'none', 4) +
    P('M84 342 L108 342 L102 372 L88 372Z', C.red, W.in) +
    P('M196 336 L220 336 L214 366 L200 366Z', C.blue, W.in) +
    P('M94 372 Q92 388 96 398', 'none', W.in) + P('M206 366 Q212 384 210 396', 'none', W.in);

  /* 18 · La Lune, two towers, two dogs, and the crayfish in the pool */
  T.m18 = () =>
    P('M20 380 Q90 366 150 376 Q214 386 280 372 L280 444 L20 444Z', C.blue, W.in) +
    CI(150, 172, 40, C.gold, W.in) +
    P('M150 132 A40 40 0 0 0 150 212 A30 30 0 0 1 150 132Z', C.stock, W.in) +
    CI(160, 164, 2.8, C.ink, W.hair) + P('M156 182 Q164 188 172 180', 'none', W.hair) +
    [[110, 214], [190, 214], [96, 246], [204, 246]].map(([x, y]) => STAR(x, y, 7, C.gold, 6, W.hair)).join('') +
    P('M62 380 L62 288 L86 268 L110 288 L110 380Z', C.white, W.in) + R(78, 312, 16, 26, C.ink, W.hair) +
    P('M190 380 L190 288 L214 268 L238 288 L238 380Z', C.white, W.in) + R(206, 312, 16, 26, C.ink, W.hair) +
    /* the two that bay at it */
    P('M124 372 Q112 350 124 330 Q134 318 142 332 Q148 352 140 372Z', C.gold, W.in) +
    P('M124 330 L116 314 L132 322Z', C.gold, W.in) + CI(130, 334, 2.2, C.ink, W.hair) +
    P('M176 372 Q188 350 176 330 Q166 318 158 332 Q152 352 160 372Z', C.white, W.in) +
    P('M176 330 L184 314 L168 322Z', C.white, W.in) + CI(170, 334, 2.2, C.ink, W.hair) +
    /* and the one in the water */
    EL(150, 414, 20, 13, C.red, W.in) +
    P('M136 406 L124 396 M164 406 L176 396 M140 424 L130 434 M160 424 L170 434', 'none', W.hair) +
    P('M144 402 L140 392 M156 402 L160 392', 'none', W.hair);

  /* 19 · Le Soleil, two children before the wall */
  T.m19 = () => ground(426) +
    CI(150, 150, 44, C.gold, W.in) +
    [...Array(12)].map((_, i) => {
      const a = i * 30 * Math.PI / 180;
      return L(150 + 50 * Math.cos(a), 150 + 50 * Math.sin(a), 150 + 74 * Math.cos(a), 150 + 74 * Math.sin(a), W.in);
    }).join('') +
    CI(140, 144, 3, C.ink, W.hair) + CI(160, 144, 3, C.ink, W.hair) +
    P('M138 162 Q150 172 162 162', 'none', W.hair) +
    [[96, 236], [204, 236], [124, 214], [176, 214]].map(([x, y]) => STAR(x, y, 8, C.gold, 6, W.hair)).join('') +
    R(70, 356, 160, 34, C.red, W.in) +
    L(70, 372, 230, 372, W.hair) + L(110, 356, 110, 390, W.hair) + L(150, 372, 150, 390, W.hair) +
    L(190, 356, 190, 372, W.hair) +
    head(118, 292, 15) + hair(118, 292, 15) + bell(118, 314, 15, 356, 20, C.blue) +
    head(182, 292, 15) + hair(182, 292, 15) + bell(182, 314, 15, 356, 20, C.gold) +
    P('M132 322 L168 322', 'none', 4) + P('M104 322 L92 338 M196 322 L208 338', 'none', 4);

  /* 20 · Le Jugement, the trumpet out of the cloud */
  T.m20 = () =>
    cloud(150, 168, 1) +
    CI(150, 132, 16, C.flesh, W.in) + face(150, 132, 1.05) + hair(150, 132, 16) +
    wing(122, 148, -1, C.white, 0.62) + wing(178, 148, 1, C.white, 0.62) +
    P('M168 156 L228 196', 'none', 5) + P('M224 182 L246 194 L224 210Z', C.gold, W.in) +
    P('M204 200 L214 216 L226 206Z', C.red, W.in) +
    /* three rising out of the ground */
    P('M20 404 Q80 392 150 400 Q220 410 280 398 L280 444 L20 444Z', C.green, W.in) +
    head(150, 296, 15) + P('M136 314 Q150 306 164 314 L166 400 L134 400Z', C.white, W.in) +
    P('M136 312 L112 262 M164 312 L188 262', 'none', 4) +
    head(84, 336, 13) + P('M72 352 Q84 344 96 352 L98 404 L70 404Z', C.blue, W.in) +
    P('M72 350 L56 316', 'none', 4) +
    head(216, 336, 13) + P('M204 352 Q216 344 228 352 L230 404 L202 404Z', C.red, W.in) +
    P('M228 350 L244 316', 'none', 4);

  /* 21 · Le Monde, in the wreath, with the four at the corners */
  T.m21 = () => {
    let wreath = '';
    for (let i = 0; i < 26; i++) {
      const a = i * (360 / 26) * Math.PI / 180;
      const x = 150 + 96 * Math.cos(a), y = 256 + 118 * Math.sin(a);
      wreath += EL(x, y, 9, 5, i % 2 ? C.green : C.gold, W.hair)
        .replace('/>', ` transform="rotate(${(a * 180 / Math.PI + 90).toFixed(0)} ${x.toFixed(1)} ${y.toFixed(1)})"/>`);
    }
    return wreath +
      /* the dancer in the mandorla: one leg planted, the other crossed behind,
         a sash across the body and a wand in either hand */
      P('M138 226 L162 226 L158 300 L142 300Z', C.flesh, W.in) +
      P('M142 300 L140 372 M158 300 Q166 342 146 366', 'none', 5) +
      P('M132 372 L152 372', 'none', W.in) +
      P('M134 226 Q150 214 166 226 L162 268 Q150 260 138 268Z', C.red, W.in) +
      P('M136 240 Q150 292 168 246', C.blue, W.hair) +
      head(150, 204, 14) + hair(150, 204, 14) +
      P('M138 232 Q112 246 104 274', 'none', 5) + hand(102, 280) +
      P('M162 230 Q188 242 196 270', 'none', 5) + hand(198, 276) +
      P('M96 292 L108 268', 'none', 4) + P('M192 288 L204 264', 'none', 4) +
      /* the four creatures the corners always carry */
      P('M56 132 Q40 116 52 102 Q64 92 74 104 Q84 118 68 134Z', C.flesh, W.in) + CI(60, 112, 2.2, C.ink, W.hair) +
      P('M244 132 Q260 116 248 102 Q236 92 226 104 Q216 118 232 134Z', C.gold, W.in) + CI(240, 112, 2.2, C.ink, W.hair) +
      P('M56 388 Q40 404 52 418 Q64 428 74 416 Q84 402 68 386Z', C.red, W.in) + CI(60, 408, 2.2, C.ink, W.hair) +
      P('M244 388 Q260 404 248 418 Q236 428 226 416 Q216 402 232 386Z', C.blue, W.in) + CI(240, 408, 2.2, C.ink, W.hair);
  };

  /* ---------- the four suits ----------
     Each emblem is drawn once, at a nominal size, and placed by transform. The
     block cutter did the same: one baton, one cup, one coin, cut once and
     stamped as many times as the number asked for.                            */

  const SUIT = {

    /* the baton: a cut branch, its bark shown as lozenges */
    wand(len = 120, col = C.gold) {
      const h = len / 2;
      return P(`M-7 ${-h} Q0 ${-h - 8} 7 ${-h} L7 ${h} Q0 ${h + 8} -7 ${h}Z`, col, W.in) +
        [-0.6, -0.2, 0.2, 0.6].map(f =>
          P(`M-7 ${h * f} L0 ${h * f - 7} L7 ${h * f} L0 ${h * f + 7}Z`, 'none', W.hair)).join('') +
        P(`M-7 ${-h + 14} L7 ${-h + 14} M-7 ${h - 14} L7 ${h - 14}`, 'none', W.hair);
    },

    /* the cup: bowl, knop, foot, and the little lid the pattern gives it */
    cup(s = 1, col = C.gold) {
      return G(
        P('M-22 -14 Q-22 16 0 22 Q22 16 22 -14Z', col, W.in) +
        P('M-24 -14 L24 -14', 'none', W.in) +
        P('M-3 22 L-3 32 L3 32 L3 22Z', col, W.in) +
        P('M-16 40 Q0 30 16 40 Q0 46 -16 40Z', col, W.in) +
        P('M-14 -14 Q0 -26 14 -14', 'none', W.hair) +
        CI(0, -24, 4, col, W.hair), 0, 0, s);
    },

    /* the sword, in the two forms the deck uses: a curved sabre for the weave,
       and a straight one for the odd number that runs through the middle. The
       sabre is a crescent with real width, not a stroked line, because a block
       cut a blade as a shape.                                                 */
    sabre(x1, y1, x2, y2, bow) {
      const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
      return P(`M${x1} ${y1} Q${mx + bow} ${my} ${x2} ${y2}
                Q${mx + bow * 0.62} ${my} ${x1} ${y1}Z`, C.white, W.in) +
        P(`M${x1 - 10} ${y1 + 3} L${x1 + 10} ${y1 + 3}`, 'none', W.in) +
        CI(x1, y1 - 4, 4.5, C.gold, W.in);
    },
    swordStraight(x, top, bot) {
      return P(`M${x - 4} ${top + 26} L${x + 4} ${top + 26} L${x + 3} ${bot - 14} L${x} ${bot - 6} L${x - 3} ${bot - 14}Z`, C.white, W.in) +
        P(`M${x - 15} ${top + 26} L${x + 15} ${top + 26}`, 'none', W.in) +
        P(`M${x - 4} ${top + 26} L${x - 4} ${top + 8} L${x + 4} ${top + 8} L${x + 4} ${top + 26}`, C.gold, W.in) +
        CI(x, top + 4, 6, C.gold, W.in);
    },

    /* the denier: a struck coin, rim, rosette, and a ring of beading */
    coin(s = 1, col = C.gold) {
      let petals = '';
      for (let i = 0; i < 6; i++) {
        const a = i * 60 * Math.PI / 180;
        petals += EL(15 * Math.cos(a), 15 * Math.sin(a), 8, 5, C.red, W.hair)
          .replace('/>', ` transform="rotate(${i * 60} ${(15 * Math.cos(a)).toFixed(1)} ${(15 * Math.sin(a)).toFixed(1)})"/>`);
      }
      return G(CI(0, 0, 30, col) + CI(0, 0, 24, 'none', W.hair) + petals + CI(0, 0, 6, C.blue, W.hair), 0, 0, s);
    },
  };

  /* ---------- how many of them, and where ----------
     Cups and coins range in rows. Batons weave into a lattice. Swords curve
     into a basket, and an odd sword stands straight through the middle.       */

  const ROWS = {
    2: [1, 1], 3: [2, 1], 4: [2, 2], 5: [2, 1, 2], 6: [2, 2, 2],
    7: [2, 2, 2, 1], 8: [2, 2, 2, 2], 9: [2, 2, 2, 2, 1], 10: [2, 2, 2, 2, 2],
  };

  /* the scene box every minor is laid inside */
  const BOX = { top: 74, bot: 434, left: 30, right: 270, cx: 150, cy: 254 };

  function ranged(n, emblem) {
    const rows = ROWS[n];
    const gap = (BOX.bot - BOX.top) / rows.length;
    let out = '';
    rows.forEach((count, i) => {
      const y = BOX.top + gap * (i + 0.5);
      const s = Math.min(1, 4.6 / rows.length);
      if (count === 1) out += G(emblem(s), BOX.cx, y);
      else { out += G(emblem(s), BOX.cx - 52, y); out += G(emblem(s), BOX.cx + 52, y); }
    });
    return out;
  }

  function batons(n) {
    const pairs = Math.floor(n / 2);
    const span = BOX.bot - BOX.top, gap = span / Math.max(pairs, 1);
    const len = Math.min(gap * 1.5, 168);
    let out = '';
    for (let i = 0; i < pairs; i++) {
      const y = BOX.top + gap * (i + 0.5);
      out += `<g transform="translate(${BOX.cx} ${y}) rotate(40)">${SUIT.wand(len)}</g>`;
      out += `<g transform="translate(${BOX.cx} ${y}) rotate(-40)">${SUIT.wand(len)}</g>`;
    }
    if (n % 2) out += G(SUIT.wand(span - 8), BOX.cx, BOX.cy);
    return out;
  }

  function swords(n) {
    const pairs = Math.floor(n / 2);
    const top = BOX.top + 16, bot = BOX.bot - 8, cx = BOX.cx;
    let out = '';
    /* the blades bow out to either side and meet again at the head and the
       foot, so the set closes into the oval cage the pattern is known for.
       Hilts alternate top and bottom, which is how a cutter kept them apart. */
    for (let i = 0; i < pairs; i++) {
      const rx = 98 - i * (pairs > 1 ? 58 / (pairs - 1) : 0);
      const off = i * 5;
      out += SUIT.sabre(cx, top + off, cx, bot - off, -rx);
      out += SUIT.sabre(cx, bot - off, cx, top + off, rx);
    }
    if (n % 2) out += SUIT.swordStraight(cx, BOX.top, BOX.bot);
    return out;
  }

  /* the ace: one emblem, held large, with the flourish the pattern gives it */
  function ace(suit) {
    const leaf = (dx, dy, rot) =>
      `<g transform="translate(${BOX.cx + dx} ${BOX.cy + dy}) rotate(${rot})">` +
      P('M0 0 Q22 -14 42 -2 Q22 12 0 0Z', C.green, W.hair) + `</g>`;
    const flourish = leaf(-46, -96, 200) + leaf(46, -96, -20) + leaf(-46, 96, 160) + leaf(46, 96, 20);
    if (suit === 'wands') return flourish + G(SUIT.wand(300), BOX.cx, BOX.cy);
    if (suit === 'cups')  return flourish + G(SUIT.cup(2.4), BOX.cx, BOX.cy - 30);
    if (suit === 'pentacles') return flourish + G(SUIT.coin(2.5), BOX.cx, BOX.cy);
    return flourish + SUIT.swordStraight(BOX.cx, BOX.top - 6, BOX.bot + 6) +
      G(crown(0, 0, 76, C.gold), BOX.cx, 150);
  }

  /* ---------- the courts ----------
     Valet on foot, Cavalier mounted, Reine and Roi enthroned, each carrying the
     emblem of the suit so the four read apart at a glance.                     */

  const EMBLEM = {
    wands: (x, y, s = 0.8) => G(SUIT.wand(150), x, y, s),
    cups: (x, y, s = 0.8) => G(SUIT.cup(1), x, y, s),
    pentacles: (x, y, s = 0.8) => G(SUIT.coin(1), x, y, s),
    swords: (x, y, s = 0.8) => G(P('M-4 46 L4 46 L3 -40 L0 -50 L-3 -40Z', C.white, W.in) +
      P('M-14 46 L14 46', 'none', W.in) + CI(0, 58, 6, C.gold, W.in), x, y, s),
  };

  const COURT = {
    /* the valet, standing, the emblem grounded beside him */
    11: (suit, col) => ground(424) +
      bell(150, 266, 20, 418, 32, col) +
      P('M132 266 Q150 256 168 266 L166 300 Q150 292 134 300Z', C.red, W.in) +
      head(150, 244, 15) + hair(150, 244, 15) +
      P('M126 230 Q150 214 174 230 Q150 224 126 230Z', C.blue, W.in) +
      sleeve(128, 274, -20, 28, col) + hand(106, 312) +
      sleeve(172, 274, 20, 28, col) + hand(194, 312) +
      EMBLEM[suit](200, 320, 0.86) + feet(150, 416),

    /* the cavalier, mounted, shown the way the block shows a horse */
    12: (suit, col) => ground(430) +
      P('M76 402 Q64 350 96 330 Q140 314 200 322 Q234 328 240 356 Q244 388 228 402', C.white, W.in) +
      P('M228 322 Q244 292 232 274 Q220 262 208 276 Q198 300 200 322', C.white, W.in) +
      P('M232 274 L226 256 L242 268Z', C.white, W.in) + CI(222, 284, 2.6, C.ink, W.hair) +
      P('M88 396 L84 434 M120 402 L116 434 M204 400 L208 434 M234 396 L240 434', 'none', 5) +
      P('M76 356 Q54 372 48 400', 'none', W.in) +
      bell(150, 254, 20, 340, 30, col) +
      P('M126 340 Q150 356 174 340', 'none', 4) +
      head(150, 232, 15) + hair(150, 232, 15) +
      P('M128 218 Q150 202 172 218', C.red, W.in) +
      sleeve(128, 262, -18, 26, col) + hand(108, 298) +
      sleeve(172, 260, 20, -26, col) + hand(196, 236) + EMBLEM[suit](206, 214, 0.78),

    /* the reine, enthroned, the emblem in her left hand */
    13: (suit, col) => R(92, 300, 116, 20, C.gold, W.in) +
      P('M100 320 L100 424 M200 320 L200 424', 'none', W.in) +
      bell(150, 258, 24, 412, 46, col) +
      P('M126 258 Q150 248 174 258 L172 300 Q150 292 128 300Z', C.white, W.in) +
      head(150, 234, 15) + hair(150, 234, 15) + crown(150, 218, 36) +
      sleeve(126, 268, -20, 26, col) + hand(102, 304) +
      sleeve(174, 268, 20, 26, col) + hand(198, 304) +
      EMBLEM[suit](204, 300, 0.8),

    /* the roi, enthroned, the emblem raised */
    14: (suit, col) => R(88, 296, 124, 22, C.gold, W.in) +
      P('M96 318 L96 424 M204 318 L204 424', 'none', W.in) +
      P('M96 296 Q150 266 204 296Z', C.red, W.in) +
      bell(150, 256, 24, 396, 44, col) +
      P('M126 256 Q150 246 174 256 L172 298 Q150 290 128 298Z', C.gold, W.in) +
      head(150, 232, 15) + hair(150, 232, 15) + crown(150, 216, 40) +
      P('M138 250 Q150 274 162 250', C.white, W.in) +
      sleeve(126, 266, -20, 30, col) + hand(102, 308) +
      sleeve(174, 264, 22, -22, col) + hand(200, 248) +
      EMBLEM[suit](208, 222, 0.82) +
      P('M126 396 L122 424 M174 396 L178 424', 'none', 4),
  };

  const SUIT_COLOUR = { wands: C.green, cups: C.blue, swords: C.blue, pentacles: C.red };

  function minor(card) {
    const s = card.suit, n = card.n;
    if (n === 1) return ace(s);
    if (n >= 11) return COURT[n](s, SUIT_COLOUR[s]);
    if (s === 'wands') return batons(n);
    if (s === 'swords') return swords(n);
    if (s === 'cups') return ranged(n, sc => SUIT.cup(sc));
    return ranged(n, sc => SUIT.coin(sc * 0.78));
  }

  /* ---------- the card itself ----------
     Stock, scene, the heavy keyline and the hairline inside it, the number set
     above and the name lettered below. The grain is a single turbulence laid
     over the whole card at low opacity, which is what stops the flat colour
     reading as vector.                                                        */

  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

  const ROMAN = ['', 'I', 'II', 'III', 'IIII', 'V', 'VI', 'VII', 'VIII', 'VIIII', 'X',
    'XI', 'XII', 'XIII', 'XIIII', 'XV', 'XVI', 'XVII', 'XVIII', 'XVIIII', 'XX', 'XXI'];

  /* the name, lettered to fit: one line where it can, two where it cannot */
  function lettering(name) {
    const n = name.length;
    if (n <= 15) return `<text x="150" y="472" text-anchor="middle" fill="${C.ink}"
      font-family="Palatino Linotype,Palatino,Georgia,serif" font-size="18" letter-spacing="2.4">${name}</text>`;
    if (n <= 21) return `<text x="150" y="472" text-anchor="middle" fill="${C.ink}"
      font-family="Palatino Linotype,Palatino,Georgia,serif" font-size="14" letter-spacing="1.2">${name}</text>`;
    const words = name.split(' ');
    let a = '', b = '';
    for (const w of words) (a.length + w.length <= Math.ceil(n / 2) ? a += (a ? ' ' : '') + w : b += (b ? ' ' : '') + w);
    if (!b) { b = a.slice(Math.ceil(a.length / 2)); a = a.slice(0, Math.ceil(a.length / 2)); }
    return `<text x="150" y="466" text-anchor="middle" fill="${C.ink}"
      font-family="Palatino Linotype,Palatino,Georgia,serif" font-size="13" letter-spacing=".6">${a}</text>
      <text x="150" y="482" text-anchor="middle" fill="${C.ink}"
      font-family="Palatino Linotype,Palatino,Georgia,serif" font-size="13" letter-spacing=".6">${b}</text>`;
  }

  window.cardSVG = function (card, lang = 'es') {
    const name = esc(card.name[lang] || card.name.es).toUpperCase();
    const isMajor = card.a === 'major';
    const scene = isMajor
      ? (T[card.id] || T.m00)()
      : minor(card);

    /* majors and pips carry a number, the courts carry a mark instead */
    const num = isMajor
      ? (card.n === 0 ? '' : ROMAN[card.n])
      : (card.n <= 10 ? ROMAN[card.n] : '');
    const topMark = num
      ? `<text x="150" y="54" text-anchor="middle" fill="${C.ink}"
           font-family="Palatino Linotype,Palatino,Georgia,serif" font-size="20"
           letter-spacing="2.2">${num}</text>`
      : STAR(150, 46, 9, C.gold, 6, W.hair);

    return `<svg viewBox="0 0 300 510" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${name}">
  <defs>
    <filter id="tm-grain" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="3" seed="7"/>
      <feColorMatrix type="saturate" values="0"/>
    </filter>
    <clipPath id="tm-clip"><rect x="20" y="20" width="260" height="470"/></clipPath>
  </defs>
  <rect width="300" height="510" fill="${C.stock}"/>
  <g clip-path="url(#tm-clip)">${scene}</g>
  <rect width="300" height="510" filter="url(#tm-grain)" opacity=".09"/>
  <rect x="14" y="14" width="272" height="482" fill="none" stroke="${C.ink}" stroke-width="4"/>
  <rect x="24" y="24" width="252" height="462" fill="none" stroke="${C.ink}" stroke-width="1.2"/>
  <path d="M24 64H276M24 446H276" stroke="${C.ink}" stroke-width="1.2" fill="none"/>
  ${topMark}
  ${lettering(name)}
</svg>`;
  };

  /* the back: the woven diaper a card back was block printed with, so that a
     face down card reads as the same press as the face */
  window.cardBackSVG = function () {
    let weave = '';
    for (let x = -40; x < 340; x += 26) {
      weave += `<path d="M${x} 0 L${x + 200} 510" stroke="${C.stock}" stroke-width="1" opacity=".26" fill="none"/>`;
      weave += `<path d="M${x} 510 L${x + 200} 0" stroke="${C.stock}" stroke-width="1" opacity=".26" fill="none"/>`;
    }
    let ring = '';
    for (let i = 0; i < 8; i++) {
      const a = i * 45 * Math.PI / 180;
      ring += EL(150 + 64 * Math.cos(a), 255 + 64 * Math.sin(a), 15, 8, 'none', 1.4)
        .replace(`stroke="${C.ink}"`, `stroke="${C.gold}"`)
        .replace('/>', ` transform="rotate(${i * 45} ${(150 + 64 * Math.cos(a)).toFixed(1)} ${(255 + 64 * Math.sin(a)).toFixed(1)})"/>`);
    }
    return `<svg viewBox="0 0 300 510" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <rect width="300" height="510" fill="${C.blue}"/>
  ${weave}
  <rect x="14" y="14" width="272" height="482" fill="none" stroke="${C.stock}" stroke-width="4"/>
  <rect x="24" y="24" width="252" height="462" fill="none" stroke="${C.gold}" stroke-width="1.2"/>
  ${ring}
  <circle cx="150" cy="255" r="40" fill="none" stroke="${C.gold}" stroke-width="1.6"/>
  <path d="${starPath(150, 255, 34, 14, 8)}" fill="${C.gold}" opacity=".9"/>
  <circle cx="150" cy="255" r="9" fill="${C.blue}" stroke="${C.stock}" stroke-width="1.4"/>
</svg>`;
  };

  /* the earlier passes named this too; keep the alias so nothing breaks */
  window.cardSVG2 = window.cardSVG;
})();
