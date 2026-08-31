/* The cards as objects, and the optional illustrations over them.

   The first half needs nothing but the site. The second half makes its own
   pictures, checks that a card prefers one and falls back to its drawing when
   one is missing, then puts everything back, so it passes whether or not any
   illustrations have been added. */
import { chromium } from 'playwright';
import { serve } from './serve.mjs';
import { writeFile, mkdir, rm, readFile } from 'node:fs/promises';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const server = await serve();
const b=await chromium.launch();
const p=await (await b.newContext({viewport:{width:1280,height:900}})).newPage();
const errs=[];
/* A resource that fails to load is expected here: one picture is broken on
   purpose to prove the fallback. Script faults are not, and neither is a
   failed assertion, so those are what decide the exit code. */
p.on('pageerror', e => errs.push('threw: ' + e.message));
p.on('console', m => {
  if (m.type() !== 'error') return;
  if (/Failed to load resource/i.test(m.text())) return;
  errs.push(m.text());
});
await p.goto('http://127.0.0.1:4321/index.html',{waitUntil:'networkidle'});
await p.locator('.privacy-notice .btn').click().catch(()=>{}); await p.waitForTimeout(400);

const T=(n,c,g)=>{ if(!c) errs.push('FAIL '+n); console.log((c?'ok  ':'FAIL')+'  '+n+(c?'':'  '+JSON.stringify(g))); };
T('deck cells are 3d', await p.locator('.deck-cell.is-3d').count()===78, await p.locator('.deck-cell.is-3d').count());
T('hero fan is 3d', await p.locator('.hero-fan .f.is-3d').count()===5);

// hover tilt on a deck cell
const cell = p.locator('.deck-cell').nth(10);
await cell.scrollIntoViewIfNeeded();
const box = await cell.boundingBox();
await p.mouse.move(box.x+box.width*0.15, box.y+box.height*0.15);
await p.waitForTimeout(450);
const tilt = await cell.evaluate(el => ({rx:el.style.getPropertyValue('--rx'),ry:el.style.getPropertyValue('--ry'),
                                          mx:el.style.getPropertyValue('--mx')}));
T('tilts toward the pointer', parseFloat(tilt.rx)>1 && parseFloat(tilt.ry)<-1, tilt);
/* the variable moving is not the same as the card moving: a page level rule
   that sets transform whole would throw the rotation away and leave the
   variable looking perfectly healthy. So read what was actually rendered. */
const m3d = await cell.evaluate(el => getComputedStyle(el).transform);
T('and the rendered transform is really 3d',
  m3d.startsWith('matrix3d') && m3d.split(',').slice(0,11).some(v => {
    const n = parseFloat(v.replace('matrix3d(','')); return Math.abs(n) > 0.02 && Math.abs(n) < 0.999;
  }), m3d);
T('the sheen follows it', tilt.mx && parseFloat(tilt.mx)<45, tilt.mx);

// leaving returns it to square
await p.mouse.move(10,10); await p.waitForTimeout(700);
const rest = await cell.evaluate(el => Math.abs(parseFloat(el.style.getPropertyValue('--rx')||0)));
T('returns to rest', rest < 1, rest);

// drag spins it
await p.mouse.move(box.x+box.width/2, box.y+box.height/2);
await p.mouse.down();
await p.mouse.move(box.x+box.width/2+160, box.y+box.height/2+40,{steps:12});
const spun = await cell.evaluate(el => parseFloat(el.style.getPropertyValue('--ry')||0));
T('drag spins it', Math.abs(spun) > 40, spun);
T('dragging selects no text', (await p.evaluate(() => String(getSelection()))).length === 0,
  await p.evaluate(() => String(getSelection()).slice(0, 60)));
await p.mouse.up(); await p.waitForTimeout(1900);
const settled = await cell.evaluate(el => Math.abs(parseFloat(el.style.getPropertyValue('--ry')||0)));
T('a thrown card settles', settled < 2, settled);

// keyboard
await cell.focus();
await p.keyboard.press('ArrowRight'); await p.keyboard.press('ArrowRight'); await p.waitForTimeout(500);
const keyed = await cell.evaluate(el => parseFloat(el.style.getPropertyValue('--ry')||0));
T('arrow keys turn it', keyed > 20, keyed);
await p.keyboard.press('Escape'); await p.waitForTimeout(600);
T('escape brings it back', Math.abs(await cell.evaluate(el=>parseFloat(el.style.getPropertyValue('--ry')||0)))<1);

// the spread: a card must still flip front to back
await p.locator('a[href="#tiradas"]').first().click(); await p.waitForTimeout(400);
await p.locator('#sp-draw').click(); await p.waitForTimeout(600);
T('picker cards are 3d', await p.locator('.picker-card.is-3d').count()===22);
await p.locator('.picker-card').first().click(); await p.waitForTimeout(1800);
const flipped = await p.locator('#sp-out .card.flipped').count();
T('the drawn card turns over', flipped===1, flipped);
const flipVar = await p.locator('#sp-out .card').first().evaluate(el=>getComputedStyle(el).getPropertyValue('--flip').trim());
T('the flip composes with the tilt', flipVar==='180deg', flipVar);
await p.waitForTimeout(300);

/* ---------- the illustrations ---------- */
let fails = 0;
const restore = await readFile(join(ROOT, 'js/card-images.js'), 'utf8');
const HAVE = ['m00', 'm01', 'm19'];
try {
  await mkdir(join(ROOT, 'cards/t'), { recursive: true });
  await mkdir(join(ROOT, 'cards/f'), { recursive: true });
  const webp = await p.evaluate(() => {
    const cv = document.createElement('canvas');
    cv.width = 60; cv.height = 102;
    const cx = cv.getContext('2d');
    cx.fillStyle = '#16314F'; cx.fillRect(0, 0, 60, 102);
    return cv.toDataURL('image/webp', .8);
  });
  if (!webp.startsWith('data:image/webp')) throw new Error('this browser cannot encode webp');
  const bytes = Buffer.from(webp.split(',')[1], 'base64');
  for (const id of HAVE) for (const d of ['t', 'f'])
    await writeFile(join(ROOT, 'cards', d, id + '.webp'), bytes);
  await writeFile(join(ROOT, 'js/card-images.js'),
    restore.replace(/HAVE: \[[^\]]*\]/, 'HAVE: ' + JSON.stringify(HAVE)));

  await p.goto('http://127.0.0.1:4321/index.html', { waitUntil: 'networkidle' });
  await p.locator('.privacy-notice .btn').click().catch(() => {});
  await p.waitForTimeout(400);

  T('three cards take a picture', await p.locator('.deck-cell img.card-img').count() === 3,
    await p.locator('.deck-cell img.card-img').count());
  T('the rest keep their drawing', await p.locator('.deck-cell svg').count() === 75,
    await p.locator('.deck-cell svg').count());
  T('pictures load lazily', await p.locator('img.card-img').first().getAttribute('loading') === 'lazy');
  T('pictures are named for a screen reader',
    (await p.locator('img.card-img').first().getAttribute('alt') || '').length > 2);

  /* a lazy picture that never started loading cannot fail, so bring it on screen first */
  await p.locator('.deck-cell img.card-img').first().scrollIntoViewIfNeeded();
  await p.waitForTimeout(500);
  await p.evaluate(() => { document.querySelector('.deck-cell img.card-img').src = '/cards/t/gone.webp'; });
  await p.waitForTimeout(900);
  T('a missing picture falls back to its drawing', await p.locator('.deck-cell svg').count() === 76,
    await p.locator('.deck-cell svg').count());
} finally {
  await writeFile(join(ROOT, 'js/card-images.js'), restore);
  await rm(join(ROOT, 'cards'), { recursive: true, force: true });
}

console.log('errors:', errs.length ? errs.slice(0, 4) : 'none');
await b.close(); server.close();
process.exit(errs.length ? 1 : 0);
