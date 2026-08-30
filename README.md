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
| `STRIPE_API_BASE` | `checkout.mjs`, `reading.mjs`, `orders.mjs` | overrides the Stripe host, for tests |

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

**Still open, and a decision rather than a fix**

* **The legal pages carry placeholders.** `js/legal.js` still contains
  `[street address]` and an unfilled VAT line. Austrian ECG §5 requires a real
  postal address before the site takes real money. This is the one thing on this
  list that blocks going live.
* `galleta.html` keeps its own cookie streak, separate from the ledger's days
  kept. The labels now say which is which, but two streaks is still two streaks.

## Verified

`npm run qa` passes: 33 page and language combinations clean with nothing asked
of any third party, 291 keys at parity across the three languages, no dashes on
screen, and 22 ledger assertions green. The whole site is about 390 KB before
compression, which is less than it was before this pass despite the new deck,
because 272 KB of unused image placeholders went with it.
