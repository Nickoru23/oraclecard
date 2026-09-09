/* Every page in every language: it answers, it has content, every string is
   lettered, nothing throws, and nothing is asked of another server.
   That last one is rule 3, and it is why the site carries no consent banner. */
import { chromium } from 'playwright';
import { serve } from './serve.mjs';
import { PAGES, LANGS, BASE, PREP, addr } from './pages.mjs';

const server = await serve();
const browser = await chromium.launch();
const foreign = new Set();
let fails = 0;

for (const lang of LANGS) {
  const ctx = await browser.newContext();
  await ctx.addInitScript(PREP);
  await ctx.route('**/*', r => {
    const u = r.request().url();
    if (u.startsWith(BASE) || u.startsWith('data:') || u.startsWith('blob:')) return r.continue();
    foreign.add(new URL(u).host);
    return r.abort();
  });
  for (const p of PAGES) {
    const page = await ctx.newPage();
    const errs = [];
    page.on('pageerror', e => errs.push('threw: ' + e.message));
    page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    const resp = await page.goto(BASE.replace(/\/$/, '') + addr(p, lang), { waitUntil: 'networkidle' });
    await page.waitForTimeout(250);
    const thin = await page.evaluate(() => (document.body.innerText || '').trim().length < 40);
    const blank = await page.evaluate(() =>
      [...document.querySelectorAll('[data-t]')]
        .filter(e => !e.textContent.trim() && !e.children.length)
        .map(e => e.getAttribute('data-t')).slice(0, 6));
    const real = errs.filter(e => !/net::ERR_FAILED|Failed to load resource/i.test(e));

    /* The document's own shape. A page can letter every string and still be a
       wall to anyone not using a mouse, so the landmarks are checked here
       rather than left to be noticed. */
    const shape = await page.evaluate(() => {
      const skip = document.querySelector('a.skip');
      const main = document.querySelector('main');
      const heads = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].map(h => +h.tagName[1]);
      const skips = heads.filter((l, i) => i && l - heads[i - 1] > 1).length;
      return {
        mains: document.querySelectorAll('main').length,
        h1s: heads.filter(l => l === 1).length,
        levelSkips: skips,
        /* the point of it is that it comes before everything, so that is what
           is asked: the first thing the tab key reaches is the way past */
        skipFirst: document.querySelector(
          'a[href],button,input,select,textarea,[tabindex]:not([tabindex="-1"])') === skip,
        skipTarget: !!skip && !!main && skip.getAttribute('href') === '#' + main.id,
        skipNamed: !!skip && !!skip.textContent.trim(),
        titled: !!document.title.trim() && document.title !== 'The Witch Atelier',
        described: !!document.querySelector('meta[name=description]') ||
                   !!document.querySelector('meta[name=robots][content*=noindex]'),
      };
    });
    const shapeBad = shape.mains !== 1 || shape.h1s !== 1 || shape.levelSkips ||
                     !shape.skipFirst || !shape.skipTarget || !shape.skipNamed ||
                     !shape.titled || !shape.described;

    const bad = resp.status() !== 200 || thin || real.length || blank.length || shapeBad;
    if (bad) fails++;
    console.log(`${bad ? 'FAIL' : 'ok  '} ${lang}/${p}` +
      (resp.status() !== 200 ? ` status=${resp.status()}` : '') +
      (thin ? ' EMPTY' : '') +
      (blank.length ? ` unlettered=${JSON.stringify(blank)}` : '') +
      (real.length ? ` errors=${JSON.stringify(real.slice(0, 2))}` : '') +
      (shapeBad ? ` shape=${JSON.stringify(shape)}` : ''));
    await page.close();
  }
  await ctx.close();
}

/* The navigation on a phone, opened.

   This is here because it broke in a way no file check could see. The menu
   panel hung outside the header and filtered its own backdrop while the header
   above it filtered its backdrop too, and Chrome composited the two in an
   order that did not match either z-index: every pointer test said the menu
   was on top, and the page underneath painted straight through it. So this
   opens the menu and asks what is actually drawn at five points down the
   panel, rather than asking what the stylesheet says. */
for (const lang of LANGS) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 },
                                         isMobile: true, hasTouch: true });
  await ctx.addInitScript(PREP);
  const page = await ctx.newPage();
  await page.goto(BASE.replace(/\/$/, '') + addr('index.html', lang), { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
  await page.evaluate(() => { const n = document.querySelector('.privacy-notice'); if (n) n.remove(); });
  const btn = await page.$('.menu-btn');
  if (!btn) { fails++; console.log(`FAIL ${lang} has no menu button at 390px`); }
  else {
    await btn.click();
    await page.waitForTimeout(350);
    const m = await page.evaluate(() => {
      const nav = document.querySelector('.nav nav'), box = nav.getBoundingClientRect();
      const cs = getComputedStyle(nav);
      const through = [.15, .3, .45, .6, .75]
        .map(f => document.elementFromPoint(box.left + box.width / 2, box.top + box.height * f))
        .filter(el => !el || !nav.contains(el))
        .map(el => (el ? el.tagName + (typeof el.className === 'string' && el.className
                      ? '.' + el.className.trim().split(/\s+/).join('.') : '') : 'nothing'));
      return { links: nav.querySelectorAll('a').length, through,
               opaque: !/rgba\([^)]*,\s*0?\.\d+\)/.test(cs.backgroundColor),
               filtered: cs.backdropFilter !== 'none' };
    });
    const menuBad = m.through.length || !m.opaque || m.filtered || m.links !== 6;
    if (menuBad) fails++;
    console.log(`${menuBad ? 'FAIL' : 'ok  '} ${lang} menu on a phone, ${m.links} links` +
      (m.through.length ? ` PAGE SHOWS THROUGH: ${m.through.join(', ')}` : '') +
      (!m.opaque ? ' panel is not opaque' : '') +
      (m.filtered ? ' panel filters its backdrop inside a header that already does' : ''));
  }
  await ctx.close();
}

await browser.close(); server.close();
if (foreign.size) { fails++; console.log('\nTHIRD PARTY HOSTS ASKED FOR:', [...foreign].join(', ')); }
else console.log('\nnothing asked of any third party');
console.log(fails ? `\n${fails} failed` : '\nall pages clean');
process.exit(fails ? 1 : 0);
