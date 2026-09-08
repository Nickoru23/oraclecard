/* ===== The Witch Atelier — the language is in the address =====

   /lectura.html is Spanish. /en/lectura.html is English. /de/lectura.html is
   German. All three are the same file: netlify.toml rewrites the two prefixes
   and the language is read back off the path here.

   Why it matters more than it looks: the language used to be a key in the
   visitor's own browser and nothing else. A page someone sent in English opened
   in whatever language the person receiving it had last chosen, so the two of
   them were looking at different sites through the same link, and a search
   engine only ever saw one of the three. Two thirds of the translation was
   invisible from outside the browser it was done in.

   The rules, in order of who wins:

     the address     an address with a prefix is that language, always
     the root        an address without one is Spanish, always
     the front door  the one exception: at / and nowhere else, somebody who has
                     chosen before, or whose browser asks for a language we
                     have, is taken to it. Deep links never move, so a shared
                     link opens where it was sent and a crawler following one
                     is never bounced somewhere else.

   This loads before everything, on every page including the legal ones, which
   have no other script in common.                                            */

(function () {
  'use strict';

  var LANGS = ['es', 'en', 'de'];
  var DEFAULT = 'es';                 /* the language the root addresses are in */
  var PREFIX = /^\/(en|de)(?=\/|$)/;
  /* addressed from the root and never through a prefix */
  var SHARED = /^\/(css|js|api|cards|favicon|robots|sitemap|\.netlify)/;

  function store(v) {
    try { return v === undefined ? localStorage.getItem('umbral.lang')
                                 : localStorage.setItem('umbral.lang', v); }
    catch (e) { return null; }
  }

  var here = location.pathname;
  var found = here.match(PREFIX);

  /* the same page, addressed in another language */
  function href(path, lang) {
    var rest = '', cut = path.search(/[?#]/);
    if (cut > -1) { rest = path.slice(cut); path = path.slice(0, cut); }
    path = path.replace(PREFIX, '') || '/';
    path = path.replace(/\/index\.html$/, '/');      /* one address for the front door */
    var out = lang === DEFAULT ? path : '/' + lang + (path === '/' ? '' : path);
    return (out || '/') + rest;
  }

  var code = found ? found[1] : DEFAULT;
  var web = location.protocol === 'http:' || location.protocol === 'https:';

  /* the front door, and only the front door */
  if (web && !found && /^\/(index\.html)?$/.test(here)) {
    var saved = store();
    var nav = (navigator.language || '').slice(0, 2).toLowerCase();
    var guess = LANGS.indexOf(saved) > -1 ? saved : LANGS.indexOf(nav) > -1 ? nav : DEFAULT;
    if (guess !== DEFAULT) {
      location.replace(href(here, guess) + location.search + location.hash);
      return;
    }
  }

  document.documentElement.lang = code;

  /* Which page this is, in every language. Without these a search engine reads
     three addresses as three thin copies of one page rather than one page in
     three languages, and picks whichever it likes. */
  (function tell() {
    var head = document.head;
    if (!head) return;
    function link(rel, path, hreflang) {
      var l = document.createElement('link');
      l.rel = rel;
      l.href = location.origin + path;
      if (hreflang) l.hreflang = hreflang;
      head.appendChild(l);
    }
    link('canonical', href(here, code));
    for (var i = 0; i < LANGS.length; i++) link('alternate', href(here, LANGS[i]), LANGS[i]);
    link('alternate', href(here, DEFAULT), 'x-default');
  })();

  /* Every way further into the site keeps the language it was reached in. The
     hrefs are rewritten so that copying a link copies the right one, and a
     click is caught as well, because the ledger and the page scripts add links
     of their own long after this has run. */
  function keep(root) {
    if (code === DEFAULT) return;
    var as = (root || document).querySelectorAll('a[href^="/"]');
    for (var i = 0; i < as.length; i++) {
      var h = as[i].getAttribute('href');
      if (SHARED.test(h) || PREFIX.test(h)) continue;
      as[i].setAttribute('href', href(h, code));
    }
  }

  function go(lang) {
    if (LANGS.indexOf(lang) < 0 || lang === code) return false;
    store(lang);
    if (!web) return false;             /* opened from a file: the caller letters in place */
    location.assign(href(here, lang) + location.search + location.hash);
    return true;
  }

  /* The ledger draws its tally after this has run, the deck browser repaints on
     a language change, and a spread appears long after load, so links are taken
     as they arrive as well as at the start. Same shape as the card mounting in
     card3d.js, and for the same reason. */
  function watch() {
    keep();
    if (code === DEFAULT || !window.MutationObserver) return;
    new MutationObserver(function (muts) {
      for (var i = 0; i < muts.length; i++) {
        if (!muts[i].addedNodes.length) continue;
        var at = muts[i].target;
        if (at && at.nodeType === 1) keep(at);
      }
    }).observe(document.body, { childList: true, subtree: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', watch);
  else watch();

  window.Lang = { code: code, LANGS: LANGS, DEFAULT: DEFAULT, href: href, go: go, keep: keep };
})();
