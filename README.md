# The Witch Atelier

Trilingual (ES / EN / DE) tarot site. Static pages plus five Netlify functions.
No build step, no runtime npm dependencies, no third party requests from any page.

The project's own account of itself, its deliberate rules and its cost model is
[`HANDOVER.md`](HANDOVER.md). That document is kept as it was written. This file
records what is actually in the repository and every place the two now differ.

## What is in here

The **deploy layout**: the site at the root and `netlify/functions/` beside it.
`netlify.toml` sets `publish = "."`, so the repository root is what Netlify serves.

```
*.html                    the pages
css/app.css               the design system: the desk, and the paper on it
js/
  art-marseille.js        the 78 card faces and the card back, drawn in code
  ritual.js               the ledger's state: the day's tasks, the days kept
  ledger.js               the ledger as it is drawn, and the tally in the header
  deck.js i18n.js app.js  the deck texts, the three languages, the page engine
  astro.js horoscope.js zodiac.js fortunes.js legal.js notice.js ornament.js
netlify/functions/        checkout, reading, free-reading, orders, diag
scripts/                  a static server and four checks, see below
legacy/                   an earlier unrelated prototype, kept for reference
```

## Deploying

Nothing to build. If you connect this repository to Netlify, **set the build
command to empty**; otherwise every push burns build minutes for no reason.
Otherwise zip the repository contents (not the folder) and drop the zip on the
Netlify deploys page. `node_modules/` and `scripts/` are development only and do
not need to ship.

Environment variables are listed in the handover. Netlify injects them at deploy
time only, so adding one to a live site does nothing until the next deploy.

Two the functions read that the handover's table omits:

| Name | Used by | Notes |
|---|---|---|
| `FREE_SECRET` | `free-reading.mjs` | signs the per visitor free reading cookie |
| `STRIPE_API_BASE` | `checkout.mjs`, `reading.mjs`, `orders.mjs` | overrides the Stripe host, for tests. `reading.mjs` and `orders.mjs` hard coded the host until this was fixed, so only checkout was ever testable |

## Working on it

```bash
npm install            # playwright, for the checks only. Nothing ships.
npm run serve          # http://localhost:4321
npm run qa             # all four checks
```

| Check | What it holds to |
|---|---|
| `qa:pages` | every page in every language answers, has content, letters every string, throws nothing, and asks nothing of any third party. That last one is rule 3 |
| `qa:i18n` | rule 6, the three languages at parity with no empty values |
| `qa:dashes` | rule 4, no dashes reach the screen |
| `qa:ritual` | the ledger end to end: the marks fire, a day is kept only when all three tasks are done, the streak survives a reload and a new day, the sigils strike |
| `qa:stripe` | the paid path end to end against a Stripe stand in: the request shape, the three tiers, what checkout refuses, the payment check, the held tiers and the owner token, the order book, and that a generated reading survives the metadata cache whole. No network, no account, no charges |

The `/api/*` paths need `netlify dev` or a deployed site. The pages render without them.

## The deck

All 78 faces are drawn in `js/art-marseille.js`, in code, at 300 by 510. Nothing
is scanned and nothing is traced. What is borrowed is the grammar of the
woodblock from the **Tarot de Marseille type I, the Jean Dodal**, printed in Lyon
between 1701 and 1715, of which the Bibliotheque nationale de France holds one of
the two surviving copies ([the scan](https://gallica.bnf.fr/ark:/12148/btv1b10537343h)):
cream stock, a heavy black keyline, six flat inks, the number set in Roman above
and the name lettered below, batons woven into a lattice, swords closed into an
oval cage, cups and coins ranged in rows. That grammar has been out of copyright
for centuries.

Drawing rather than scanning is what keeps the deck at 42 KB with no requests.
The handover's section 8 warns that scanned art is where the bandwidth budget
goes wrong: 3 to 5 MB for the deck, and 40 GB if ten thousand people view it in
full. None of that applies here.

## Paying

Stripe is called over its REST API with plain `fetch` and form encoding, so
there is still no npm dependency anywhere. Three tiers, priced by how long the
buyer waits: 48 hours for 9 €, 6 hours for 19 €, now for 29 €. There is no
database: the Checkout Session carries the order in its metadata, the generated
reading is written back into that same metadata, and `orders.mjs` reads the
session list back as the order book.

`npm run qa:stripe` exercises all of it against a stand in. To try it for real,
set `STRIPE_SECRET_KEY` to an `sk_test_…` key, deploy, and open `/api/diag?token=…`,
which creates a real Checkout Session, writes metadata to it, expires it, and
reports what happened.

**Before taking real money, make one test mode purchase all the way through.**
Two things only that proves:

1. **The account is activated.** A valid key still fails checkout if Stripe has
   not activated the account, and only a real attempt finds that out.
2. **Metadata is writable on a completed session.** The reading cache depends on
   it. `/api/diag` can only prove the key may write metadata to an *open*
   session; the completed case is reached only by paying. If it turns out not to
   be allowed, the cache silently fails and every reload of the success page
   generates and bills a fresh reading. `reading.mjs` now logs that loudly
   (`READING CACHE FAILED`) instead of swallowing it, so it will be visible in
   the Netlify function log.

## The ledger

The gamification, all of it in `localStorage` under one key, sent nowhere, costing
nothing to serve and nothing in function runtime.

* **The day's ritual.** Three free things: the fortune cookie, the card of the
  day, one spread. Doing all three keeps the day.
* **The days kept.** A run of kept days, with the last four weeks shown. A
  streak survives a missed page load, and breaks only on a missed day.
* **The standing.** Six stations, from the door to the whole atelier, reached by
  days kept. Eight sigils for milestones, struck with a toast as they are earned.

`window.Ritual` is the whole interface: `get`, `mark`, `spreadLaid`, `langSeen`,
`calendar`, `forget`. Pages call `mark` and nothing else. Clearing site data
clears the ledger, which is the honest trade for asking nobody to sign up.

## How this repository differs from the handover

The handover describes a source repository. What was handed over was the deploy
output, so parts of it are still absent.

**Still missing**

* `data/*.json`, the card texts `js/deck.js` is generated from. `deck.js` itself
  is here, so nothing is lost at runtime, but the source of truth for the card
  copy is not in version control.
* `scripts/build-deck.mjs`, `build-legal.mjs`, `build-deploy-zip.mjs`, and the
  eleven original `qa-*.mjs`. The four checks here cover the rules the handover
  calls deliberate; they are not the originals.
* `js/dailyfortune.js`, and with it the once a day greeting modal. `galleta.html`
  works, but no page greets a visitor on arrival.

**Resolved since the handover**

* The card artwork is no longer procedural abstraction. `js/art.js` and
  `js/art2.js`, which the handover calls earlier drafts, are deleted.
* The Unsplash photo path is gone: `js/photos.js`, the `preview/` placeholders,
  and the dead probe in `app.js`. It had been disabled by an unreachable early
  return while `creditos.html` still credited 33 photographers whose work was
  never shown, and turning it back on would have broken rule 3, because
  `images.unsplash.com` is a third party host and rule 3 is why this site carries
  no consent banner. `creditos.html` is now a colophon for the drawn deck.
* An unclosed `</a>` in `index.html` that nested the fourth menu card inside the
  third.

**Fixed in the paid path**

* **The reading cache truncated.** It held eight metadata keys of 490
  characters, 3,920 in all, while the paid prompt asks for 700 to 900 words,
  which runs past 4,200 in English and further in German. The visitor's first
  view was whole because it is returned directly; every later view served the
  cached copy, cut off mid sentence. The cache now holds twenty keys, 9,800
  characters, still well inside Stripe's limit of 50 keys. See
  `netlify/functions/lib/cache.mjs`.
* **The order book lost old orders.** It read one page of 50 sessions, and
  Stripe counts abandoned ones, so a run of people who opened checkout and left
  pushed paid orders off the review desk. It now walks the pages.
* **Only `checkout.mjs` honoured `STRIPE_API_BASE`.** `reading.mjs` and
  `orders.mjs` hard coded `api.stripe.com`, so neither could be tested. Both
  now read the same variable, which is what `qa:stripe` runs against.

**Still open, and a decision rather than a fix**

* **The legal pages carry placeholders.** `js/legal.js` still contains
  `[street address]` and an unfilled VAT line. Austrian ECG §5 requires a real
  postal address before the site takes real money. This is the one thing on this
  list that blocks going live.
* **No VAT handling.** Selling a digital service to consumers in the EU puts VAT
  where the buyer is, and prices are shown as flat euro amounts with nothing
  said about tax. Stripe Tax would handle it and costs a percentage. This is an
  accounting decision, not a code one, but it has to be made before invoicing.
* **No webhook**, as the handover says. If the buyer closes the tab before the
  success page loads, the instant tier reading is not generated then. Nothing is
  lost, it generates whenever that URL is opened and the order shows on the
  review desk, but nobody is told.
* `galleta.html` keeps its own cookie streak, separate from the ledger's days
  kept. The labels now say which is which, but two streaks is still two streaks.

## Verified

`npm run qa` passes: 33 page and language combinations clean with nothing asked
of any third party, 291 keys at parity across the three languages, no dashes on
screen, and 22 ledger assertions green. The whole site is about 390 KB before
compression, which is less than it was before this pass despite the new deck,
because 272 KB of unused image placeholders went with it.
