# The Witch Atelier — handover

Everything a developer or coding agent needs to take this over. Written to be
read top to bottom once, then used as a reference.

---

## 1. What this is

A trilingual (ES / EN / DE) tarot site with four free things and one paid thing.

| Thing | Page | Cost to run |
|---|---|---|
| Today's fortune | modal on first visit each day | zero, runs in the browser |
| Card of the day | `/horoscopo.html` | zero, computed in the browser |
| Play with the deck | `/#tiradas` and `/#baraja` | zero |
| Ask the cards | `/consulta.html` → `/api/free` | one Anthropic call |
| Your full reading | `/lectura.html` → `/api/checkout` → Stripe → `/gracias.html` → `/api/reading` | Stripe fee plus one Anthropic call |

Paid tiers, priced by how long the buyer waits: **48 h for 9 €, 6 h for 19 €,
now for 29 €**. The two slower ones are held for a human to read and send, from
the review desk at `/atelier.html`.

---

## 2. Rules that are deliberate, not accidental

Break these only on purpose.

1. **No build step.** The site is plain HTML, CSS and JS. `netlify.toml` sets an
   empty build command. This is what keeps Netlify build minutes at zero.
2. **No runtime npm dependencies.** Stripe and Anthropic are called with plain
   `fetch`. Netlify bundles the functions with esbuild; nothing is installed.
3. **No third party requests from any page.** No web fonts, no analytics, no
   CDNs. This is a GDPR position, not a preference: it is why the site needs no
   consent banner. `npm run qa:legal` asserts it and will fail if you add one.
4. **No dashes in visitor facing text.** Commas and full stops instead. There is
   a test for it (`scripts/qa-dashes.mjs`) and a rule in both AI prompts.
5. **The free reading must never fail.** If Anthropic is unreachable for any
   reason, `netlify/functions/lib/compose.mjs` writes the reading locally from
   the deck's own texts. The visitor always gets something.
6. **Three languages stay at parity.** Every key exists in `es`, `en` and `de`.
   `scripts/qa-audit.mjs` fails on any gap.

---

## 3. Layout

```
public/                     everything served
  index.html                the table: free things, paid thing, spreads, deck
  galleta.html              the fortune cookie as its own page (kept as a permalink)
  horoscopo.html            card of the day, per sign
  consulta.html             ask the cards, free, 1 or 2 cards
  lectura.html              the paid reading, tier chooser and form
  gracias.html              after payment: the reading, or a receipt for held tiers
  atelier.html              the owner's review desk (no index, token gated)
  aviso-legal / privacidad / cookies / creditos    generated, see below
  css/app.css               the whole design system
  js/
    i18n.js                 all copy, three languages, ~244 keys each
    deck.js                 78 cards, generated from data/*.json
    art.js, art2.js         the procedural card artwork (art2 is the live one)
    zodiac.js               the twelve sign medallions
    astro.js                real Sun and Moon positions (Meeus, low precision)
    horoscope.js            seeded daily draw per sign, plus the prose frames
    fortunes.js             the fortune texts and the once a day state
    dailyfortune.js         the modal that greets a visitor on a new day
    app.js                  boot, language, menu, spreads, picker, deck browser
    ornament.js             wraps [data-banner] headings in a ribbon
    legal.js, notice.js     legal texts, privacy notice
netlify/functions/
  checkout.mjs              creates the Stripe Checkout Session
  reading.mjs               verifies payment, writes the paid reading, caches it
  free-reading.mjs          the free 1 or 2 card reading, with the local fallback
  orders.mjs                the review desk's data, read from Stripe
  diag.mjs                  self diagnosis, see section 6
  lib/writer.mjs            Anthropic calls with a model fallback chain
  lib/compose.mjs           the locally written reading, and question analysis
  lib/deck-data.mjs         the deck, for the functions
data/*.json                 card texts, the source of truth for deck.js
scripts/                    builds and tests, see section 5
```

**There is no database.** Stripe Checkout Sessions carry everything in their
`metadata`, and the generated reading is written back into that metadata in
500 character chunks (`r0` … `r7`) so a refresh never bills a second generation.
`orders.mjs` reads the session list back as the order book.

---

## 4. Environment variables

| Name | Needed for | Notes |
|---|---|---|
| `STRIPE_SECRET_KEY` | all payment | `sk_test_…` while testing |
| `ANTHROPIC_API_KEY` | written readings | without it the free path still works, from `compose.mjs` |
| `OWNER_TOKEN` | `/atelier.html` and `/api/orders` | any long random string |
| `DIAG_TOKEN` | the full `/api/diag` report | any long random string |
| `PRICE_SLOW_CENTS` `PRICE_FAST_CENTS` `PRICE_NOW_CENTS` | prices | default 900 / 1900 / 2900 |
| `READING_CURRENCY` | currency | default `eur` |
| `FREE_PER_DAY` `FREE_PER_IP_DAY` | free reading limits | default 3 and 12 |
| `ANTHROPIC_MODEL` `ANTHROPIC_FREE_MODEL` | pin a model | otherwise a fallback chain is used |
| `SITE_URL` | Stripe return urls | otherwise the request origin |
| `RESEND_API_KEY` `MAIL_FROM` | optional email copies | never required |

**Netlify injects these at deploy time only.** Adding one to a live site does
nothing until the next deploy. This has already cost this project days.

---

## 5. Working on it

```bash
node scripts/dev-server.mjs      # http://localhost:4321, fakes both APIs
node scripts/build-deck.mjs      # data/*.json  ->  public/js/deck.js
node scripts/build-legal.mjs     # js/legal.js  ->  the three legal pages
node scripts/build-deploy-zip.mjs   # -> dist-deploy/ , the exact drop layout
```

Tests, all Playwright against the dev server:

| Script | Checks |
|---|---|
| `qa-audit.mjs` | every page in every language: missing keys, empty elements, dead links, contrast, console errors |
| `qa-checkout.mjs` | the Stripe request shape, against a stand in. No network, no charges |
| `qa-dashes.mjs` | no dashes reach the screen |
| `qa-fortune.mjs` | the daily fortune: greets once, remembers, stays off checkout |
| `qa.mjs` `qa-picker.mjs` `qa-free.mjs` `qa-tiers.mjs` `qa-horoscope.mjs` `qa-fallback.mjs` `qa-menu.mjs` `qa-legal.mjs` `qa-cookie.mjs` | the flows named |

Deploying: `dist-deploy/` is the drop layout, with the site at the root and
`netlify/functions/` beside it. Zip its **contents**, not the folder, and drag
the zip onto the Netlify deploys page.

---

## 6. When something is wrong

Open `https://thewitchatelier.com/api/diag`.

Without a token it reports only which settings exist, no values. With
`?token=DIAG_TOKEN` it also tests every Anthropic model id for real, creates a
Stripe Checkout Session for real and then expires it, and prints the prices in
force. A valid Stripe key can still fail checkout because the account is not
activated, and only a real attempt finds that out.

---

## 7. Netlify cost, which is now the constraint

The credit is around half used, so what follows matters.

**What costs nothing.** Bandwidth: the whole site is about 370 KB, and the free
allowance is 100 GB. Build minutes: there is no build. Keep it that way. If you
connect a Git repository, **set the build command to empty**, or every push will
start burning minutes for no reason.

**What actually costs.** Function runtime. The free consultation calls Anthropic
and waits, and that wait is billed as runtime. A 900 word generation can run 20
to 40 seconds. On the free allowance of roughly 100 hours a month, that is on
the order of ten thousand free readings, which sounds ample until someone finds
the endpoint. The limiter in `free-reading.mjs` is a signed cookie plus a per IP
counter, which stops casual abuse but not a determined script.

If the credit gets tight, in order of effect and least damage:

1. Lower `FREE_PER_DAY` from 3 to 1.
2. Lower the free reading target length in `free-reading.mjs` from 900 to 1100
   words back to 450 to 550, and `maxTokens` from 3000 to 1600.
3. Set `ANTHROPIC_FREE_MODEL` to the cheapest available model.
4. Serve the free reading from `compose.mjs` only, by leaving
   `ANTHROPIC_API_KEY` unset. Zero API cost, near zero runtime, and the visitor
   still gets 500 words. The paid path is unaffected.

**The thing most likely to break the budget next is card images.** See below.

---

## 8. Card artwork, the open piece

The artwork is currently procedural SVG (`js/art2.js`), about 86 KB for all 78
cards, no requests. Replacing it with scanned illustrations is the requested
next step, and it is where the bandwidth budget can go wrong.

Sources that are safe to use, with the reasoning:

- **Rider Waite Smith, 1909, drawn by Pamela Colman Smith.** She died in 1951,
  so under life plus seventy her work entered the public domain in the EU and
  the UK on 1 January 2022. Austria is life plus seventy, so this is clear.
  In the US the 1909 publication was already public domain.
  Two cautions: US Games holds a **trademark** on the words "Rider Waite", so do
  not use that name as a brand, and they claim rights in **their** modern
  recolourings, so work from the original 1909 scans rather than from a current
  retail deck.
- **Tarot de Marseille**, Jean Dodal 1701 and Nicolas Conver 1760. Long out of
  copyright, and the Bibliothèque nationale de France publishes high resolution
  scans.
- **Sola Busca, 1491.** The oldest complete 78 card deck, pure line engraving,
  which is the closest of the three to the ink style this site already uses.

Links are in the message that accompanied this document.

**If you swap the SVG for images, do this or the site gets slow and expensive:**

1. Convert to WebP at about 600 px on the long edge, quality 80. Expect roughly
   40 to 70 KB a card, so 3 to 5 MB for the full deck.
2. Never load all 78 at once. The deck browser must lazy load
   (`loading="lazy"`, `decoding="async"`), and the picker uses **one** card back
   image for all 22 face down cards.
3. Keep a small thumbnail set, about 200 px wide, for the picker and the grid,
   and load the large version only when a card is opened.
4. Keep the procedural SVG as the fallback for any card whose image fails.
5. Netlify serves images from the same 100 GB. A 4 MB deck viewed in full by
   ten thousand visitors is 40 GB. The thumbnail rule above is what keeps this
   from happening.

---

## 9. Known and deliberate gaps

- **No webhook.** If a buyer closes the tab before the success page loads, the
  instant tier reading is never generated. It still generates whenever that URL
  is opened, and the order appears on the review desk, so nothing is lost, but
  a Stripe webhook would make it automatic.
- **Held readings are sent by hand** from the review desk, with a copy button
  and a prefilled email. Wiring `RESEND_API_KEY` would automate it.
- **The free limiter is soft.** Real enforcement needs a store. Netlify Blobs
  would be the natural choice, but it needs an npm dependency, which breaks
  rule 2 above. Decide deliberately.
- **The legal pages have placeholders.** `js/legal.js` still contains
  `[street address]` and a VAT line. Austrian ECG §5 requires a real postal
  address on a commercial site. Fill these before taking real money.
- **`_v2.html` and `js/art.js`** are earlier drafts, kept only for reference.
  Safe to delete.

---

*Imported into version control alongside the site it describes. Where this
document and the repository disagree, `README.md` records the difference.*
