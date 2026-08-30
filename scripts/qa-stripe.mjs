/* The paid path, end to end, against a Stripe stand in.

   No network, no Stripe account, no charges and no Anthropic call: both are
   answered in process. What this proves is the part that is ours, the request
   shape Stripe is sent, the payment check, the held tiers, the order book, and
   above all that the generated reading survives a round trip through the
   session metadata intact. That last one is the expensive one to get wrong: a
   cache that silently truncates serves a cut off reading on every refresh, and
   a cache that silently fails bills a fresh generation every time. */

process.env.STRIPE_SECRET_KEY = 'sk_test_standin';
process.env.STRIPE_API_BASE = 'https://stripe.invalid/v1';
process.env.ANTHROPIC_API_KEY = 'sk-ant-standin';
process.env.SITE_URL = 'https://thewitchatelier.test';
process.env.OWNER_TOKEN = 'owner_token_for_the_test';
delete process.env.RESEND_API_KEY;

let pass = 0, fail = 0;
const ok = (name, cond, got) => {
  if (cond) { pass++; console.log('ok    ' + name); }
  else { fail++; console.log('FAIL  ' + name + (got === undefined ? '' : '  ' + JSON.stringify(got).slice(0, 300))); }
};

/* ---------- the stand ins ---------- */

const STRIPE = { sessions: new Map(), seq: 0, calls: [] };
let anthropicCalls = 0;

/* a reading the length the paid prompt actually asks for, 700 to 900 words */
const READING = (() => {
  const para = (n) => Array.from({ length: n }, (_, i) =>
    `Sentence ${i + 1} of a paragraph that runs at the length this reading is specified to run at, ` +
    'with enough words in it to carry the character count a real reading carries.').join(' ');
  return ['## The question', para(3), '## What the cards say', para(3), para(3), para(3), para(3),
          '## The knot', para(3), '## What the cards do not advise', para(2),
          '## What is yours to do', para(3), para(2)].join('\n');
})();

/* what the cache held before this was fixed, kept here so the regression stays
   named rather than implied */
const OLD_CACHE = 8 * 490;

const form = (s) => Object.fromEntries(new URLSearchParams(s));

globalThis.fetch = async (url, opt = {}) => {
  const u = String(url);
  const J = (o, st = 200) => new Response(JSON.stringify(o), {
    status: st, headers: { 'content-type': 'application/json' } });

  if (u.startsWith('https://api.anthropic.com/')) {
    anthropicCalls++;
    return J({ content: [{ type: 'text', text: READING }] });
  }

  if (u.startsWith('https://stripe.invalid/v1/')) {
    const path = u.slice('https://stripe.invalid/v1/'.length);
    STRIPE.calls.push({ path, method: opt.method || 'GET', body: opt.body });
    if (!String(opt.headers?.Authorization || '').startsWith('Bearer sk_'))
      return J({ error: { message: 'Invalid API Key provided' } }, 401);

    if (path === 'checkout/sessions' && opt.method === 'POST') {
      const f = form(opt.body);
      const id = 'cs_test_' + (++STRIPE.seq).toString().padStart(6, '0');
      const metadata = {};
      for (const [k, v] of Object.entries(f)) {
        const m = k.match(/^metadata\[(.+)\]$/);
        if (m) metadata[m[1]] = v;
      }
      const s = {
        id, object: 'checkout_session', created: Math.floor(Date.now() / 1000),
        payment_status: 'unpaid', status: 'open', metadata,
        amount_total: Number(f['line_items[0][price_data][unit_amount]']),
        currency: f['line_items[0][price_data][currency]'],
        customer_email: f.customer_email,
        customer_details: { email: f.customer_email },
        url: 'https://checkout.stripe.com/c/pay/' + id,
        raw: f,
      };
      STRIPE.sessions.set(id, s);
      return J(s);
    }

    const one = path.match(/^checkout\/sessions\/(cs_[A-Za-z0-9_]+)$/);
    if (one) {
      const s = STRIPE.sessions.get(one[1]);
      if (!s) return J({ error: { message: 'No such checkout session' } }, 404);
      if (opt.method === 'POST') {
        const f = form(opt.body);
        for (const [k, v] of Object.entries(f)) {
          const m = k.match(/^metadata\[(.+)\]$/);
          if (!m) continue;
          if (String(v).length > 500) return J({ error: { message: `metadata value for ${m[1]} exceeds 500 characters` } }, 400);
          s.metadata[m[1]] = v;
        }
        if (Object.keys(s.metadata).length > 50)
          return J({ error: { message: 'metadata has more than 50 keys' } }, 400);
      }
      return J(s);
    }

    if (path.startsWith('checkout/sessions?')) {
      const q = new URLSearchParams(path.split('?')[1]);
      const limit = Number(q.get('limit') || 10);
      const all = [...STRIPE.sessions.values()].reverse();          /* newest first */
      let from = 0;
      if (q.get('starting_after')) from = all.findIndex(s => s.id === q.get('starting_after')) + 1;
      const page = all.slice(from, from + limit);
      return J({ object: 'list', data: page, has_more: from + limit < all.length });
    }
    return J({ error: { message: 'unhandled path ' + path } }, 404);
  }
  throw new Error('unexpected fetch to ' + u);
};

/* env is read at module load, so the handlers are imported after it is set */
const checkout = (await import('../netlify/functions/checkout.mjs')).default;
const reading = (await import('../netlify/functions/reading.mjs')).default;
const orders = (await import('../netlify/functions/orders.mjs')).default;
const { CHUNK_COUNT, CHUNK_SIZE } = await import('../netlify/functions/lib/cache.mjs');

const post = (url, body) => new Request(url, {
  method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });

const QUESTION = 'I have been going back and forth about whether to leave the studio I helped '
  + 'start four years ago with Marta, and every time I decide to go something pulls me back in. '
  + 'I have already tried cutting my days down and it changed nothing at all about how I feel.';
const DRAWS = 'm01,c03R,s07,m17,p10';

const BUY = (over = {}) => ({
  name: 'Nico', email: 'nico@example.test', birth: '1990-04-12', sex: '-',
  lang: 'en', tier: 'now', draws: DRAWS, question: QUESTION, sign: 'aries', degree: 22, ...over });

/* ---------- the checkout request ---------- */

let r = await checkout(post('https://thewitchatelier.test/api/checkout', BUY()));
let j = await r.json();
ok('checkout answers 200', r.status === 200, r.status);
ok('checkout returns a url', typeof j.url === 'string' && j.url.includes('checkout.stripe.com'), j);

const sent = STRIPE.calls.find(c => c.path === 'checkout/sessions' && c.method === 'POST');
const f = form(sent.body);
ok('mode is payment', f.mode === 'payment', f.mode);
ok('price is the now tier, 2900', f['line_items[0][price_data][unit_amount]'] === '2900', f['line_items[0][price_data][unit_amount]']);
ok('currency is eur', f['line_items[0][price_data][currency]'] === 'eur', f['line_items[0][price_data][currency]']);
ok('quantity is one', f['line_items[0][quantity]'] === '1');
ok('success url carries the session placeholder',
   f.success_url === 'https://thewitchatelier.test/gracias.html?session_id={CHECKOUT_SESSION_ID}&lang=en', f.success_url);
ok('cancel url returns to the form', f.cancel_url === 'https://thewitchatelier.test/lectura.html', f.cancel_url);
ok('the buyer email is on the session', f.customer_email === 'nico@example.test');
ok('checkout is shown in the buyer language', f.locale === 'en');
ok('the draw is carried in metadata', f['metadata[draws]'] === DRAWS);
ok('the question is split across two keys',
   (f['metadata[q1]'] + f['metadata[q2]']) === QUESTION, f['metadata[q1]']);
ok('every metadata value is inside Stripe 500 char limit',
   Object.entries(f).filter(([k]) => k.startsWith('metadata[')).every(([, v]) => v.length <= 500));
ok('a deadline is stamped at purchase', !!Date.parse(f['metadata[due]']), f['metadata[due]']);

/* the tiers */
for (const [tier, cents] of [['slow', '900'], ['fast', '1900'], ['now', '2900']]) {
  STRIPE.calls.length = 0;
  await checkout(post('https://thewitchatelier.test/api/checkout', BUY({ tier })));
  const g = form(STRIPE.calls.find(c => c.method === 'POST').body);
  ok(`tier ${tier} charges ${cents}`, g['line_items[0][price_data][unit_amount]'] === cents,
     g['line_items[0][price_data][unit_amount]']);
}

/* what checkout must refuse */
const refuses = async (name, body, error) => {
  const res = await checkout(post('https://thewitchatelier.test/api/checkout', BUY(body)));
  const b = await res.json();
  ok(name, b.error === error, b);
};
await refuses('refuses a missing email', { email: '' }, 'bad_input');
await refuses('refuses a malformed birth date', { birth: '12/04/1990' }, 'bad_input');
await refuses('refuses a question under 80 chars', { question: 'too short' }, 'question_too_short');
await refuses('refuses a spread that is not five cards', { draws: 'm01,c03' }, 'bad_draw');
await refuses('refuses a tampered card id', { draws: 'm01,c03,ZZZ,m17,p10' }, 'bad_draw');
ok('refuses anything but POST',
   (await checkout(new Request('https://x.test/api/checkout'))).status === 405);

/* no key at all is a setup problem, and says so */
{
  const keep = process.env.STRIPE_SECRET_KEY;
  delete process.env.STRIPE_SECRET_KEY;
  const res = await checkout(post('https://thewitchatelier.test/api/checkout', BUY()));
  ok('without a key it reports stripe_not_configured', (await res.json()).error === 'stripe_not_configured');
  process.env.STRIPE_SECRET_KEY = keep;
}

/* ---------- the reading, after payment ---------- */

const buy = async (over = {}) => {
  STRIPE.calls.length = 0;
  const res = await checkout(post('https://thewitchatelier.test/api/checkout', BUY(over)));
  return (await res.json()).url.split('/').pop();
};
const get = (sid, extra = '') =>
  reading(new Request(`https://thewitchatelier.test/api/reading?session_id=${sid}${extra}`));

let sid = await buy();
ok('an unpaid session is refused', (await get(sid)).status === 402);

STRIPE.sessions.get(sid).payment_status = 'paid';
anthropicCalls = 0;
r = await get(sid); j = await r.json();
ok('a paid session gets a reading', r.status === 200 && j.reading === READING, r.status);
ok('the reading was written once', anthropicCalls === 1, anthropicCalls);
ok('five cards come back with it', j.draws?.length === 5, j.draws);
ok('the reversed card is marked', j.draws?.[1]?.rev === true, j.draws?.[1]);
ok('positions are lettered in the buyer language',
   j.draws?.[0]?.pos === 'The situation as it is', j.draws?.[0]?.pos);

/* the whole point of the cache */
ok(`a reading of ${READING.split(/\s+/).length} words is ${READING.length} chars, over the ${OLD_CACHE} the old cache held`,
   READING.length > OLD_CACHE, READING.length);
ok('and it fits the cache as sized now', READING.length <= CHUNK_COUNT * CHUNK_SIZE, READING.length);

anthropicCalls = 0;
r = await get(sid); j = await r.json();
ok('a refresh bills nothing', anthropicCalls === 0, anthropicCalls);
ok('a refresh serves the reading WHOLE, not truncated', j.reading === READING,
   { got: j.reading?.length, want: READING.length });
ok('the order keys survived the cache write',
   STRIPE.sessions.get(sid).metadata.draws === DRAWS && STRIPE.sessions.get(sid).metadata.tier === 'now');
ok('the cache stayed inside Stripe 50 key limit',
   Object.keys(STRIPE.sessions.get(sid).metadata).length <= 50,
   Object.keys(STRIPE.sessions.get(sid).metadata).length);

/* ---------- the held tiers ---------- */

const held = await buy({ tier: 'fast' });
STRIPE.sessions.get(held).payment_status = 'paid';
anthropicCalls = 0;
r = await get(held); j = await r.json();
ok('a held tier returns a receipt, not a reading', j.held === true && !j.reading, j);
ok('the receipt carries the deadline', !!Date.parse(j.due), j.due);
ok('a held tier writes nothing until a person releases it', anthropicCalls === 0, anthropicCalls);

r = await get(held, '&token=' + process.env.OWNER_TOKEN); j = await r.json();
ok('the review desk can make it appear', j.reading === READING, r.status);
r = await get(held, '&token=wrong'); j = await r.json();
ok('a wrong token still only sees the receipt', j.held === true, j);

/* ---------- the order book ---------- */

const list = async (token) => {
  const res = await orders(new Request(`https://thewitchatelier.test/api/orders?token=${token}`));
  return { status: res.status, body: await res.json().catch(() => null) };
};
ok('the order book is invisible without the token', (await list('nope')).status === 404);
let o = await list(process.env.OWNER_TOKEN);
ok('the order book lists paid orders only',
   o.body.pending.concat(o.body.done).length === 2, o.body.pending.concat(o.body.done).length);
ok('the held order is pending', o.body.pending.length === 1 && o.body.pending[0].tier === 'fast');
ok('the instant order is done', o.body.done.length === 1 && o.body.done[0].tier === 'now');
ok('a written order is marked written', o.body.done[0].written === true, o.body.done[0]);
ok('the question is on the order', o.body.done[0].question === QUESTION);

/* the pagination fix: a run of abandoned sessions must not push paid ones off */
const early = await buy();
STRIPE.sessions.get(early).payment_status = 'paid';
for (let i = 0; i < 140; i++) await buy();          /* 140 people who did not pay */
o = await list(process.env.OWNER_TOKEN);
const ids = o.body.pending.concat(o.body.done).map(x => x.id);
ok('a paid order 140 abandoned sessions back is still listed', ids.includes(early), ids.length);

console.log(fail ? `\n${fail} failed, ${pass} passed` : `\nall ${pass} checks passed`);
process.exit(fail ? 1 : 0);
