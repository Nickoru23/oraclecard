/* Rule 4: no dashes reach the screen. Commas and full stops instead.
   A hyphen inside a word a language actually hyphenates is not a dash, so what
   this looks for is the dash characters themselves and a hyphen used as one. */
import { chromium } from 'playwright';
import { serve } from './serve.mjs';
import { PAGES, LANGS, BASE } from './pages.mjs';

const BAD = /[—–‒―]|(?:^|\s)-(?:\s|$)/;
const server = await serve();
const browser = await chromium.launch();
let bad = 0;

for (const lang of LANGS) {
  const ctx = await browser.newContext();
  await ctx.addInitScript(l => { try { localStorage.setItem('umbral.lang', l); } catch (e) {} }, lang);
  for (const p of PAGES) {
    const page = await ctx.newPage();
    await page.goto(BASE + p, { waitUntil: 'networkidle' });
    await page.waitForTimeout(200);
    const hits = await page.evaluate(pattern => {
      const re = new RegExp(pattern);
      const out = [];
      const SKIP = { SCRIPT: 1, STYLE: 1, TEMPLATE: 1, NOSCRIPT: 1, SVG: 1 };
      const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
        acceptNode(n) {
          for (let el = n.parentElement; el; el = el.parentElement) {
            if (SKIP[el.tagName]) return NodeFilter.FILTER_REJECT;
            if (el.hidden || el.getAttribute('aria-hidden') === 'true') return NodeFilter.FILTER_REJECT;
          }
          return NodeFilter.FILTER_ACCEPT;
        },
      });
      for (let n = walk.nextNode(); n; n = walk.nextNode()) {
        const s = (n.nodeValue || '').trim();
        if (s && re.test(s)) out.push(s.slice(0, 90));
      }
      return out;
    }, BAD.source);
    if (hits.length) {
      bad += hits.length;
      console.log(`DASH ${lang}/${p}`);
      for (const h of new Set(hits)) console.log('      ' + h);
    }
    await page.close();
  }
  await ctx.close();
}

await browser.close(); server.close();
console.log(bad ? `\n${bad} dashes reached the screen` : '\nno dashes reached the screen');
process.exit(bad ? 1 : 0);
