/* GET  /api/orders?token=…            the review desk's list of paid readings
   POST /api/orders?token=…            mark one as sent  { session_id }

   There is no database on this site, and there does not need to be one: every
   paid reading already exists as a Stripe Checkout Session carrying its own
   metadata, so Stripe is the order book. This reads it back.

   Guarded by OWNER_TOKEN. Without that variable set the endpoint does not
   exist at all, which is the right default for something that lists customer
   questions and email addresses. */

import { isWritten } from './lib/cache.mjs';

const API = (process.env.STRIPE_API_BASE || 'https://api.stripe.com/v1').replace(/\/$/, '');

const json = (b, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { 'content-type': 'application/json' } });

/* compare in constant time so the token cannot be guessed a character at a
   time by watching how long the answer takes */
function same(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

async function stripe(path, key, body) {
  const r = await fetch(`${API}/${path}`, {
    method: body ? 'POST' : 'GET',
    headers: {
      Authorization: `Bearer ${key}`,
      ...(body ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
    },
    ...(body ? { body } : {}),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j?.error?.message || 'stripe_error');
  return j;
}

export default async function handler(req) {
  const want = process.env.OWNER_TOKEN;
  const url = new URL(req.url);
  if (!want || !same(url.searchParams.get('token') || '', want)) {
    return new Response('Not found', { status: 404 });
  }

  const skey = process.env.STRIPE_SECRET_KEY;
  if (!skey) return json({ error: 'stripe_not_configured' }, 500);

  try {
    if (req.method === 'POST') {
      const b = await req.json();
      const sid = String(b.session_id || '');
      if (!/^cs_[A-Za-z0-9_]+$/.test(sid)) return json({ error: 'bad_session' }, 400);
      const body = new URLSearchParams();
      body.append('metadata[sent]', '1');
      body.append('metadata[sent_at]', new Date().toISOString());
      await stripe(`checkout/sessions/${sid}`, skey, body.toString());
      return json({ ok: true });
    }

    /* Stripe lists sessions newest first and counts the abandoned ones, so a
       single page of 50 quietly drops older paid orders behind a run of people
       who opened checkout and left. Walk the pages instead. */
    const sessions = [];
    let after = '';
    for (let page = 0; page < 10; page++) {
      const j = await stripe(`checkout/sessions?limit=100${after ? `&starting_after=${after}` : ''}`, skey);
      const batch = j.data || [];
      sessions.push(...batch);
      if (!j.has_more || !batch.length) break;
      after = batch[batch.length - 1].id;
    }

    const orders = sessions
      .filter(s => s.payment_status === 'paid')
      .map(s => {
        const m = s.metadata || {};
        const written = isWritten(m);
        return {
          id: s.id,
          created: s.created,
          amount: s.amount_total,
          currency: s.currency,
          email: s.customer_details?.email || s.customer_email || '',
          name: m.name || '',
          lang: m.lang || 'es',
          tier: m.tier || 'now',
          due: m.due || null,
          sent: m.sent === '1',
          written,
          question: ((m.q1 || '') + (m.q2 || '')).trim(),
        };
      });

    /* what still needs a person: everything held that has not gone out yet,
       oldest deadline first, because that is the one about to be late */
    const pending = orders.filter(o => o.tier !== 'now' && !o.sent)
      .sort((a, b) => String(a.due).localeCompare(String(b.due)));
    const done = orders.filter(o => o.tier === 'now' || o.sent)
      .sort((a, b) => b.created - a.created);

    return json({ pending, done, now: new Date().toISOString() });
  } catch (e) {
    console.error(e);
    return json({ error: 'server_error', detail: e.message }, 500);
  }
}
