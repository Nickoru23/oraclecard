/* Every page in every language: it answers, it has content, every string is
   lettered, nothing throws, and nothing is asked of another server.
   That last one is rule 3, and it is why the site carries no consent banner. */
import { chromium } from 'playwright';
import { serve } from './serve.mjs';
import { PAGES, LANGS, BASE, PREP } from './pages.mjs';

const server = await serve();
const browser = await chromium.launch();
const foreign = new Set();
let fails = 0;

for (const lang of LANGS) {
  const ctx = await browser.newContext();
  await ctx.addInitScript(PREP, lang);
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
    const resp = await page.goto(BASE + p, { waitUntil: 'networkidle' });
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

await browser.close(); server.close();
if (foreign.size) { fails++; console.log('\nTHIRD PARTY HOSTS ASKED FOR:', [...foreign].join(', ')); }
else console.log('\nnothing asked of any third party');
console.log(fails ? `\n${fails} failed` : '\nall pages clean');
process.exit(fails ? 1 : 0);
