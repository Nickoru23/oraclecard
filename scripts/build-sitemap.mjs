/* The sitemap and robots.txt.

   Every public page exists at three addresses, one per language, and each one
   has to name the other two or a search engine reads them as three thin copies
   of the same page rather than one page in three languages.

   Generated rather than typed, because it is 27 URLs with 108 alternate links
   between them and nobody keeps that right by hand. Run `npm run sitemap` after
   adding or removing a page; qa:langs fails if the committed file has fallen
   behind. */
import { writeFileSync } from 'node:fs';
import { LANGS } from './pages.mjs';

export const SITE = 'https://thewitchatelier.com';

/* What belongs in an index. The review desk is private, and the page after
   payment needs a session to mean anything, so neither is here and both say so
   in their own markup. */
export const PUBLIC = [
  '/', '/fortuna.html', '/horoscopo.html', '/consulta.html', '/lectura.html',
  '/creditos.html', '/aviso-legal.html', '/privacidad.html', '/cookies.html',
];

export const address = (path, lang) =>
  lang === 'es' ? path : '/' + lang + (path === '/' ? '' : path);

export function sitemap() {
  const url = (path, lang) => {
    const alts = LANGS.map(l =>
      `    <xhtml:link rel="alternate" hreflang="${l}" href="${SITE}${address(path, l)}"/>`)
      .concat(`    <xhtml:link rel="alternate" hreflang="x-default" href="${SITE}${address(path, 'es')}"/>`);
    return `  <url>\n    <loc>${SITE}${address(path, lang)}</loc>\n${alts.join('\n')}\n  </url>`;
  };
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${PUBLIC.flatMap(p => LANGS.map(l => url(p, l))).join('\n')}
</urlset>
`;
}

export function robots() {
  return `# The Witch Atelier
# Every page is at three addresses, one per language. They are all in the
# sitemap, each one naming the other two.

User-agent: *
Allow: /
Disallow: /atelier.html
Disallow: /gracias.html
Disallow: /en/atelier.html
Disallow: /de/atelier.html
Disallow: /en/gracias.html
Disallow: /de/gracias.html

Sitemap: ${SITE}/sitemap.xml
`;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const root = new URL('..', import.meta.url);
  writeFileSync(new URL('sitemap.xml', root), sitemap());
  writeFileSync(new URL('robots.txt', root), robots());
  console.log(`sitemap.xml: ${PUBLIC.length} pages in ${LANGS.length} languages, ${PUBLIC.length * LANGS.length} addresses`);
  console.log('robots.txt: written');
}
