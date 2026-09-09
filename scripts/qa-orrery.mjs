/* The orrery: the ring behind the opening line.

   It is only worth having if it is telling the truth, so most of this checks
   the drawing against the astronomy rather than checking that a drawing exists.
   The rest is the part that was wrong twice while it was being built: a dial
   made of hairlines with nothing to take hold of, and a dial painted behind the
   block that covers the whole opening, where no pointer can ever reach it. */
import { chromium } from 'playwright';
import { serve } from './serve.mjs';
import { BASE, PREP } from './pages.mjs';

const origin = BASE.replace(/\/$/, '');
const server = await serve();
const b = await chromium.launch();
let pass = 0, fail = 0;
const check = (n, c, got) => {
  c ? pass++ : (fail++, console.log('FAIL', n, got === undefined ? '' : JSON.stringify(got)));
};

const ctx = await b.newContext({ viewport: { width: 1400, height: 900 }, locale: 'en-GB' });
await ctx.addInitScript(PREP);
const p = await ctx.newPage();
const errs = [];
p.on('pageerror', e => errs.push(e.message));
p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
await p.goto(origin + '/en/index.html', { waitUntil: 'networkidle' });
await p.locator('.privacy-notice .btn').click().catch(() => {});
await p.waitForTimeout(500);

check('it is drawn', await p.locator('#orrery .or-svg').count() === 1);

/* ---- it agrees with the astronomy ---- */
const truth = await p.evaluate(() => {
  const k = window.ASTRO.sky(new Date());
  const at = sel => {
    const t = document.querySelector(sel).getAttribute('transform');
    const m = t.match(/translate\(([-\d.]+),([-\d.]+)\)/);
    return { x: +m[1], y: +m[2] };
  };
  const ang = q => (Math.atan2(500 - q.y, q.x - 500) * 180 / Math.PI + 360) % 360;
  return {
    sunLon: (window.ASTRO.sunLon(new Date()) % 360 + 360) % 360,
    moonLon: (window.ASTRO.moonLon(new Date()) % 360 + 360) % 360,
    sunDrawn: ang(at('.or-sun')), moonDrawn: ang(at('.or-moon')),
    illum: k.phase.illumination, waxing: k.phase.waxing,
    termRx: +document.querySelector('.or-moon-term').getAttribute('rx'),
    termDark: document.querySelector('.or-moon-term').classList.contains('is-dark'),
    litD: document.querySelector('.or-moon-lit').getAttribute('d'),
    lit: document.querySelector('.or-sign text.is-here')?.textContent,
    sign: k.sun.id,
  };
});
const near = (a, c) => Math.abs(((a - c + 540) % 360) - 180) < 1;
check('the Sun is drawn where the Sun is', near(truth.sunDrawn, truth.sunLon),
      { drawn: truth.sunDrawn.toFixed(1), real: truth.sunLon.toFixed(1) });
check('the Moon is drawn where the Moon is', near(truth.moonDrawn, truth.moonLon),
      { drawn: truth.moonDrawn.toFixed(1), real: truth.moonLon.toFixed(1) });
check('the house the Sun stands in is the one lit',
      (truth.lit || '').toLowerCase() === truth.sign.slice(0, 3), { lit: truth.lit, sign: truth.sign });

/* the Moon carries the shape it has tonight, and never spills out of its disc */
check('the terminator matches the phase',
      Math.abs(truth.termRx - 15 * Math.abs(1 - 2 * truth.illum)) < 0.2,
      { rx: truth.termRx, illum: truth.illum });
check('past half it adds light, before half it takes it away',
      truth.termDark === (truth.illum <= 0.5), { dark: truth.termDark, illum: truth.illum });
check('the lit limb is a half disc, so nothing can spill outside it',
      /^M 0,-15 A 15,15 0 0 [01] 0,15 Z$/.test(truth.litD), truth.litD);

/* ---- and it can be taken hold of ---- */
const box = await p.locator('#orrery').boundingBox();
const cx = box.x + box.width / 2, cy = box.y + box.height / 2, r = box.width * 0.441;
const grabbed = await p.evaluate(([x, y]) => {
  const el = document.elementFromPoint(x, y);
  return el ? (el.getAttribute('class') || '') : 'nothing';
}, [cx + r, cy]);
check('the band is what the pointer finds on the band', grabbed === 'or-grip', grabbed);
const middle = await p.evaluate(() => {
  const h = document.querySelector('.hero h1').getBoundingClientRect();
  const el = document.elementFromPoint(h.left + h.width / 2, h.top + h.height / 2);
  return el ? el.tagName : 'nothing';
});
check('and the words in the middle are still the words', middle !== 'circle', middle);

const at = () => p.evaluate(() => ({
  sun: document.querySelector('.or-sun').getAttribute('transform'),
  moon: document.querySelector('.or-moon').getAttribute('transform'),
  read: document.querySelector('.or-read').textContent.trim(),
}));
const now = await at();

await p.mouse.move(cx + r, cy);
await p.mouse.down();
for (let a = 0; a <= 150; a += 8) {
  const t = a * Math.PI / 180;
  await p.mouse.move(cx + r * Math.cos(t), cy - r * Math.sin(t));
}
const turned = await at();
check('turning the band moves the Sun', turned.sun !== now.sun);
check('and the Moon, which runs faster', turned.moon !== now.moon);
check('and it says which day it is showing', /\d{4}/.test(turned.read), turned.read);
/* the readout is pinned to the window, and a fixed child of a transformed
   element is fixed to the element, which is how it ended up below the fold */
const onScreen = await p.evaluate(() => {
  const r = document.querySelector('.or-read').getBoundingClientRect();
  return r.top >= 0 && r.bottom <= window.innerHeight && r.width > 0;
});
check('and you can see it say so', onScreen);

/* the sky it shows while turned is the real sky for that day */
const honest = await p.evaluate(() => {
  const read = document.querySelector('.or-read').textContent;
  const d = new Date(read.split('·')[0].trim());
  if (isNaN(d)) return null;
  const t = document.querySelector('.or-sun').getAttribute('transform');
  const m = t.match(/translate\(([-\d.]+),([-\d.]+)\)/);
  const drawn = (Math.atan2(500 - +m[2], +m[1] - 500) * 180 / Math.PI + 360) % 360;
  const real = (window.ASTRO.sunLon(d) % 360 + 360) % 360;
  return Math.abs(((drawn - real + 540) % 360) - 180);
});
check('the day it winds to is a real sky, not a spin', honest !== null && honest < 2, honest);

const fps = await p.evaluate(() => new Promise(r => {
  let n = 0; const t0 = performance.now();
  (function f() { n++; performance.now() - t0 < 1000 ? requestAnimationFrame(f) : r(n); })();
}));
check('turning it does not cost the frame budget', fps > 40, fps);

await p.mouse.up();
await p.waitForTimeout(1800);
const back = await at();
check('letting go returns it to now', back.sun === now.sun, { was: now.sun, is: back.sun });

/* ---- and it works without a pointer ---- */
await p.locator('#orrery').focus();
await p.keyboard.press('ArrowRight');
await p.waitForTimeout(600);
check('arrow keys step a day', /\d{4}/.test((await at()).read), (await at()).read);
await p.keyboard.press('Escape');
await p.waitForTimeout(900);
check('escape brings it back to now', (await at()).sun === now.sun);
await ctx.close();

/* ---- someone who asked for less movement is not given a dial that spins ---- */
const still = await b.newContext({ reducedMotion: 'reduce', viewport: { width: 1400, height: 900 } });
await still.addInitScript(PREP);
const q = await still.newPage();
await q.goto(origin + '/index.html', { waitUntil: 'networkidle' });
await q.waitForTimeout(400);
const b2 = await q.locator('#orrery').boundingBox();
const before = await q.locator('.or-sun').getAttribute('transform');
await q.mouse.move(b2.x + b2.width / 2 + b2.width * 0.441, b2.y + b2.height / 2);
await q.mouse.down();
await q.mouse.move(b2.x + b2.width / 2, b2.y + b2.height / 2 - b2.height * 0.441, { steps: 10 });
await q.mouse.up();
await q.waitForTimeout(300);
check('reduced motion leaves it still', await q.locator('.or-sun').getAttribute('transform') === before);
check('but it is still drawn, and still true', await q.locator('.or-moon-lit').count() === 1);
await still.close();

/* ---- the ephemeris, checked against the definitions it is solving --------

   Both of these shipped wrong and neither showed in a screenshot. nextPhase
   moved only the low end of its bracket and returned the first midpoint past
   the crossing, so it was one step of a bisection and not forty, and named the
   wrong calendar day on about one load in seventy. dms rounded the arcminutes
   on their own, so they could carry to sixty and print "17 degrees 60". Both
   are arithmetic, so both are checked as arithmetic, over a whole year of
   hourly loads rather than on the one date the panel happens to be showing. */
const cal = await b.newContext({ viewport: { width: 1400, height: 900 } });
await cal.addInitScript(PREP);
const e = await cal.newPage();
await e.goto(origin + '/index.html', { waitUntil: 'networkidle' });

const eph = await e.evaluate(() => {
  const A = window.ASTRO, norm = x => ((x % 360) + 360) % 360;
  let worstMinutes = 0, sixty = 0, outOfSign = 0, missing = 0;
  for (let h = 0; h < 8760; h += 7) {
    const d = new Date(Date.UTC(2026, 0, 1) + h * 3600e3);
    for (const want of [0, 180]) {
      const t = A.nextPhase(d, want);
      if (!t) { missing++; continue; }
      let off = norm(A.moonLon(t) - A.sunLon(t) - want);
      if (off > 180) off -= 360;
      /* elongation opens at about half a degree an hour, so degrees of error
         convert to minutes of error at that rate */
      worstMinutes = Math.max(worstMinutes, Math.abs(off) / 0.5083 * 60);
    }
    const x = A.ephemeris(d);
    for (const body of [x.sun, x.moon]) {
      if (body.min >= 60 || body.min < 0) sixty++;
      if (body.deg > 29 || body.deg < 0) outOfSign++;
    }
  }
  return { worstMinutes, sixty, outOfSign, missing };
});
check('every new and full moon is found', eph.missing === 0);
check('and found to the minute, not to the six hour step',
      eph.worstMinutes < 1, `worst error ${eph.worstMinutes.toFixed(1)} minutes`);
check('arcminutes never round up to sixty', eph.sixty === 0, `${eph.sixty} readings of 60`);
check('and a degree never leaves its own sign', eph.outOfSign === 0, `${eph.outOfSign} outside 0 to 29`);
await cal.close();

await b.close(); server.close();
if (errs.length) { fail += errs.length; console.log('THREW\n  ' + errs.join('\n  ')); }
console.log(fail ? `\n${fail} failed, ${pass} passed` : `\nthe orrery tells the truth, ${pass} checks green`);
process.exit(fail ? 1 : 0);
