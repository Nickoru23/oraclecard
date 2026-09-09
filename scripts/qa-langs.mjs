/* The language lives in the address.

   /lectura.html is English, /es/lectura.html is Spanish, /de/lectura.html is
   German. All three are the same file, rewritten by netlify.toml, and the
   language is read back off the path.

   What this holds to is the promise that makes it worth doing: a link opens in
   the language it was sent in. So every address has to serve the language it
   names, agree with its own canonical, name its two alternates, and never
   quietly move somebody somewhere else. */
import { chromium } from 'playwright';
import { serve } from './serve.mjs';
import { PAGES, LANGS, BASE, PREP, addr, DEFAULT } from './pages.mjs';
import { sitemap, robots, PUBLIC, SITE, address } from './build-sitemap.mjs';
import { readFileSync } from 'node:fs';

const ROOT = new URL('..', import.meta.url);
const server = await serve();
const b = await chromium.launch();
const origin = BASE.replace(/\/$/, '');
let pass = 0, fail = 0;
const check = (name, cond, got) => {
  cond ? pass++ : (fail++, console.log('FAIL', name, got === undefined ? '' : JSON.stringify(got)));
};

/* The reader's locale is the default language's, so that the front door, which
   is the one address that adapts to the reader, stays where it is put for the
   sweep. It has its own check below. Derived rather than named: pinning this to
   Spanish was right while Spanish was the default and silently wrong the moment
   it was not. */
const LOCALE = { es: 'es-ES', en: 'en-GB', de: 'de-DE' };
const ctx = await b.newContext({ locale: LOCALE[DEFAULT] });
await ctx.addInitScript(PREP);
const p = await ctx.newPage();
const errs = [];
p.on('pageerror', e => errs.push(e.message));

/* ---- every page answers in the language its address names ---- */
/* Two pages are not addressable and say so themselves. The review desk is
   private and carries no scripts at all. The page after payment needs a session
   to mean anything and sends anyone without one back to the form, which it does
   in the language they were reading, and that is checked on its own below. */
const ADDRESSED = PAGES.filter(p => p !== 'atelier.html' && p !== 'gracias.html');
for (const lang of LANGS) {
  for (const page of ADDRESSED) {
    const path = addr(page, lang);
    const resp = await p.goto(origin + path, { waitUntil: 'networkidle' });
    await p.waitForTimeout(120);
    const seen = await p.evaluate(() => ({
      lang: document.documentElement.lang,
      here: location.pathname,
      canon: (document.querySelector('link[rel=canonical]') || {}).href,
      alts: [...document.querySelectorAll('link[rel=alternate]')]
              .map(l => l.hreflang + ' ' + l.getAttribute('href')),
    }));
    const want = LANGS.map(l => l + ' ' + location0(path, l))
                      .concat('x-default ' + location0(path, DEFAULT));
    const ok = resp.status() === 200 &&
               seen.lang === lang &&
               seen.here === path &&
               seen.canon === location0(path, lang) &&
               String(seen.alts) === String(want);
    if (!ok) {
      fail++;
      console.log(`FAIL ${path} ${JSON.stringify({ status: resp.status(), ...seen })}`);
      console.log(`     wanted lang=${lang} canonical=${location0(path, lang)}`);
    } else pass++;
  }
}
function location0(path, lang) {
  const prefixed = LANGS.filter(l => l !== DEFAULT).join('|');
  const bare = path.replace(new RegExp('^/(' + prefixed + ')(?=/|$)'), '')
                   .replace(/\/index\.html$/, '/') || '/';
  return origin + (lang === DEFAULT ? bare : '/' + lang + (bare === '/' ? '' : bare));
}
console.log(`ok   ${ADDRESSED.length} pages answered at ${LANGS.length} addresses each`);

/* ---- a deep link opens where it was sent, whatever the reader prefers ---- */
for (const locale of ['de-DE', 'en-GB', 'es-ES']) {
  const c = await b.newContext({ locale });
  await c.addInitScript(PREP);
  const q = await c.newPage();
  await q.goto(origin + '/lectura.html', { waitUntil: 'networkidle' });
  await q.waitForTimeout(300);
  check(`a root deep link stays ${DEFAULT} for a ${locale} reader`,
        new URL(q.url()).pathname === '/lectura.html' &&
        await q.evaluate(() => document.documentElement.lang) === DEFAULT,
        new URL(q.url()).pathname + ' ' + await q.evaluate(() => document.documentElement.lang));
  await q.goto(origin + '/es/lectura.html', { waitUntil: 'networkidle' });
  await q.waitForTimeout(300);
  check(`a Spanish deep link stays Spanish for a ${locale} reader`,
        new URL(q.url()).pathname === '/es/lectura.html' &&
        await q.evaluate(() => document.documentElement.lang) === 'es');
  await c.close();
}

/* ---- the front door is the one place that adapts ---- */
{
  const c = await b.newContext({ locale: 'de-DE' });
  await c.addInitScript(PREP);
  const q = await c.newPage();
  await q.goto(origin + '/', { waitUntil: 'networkidle' });
  await q.waitForTimeout(400);
  check('the front door meets a German reader in German',
        new URL(q.url()).pathname === '/de', new URL(q.url()).pathname);
  await c.close();
}

/* ---- choosing a language moves the address, and stays on the same page ---- */
await p.goto(origin + '/consulta.html', { waitUntil: 'networkidle' });
await p.locator('.privacy-notice .btn').click().catch(() => {});
await p.click('.lang button[data-lang="de"]');
await p.waitForTimeout(600);
check('choosing a language changes the address',
      new URL(p.url()).pathname === '/de/consulta.html', new URL(p.url()).pathname);
check('and lands on the same page, in that language',
      await p.evaluate(() => document.documentElement.lang) === 'de');

/* ---- and every link out of it keeps the language ---- */
const hrefs = await p.$$eval('a[href^="/"]', as => as.map(a => a.getAttribute('href')));
const strayed = hrefs.filter(h =>
  !/^\/(css|js|api|cards|favicon|robots|sitemap)/.test(h) && !h.startsWith('/de'));
check('links out of a German page stay German', strayed.length === 0, strayed);
const assets = hrefs.filter(h => /^\/(css|favicon)/.test(h));
check('assets are still addressed from the root', assets.every(h => !h.startsWith('/de')), assets);

/* ---- the page after payment sends people back in their own language ---- */
for (const lang of LANGS) {
  await p.goto(origin + addr('gracias.html', lang), { waitUntil: 'networkidle' });
  await p.waitForTimeout(400);
  check(`a ${lang} thank you page with no session goes back to the ${lang} form`,
        new URL(p.url()).pathname === addr('lectura.html', lang), new URL(p.url()).pathname);
}

/* ---- the sitemap and robots.txt are what the generator would write ---- */
const onDisk = f => { try { return readFileSync(new URL(f, ROOT), 'utf8'); } catch { return null; } };
check('sitemap.xml is current, run npm run sitemap', onDisk('sitemap.xml') === sitemap());
check('robots.txt is current, run npm run sitemap', onDisk('robots.txt') === robots());

/* every public page really is public, and every address in it answers */
for (const path of PUBLIC) {
  for (const lang of LANGS) {
    const r = await p.goto(origin + address(path, lang), { waitUntil: 'domcontentloaded' });
    if (r.status() !== 200) { fail++; console.log(`FAIL sitemap lists ${address(path, lang)}, which answers ${r.status()}`); }
  }
}
pass++;
console.log(`ok   every one of the ${PUBLIC.length * LANGS.length} addresses in the sitemap answers`);

/* What is kept out of it says so itself. Read from the file rather than from a
   rendering: gracias.html sends a visitor with no session back to the form, so
   what a browser ends up showing is a different page's markup. */
for (const page of ['atelier.html', 'gracias.html']) {
  const src = onDisk(page) || '';
  const meta = (src.match(/<meta name="robots" content="([^"]*)"/) || [, ''])[1];
  check(`${page} is not in the sitemap and says noindex itself`,
        /noindex/.test(meta) && !PUBLIC.includes('/' + page), meta);
}
check('the sitemap names the site', sitemap().includes(SITE) && robots().includes(SITE + '/sitemap.xml'));

await b.close();
server.close();
if (errs.length) { fail += errs.length; console.log('THREW\n  ' + errs.join('\n  ')); }
console.log(fail ? `\n${fail} failed, ${pass} passed` : `\nthe language is in the address, ${pass} checks green`);
process.exit(fail ? 1 : 0);
