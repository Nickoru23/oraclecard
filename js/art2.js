/* ===== The Witch Atelier — deck art, second pass =====
   Flat filled shapes on cream, in the register of contemporary illustrated decks:
   a deep roundel behind a pale figure, gold detail, star scatter, printed grain.
   Original work — nothing traced or copied from any existing deck. */
(function () {
  const C = {
    paper: '#EDE6D6', ink: '#12233B', deep: '#16314F', mid: '#325C82',
    slate: '#5E86A8', teal: '#2E6E6B', pale: '#F4EFE4', gold: '#C9A227',
  };
  const ROMAN = ['0','I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII',
                 'XIII','XIV','XV','XVI','XVII','XVIII','XIX','XX','XXI'];

  function star(cx, cy, R, r, pts, rot = -90) {
    let d = '';
    for (let i = 0; i < pts * 2; i++) {
      const rad = i % 2 ? r : R, a = (rot + i * 180 / pts) * Math.PI / 180;
      d += (i ? 'L' : 'M') + (cx + rad * Math.cos(a)).toFixed(1) + ' ' + (cy + rad * Math.sin(a)).toFixed(1);
    }
    return d + 'Z';
  }
  const sparkle = (x, y, s, f = C.gold, o = 1) =>
    `<path d="${star(x, y, s, s * 0.28, 4)}" fill="${f}" opacity="${o}"/>`;

  /* star scatter inside the roundel — deterministic per card, so it never reflows */
  function starfield(seed, n = 22) {
    let out = '', v = seed * 9301 + 49297;
    const rnd = () => ((v = (v * 9301 + 49297) % 233280) / 233280);
    for (let i = 0; i < n; i++) {
      const a = rnd() * Math.PI * 2, rr = 26 + rnd() * 82;
      const x = 150 + Math.cos(a) * rr, y = 244 + Math.sin(a) * rr;
      const s = 1.1 + rnd() * 2.4;
      out += rnd() > 0.74
        ? sparkle(x, y, s + 1.7, C.gold, 0.95)
        : `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${s.toFixed(1)}" fill="${C.pale}"
             opacity="${(0.45 + rnd() * 0.5).toFixed(2)}"/>`;
    }
    return out;
  }

  /* the roundel: an arch-topped night field the figure stands in */
  const roundel = (seed) => `
    <path d="M38 250 A112 112 0 0 1 262 250 L262 392 L38 392 Z" fill="${C.deep}"/>
    <path d="M38 250 A112 112 0 0 1 262 250" fill="none" stroke="${C.gold}" stroke-width="2"/>
    <path d="M50 250 A100 100 0 0 1 250 250" fill="none" stroke="${C.gold}" stroke-width="0.8" opacity=".45"/>
    ${starfield(seed)}`;

  /* rolling ground the roundel sits on */
  const ground = () => `
    <path d="M34 336 Q92 312 150 328 Q210 344 266 322 L266 396 L34 396 Z" fill="${C.mid}"/>
    <path d="M34 360 Q100 340 150 354 Q206 368 266 348 L266 396 L34 396 Z" fill="${C.teal}" opacity=".92"/>
    <path d="M34 382 Q104 366 150 378 Q200 390 266 372 L266 396 L34 396 Z" fill="${C.ink}"/>`;

  /* a pale standing figure; the stance changes per card */
  function figure(pose) {
    const P = {
      open:  { arms: 'M150 258 L104 226 M150 258 L196 226', hands: [[100, 222], [200, 222]] },
      raise: { arms: 'M150 258 L120 206 M150 258 L180 206', hands: [[116, 202], [184, 202]] },
      hold:  { arms: 'M150 258 L114 246 M150 258 L186 268', hands: [[110, 244], [190, 270]] },
    }[pose] || {};
    return `
      <path d="M150 178 a15 17 0 1 1 .1 0Z" fill="${C.pale}"/>
      <path d="M137 192 Q150 184 163 192 L172 268 Q150 280 128 268 Z" fill="${C.pale}"/>
      <path d="${P.arms}" stroke="${C.pale}" stroke-width="9" stroke-linecap="round" fill="none"/>
      ${(P.hands || []).map(([x, y]) => `<circle cx="${x}" cy="${y}" r="5.4" fill="${C.pale}"/>`).join('')}
      <path d="M141 278 L137 344 M159 278 L163 344" stroke="${C.pale}" stroke-width="10"
        stroke-linecap="round" fill="none"/>
      <path d="M128 266 Q150 280 172 266 L178 300 Q150 314 122 300 Z" fill="${C.pale}"/>`;
  }

  /* per-card scenes */
  const SCENE = {
    m21: () => `${roundel(21)}
      <path d="M74 218 Q96 152 132 180 Q112 252 96 322 Q70 294 74 218Z" fill="${C.mid}"/>
      <path d="M226 218 Q204 152 168 180 Q188 252 204 322 Q230 294 226 218Z" fill="${C.mid}"/>
      ${figure('open')}
      <circle cx="150" cy="152" r="19" fill="none" stroke="${C.gold}" stroke-width="1.6"/>
      ${sparkle(150, 152, 10)}${ground()}
      <circle cx="92" cy="322" r="12" fill="${C.gold}" opacity=".92"/>
      <path d="M216 318 a12 12 0 1 0 -9 -20 14 14 0 0 1 9 20Z" fill="${C.gold}" opacity=".92"/>`,
    m17: () => `${roundel(17)}${figure('hold')}
      <path d="${star(150, 136, 30, 11, 8)}" fill="${C.pale}"/>
      <path d="${star(150, 136, 15, 5, 8)}" fill="${C.gold}"/>
      ${sparkle(96, 180, 8)}${sparkle(206, 172, 8)}${sparkle(118, 142, 6)}${ground()}
      <path d="M104 354 Q126 344 148 354" stroke="${C.pale}" stroke-width="2.4" fill="none" opacity=".8"/>
      <path d="M156 368 Q180 358 202 368" stroke="${C.pale}" stroke-width="2.4" fill="none" opacity=".8"/>`,
    m18: () => `${roundel(18)}
      <path d="M182 150 a40 40 0 1 0 0 76 32 32 0 0 1 0 -76Z" fill="${C.pale}"/>
      <path d="M84 352 L84 276 L100 248 L116 276 L116 352Z" fill="${C.ink}"/>
      <path d="M184 352 L184 276 L200 248 L216 276 L216 352Z" fill="${C.ink}"/>
      <path d="M150 352 Q138 310 152 282 Q166 254 150 228" stroke="${C.pale}"
        stroke-width="3" fill="none" opacity=".85"/>${ground()}`,
    m19: () => `${roundel(19)}
      <circle cx="150" cy="198" r="44" fill="${C.gold}"/>
      ${(() => { let s = ''; for (let i = 0; i < 16; i++) { const a = i * 22.5 * Math.PI / 180;
        s += `<path d="M${(150 + 50 * Math.cos(a)).toFixed(1)} ${(198 + 50 * Math.sin(a)).toFixed(1)}
          L${(150 + 74 * Math.cos(a)).toFixed(1)} ${(198 + 74 * Math.sin(a)).toFixed(1)}"
          stroke="${C.gold}" stroke-width="3" stroke-linecap="round"/>`; } return s; })()}
      ${figure('raise')}${ground()}`,
    m09: () => `${roundel(9)}
      <path d="M150 170 a16 17 0 1 1 .1 0Z" fill="${C.pale}"/>
      <path d="M118 352 Q124 236 150 186 Q176 236 182 352Z" fill="${C.pale}"/>
      <path d="M126 202 Q150 168 174 202 Q150 192 126 202Z" fill="${C.slate}"/>
      <path d="M198 152 L198 352" stroke="${C.gold}" stroke-width="3.4" stroke-linecap="round"/>
      <path d="M92 216 L124 216 L130 264 L86 264Z" fill="${C.gold}"/>
      <circle cx="108" cy="240" r="11" fill="${C.deep}"/>${sparkle(108, 240, 7)}${ground()}`,
    m01: () => `${roundel(1)}${figure('hold')}
      <path d="M114 246 L114 170" stroke="${C.gold}" stroke-width="5" stroke-linecap="round"/>
      ${sparkle(114, 162, 10)}
      <path d="M108 142 C108 126 134 126 134 142 C134 158 160 158 160 142 C160 126 134 126 134 142
               C134 158 108 158 108 142Z" fill="none" stroke="${C.gold}" stroke-width="2"/>
      <path d="M96 318 L204 318 L204 326 L96 326Z" fill="${C.gold}"/>
      <circle cx="118" cy="308" r="6" fill="${C.pale}"/>
      <path d="${star(150, 308, 8, 3, 5)}" fill="${C.pale}"/>
      <path d="M176 302 h12 v12 h-12Z" fill="${C.pale}"/>${ground()}`,
  };

  /* minors — the suit as a filled emblem in the classic pip layouts */
  const GLYPH = {
    wands: `<path d="M0 -22 L0 20" stroke="${C.gold}" stroke-width="5" stroke-linecap="round"/>
            <path d="M0 -8 Q-12 -14 -10 -24 Q0 -20 0 -8Z" fill="${C.teal}"/>
            <path d="M0 2 Q12 -4 10 -14 Q0 -10 0 2Z" fill="${C.teal}"/>
            <circle cx="0" cy="-22" r="4.4" fill="${C.gold}"/>`,
    cups:  `<path d="M-13 -16 L13 -16 L9 4 Q0 12 -9 4Z" fill="${C.deep}"/>
            <path d="M-13 -16 L13 -16 L11 -10 L-11 -10Z" fill="${C.gold}"/>
            <path d="M0 12 L0 18" stroke="${C.deep}" stroke-width="3.4" stroke-linecap="round"/>
            <path d="M-9 20 L9 20" stroke="${C.deep}" stroke-width="3.4" stroke-linecap="round"/>`,
    swords: `<path d="M0 -22 L6 -8 L6 12 L0 20 L-6 12 L-6 -8Z" fill="${C.slate}"/>
            <path d="M-11 10 L11 10" stroke="${C.gold}" stroke-width="3.4" stroke-linecap="round"/>
            <circle cx="0" cy="-14" r="3" fill="${C.gold}"/>`,
    pentacles: `<circle cx="0" cy="-1" r="15" fill="${C.deep}"/>
            <circle cx="0" cy="-1" r="15" fill="none" stroke="${C.gold}" stroke-width="1.6"/>
            <path d="${star(0, -1, 9.5, 3.8, 5)}" fill="${C.gold}"/>`,
  };
  const PIPS = {
    1: [[150, 236]], 2: [[150, 178], [150, 296]], 3: [[150, 164], [150, 236], [150, 308]],
    4: [[112, 182], [188, 182], [112, 290], [188, 290]],
    5: [[112, 178], [188, 178], [150, 236], [112, 294], [188, 294]],
    6: [[112, 170], [188, 170], [112, 236], [188, 236], [112, 302], [188, 302]],
    7: [[112, 164], [188, 164], [112, 224], [188, 224], [150, 272], [112, 318], [188, 318]],
    8: [[112, 160], [188, 160], [112, 212], [188, 212], [112, 264], [188, 264], [112, 316], [188, 316]],
    9: [[108, 164], [150, 164], [192, 164], [108, 236], [150, 236], [192, 236], [108, 308], [150, 308], [192, 308]],
    10: [[108, 160], [150, 160], [192, 160], [108, 214], [192, 214], [108, 268], [192, 268], [108, 322], [150, 322], [192, 322]],
  };

  /* on the night field the emblems need to be pale, not deep */
  const GLYPH_DARK = {
    wands: `<path d="M0 -22 L0 20" stroke="${C.gold}" stroke-width="5" stroke-linecap="round"/>
            <path d="M0 -8 Q-12 -14 -10 -24 Q0 -20 0 -8Z" fill="${C.pale}"/>
            <path d="M0 2 Q12 -4 10 -14 Q0 -10 0 2Z" fill="${C.pale}"/>
            <circle cx="0" cy="-22" r="4.4" fill="${C.gold}"/>`,
    cups:  `<path d="M-13 -16 L13 -16 L9 4 Q0 12 -9 4Z" fill="${C.pale}"/>
            <path d="M-13 -16 L13 -16 L11 -10 L-11 -10Z" fill="${C.gold}"/>
            <path d="M0 12 L0 18" stroke="${C.pale}" stroke-width="3.4" stroke-linecap="round"/>
            <path d="M-9 20 L9 20" stroke="${C.pale}" stroke-width="3.4" stroke-linecap="round"/>`,
    swords: `<path d="M0 -22 L6 -8 L6 12 L0 20 L-6 12 L-6 -8Z" fill="${C.pale}"/>
            <path d="M-11 10 L11 10" stroke="${C.gold}" stroke-width="3.4" stroke-linecap="round"/>
            <circle cx="0" cy="-14" r="3" fill="${C.gold}"/>`,
    pentacles: `<circle cx="0" cy="-1" r="15" fill="${C.pale}"/>
            <path d="${star(0, -1, 9.5, 3.8, 5)}" fill="${C.deep}"/>`,
  };

  function minor(card) {
    if (card.n <= 10) {
      const sc = card.n >= 9 ? 0.74 : card.n >= 7 ? 0.84 : 1;
      const gd = GLYPH_DARK[card.suit];
      return `${roundel(card.n * 7 + card.suit.length)}
        <g transform="translate(150 252) scale(0.86) translate(-150 -252)">
          ${PIPS[card.n].map(([x, y]) => `<g transform="translate(${x} ${y}) scale(${sc})">${gd}</g>`).join('')}
        </g>${ground()}`;
    }
    const gl = GLYPH_DARK[card.suit];
    const crown = {
      11: `<path d="M132 162 L150 144 L168 162Z" fill="${C.gold}"/>`,
      12: `<path d="M130 160 Q150 138 170 160Z" fill="${C.gold}"/>`,
      13: `<path d="M128 162 L134 138 L150 154 L166 138 L172 162Z" fill="${C.gold}"/>`,
      14: `<path d="M126 162 L126 134 L140 148 L150 130 L160 148 L174 134 L174 162Z" fill="${C.gold}"/>`,
    }[card.n];
    return `${roundel(card.n + card.suit.length)}${figure('hold')}${crown}
      <g transform="translate(114 250)">${gl}</g>${ground()}`;
  }

  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  window.cardSVG2 = function (card, lang = 'es') {
    const name = esc(card.name[lang] || card.name.es).toUpperCase();
    const isMajor = card.a === 'major';
    const top = isMajor ? ROMAN[card.n]
      : (card.n <= 10 ? ROMAN[card.n]
        : { wands: '&#9651;', cups: '&#9661;', swords: '&#9651;&#822;', pentacles: '&#9661;&#822;' }[card.suit]);
    const scene = isMajor
      ? (SCENE[card.id] || (() => `${roundel(card.n)}${figure('open')}${ground()}`))()
      : minor(card);

    return `<svg viewBox="0 0 300 510" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${name}">
      <defs>
        <filter id="twa-grain" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" seed="5"/>
          <feColorMatrix type="saturate" values="0"/>
        </filter>
        <clipPath id="twa-clip"><rect x="18" y="18" width="264" height="474" rx="3"/></clipPath>
      </defs>
      <rect width="300" height="510" fill="${C.paper}"/>
      <g clip-path="url(#twa-clip)">${scene}</g>
      <rect width="300" height="510" filter="url(#twa-grain)" opacity=".07"/>
      <rect x="12" y="12" width="276" height="486" rx="3" fill="none" stroke="${C.ink}" stroke-width="2"/>
      <rect x="18" y="18" width="264" height="474" rx="2" fill="none" stroke="${C.gold}"
        stroke-width="0.9" opacity=".7"/>
      <text x="150" y="56" text-anchor="middle" fill="${C.ink}" font-family="Georgia,serif"
        font-size="19" letter-spacing="4">&#183; ${top} &#183;</text>
      <text x="150" y="466" text-anchor="middle" fill="${C.ink}" font-family="Georgia,serif"
        font-size="${name.length > 18 ? 14 : 17}" letter-spacing="2.6">${name}</text>
    </svg>`;
  };

  /* this is the deck the site draws with; the first-pass line deck stays in
     art.js as the fallback if anything here fails to load */
  window.cardSVG = window.cardSVG2;

  window.cardBackSVG = function () {
    let web = '';
    for (let i = 0; i < 8; i++) {
      const a = i * 45 * Math.PI / 180;
      web += `<path d="M150 255 L${(150 + 118 * Math.cos(a)).toFixed(1)} ${(255 + 118 * Math.sin(a)).toFixed(1)}"
        stroke="${C.gold}" stroke-width="0.7" opacity=".4"/>`;
    }
    return `<svg viewBox="0 0 300 510" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect width="300" height="510" fill="${C.deep}"/>
      ${web}
      <circle cx="150" cy="255" r="118" fill="none" stroke="${C.gold}" stroke-width="0.8" opacity=".45"/>
      <circle cx="150" cy="255" r="78" fill="none" stroke="${C.gold}" stroke-width="0.8" opacity=".6"/>
      <circle cx="150" cy="255" r="42" fill="none" stroke="${C.gold}" stroke-width="1.3"/>
      <path d="${star(150, 255, 36, 15, 8)}" fill="none" stroke="${C.gold}" stroke-width="1.2"/>
      <circle cx="150" cy="255" r="7" fill="${C.gold}"/>
      <rect x="12" y="12" width="276" height="486" rx="3" fill="none" stroke="${C.gold}"
        stroke-width="1.4" opacity=".7"/>
    </svg>`;
  };
})();
