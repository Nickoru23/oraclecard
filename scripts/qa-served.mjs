/* What the host serves that is not the site.

   publish = "." is the whole repository. That is what keeps this project free
   of a build step, and the cost of it is that every file in the repository is
   a public URL unless something says otherwise. Without the deny rules in
   netlify.toml the site hands out its own server source, its test suite and its
   internal notes.

   So this walks the repository rather than the site: anything that is not part
   of what a visitor is meant to receive has to be denied, and adding a new
   script or a new note fails this until it is either denied or deliberately
   listed as public. No browser, no network. */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { LANGS, DEFAULT } from './pages.mjs';

const ROOT = new URL('..', import.meta.url).pathname;
const toml = readFileSync(join(ROOT, 'netlify.toml'), 'utf8');

/* what a visitor is meant to be able to fetch */
const PUBLIC_DIRS = ['css', 'js', 'cards', 'legacy'];
const PUBLIC_FILES = /\.html$|^favicon\.svg$|^robots\.txt$|^sitemap\.xml$/;
/* never in the deploy at all, so nothing to deny */
const NOT_DEPLOYED = ['node_modules', '.git', '.gitignore', 'dist-deploy', '.netlify'];

const denied = new Set(
  [...toml.matchAll(/from = "([^"]+)"\n\s*to = "[^"]*"\n\s*status = 404/g)].map(m => m[1]));

const PREFIXES = [''].concat(LANGS.filter(l => l !== DEFAULT).map(l => '/' + l));

let fails = 0;
const need = [];
for (const entry of readdirSync(ROOT)) {
  if (NOT_DEPLOYED.includes(entry)) continue;
  if (PUBLIC_DIRS.includes(entry)) continue;
  if (PUBLIC_FILES.test(entry)) continue;
  const dir = statSync(join(ROOT, entry)).isDirectory();
  need.push(dir ? `/${entry}/*` : `/${entry}`);
}

for (const path of need) {
  /* the root, and a prefix for every language that is not the default one */
  for (const prefix of PREFIXES) {
    const want = prefix + path;
    if (!denied.has(want)) {
      fails++;
      console.log(`FAIL ${want} is served to anyone who asks for it`);
      console.log('     add a 404 rule for it in netlify.toml, or list it as public in this check');
    }
  }
}

if (!fails) {
  console.log(`ok   ${need.length} paths denied, at the root and under each of the ${PREFIXES.length - 1} language prefixes`);
  console.log(`     ${need.join(' ')}`);
}
console.log(fails ? `\n${fails} things the host would hand out` : '\nthe host serves the site and nothing else');
process.exit(fails ? 1 : 0);
