/* POST /api/checkout — creates a Stripe Checkout Session.
   No npm dependencies: Stripe's REST API is called with form encoding. */

const CURRENCY = (process.env.READING_CURRENCY || 'eur').toLowerCase();
const API = (process.env.STRIPE_API_BASE || 'https://api.stripe.com/v1').replace(/\/$/, '');

/* Three ways to buy the same reading, priced by how long you are willing to
   wait for it. The two slower ones are held and read by a person before they go
   out, which is what the wait actually buys. Prices are env overridable so they
   can move without a code change. */
const TIERS = {
  slow: { cents: Number(process.env.PRICE_SLOW_CENTS || 900),  hours: 48 },
  fast: { cents: Number(process.env.PRICE_FAST_CENTS || 1900), hours: 6 },
  now:  { cents: Number(process.env.PRICE_NOW_CENTS  || 2900), hours: 0 },
};

const TIER_NAME = {
  es: { slow: 'en 48 horas', fast: 'en 6 horas', now: 'ahora mismo' },
  en: { slow: 'within 48 hours', fast: 'within 6 hours', now: 'right now' },
  de: { slow: 'in 48 Stunden', fast: 'in 6 Stunden', now: 'sofort' },
};

const PRODUCT = {
  es: 'Lectura personalizada · The Witch Atelier',
  en: 'Personalised reading · The Witch Atelier',
  de: 'Persönliche Deutung · The Witch Atelier',
};

function form(obj, prefix = '', out = new URLSearchParams()) {
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null) continue;
    const key = prefix ? `${prefix}[${k}]` : k;
    if (typeof v === 'object') form(v, key, out);
    else out.append(key, String(v));
  }
  return out;
}

const clean = (s, max) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

export default async function handler(req) {
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return json({ error: 'stripe_not_configured' }, 500);

  try {
    const b = await req.json();

    const name = clean(b.name, 60);
    const email = clean(b.email, 120);
    const birth = clean(b.birth, 12);
    const sex = ['f','m','x','-'].includes(b.sex) ? b.sex : '-';
    const lang = ['en', 'de'].includes(b.lang) ? b.lang : 'es';
    const draws = clean(b.draws, 60);
    const question = clean(b.question, 900);
    const tier = TIERS[b.tier] ? b.tier : 'now';
    const sign = clean(b.sign, 12);
    const degree = Number.isFinite(+b.degree) ? String(Math.floor(+b.degree)) : '';
    /* the moment the reading is promised by, stamped at purchase so both the
       customer and the review desk are looking at the same deadline */
    const due = new Date(Date.now() + TIERS[tier].hours * 3600 * 1000).toISOString();

    if (!name || !email.includes('@')) return json({ error: 'bad_input' }, 400);
    if (birth && !/^\d{4}-\d{2}-\d{2}$/.test(birth)) return json({ error: 'bad_input' }, 400);
    if (question.length < 80) return json({ error: 'question_too_short' }, 400);
    if (!/^[a-z]\d{2}R?(,[a-z]\d{2}R?){4}$/.test(draws)) return json({ error: 'bad_draw' }, 400);

    const origin = process.env.SITE_URL || new URL(req.url).origin;

    const payload = {
      mode: 'payment',
      success_url: `${origin}/gracias.html?session_id={CHECKOUT_SESSION_ID}&lang=${lang}`,
      cancel_url: `${origin}/lectura.html`,
      customer_email: email,
      locale: lang,
      line_items: [{
        quantity: 1,
        price_data: {
          currency: CURRENCY,
          unit_amount: TIERS[tier].cents,
          product_data: { name: `${PRODUCT[lang]}, ${TIER_NAME[lang][tier]}` },
        },
      }],
      metadata: {
        name, birth, sex, lang, draws, tier, due, sign, degree,
        q1: question.slice(0, 450),
        q2: question.slice(450),
      },
    };

    const r = await fetch(`${API}/checkout/sessions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: form(payload).toString(),
    });
    const j = await r.json();
    if (!r.ok) {
      const msg = j?.error?.message || '';
      console.error('stripe', r.status, j?.error?.type, msg);
      /* an invalid or revoked key is a setup problem, not a payment problem,
         and the page should say so rather than blaming the visitor's card */
      const kind = r.status === 401 || /api key|authentication/i.test(msg)
        ? 'stripe_not_configured' : 'stripe_error';
      return json({ error: kind, detail: msg.slice(0, 200) }, kind === 'stripe_not_configured' ? 500 : 502);
    }
    if (!j.url) {
      console.error('stripe returned no url', JSON.stringify(j).slice(0, 300));
      return json({ error: 'stripe_error', detail: 'no checkout url returned' }, 502);
    }
    return json({ url: j.url });
  } catch (e) {
    console.error(e);
    return json({ error: 'server_error' }, 500);
  }
}
