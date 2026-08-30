/* Every page in every language: it answers, it has content, every string is
   lettered, nothing throws, and nothing is asked of another server.
   That last one is rule 3, and it is why the site carries no consent banner. */
import { chromium } from 'playwright';
import { serve } from './serve.mjs';
import { PAGES, LANGS, BASE } from './pages.mjs';

const server = await serve();
const browser = await chromium.launch();
const foreign = new Set();
let fails = 0;

for (const lang of LANGS) {
  const ctx = await browser.newContext();
  await ctx.addInitScript(l => { try { localStorage.setItem('umbral.lang', l); } catch (e) {} }, lang);
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
    const bad = resp.status() !== 200 || thin || real.length || blank.length;
    if (bad) fails++;
    console.log(`${bad ? 'FAIL' : 'ok  '} ${lang}/${p}` +
      (resp.status() !== 200 ? ` status=${resp.status()}` : '') +
      (thin ? ' EMPTY' : '') +
      (blank.length ? ` unlettered=${JSON.stringify(blank)}` : '') +
      (real.length ? ` errors=${JSON.stringify(real.slice(0, 2))}` : ''));
    await page.close();
  }
  await ctx.close();
}

await browser.close(); server.close();
if (foreign.size) { fails++; console.log('\nTHIRD PARTY HOSTS ASKED FOR:', [...foreign].join(', ')); }
else console.log('\nnothing asked of any third party');
console.log(fails ? `\n${fails} failed` : '\nall pages clean');
process.exit(fails ? 1 : 0);
