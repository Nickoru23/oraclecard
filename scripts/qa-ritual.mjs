/* The ledger, end to end: the three marks fire from the three pages, a day is
   kept only when all three are done, the streak survives a reload and a new
   day, and the sigils strike when they are earned. */
import { chromium } from 'playwright';
import { serve } from './serve.mjs';
import { BASE as base } from './pages.mjs';

const server = await serve();
const b = await chromium.launch();
const ctx = await b.newContext();
await ctx.route('**/*', r => r.request().url().startsWith(base) ? r.continue() : r.abort());
const p = await ctx.newPage();
const errs = [];
p.on('pageerror', e => errs.push('' + e));
const S = async () => p.evaluate(() => window.Ritual.get());

let pass = 0, fail = 0;
const check = (name, cond, got) => { cond ? pass++ : (fail++, console.log('FAIL', name, JSON.stringify(got))); };

await p.goto(base + 'index.html', { waitUntil: 'networkidle' });
check('starts empty', (await S()).kept === 0 && (await S()).streak === 0, await S());
check('rank 0 at start', (await S()).rank === 0);

// lay a spread from the front page
await p.click('#sp-draw');
await p.waitForTimeout(400);
let s = await S();
check('spread marked', s.done.spread === 1, s.done);
check('not complete on one task', s.complete === false, s.complete);
check('ledger shows one done', await p.locator('.ritual-row.is-done').count() === 1);

// the fortune cookie
await p.goto(base + 'galleta.html', { waitUntil: 'networkidle' });
await p.click('#cookie');
await p.waitForTimeout(500);
s = await S();
check('cookie marked', s.done.cookie === 1, s.done);

// the card of the day
await p.goto(base + 'horoscopo.html', { waitUntil: 'networkidle' });
await p.click('.sign');
await p.waitForTimeout(600);
s = await S();
check('card marked', s.done.card === 1, s.done);
check('day complete', s.complete === true, s);
check('day kept', s.kept === 1, s.kept);
check('streak 1', s.streak === 1, s.streak);
check('rank rose to 1', s.rank === 1, s.rank);
check('first_light struck', s.sigils.includes('first_light'), s.sigils);

// persistence across a reload
await p.goto(base + 'index.html', { waitUntil: 'networkidle' });
s = await S();
check('survives reload', s.kept === 1 && s.complete === true, s);
check('tally shows the streak', (await p.locator('[data-tally] b').textContent()) === '1');
check('all three rows done', await p.locator('.ritual-row.is-done').count() === 3);

// all four spreads earns the full table
for (const sp of ['three', 'yesno', 'love']) {
  await p.click(`.tab[data-sp="${sp}"]`);
  await p.click('#sp-draw');
  await p.waitForTimeout(250);
}
s = await S();
check('four spreads recorded', s.spreads.length === 4, s.spreads);
check('full_table struck', s.sigils.includes('full_table'), s.sigils);

// a language switch is recorded, and three earns a sigil
for (const l of ['es', 'en', 'de']) { await p.click(`.lang button[data-lang="${l}"]`); await p.waitForTimeout(200); }
s = await S();
check('three_tongues struck', s.sigils.includes('three_tongues'), s.sigils);
check('ledger relettered', (await p.locator('.ledger-day h3').textContent()).trim() === 'Heute',
      await p.locator('.ledger-day h3').textContent());

// a fresh day continues the streak rather than resetting it
await p.evaluate(() => {
  const s = JSON.parse(localStorage.getItem('twa_ritual'));
  const d = new Date(); d.setDate(d.getDate() - 1);
  const iso = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
  s.kept = [iso]; s.day = iso; s.done = { cookie:1, card:1, spread:1 };
  localStorage.setItem('twa_ritual', JSON.stringify(s));
});
await p.goto(base + 'index.html', { waitUntil: 'networkidle' });
s = await S();
check('new day clears the tasks', Object.keys(s.done).length === 0, s.done);
check('yesterday still holds the streak', s.streak === 1, s.streak);

check('no page errors', errs.length === 0, errs);
await b.close(); server.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
