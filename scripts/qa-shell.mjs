/* The header and the footer are copied into every page by hand.

   That is the cost of the no build step rule, and the rule is worth more than
   the cost. What it needs is something watching the copies, because a change to
   the navigation is eleven edits and the eleventh is the one that gets missed.
   Renaming one page in this project touched nine files.

   What is compared is the contract, not the bytes. Byte equality is the wrong
   instrument here: index links the deck as "#baraja" because the deck is on it,
   the older pages spell the copyright sign as an entity, and the legal pages
   have the brand drawing on one line. None of that is drift. A navigation item
   added to ten pages and missed on the eleventh is, and so is a link that has
   been pointed somewhere else on one page only.

   No browser: this reads the files. */
import { readFileSync } from 'node:fs';
import { PAGES } from './pages.mjs';

const REF = 'index.html';
const read = f => readFileSync(new URL('../' + f, import.meta.url), 'utf8');

const block = (src, from, to) => {
  const a = src.indexOf(from);
  if (a < 0) return null;
  const b = src.indexOf(to, a);
  return b < 0 ? null : src.slice(a, b + to.length);
};

/* A link is where it goes and which string it carries. The leading slash comes
   off an anchor only, because the page the anchor points into writes it without
   one and that is not a difference. */
const links = html => [...html.matchAll(/<a\s[^>]*href="([^"]+)"[^>]*>/g)].map(m => {
  const tag = m[0];
  const key = (tag.match(/data-t="([^"]+)"/) || [, ''])[1];
  return `${m[1].replace(/^\/(?=#)/, '')} ${key}`;
});

function shell(page) {
  const src = read(page);
  const head = block(src, '<header class="site">', '</div></header>');
  const foot = block(src, '<footer class="site">', '</footer>');
  return {
    head: head && {
      links: links(head),
      menu: /id="menu-btn"/.test(head),
      langs: [...head.matchAll(/data-lang="(\w+)"/g)].map(m => m[1]),
    },
    foot: foot && { links: links(foot) },
  };
}

/* Two pages are deliberately not the others, and the reason is worth keeping
   next to the exemption rather than in a commit message. */
const APART = {
  'atelier.html': 'the private review desk: no navigation, no footer, noindex',
  'gracias.html': 'the page after payment: brand only, so nothing competes with the reading',
};

const want = shell(REF);
let fails = 0;
const say = (page, what, a, b) => {
  fails++;
  console.log(`FAIL ${page} ${what}`);
  console.log(`     ${REF}: ${JSON.stringify(a)}`);
  console.log(`     ${page}: ${JSON.stringify(b)}`);
};

let checked = 0;
for (const page of PAGES) {
  if (page === REF) continue;
  if (APART[page]) { console.log(`skip ${page}, ${APART[page]}`); continue; }
  const got = shell(page);
  if (!got.head) { fails++; console.log(`FAIL ${page} has no header`); continue; }
  if (!got.foot) { fails++; console.log(`FAIL ${page} has no footer`); continue; }

  if (String(got.head.links) !== String(want.head.links))
    say(page, 'navigation differs', want.head.links, got.head.links);
  if (got.head.menu !== want.head.menu)
    say(page, 'menu button differs', want.head.menu, got.head.menu);
  if (String(got.head.langs) !== String(want.head.langs))
    say(page, 'language switch differs', want.head.langs, got.head.langs);
  if (String(got.foot.links) !== String(want.foot.links))
    say(page, 'footer links differ', want.foot.links, got.foot.links);
  checked++;
}

console.log(fails
  ? `\n${fails} difference${fails === 1 ? '' : 's'} between the copied shells`
  : `\nthe shell is the same in ${checked + 1} pages, ${want.head.links.length} navigation links and ${want.foot.links.length} in the footer`);
process.exit(fails ? 1 : 0);
