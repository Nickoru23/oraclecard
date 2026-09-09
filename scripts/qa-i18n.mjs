/* Rule 6: the three languages stay at parity. Every key in one is in all three,
   and none of them is empty. Runs without a browser. */
import { readFileSync } from 'node:fs';

const src = readFileSync(new URL('../js/i18n.js', import.meta.url), 'utf8');
const window = {};
new Function('window', src)(window);
const T = window.T, langs = Object.keys(T);

let fails = 0;
const all = new Set(langs.flatMap(l => Object.keys(T[l])));
for (const l of langs) {
  const missing = [...all].filter(k => !(k in T[l]));
  const empty = Object.keys(T[l]).filter(k => {
    const v = T[l][k];
    return v === '' || v === null || v === undefined ||
           (Array.isArray(v) && (!v.length || v.some(x => !String(x).trim())));
  });
  if (missing.length) { fails++; console.log(`FAIL ${l} missing: ${missing.join(', ')}`); }
  if (empty.length) { fails++; console.log(`FAIL ${l} empty: ${empty.join(', ')}`); }
  if (!missing.length && !empty.length) console.log(`ok   ${l}, ${Object.keys(T[l]).length} keys`);
}
console.log(fails ? `\n${fails} failed` : `\nthree languages at parity, ${all.size} keys each`);
process.exit(fails ? 1 : 0);
