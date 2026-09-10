/* The same thing, said twice.

   Three passes of this project went at the wording and every one of them
   missed the same defect, because it is invisible one string at a time: the
   card on the front page and the lede of the page it opens said the same
   sentence, so you clicked a promise and landed on it repeated. The credits
   page said "all 78 cards are drawn here" in its lede and again in its first
   section. The card of the day said "where the Sun and the Moon actually are"
   twice on one screen. Reading a string tells you nothing about that; only
   reading every string against every other one does.

   So this reads them against each other. Any run of four words that turns up
   in two strings is an echo unless the pair is listed below as deliberate,
   and deliberate means one of two things: a feature has one name and every
   surface uses it, or two strings are a matched pair whose whole point is to
   read alike.

   No browser, no network: this is the strings against themselves. */
import { readFileSync } from 'node:fs';
import { LANGS } from './pages.mjs';

const src = readFileSync(new URL('../js/i18n.js', import.meta.url), 'utf8');
const win = {};
new Function('window', src)(win);
const T = win.T;

/* A feature has one name. Every surface that points at it says that name, and
   that is consistency rather than repetition. */
const NAMES = [
  ['it_hor_t', 'nav_horoscopo', 'hor_eyebrow', 'task_card', 'sp_daily'],
  ['it_cookie_t', 'nav_cookie', 'ck_eyebrow', 'task_cookie', 'df_card', 'it_cookie_d'],
  ['it_ask_t', 'free_eyebrow', 'nav_consulta', 'cta_consulta', 'ck_ask', 'sg_open_question_d'],
  ['it_deck_t', 'nav_deck', 'deck_h2', 'spreads_h2', 'task_spread'],
  ['nav_reading', 'paid_eyebrow', 'ck_full', 'upsell_cta', 'cta_paid', 'err_limit'],
  /* the same destination gets the same words on every page that links to it */
  ['explore_cta', 'nav_deck', 'deck_h2'],
];
/* Pairs written to read alike: a yes beside its no, a singular beside its
   plural, a field beside the error that asks for it, and the promise that
   nothing was charged, which every payment error has to make. */
const PAIRS = [
  ['yes_d', 'no_d'], ['in_love', 'hor_love'], ['in_work', 'hor_work'],
  ['err', 'err_off'], ['err', 'err_net'], ['err_off', 'err_net'], ['err', 'err_pay'],
  ['err_pay', 'err_off'], ['err_pay', 'err_net'],
  ['why_birth', 'err_birth'], ['why_birth', 'f_birth'], ['f_birth', 'err_birth'],
  ['orrery_label', 'eph_note'], ['orrery_label', 'it_hor_d'], ['eph_note', 'why_birth'],
  ['eph_note', 'it_hor_d'],
  /* the streak sigils are a ladder and are meant to be read as one:
     three days in a row, seven days in a row, twenty eight days in a row */
  ['ck_streak', 'sg_three_nights_d'], ['ck_streak', 'sg_seven_nights_d'],
  ['ck_streak', 'sg_moon_turn_d'], ['sg_three_nights_d', 'sg_seven_nights_d'],
  ['sg_three_nights_d', 'sg_moon_turn_d'], ['sg_seven_nights_d', 'sg_moon_turn_d'],
  /* the pitch on the free page and the list of what you get at the checkout.
     Two pages, and the second is where somebody goes to check the numbers the
     first one quoted, so it has to quote the same ones. */
  ['upsell_p', 'incl'],
];
const singular = k => k.replace(/_1$/, '');
const together = (a, b) =>
  singular(a) === singular(b) ||
  PAIRS.some(([x, y]) => (x === a && y === b) || (x === b && y === a)) ||
  NAMES.some(g => g.includes(a) && g.includes(b));

const RUN = 4;                       /* four words in common is an echo */
let fails = 0, checked = 0;

for (const lang of LANGS) {
  const t = T[lang];
  const strs = Object.entries(t).flatMap(([k, v]) =>
    typeof v === 'string' ? [[k, v]] :
    Array.isArray(v) ? v.filter(x => typeof x === 'string').map(x => [k, x]) : []);
  checked += strs.length;

  const seen = new Map();
  for (const [k, v] of strs) {
    const w = v.replace(/<[^>]*>/g, '').toLowerCase()
               .replace(/\{[a-z]+\}/g, ' ').replace(/[^\p{L}\p{N} ]/gu, ' ')
               .split(/\s+/).filter(Boolean);
    for (let i = 0; i + RUN <= w.length; i++) {
      const g = w.slice(i, i + RUN).join(' ');
      if (!seen.has(g)) seen.set(g, new Set());
      seen.get(g).add(k);
    }
  }

  const echoes = new Map();          /* pair -> the longest phrase they share */
  for (const [g, ks] of seen) {
    const a = [...ks];
    for (let i = 0; i < a.length; i++)
      for (let j = i + 1; j < a.length; j++) {
        if (together(a[i], a[j])) continue;
        const key = [a[i], a[j]].sort().join(' + ');
        const had = echoes.get(key);
        if (!had || g.length > had.length) echoes.set(key, g);
      }
  }

  if (!echoes.size) { console.log(`ok   ${lang}, nothing is said twice`); continue; }
  fails += echoes.size;
  for (const [pair, g] of echoes)
    console.log(`FAIL ${lang} ${pair} both say "${g}"`);
}

console.log(fails
  ? `\n${fails} echo${fails === 1 ? '' : 'es'}: say it in one of the two, or list the pair as deliberate`
  : `\nnothing is said twice, across ${checked} strings in ${LANGS.length} languages`);
process.exit(fails ? 1 : 0);
