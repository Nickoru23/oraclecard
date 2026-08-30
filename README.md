# The Witch Atelier

Trilingual (ES / EN / DE) tarot site. Static pages plus five Netlify functions.
No build step, no runtime npm dependencies, no third party requests from any page.

The authoritative description of the project, its deliberate rules, its cost
model and its open questions is [`HANDOVER.md`](HANDOVER.md). Read that first.
This file records only what is actually in this repository and how it differs
from what the handover describes.

## What is in here

This repository holds the **deploy layout**: the site at the root and
`netlify/functions/` beside it. `netlify.toml` sets `publish = "."`, so the
repository root is what Netlify serves.

```
*.html                    the pages
css/app.css               the design system
js/                       deck, art, i18n, and the page behaviour
netlify/functions/        checkout, reading, free-reading, orders, diag
netlify.toml              publish root, /api/* redirects, security headers
preview/                  33 reference jpgs, currently unreferenced
legacy/                   an earlier unrelated prototype, kept for reference
```

## Deploying

There is nothing to build. If you connect this repository to Netlify, **set the
build command to empty**; otherwise every push burns build minutes for no
reason. Otherwise, zip the repository contents (not the folder) and drop the zip
on the Netlify deploys page.

Environment variables are listed in the handover. Netlify injects them at deploy
time only, so adding one to a live site does nothing until the next deploy.

Two variables the functions read are missing from the handover's table:

| Name | Used by | Notes |
|---|---|---|
| `FREE_SECRET` | `free-reading.mjs` | signs the per visitor free reading cookie |
| `STRIPE_API_BASE` | `checkout.mjs`, `reading.mjs`, `orders.mjs` | overrides the Stripe host, for tests |

## Checking a change

There is no dev server and no test suite in this repository (see the gaps
below). Until those are restored, serve the root statically and load the pages:

```bash
npx http-server -p 4321 .      # then open http://127.0.0.1:4321/
```

The `/api/*` paths need `netlify dev` or a deployed site; the pages themselves
render without them.

## How this repository differs from the handover

The handover describes a source repository. What was handed over is the deploy
output, so several things it names are not here.

**Missing, and needed before the documented workflow works again**

* `data/*.json`, the card texts that `js/deck.js` is generated from. `deck.js`
  itself is present, so nothing is lost at runtime, but the source of truth for
  the card copy is not in version control.
* `scripts/`, all of it: `dev-server.mjs`, `build-deck.mjs`, `build-legal.mjs`,
  `build-deploy-zip.mjs`, and the eleven `qa-*.mjs` Playwright tests. Every
  check the handover names, including the ones that enforce the deliberate
  rules, is therefore unrunnable.
* `package.json`, so `npm run qa:legal` and the rest have nothing to run.
* `public/`, the wrapper the handover's layout puts the site in. The site is at
  the root here instead, which is what `netlify.toml` expects.

**Present, and not in the handover**

* `js/photos.js` and `preview/`, from an Unsplash card imagery experiment. See
  the findings below.
* `cards/`, an empty directory in the delivered zip. Git does not track empty
  directories, so it is not committed.

**Named in the handover, and not present**

* `js/dailyfortune.js`, and with it the once a day greeting modal. `fortunes.js`
  is here and `galleta.html` uses it, so the fortune cookie page works, but no
  page loads a modal on first visit.
* `_v2.html`. `js/art.js`, which the handover also calls safe to delete, is
  still here and still loaded by every page.

## Open findings

Recorded, not acted on, because each one is a decision rather than a fix.

1. **The Unsplash photo path is disabled by a short circuit, not by
   configuration.** `probePhotos()` in `js/app.js` returns `'line'` on its first
   statement, leaving the image probe below it unreachable. The procedural SVG
   is what every visitor sees.
2. **`creditos.html` still credits 33 photographers whose photographs are never
   shown.** It reads `window.PHOTO_CREDITS`, which `photos.js` populates
   regardless of the short circuit above. Either the photo path comes back, or
   that page stops crediting it.
3. **Turning the photo path back on would break the handover's rule 3.**
   `images.unsplash.com` is a third party host, and rule 3 is the reason the
   site carries no consent banner. The public domain scans in the handover's
   section 8 are self hosted and do not have this problem.
4. **The legal pages still carry placeholders.** `[street address]` and the VAT
   line are unfilled. Austrian ECG §5 requires a real postal address before the
   site takes real money.
5. **`preview/` is unreferenced.** 272 KB of jpgs that no page loads.

## Verified at import

Every page was loaded headless in all three languages: 33 combinations, all
200, no console errors, no empty bodies, no untranslated `data-i18n` elements,
and no requests to any third party host. Every local asset referenced by a page
exists, and every `.js` and `.mjs` file parses.
