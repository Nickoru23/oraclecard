/* Turn a folder of card illustrations into the two WebP sets the site serves.

     scripts/build-cards.mjs  [source folder]      default: cards-src/

   Source files are named by card id, so m00.jpg is The Fool and p14.png is the
   King of Pentacles. Anything not named after a card in the deck is reported
   and skipped, which is the quickest way to catch a typo in 78 filenames.

   It writes:
     cards/t/<id>.webp   200px wide, for the grid and the picker
     cards/f/<id>.webp   600px wide, for a card opened on its own
     js/card-images.js   with HAVE filled in, so the site starts using them

   The conversion runs in the Chromium that Playwright already installs, so
   this adds no dependency: the image is drawn to a canvas and read back as
   WebP. Any card with no source file keeps its drawn SVG face.             */

import { chromium } from 'playwright';
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { join, extname, basename } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const SRC = join(ROOT, process.argv[2] || 'cards-src');
const SIZES = { t: 200, f: 600 };
const QUALITY = 0.82;

const deck = await (async () => {
  const src = await readFile(join(ROOT, 'js/deck.js'), 'utf8');
  const w = {}; new Function('window', src)(w); return w.DECK;
})();
const ids = new Set(deck.map(c => c.id));

let files = [];
try { files = await readdir(SRC); } catch {
  console.error(`no source folder at ${SRC}\n` +
    'Put the illustrations there, one per card, named by card id: m00.jpg, w01.png, and so on.');
  process.exit(1);
}
const usable = files.filter(f => /\.(jpe?g|png|webp|avif)$/i.test(f));
const unknown = usable.filter(f => !ids.has(basename(f, extname(f))));
if (unknown.length) console.log('skipped, not a card id:', unknown.join(', '));

const work = usable.filter(f => ids.has(basename(f, extname(f))));
if (!work.length) { console.error('nothing to convert'); process.exit(1); }

for (const dir of Object.keys(SIZES)) await mkdir(join(ROOT, 'cards', dir), { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage();
const done = [];

for (const file of work) {
  const id = basename(file, extname(file));
  const bytes = await readFile(join(SRC, file));
  const dataUri = `data:image/${extname(file).slice(1).replace('jpg', 'jpeg')};base64,${bytes.toString('base64')}`;
  for (const [dir, width] of Object.entries(SIZES)) {
    const out = await page.evaluate(async ([uri, w, q]) => {
      const img = new Image();
      await new Promise((ok, no) => { img.onload = ok; img.onerror = () => no(new Error('decode')); img.src = uri; });
      const cv = document.createElement('canvas');
      cv.width = w; cv.height = Math.round(w * img.height / img.width);
      const cx = cv.getContext('2d');
      cx.imageSmoothingQuality = 'high';
      cx.drawImage(img, 0, 0, cv.width, cv.height);
      return cv.toDataURL('image/webp', q);
    }, [dataUri, width, QUALITY]);
    if (!out.startsWith('data:image/webp')) {
      console.error(`${id}: this browser did not encode WebP`); process.exit(1);
    }
    await writeFile(join(ROOT, 'cards', dir, id + '.webp'),
                    Buffer.from(out.split(',')[1], 'base64'));
  }
  done.push(id);
  process.stdout.write(`\r${done.length}/${work.length} converted`);
}
await browser.close();

const manifest = await readFile(join(ROOT, 'js/card-images.js'), 'utf8');
await writeFile(join(ROOT, 'js/card-images.js'),
  manifest.replace(/HAVE: \[[^\]]*\]/, 'HAVE: ' + JSON.stringify(done.sort())));

const missing = deck.map(c => c.id).filter(id => !done.includes(id));
console.log(`\n${done.length} cards have pictures, ${missing.length} keep their drawing`);
if (missing.length) console.log('still drawn:', missing.join(' '));
