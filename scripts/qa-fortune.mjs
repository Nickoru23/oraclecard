/* The daily fortune: the first thing a visitor sees.

   What is asserted is what was asked for and what would be embarrassing to get
   wrong. It arrives on its own on a first visit, the words arrive one at a time
   rather than as a block, the card behind it is a real two sided card, it never
   stands between a buyer and a purchase, it does not come back the same day,
   and the page it lives on writes the same words with the same animation. */
import { chromium } from 'playwright';
import { serve } from './serve.mjs';
import { BASE as base, LANGS, addr, DEFAULT } from './pages.mjs';

const server = await serve();
const b = await chromium.launch();
const errs = [];
let pass = 0, fail = 0;
const check = (name, cond, got) => {
  cond ? pass++ : (fail++, console.log('FAIL', name, got === undefined ? '' : JSON.stringify(got)));
};

/* a browser that has never been here, in one language */
const at = (page, lang) => base.replace(/\/$/, '') + addr(page, lang || DEFAULT);

async function fresh(lang) {
  const ctx = await b.newContext();
  const p = await ctx.newPage();
  p.on('pageerror', e => errs.push(`${lang}: ${e.message}`));
  await ctx.route('**/*', r => r.request().url().startsWith(base) ? r.continue() : r.abort());
  return { ctx, p };
}

/* ---- it opens by itself, in every language ---- */
for (const lang of LANGS) {
  const { ctx, p } = await fresh(lang);
  await p.goto(at('index.html', lang), { waitUntil: 'networkidle' });
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

/* ---- the card behind it is a real card, and behaves like every other one ---- */
check('the card has two faces', await p.locator('.df-cardart .face').count() === 2);
const flat = await p.$eval('.df-cardart .c3d-faces', n => getComputedStyle(n).transformStyle);
check('the card is not flattened', flat === 'preserve-3d', flat);

const art = p.locator('.df-cardart');
check('it was picked up as a card', await art.evaluate(n => n.classList.contains('is-3d')));

/* The card is interactive now, so it must not be interactive before it can be
   seen: a click into the empty space it is about to occupy would turn it, and
   it would then fade in showing its back. Checked here, while it is still on
   its way in, and again once it has arrived. */
const pe = sel => p.$eval(sel, n => getComputedStyle(n).pointerEvents);
check('a card still on its way in takes no clicks', await pe('.df-card') === 'none',
      await pe('.df-card'));
check('nor does the button under it', await pe('.df-go') === 'none', await pe('.df-go'));

/* it tilts toward the pointer, and the rendered matrix really turns */
/* and once it has arrived it takes them again */
await p.waitForTimeout(4200);
check('once it has arrived it takes clicks', await pe('.df-card') === 'auto', await pe('.df-card'));
check('and so does the button', await pe('.df-go') === 'auto', await pe('.df-go'));

const box = await art.boundingBox();
const matrix = () => art.evaluate(n => getComputedStyle(n).transform);
const rest = await matrix();
await p.mouse.move(box.x + box.width * 0.9, box.y + box.height * 0.2);
await p.waitForTimeout(320);
const tilted = await matrix();
check('it tilts toward the pointer', tilted !== rest && tilted !== 'none', tilted.slice(0, 40));
check('the sheen follows it',
      (await art.evaluate(n => n.style.getPropertyValue('--mx'))) !== '');

/* a drag spins it and the throw settles */
await p.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
await p.mouse.down();
await p.mouse.move(box.x + box.width / 2 + 120, box.y + box.height / 2 + 40, { steps: 8 });
const spun = await matrix();
check('a drag spins it', spun !== tilted, spun.slice(0, 40));
await p.mouse.up();
await p.waitForTimeout(400);
check('a throw that ends on the sky does not close the greeting',
      await p.locator('.df').count() === 1);

/* polled rather than slept on: how long the spin takes to run down is the
   friction, and how many frames that is depends on the machine */
const ry = () => art.evaluate(n => Math.abs(parseFloat(n.style.getPropertyValue('--ry')) || 0));
let settled = false;
for (let i = 0; i < 20 && !settled; i++) {
  await p.waitForTimeout(200);
  settled = (await ry()) < 1;
}
check('a thrown card settles', settled, await ry());

/* a click turns it over, and the drag just now did not */
check('the drag did not turn it', await art.evaluate(n => n.classList.contains('is-turned')) === false);
await art.click();
await p.waitForTimeout(800);            /* the turn is eased, so let it finish */
check('a click turns it over', await art.evaluate(n => n.classList.contains('is-turned')));
const flip = () => art.evaluate(n => parseFloat(getComputedStyle(n).getPropertyValue('--flip')) || 0);
check('turning it composes with the tilt', (await flip()) === 180 && (await matrix()) !== rest,
      await flip());
await art.click();
await p.waitForTimeout(800);
check('a second click turns it back',
      await art.evaluate(n => n.classList.contains('is-turned')) === false && (await flip()) === 0);

/* the focus ring is for the keyboard, and a click is not the keyboard */
check('a click leaves no focus ring',
      await art.evaluate(n => getComputedStyle(n).outlineStyle) === 'none');

/* and arrow keys reach it without a pointer */
await art.focus();
await p.keyboard.press('ArrowRight');
await p.waitForTimeout(320);
check('arrow keys turn it', (await ry()) > 5, await ry());
check('a key press brings the ring back',
      await art.evaluate(n => getComputedStyle(n).outlineStyle) === 'solid');

/* Escape belongs to the greeting, not to the card. Everywhere else on the site
   it brings a card back to rest, but this is a dialog, and a dialog that would
   not close on Escape because a card happened to have focus would be a trap. */
await p.keyboard.press('Escape');
await p.waitForTimeout(700);
check('escape closes the greeting even from the card',
      await p.locator('.df').count() === 0);
await p.evaluate(() => localStorage.removeItem('twa_greeted'));
await p.goto(base + 'index.html', { waitUntil: 'networkidle' });
await p.waitForSelector('.df-w');

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

/* the card is redrawn on a language change, and a redrawn card is face up */
await p.click('#ck-art');
await p.waitForTimeout(700);
check('the page card turns over too',
      await p.locator('#ck-art').evaluate(n => n.classList.contains('is-turned')));
await p.click('.lang button[data-lang="de"]');
await p.waitForTimeout(500);
check('and a language change does not leave it back to front',
      await p.locator('#ck-art').evaluate(n => n.classList.contains('is-turned')) === false);
await p.click('.lang button[data-lang="en"]');
await p.waitForTimeout(300);
await p.goto(base + 'index.html', { waitUntil: 'networkidle' });
await p.waitForTimeout(500);
check('reading it on its page is enough for the day', await p.locator('.df').count() === 0);

/* ---- the same rule reaches every other card object on the site ---- */
await p.goto(base + 'fortuna.html', { waitUntil: 'networkidle' });
await p.waitForTimeout(400);
check('the fortune page card is a card too',
      await p.locator('#ck-art').evaluate(n => n.classList.contains('is-3d')));
check('and it has a back', await p.locator('#ck-art .face').count() === 2);

await p.goto(base + 'horoscopo.html', { waitUntil: 'networkidle' });
await p.click('.sign');
await p.waitForTimeout(500);
/* addressed by data-turn, not by .art: the card drawing has a group of its own
   by that name inside it */
const arts = p.locator('.slot [data-turn]');
check('the three cards of the day are cards',
      await arts.count() === 3 &&
      await arts.evaluateAll(ns => ns.every(n => n.classList.contains('is-3d'))),
      await arts.count());
check('and each of them has a back', await p.locator('.slot [data-turn] .face').count() === 6);

await ctx.close();
await b.close();
server.close();

if (errs.length) { fail += errs.length; console.log('THREW\n  ' + errs.join('\n  ')); }
console.log(fail ? `\n${fail} failed, ${pass} passed` : `\nthe daily fortune, ${pass} checks green`);
process.exit(fail ? 1 : 0);
