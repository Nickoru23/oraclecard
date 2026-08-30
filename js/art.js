/* ===== Umbral — procedural tarot art =====
   Original geometric deck. No third-party imagery, no licensing exposure.
   cardSVG(card, lang) -> SVG string, viewBox 0 0 300 510
*/
(function () {
  const INK = '#1B1733', GOLD = '#A9822F', PAPER = '#F2EBDC', ROSE = '#9C5567';
  const ROMAN = ['0','I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII',
                 'XIII','XIV','XV','XVI','XVII','XVIII','XIX','XX','XXI'];

  const g = (s, extra = '') => `<g fill="none" stroke="currentColor" stroke-width="2.4"
    stroke-linecap="round" stroke-linejoin="round" ${extra}>${s}</g>`;
  const c = (x, y, r, o = '') => `<circle cx="${x}" cy="${y}" r="${r}" ${o}/>`;
  const l = (x1, y1, x2, y2) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`;
  const p = (d, o = '') => `<path d="${d}" ${o}/>`;

  /* ---- star helper ---- */
  function star(cx, cy, R, r, pts, rot = -90) {
    let d = '';
    for (let i = 0; i < pts * 2; i++) {
      const rad = (i % 2 ? r : R);
      const a = (rot + i * 180 / pts) * Math.PI / 180;
      d += (i ? 'L' : 'M') + (cx + rad * Math.cos(a)).toFixed(1) + ' ' + (cy + rad * Math.sin(a)).toFixed(1);
    }
    return d + 'Z';
  }

  /* ================= MAJOR ARCANA EMBLEMS ================= */
  /* drawing box: x 55..245, y 105..365, centre (150,235) */
  const MAJOR = {
    m00: () => g(`${c(230,128,14)}${(()=>{let s='';for(let i=0;i<8;i++){const a=i*45*Math.PI/180;
      s+=l((230+18*Math.cos(a)).toFixed(1),(128+18*Math.sin(a)).toFixed(1),
           (230+25*Math.cos(a)).toFixed(1),(128+25*Math.sin(a)).toFixed(1));}return s;})()}
      ${c(126,190,18)}${p('M106 314 L126 212 L146 314 Z')}${l(116,314,108,348)}${l(136,314,146,348)}
      ${l(162,184,104,300)}${c(168,176,11)}${p('M56 350 L190 350 L190 388')}
      ${c(80,334,11)}${p('M70 328 L58 318')}`),
    m01: () => g(`${l(150,128,150,208)}${p('M132 154 Q150 136 168 154')}
      ${p('M118 250 C118 230 146 230 146 250 C146 270 174 270 174 250 C174 230 146 230 146 250 C146 270 118 270 118 250 Z')}
      ${l(96,320,204,320)}${l(108,320,108,346)}${l(192,320,192,346)}
      ${c(114,306,7)}${p('M136 312 L144 298 L152 312 Z')}${p('M164 298 L180 298 L180 312 L164 312 Z')}
      ${l(198,296,198,312)}`),
    m02: () => g(`${l(104,132,104,338)}${l(196,132,196,338)}${l(90,132,118,132)}${l(182,132,210,132)}
      ${p('M124 236 A26 26 0 1 0 150 200 A20 20 0 1 1 124 236 Z')}${l(104,338,196,338)}${c(150,290,4)}`),
    m03: () => g(`${c(150,190,32)}${l(150,222,150,318)}${l(124,268,176,268)}
      ${p(star(150,190,13,5.2,6),'stroke-width="1.3"')}
      ${p('M96 344 Q104 288 122 262')}${p('M204 344 Q196 288 178 262')}
      ${p('M116 268 L122 262 L128 268')}${p('M172 268 L178 262 L184 268')}
      ${p('M78 350 Q150 366 222 350')}`),
    m04: () => g(`${p('M112 344 L112 178 L188 178 L188 344')}${l(98,290,202,290)}
      ${p('M112 178 Q92 152 114 144')}${p('M188 178 Q208 152 186 144')}
      ${c(150,232,17)}${l(150,215,150,249)}${l(133,232,167,232)}${l(126,318,174,318)}`),
    m05: () => g(`${l(104,178,104,352)}${l(196,178,196,352)}${c(150,198,17)}
      ${p('M122 336 L150 220 L178 336 Z')}${p('M130 176 Q150 158 170 176')}${p('M136 160 Q150 146 164 160')}
      ${l(150,140,150,148)}${l(178,250,196,228)}${l(124,308,176,308)}
      ${l(124,368,176,392)}${l(176,368,124,392)}${c(120,364,6)}${c(180,364,6)}`),
    m06: () => g(`${c(150,152,13)}${(()=>{let s='';for(let i=0;i<8;i++){const a=i*45*Math.PI/180;
      s+=l((150+17*Math.cos(a)).toFixed(1),(152+17*Math.sin(a)).toFixed(1),
           (150+24*Math.cos(a)).toFixed(1),(152+24*Math.sin(a)).toFixed(1));}return s;})()}
      ${p('M74 212 Q150 178 226 212')}
      ${c(110,258,21)}${p('M84 352 L110 288 L136 352 Z')}
      ${c(190,258,21)}${p('M164 352 L190 288 L216 352 Z')}
      ${p('M122 296 L150 310 L178 296')}`),
    m07: () => g(`${c(114,332,23)}${c(186,332,23)}${l(114,320,114,344)}${l(102,332,126,332)}
      ${l(186,320,186,344)}${l(174,332,198,332)}
      ${p('M92 300 L208 300 L194 254 L106 254 Z')}${l(106,254,106,206)}${l(194,254,194,206)}
      ${p('M100 206 L200 206')}${c(150,232,15)}${p(star(150,176,13,5.2,5),'stroke-width="1.3"')}
      ${l(92,300,72,312)}${l(208,300,228,312)}`),
    m08: () => g(`${p('M110 160 C110 138 146 138 146 160 C146 182 182 182 182 160 C182 138 146 138 146 160 C146 182 110 182 110 160 Z','stroke-width="1.8"')}
      ${p('M150 356 C108 350 96 318 106 298 C124 280 176 280 194 298 C204 318 192 350 150 356 Z')}
      ${c(106,258,15)}${c(139,242,15)}${c(172,242,15)}${c(205,258,15)}`),
    m09: () => g(`${p('M116 356 L160 202 L204 356 Z')}${p('M136 236 Q160 178 184 236')}
      ${c(160,222,13)}${l(214,146,214,358)}${l(160,244,120,258)}
      ${p('M80 258 L116 258 L122 304 L74 304 Z')}${p('M80 258 L98 238 L116 258')}
      ${p(star(98,282,10,4,6),'stroke-width="1.2"')}${l(98,232,98,222)}`),
    m10: () => g(`${c(150,238,66)}${c(150,238,22)}${l(150,172,150,216)}${l(150,260,150,304)}
      ${l(84,238,128,238)}${l(172,238,216,238)}${l(103,191,134,222)}${l(166,254,197,285)}
      ${l(197,191,166,222)}${l(134,254,103,285)}`),
    m11: () => g(`${l(150,128,150,352)}${l(126,178,174,178)}${l(96,214,204,214)}
      ${p('M96 214 Q96 254 74 254')}${p('M96 214 Q96 254 118 254')}${p('M74 254 A22 12 0 0 0 118 254')}
      ${p('M204 214 Q204 254 182 254')}${p('M204 214 Q204 254 226 254')}${p('M182 254 A22 12 0 0 0 226 254')}
      ${c(150,214,6)}`),
    m12: () => g(`${l(78,138,222,138)}${l(78,138,78,182)}${l(222,138,222,182)}
      ${l(150,138,150,206)}${c(150,228,22)}${l(150,250,150,346)}
      ${p('M150 268 L118 300')}${p('M150 268 L182 300')}${p('M150 320 L188 296')}`),
    m13: () => g(`${p('M116 274 A34 34 0 1 1 184 274 L184 296 L116 296 Z')}
      ${c(132,264,6.5)}${c(168,264,6.5)}${p('M146 282 L150 274 L154 282 Z')}
      ${l(134,296,134,308)}${l(150,296,150,308)}${l(166,296,166,308)}${l(116,296,184,296)}
      ${l(212,150,212,352)}${p('M212 150 Q150 152 122 190')}`),
    m14: () => g(`${c(150,148,16)}${p('M96 194 L142 194 L134 240 L104 240 Z')}
      ${p('M158 268 L204 268 L196 314 L166 314 Z')}${p('M134 240 Q176 250 168 268')}
      ${l(90,352,210,352)}${p('M120 352 Q150 330 180 352')}`),
    m15: () => g(`${c(150,216,32)}${p('M126 194 Q110 160 132 156')}${p('M174 194 Q190 160 168 156')}
      ${c(139,212,4)}${c(161,212,4)}${p('M144 230 L156 230')}
      ${p(star(150,208,11,4.4,5,90),'stroke-width="1.1"')}
      ${p('M112 344 L150 248 L188 344 Z')}
      ${p('M116 274 Q74 250 62 292 Q90 280 100 306')}${p('M184 274 Q226 250 238 292 Q210 280 200 306')}
      ${c(120,368,8)}${c(180,368,8)}${l(128,368,172,368)}`),
    m16: () => g(`${p('M114 344 L120 216 L180 216 L186 344')}${p('M120 216 L150 176 L180 216')}
      ${p('M150 132 L136 174 L158 170 L142 208')}${c(132,262,7)}${c(168,262,7)}
      ${l(96,196,112,182)}${l(204,196,188,182)}`),
    m17: () => g(`${p(star(150,186,52,20,8))}${p(star(102,270,17,7,5),'stroke-width="1.3"')}
      ${p(star(198,270,17,7,5),'stroke-width="1.3"')}${p('M90 330 Q120 314 150 330 T210 330')}
      ${p('M90 348 Q120 332 150 348 T210 348')}`),
    m18: () => g(`${p('M166 130 A42 42 0 1 0 166 214 A32 32 0 1 1 166 130 Z')}
      ${p('M98 352 L98 262 L114 238 L130 262 L130 352')}${p('M170 352 L170 262 L186 238 L202 262 L202 352')}
      ${p('M150 352 Q138 316 152 286 Q166 256 150 232')}${c(114,262,3)}${c(186,262,3)}
      ${p('M86 372 Q150 390 214 372')}`),
    m19: () => g(`${c(150,206,42)}${(()=>{let s='';for(let i=0;i<12;i++){const a=i*30*Math.PI/180;
      s+=l((150+52*Math.cos(a)).toFixed(1),(206+52*Math.sin(a)).toFixed(1),
           (150+70*Math.cos(a)).toFixed(1),(206+70*Math.sin(a)).toFixed(1));}return s;})()}
      ${l(96,320,204,320)}${l(96,320,96,344)}${l(204,320,204,344)}${l(126,320,126,344)}${l(174,320,174,344)}`),
    m20: () => g(`${l(214,140,146,184)}${c(218,136,7)}${p('M148 166 L106 144 L106 226 L148 204 Z')}
      ${p('M92 156 Q78 185 92 214','stroke-width="1.3"')}${p('M78 146 Q60 185 78 224','stroke-width="1.1" opacity=".7"')}
      ${c(112,296,15)}${p('M90 348 Q112 312 134 348')}${l(96,282,88,262)}${l(128,282,136,262)}
      ${c(150,282,17)}${p('M124 342 Q150 302 176 342')}${l(132,268,128,246)}${l(168,268,172,246)}
      ${c(190,298,14)}${p('M170 348 Q190 316 210 348')}${l(176,286,170,268)}${l(204,286,210,268)}
      ${l(74,354,226,354)}`),
    m21: () => g(`${p('M150 128 C222 138 234 330 150 352 C66 330 78 138 150 128 Z')}
      ${p('M150 140 C210 150 220 322 150 340 C80 322 90 150 150 140 Z','stroke-width="0.9" opacity=".55"')}
      ${c(150,206,17)}${p('M132 280 L150 224 L168 280')}${p('M150 280 L124 322')}${p('M150 280 L182 306')}
      ${p('M118 236 L150 250 L182 226')}
      ${c(70,146,7)}${c(230,146,7)}${c(70,336,7)}${c(230,336,7)}`),
  };

  /* ================= SUIT GLYPHS (minors) ================= */
  function glyph(suit, x, y, s) {
    const t = `translate(${x} ${y}) scale(${s}) translate(-16 -22)`;
    const body = {
      wands: `${l(16,2,16,42)}${p('M16 14 Q6 8 8 0')}${p('M16 22 Q26 16 24 8')}${c(16,2,3.2)}`,
      cups:  `${p('M4 8 L28 8 L24 24 Q16 30 8 24 Z')}${l(16,30,16,38)}${p('M8 40 L24 40')}${p('M8 8 Q16 2 24 8')}`,
      swords:`${p('M16 0 L21 12 L21 34 L16 42 L11 34 L11 12 Z')}${l(4,30,28,30)}${c(16,10,2.6)}`,
      pentacles:  `${c(16,21,15)}${c(16,21,11)}${p(star(16,21,8.5,3.6,5),'stroke-width="1.2"')}`,
    }[suit];
    return `<g transform="${t}" fill="none" stroke="currentColor" stroke-width="2.2"
      stroke-linecap="round" stroke-linejoin="round">${body}</g>`;
  }

  /* pip layouts — [x,y] in the 55..245 / 110..360 box */
  const PIPS = {
    1:  [[150,235]],
    2:  [[150,168],[150,302]],
    3:  [[150,150],[150,235],[150,320]],
    4:  [[108,172],[192,172],[108,298],[192,298]],
    5:  [[108,168],[192,168],[150,235],[108,302],[192,302]],
    6:  [[108,158],[192,158],[108,235],[192,235],[108,312],[192,312]],
    7:  [[108,152],[192,152],[108,222],[192,222],[150,282],[108,338],[192,338]],
    8:  [[108,148],[192,148],[108,208],[192,208],[108,268],[192,268],[108,328],[192,328]],
    9:  [[104,150],[150,150],[196,150],[104,235],[150,235],[196,235],[104,320],[150,320],[196,320]],
    10: [[104,150],[150,150],[196,150],[104,214],[196,214],[104,276],[196,276],[104,340],[150,340],[196,340]],
  };

  /* court silhouettes */
  function court(rank, suit) {
    const em = glyph(suit, 150, 340, 1.35);
    const heads = {
      11: g(`${c(150,168,22)}${p('M112 246 Q150 200 188 246 L188 268 L112 268 Z')}
             ${p('M128 150 L150 132 L172 150')}`),                             // Page
      12: g(`${c(150,162,21)}${p('M110 242 Q150 198 190 242 L190 266 L110 266 Z')}
             ${p('M126 146 Q150 122 174 146')}${l(112,208,80,232)}${l(188,208,220,232)}`), // Knight
      13: g(`${c(150,164,23)}${p('M108 250 Q150 198 192 250 L192 272 L108 272 Z')}
             ${p('M122 146 L134 118 L150 138 L166 118 L178 146')}${c(150,110,4)}`), // Queen
      14: g(`${c(150,164,23)}${p('M104 252 Q150 196 196 252 L196 274 L104 274 Z')}
             ${p('M120 146 L120 116 L136 132 L150 110 L164 132 L180 116 L180 146 Z')}`), // King
    }[rank];
    return heads + em;
  }

  /* ================= FRAME + ASSEMBLY ================= */
  function frame(topLabel, name, accent, photo) {
    const line = photo ? accent : INK;
    const text = photo ? '#F4EEE2' : INK;
    /* a drawn corner flourish rather than a plain diamond */
    const orn = (x, y, sx, sy) => `<g transform="translate(${x} ${y}) scale(${sx} ${sy})"
      fill="none" stroke="${accent}" stroke-width="1.1" stroke-linecap="round">
      <path d="M0 16 L0 6 Q0 0 6 0 L16 0"/>
      <path d="M4 16 Q4 4 16 4" opacity=".55"/>
      <circle cx="6.5" cy="6.5" r="1.9" fill="${accent}" stroke="none"/></g>`;
    return `
      <rect width="300" height="510" fill="${photo ? photo.c : PAPER}"/>
      ${photo ? photoLayer(photo) : grain()}
      <rect x="10" y="10" width="280" height="490" rx="3" fill="none" stroke="${line}"
        stroke-width="2.2" opacity="${photo ? .75 : .92}"/>
      <rect x="16.5" y="16.5" width="267" height="477" rx="2" fill="none" stroke="${line}"
        stroke-width="0.6" opacity="${photo ? .4 : .5}"/>
      ${orn(20, 20, 1, 1)}${orn(280, 20, -1, 1)}${orn(20, 490, 1, -1)}${orn(280, 490, -1, -1)}
      <path d="M40 76 L260 76" stroke="${line}" stroke-width="0.7" opacity="${photo ? .4 : .45}"/>
      <path d="M150 71 l5 5 -5 5 -5 -5 Z" fill="${accent}" stroke="none"/>
      <path d="M40 424 L260 424" stroke="${line}" stroke-width="0.7" opacity="${photo ? .4 : .45}"/>
      <path d="M150 419 l5 5 -5 5 -5 -5 Z" fill="${accent}" stroke="none"/>
      <text x="150" y="56" text-anchor="middle" fill="${accent}"
        font-family="Georgia,serif" font-size="25" letter-spacing="3.5">${topLabel}</text>
      <text x="150" y="459" text-anchor="middle" fill="${text}"
        font-family="Georgia,serif" font-size="${name.length > 20 ? 16.5 : 19.5}" letter-spacing="1.1"
        ${photo ? 'style="filter:drop-shadow(0 1px 3px rgba(6,5,14,.95))"' : ''}>${name}</text>`;
  }

  /* faint tooth on the paper, so the ground is not a flat fill */
  function grain() {
    return `<defs><filter id="umbral-grain" x="0" y="0" width="100%" height="100%">
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" seed="7"/>
        <feColorMatrix type="saturate" values="0"/>
      </filter>
      <radialGradient id="umbral-vign" cx="0.5" cy="0.46" r="0.75">
        <stop offset="0.55" stop-color="#8A7A55" stop-opacity="0"/>
        <stop offset="1" stop-color="#8A7A55" stop-opacity=".2"/>
      </radialGradient></defs>
      <rect width="300" height="510" filter="url(#umbral-grain)" opacity=".055"/>
      <rect width="300" height="510" fill="url(#umbral-vign)"/>`;
  }

  /* duotone photograph + scrims, so type and emblem always sit on darkness */
  function photoLayer(p) {
    return `
      <defs>
        <filter id="umbral-duo" color-interpolation-filters="sRGB">
          <feColorMatrix type="matrix" values="
            .33 .34 .33 0 0  .33 .34 .33 0 0  .33 .34 .33 0 0  0 0 0 1 0"/>
          <feComponentTransfer>
            <feFuncR type="table" tableValues="0.05 0.88"/>
            <feFuncG type="table" tableValues="0.04 0.83"/>
            <feFuncB type="table" tableValues="0.12 0.75"/>
          </feComponentTransfer>
        </filter>
        <linearGradient id="umbral-top" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#0A0912" stop-opacity=".92"/>
          <stop offset="1" stop-color="#0A0912" stop-opacity="0"/>
        </linearGradient>
        <linearGradient id="umbral-bot" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stop-color="#0A0912" stop-opacity=".95"/>
          <stop offset="1" stop-color="#0A0912" stop-opacity="0"/>
        </linearGradient>
        <radialGradient id="umbral-vig" cx="0.5" cy="0.47" r="0.72">
          <stop offset="0" stop-color="#0A0912" stop-opacity=".42"/>
          <stop offset="0.55" stop-color="#0A0912" stop-opacity=".2"/>
          <stop offset="1" stop-color="#0A0912" stop-opacity=".62"/>
        </radialGradient>
      </defs>
      <image href="${p.s}" x="0" y="0" width="300" height="510"
        preserveAspectRatio="xMidYMid slice" filter="url(#umbral-duo)"/>
      <rect width="300" height="510" fill="#150F26" opacity=".42"/>
      <rect width="300" height="510" fill="url(#umbral-vig)"/>
      <rect width="300" height="132" fill="url(#umbral-top)"/>
      <rect y="378" width="300" height="132" fill="url(#umbral-bot)"/>`;
  }

  function esc(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  window.cardSVG = function (card, lang = 'es') {
    const name = esc(card.name[lang] || card.name.es);
    let top, art, accent = GOLD;

    if (card.a === 'major') {
      top = ROMAN[card.n];
      art = (MAJOR[card.id] || (() => g(c(150,235,60))))();
      if (['m06','m13','m15','m16'].includes(card.id)) accent = ROSE;
    } else {
      const ELSYM = { wands:'&#9651;', cups:'&#9661;', swords:'&#9651;&#822;', pentacles:'&#9661;&#822;' };
      top = card.n <= 10 ? ROMAN[card.n] : ELSYM[card.suit];
      if (card.n <= 10) {
        const sc = card.n >= 9 ? 0.82 : card.n >= 7 ? 0.92 : 1.05;
        art = PIPS[card.n].map(([x, y]) => glyph(card.suit, x, y, sc)).join('');
      } else {
        art = court(card.n, card.suit);
      }
    }

    /* photo treatment when imagery is available and reachable, paper otherwise */
    const photo = window.UMBRAL_ART === 'photo' && window.PHOTOS ? window.PHOTOS[card.id] : null;
    const artAttrs = photo
      ? `color="#F1E9D8" opacity=".95" style="filter:drop-shadow(0 0 3px rgba(6,5,14,.98))
         drop-shadow(0 0 9px rgba(6,5,14,.8))"`
      : `color="${INK}"`;

    return `<svg viewBox="0 0 300 510" xmlns="http://www.w3.org/2000/svg" role="img"
      aria-label="${name}">${frame(top, name, accent, photo)}<g class="art" ${artAttrs}
      ><g transform="translate(150 252) scale(1.19) translate(-150 -235)">${art}</g></g></svg>`;
  };

  /* card back — one shared design */
  window.cardBackSVG = function () {
    let web = '';
    for (let i = 0; i < 8; i++) {
      const a = i * 45 * Math.PI / 180;
      web += `<line x1="150" y1="255" x2="${(150+112*Math.cos(a)).toFixed(1)}"
        y2="${(255+112*Math.sin(a)).toFixed(1)}" stroke="#5B4C86" stroke-width="0.8" opacity=".6"/>`;
    }
    return `<svg viewBox="0 0 300 510" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs><linearGradient id="bk" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#2A2249"/><stop offset="1" stop-color="#120E22"/></linearGradient></defs>
      <rect width="300" height="510" fill="url(#bk)"/>
      <rect x="12" y="12" width="276" height="486" fill="none" stroke="#8A76C4" stroke-width="1" opacity=".5"/>
      <rect x="20" y="20" width="260" height="470" fill="none" stroke="#8A76C4" stroke-width="0.5" opacity=".3"/>
      ${web}
      <circle cx="150" cy="255" r="112" fill="none" stroke="#8A76C4" stroke-width="0.8" opacity=".5"/>
      <circle cx="150" cy="255" r="76" fill="none" stroke="#8A76C4" stroke-width="0.8" opacity=".6"/>
      <circle cx="150" cy="255" r="40" fill="none" stroke="#D8B26A" stroke-width="1.2" opacity=".85"/>
      <path d="${star(150,255,34,14,8)}" fill="none" stroke="#D8B26A" stroke-width="1.1" opacity=".9"/>
      <circle cx="150" cy="255" r="6" fill="#D8B26A" opacity=".9"/>
    </svg>`;
  };
})();
