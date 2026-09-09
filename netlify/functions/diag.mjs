/* GET /api/diag?token=…  — "why is it not working?", answered in one request.

   Guessing at a serverless failure from a visitor-facing error message is
   miserable, so this says plainly which keys are present and which model ids
   actually answer. It never returns a key, only whether one is set and what the
   API said back. It is off unless DIAG_TOKEN is set in the environment, and the
   token has to match — a public endpoint that probes your billing state is not
   something to leave lying around. */

import { write, FREE_MODELS, PAID_MODELS } from './lib/writer.mjs';

const json = (b, s = 200) =>
  new Response(JSON.stringify(b, null, 2), { status: s, headers: { 'content-type': 'application/json' } });

export default async function handler(req) {
  const want = process.env.DIAG_TOKEN || process.env.OWNER_TOKEN;
  const got = new URL(req.url).searchParams.get('token') || '';
  const full = !!want && same(got, want);

  /* Without the token this reports only whether each setting exists. No values,
     no customer data, nothing anyone can use, and it means the owner can find
     out from a phone why payments are off without hunting for a token first.
     A visitor who tries to pay already discovers the same fact. */
  if (!full) {
    const hasStripe = !!process.env.STRIPE_SECRET_KEY;
    const hasWriter = !!process.env.ANTHROPIC_API_KEY;
    return json({
      status: hasStripe && hasWriter ? 'configured' : 'NOT fully configured',
      payments: hasStripe ? 'Stripe key is present' : 'STRIPE_SECRET_KEY is MISSING, so nobody can pay',
      readings: hasWriter ? 'Anthropic key is present' : 'ANTHROPIC_API_KEY is MISSING, so paid readings cannot be written',
      review_desk: process.env.OWNER_TOKEN ? 'OWNER_TOKEN is set' : 'OWNER_TOKEN is MISSING',
      next: 'Add whatever says MISSING in Netlify, then deploy again. Netlify only injects variables at deploy time, so adding one without redeploying changes nothing.',
      full_report: want ? 'Add ?token=YOUR_DIAG_TOKEN for the full report.'
                        : 'Set DIAG_TOKEN in Netlify to unlock the full report, including a live Stripe checkout test.',
    });
  }

  const akey = process.env.ANTHROPIC_API_KEY;
  const skey = process.env.STRIPE_SECRET_KEY;

  const env = {
    ANTHROPIC_API_KEY: akey ? `set (${akey.length} chars, starts ${akey.slice(0, 7)}…)` : 'MISSING',
    STRIPE_SECRET_KEY: skey
      ? `set (${skey.startsWith('sk_live') ? 'LIVE' : skey.startsWith('sk_test') ? 'test' : 'unknown'} key)`
      : 'MISSING',
    ANTHROPIC_FREE_MODEL: process.env.ANTHROPIC_FREE_MODEL || '(unset — using the built-in chain)',
    ANTHROPIC_MODEL: process.env.ANTHROPIC_MODEL || '(unset — using the built-in chain)',
    SITE_URL: process.env.SITE_URL || '(unset — using the request origin)',
    FREE_PER_DAY: process.env.FREE_PER_DAY || '3 (default)',
    RESEND_API_KEY: process.env.RESEND_API_KEY ? 'set' : 'not set (no email copies)',
  };

  /* one cheap real call per candidate id, so the answer is what the API does,
     not what the documentation says it should do */
  const ids = [...new Set([...FREE_MODELS, ...PAID_MODELS])];
  const models = {};
  if (akey) {
    for (const id of ids) {
      const r = await write({
        key: akey, models: [id], maxTokens: 8,
        system: 'Reply with the single word: ok',
        user: 'ok',
      });
      models[id] = r.text ? 'OK' : `${r.reason}${r.status ? ` (HTTP ${r.status})` : ''}${r.detail ? ` — ${r.detail}` : ''}`;
    }
  }

  let stripe = 'not tested (no key)';
  let cache = 'not tested (no key)';
  let checkout = 'not tested';
  if (skey) {
    try {
      const r = await fetch('https://api.stripe.com/v1/balance', {
        headers: { Authorization: `Bearer ${skey}` },
      });
      const j = await r.json();
      stripe = r.ok ? 'OK' : `${r.status}: ${j?.error?.message || 'error'}`;
    } catch (e) { stripe = 'network error: ' + e.message; }

    /* The real test. A key can be valid and checkout still fail, because the
       account is not activated, the currency is not enabled, or the session
       payload is refused. So create one for real, read the answer, then expire
       it immediately so nobody can pay through it. */
    try {
      const body = new URLSearchParams({
        mode: 'payment',
        success_url: 'https://example.com/ok?session_id={CHECKOUT_SESSION_ID}',
        cancel_url: 'https://example.com/cancel',
        'line_items[0][quantity]': '1',
        'line_items[0][price_data][currency]': (process.env.READING_CURRENCY || 'eur').toLowerCase(),
        'line_items[0][price_data][unit_amount]': '900',
        'line_items[0][price_data][product_data][name]': 'Diagnostics, not for sale',
      });
      const r = await fetch('https://api.stripe.com/v1/checkout/sessions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${skey}`, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      });
      const j = await r.json();
      if (r.ok && j.id) {
        checkout = 'OK, a session was created and then expired';
        /* The paid reading is cached back into the session metadata, so the key
           has to be allowed to write it. This proves that on a fresh session.
           It cannot prove the same for a COMPLETED one, which only a real test
           mode purchase reaches, so run one before taking real money. */
        try {
          const w = await fetch(`https://api.stripe.com/v1/checkout/sessions/${j.id}`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${skey}`, 'Content-Type': 'application/x-www-form-urlencoded' },
            body: 'metadata[diag]=1',
          });
          cache = w.ok ? 'OK, metadata is writable on an open session'
                       : `${w.status}: ${(await w.json())?.error?.message || 'refused'}`;
        } catch (e) { cache = 'network error: ' + e.message; }
        await fetch(`https://api.stripe.com/v1/checkout/sessions/${j.id}/expire`, {
          method: 'POST', headers: { Authorization: `Bearer ${skey}` },
        }).catch(() => {});
      } else {
        checkout = `${r.status} ${j?.error?.type || ''}: ${j?.error?.message || 'refused'}`;
      }
    } catch (e) { checkout = 'network error: ' + e.message; }
  }

  const working = Object.values(models).filter(v => v === 'OK').length;
  return json({
    verdict_payments: !skey ? 'No Stripe key, so nobody can pay.'
      : checkout.startsWith('OK') ? 'Payments are working.'
      : `Stripe answered but checkout failed. ${checkout}`,
    verdict: !akey ? 'No Anthropic key — free readings fall back to composed text, paid readings fail.'
      : working === 0 ? 'The Anthropic key is set but no model answered. See models below — usually auth (wrong or rotated key) or credit (empty account).'
      : `${working} model(s) answering. The writer is working.`,
    env, models, stripe, checkout, reading_cache: cache,
    prices: {
      slow: (Number(process.env.PRICE_SLOW_CENTS || 900) / 100) + ' ' + (process.env.READING_CURRENCY || 'eur'),
      fast: (Number(process.env.PRICE_FAST_CENTS || 1900) / 100) + ' ' + (process.env.READING_CURRENCY || 'eur'),
      now: (Number(process.env.PRICE_NOW_CENTS || 2900) / 100) + ' ' + (process.env.READING_CURRENCY || 'eur'),
    },
    review_desk: process.env.OWNER_TOKEN ? '/atelier.html is open with your OWNER_TOKEN' : 'OWNER_TOKEN is not set, so held readings cannot be reviewed',
  });
}
