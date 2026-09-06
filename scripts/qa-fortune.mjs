/* The daily fortune: the first thing a visitor sees.

   What is asserted is what was asked for and what would be embarrassing to get
   wrong. It arrives on its own on a first visit, the words arrive one at a time
   rather than as a block, the card behind it is a real two sided card, it never
   stands between a buyer and a purchase, it does not come back the same day,
   and the page it lives on writes the same words with the same animation. */
import { chromium } from 'playwright';
import { serve } from './serve.mjs';
import { BASE as base, LANGS } from './pages.mjs';

const server = await serve();
const b = await chromium.launch();
const errs = [];
let pass = 0, fail = 0;
const check = (name, cond, got) => {
  cond ? pass++ : (fail++, console.log('FAIL', name, got === undefined ? '' : JSON.stringify(got)));
};

/* a browser that has never been here, in one language */
async function fresh(lang) {
  const ctx = await b.newContext();
  await ctx.addInitScript(l => { try { localStorage.setItem('umbral.lang', l); } catch (e) {} }, lang);
  const p = await ctx.newPage();
  p.on('pageerror', e => errs.push(`${lang}: ${e.message}`));
  await ctx.route('**/*', r => r.request().url().startsWith(base) ? r.continue() : r.abort());
  return { ctx, p };
}

/* ---- it opens by itself, in every language ---- */
for (const lang of LANGS) {
  const { ctx, p } = await fresh(lang);
  await p.goto(base + 'index.html', { waitUntil: 'networkidle' });
  await p.waitForSelector('.df', { timeout: 3000 }).catch(() => {});
  check(`${lang}: opens on a first visit`, await p.locator('.df').count() === 1);
  check(`${lang}: the words are there`, (await p.locator('.df-w').count()) > 3,
        await p.locator('.df-w').count());
  const texts = await p.locator('.df-eyebrow, .df-cardlabel, .df-go, .df-note')
                       .allTextContents();
  check(`${lang}: every label is translated`, texts.length === 4 && texts.every(t => t.trim()), texts);
  await ctx.close();
}

const { ctx, p } = await fresh('en');
await p.goto(base + 'index.html', { waitUntil: 'networkidle' });
await p.waitForSelector('.df-w');

/* ---- the words arrive one at a time ---- */
const delays = await p.$$eval('.df-w', ns => ns.map(n => parseFloat(n.style.animationDelay)));
check('every word carries its own delay', delays.length > 3 && delays.every(d => d >= 0), delays.slice(0, 4));
check('the delays climb', delays.every((d, i) => i === 0 || d > delays[i - 1]), delays.slice(0, 4));
check('the last word is inside four seconds', delays[delays.length - 1] < 4, delays[delays.length - 1]);
const anim = await p.$eval('.df-w', n => getComputedStyle(n).animationName);
check('the words are animated, not just placed', anim !== 'none', anim);

/* the words really do appear over time: nothing is painted at the start */
const early = await p.$eval('.df-w:last-of-type', n => getComputedStyle(n).opacity);
check('a late word starts invisible', Number(early) < 0.5, early);

/* ---- the card behind it is a real card ---- */
check('the card has two faces', await p.locator('.df-cardart .face').count() === 2);
const flat = await p.$eval('.df-cardart .c3d-faces', n => getComputedStyle(n).transformStyle);
check('the card is not flattened', flat === 'preserve-3d', flat);

/* ---- it counts as the day's first task ---- */
const done = await p.evaluate(() => window.Ritual.get().done.cookie);
check('reading it keeps the first task', done === 1, done);
const st = await p.evaluate(() => window.COOKIE.state());
check('it carries the streak', st.streak === 1 && st.total === 1, st);

/* ---- it goes away, and stays away for the day ---- */
await p.click('.df-go');
await p.waitForTimeout(700);
check('the button closes it', await p.locator('.df').count() === 0);
check('the page is scrollable again',
      await p.evaluate(() => !document.documentElement.classList.contains('df-open')));

await p.goto(base + 'index.html', { waitUntil: 'networkidle' });
await p.waitForTimeout(500);
check('it does not come back the same day', await p.locator('.df').count() === 0);

/* Escape closes it too, on a fresh day */
await p.evaluate(() => localStorage.removeItem('twa_greeted'));
await p.goto(base + 'index.html', { waitUntil: 'networkidle' });
await p.waitForSelector('.df');
await p.keyboard.press('Escape');
await p.waitForTimeout(700);
check('escape closes it', await p.locator('.df').count() === 0);

/* ---- never in the way of money ---- */
for (const page of ['lectura.html', 'gracias.html']) {
  await p.evaluate(() => localStorage.removeItem('twa_greeted'));
  await p.goto(base + page, { waitUntil: 'networkidle' });
  await p.waitForTimeout(600);
  check(`it stays off ${page}`, await p.locator('.df').count() === 0);
}

/* ---- its own page writes the same words the same way ---- */
await p.evaluate(() => { localStorage.removeItem('twa_greeted'); localStorage.removeItem('umbral.cookie'); });
await p.goto(base + 'fortuna.html', { waitUntil: 'networkidle' });
await p.waitForTimeout(400);
check('the fortune page does not overlay itself', await p.locator('.df').count() === 0);
check('it starts closed', await p.locator('#ck-card').isVisible() === false);
await p.click('#reveal');
await p.waitForTimeout(300);
check('the page writes the words one at a time', (await p.locator('#fortune .df-w').count()) > 3);
check('the card comes with them', await p.locator('#ck-art .face').count() === 2);
check('the page greets the day too',
      await p.evaluate(() => localStorage.getItem('twa_greeted')) !== null);
await p.goto(base + 'index.html', { waitUntil: 'networkidle' });
await p.waitForTimeout(500);
check('reading it on its page is enough for the day', await p.locator('.df').count() === 0);

await ctx.close();
await b.close();
server.close();

if (errs.length) { fail += errs.length; console.log('THREW\n  ' + errs.join('\n  ')); }
console.log(fail ? `\n${fail} failed, ${pass} passed` : `\nthe daily fortune, ${pass} checks green`);
process.exit(fail ? 1 : 0);
