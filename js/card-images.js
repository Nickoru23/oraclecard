/* ===== The Witch Atelier — card illustrations =====

   The deck draws itself in SVG (js/art2.js) and always will: that is the
   fallback the whole site rests on, and it costs no requests. This file is the
   optional layer above it. When illustrations exist, a card shows the picture;
   when one is missing or fails to load, that card falls back to its drawing,
   on its own, without taking the page down with it.

   HAVE lists the card ids that have a picture. It is written by
   scripts/build-cards.mjs and is empty until images are added, so with no
   images this file changes nothing at all.

   The files live in the site, never on someone else's server, because rule 3
   is why this site carries no consent banner.

     /cards/t/<id>.webp    about 200px wide, for the grid and the picker
     /cards/f/<id>.webp    about 600px wide, for a card opened on its own

   Two sizes because of the sum in the handover's section 7: a 4 MB deck viewed
   in full by ten thousand people is 40 GB, and the free allowance is 100.     */

(function () {
  'use strict';

  window.CARD_IMAGES = { HAVE: [], VERSION: 1 };
  const has = id => window.CARD_IMAGES.HAVE.indexOf(id) !== -1;
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

  /* the face of a card at a given size: a picture if there is one, the drawing
     if there is not. Everything on the site draws a card through this. */
  window.cardFace = function (card, lang, size) {
    if (!card) return '';
    if (!has(card.id)) return window.cardSVG(card, lang);
    const dir = size === 'full' ? 'f' : 't';
    const name = esc(card.name[lang] || card.name.es);
    return `<img class="card-img" src="/cards/${dir}/${card.id}.webp" alt="${name}"
                 width="300" height="510" loading="lazy" decoding="async"
                 data-card-id="${card.id}">`;
  };

  /* One picture failing must never leave a hole. The error event does not
     bubble, so this listens in the capture phase and swaps that single card
     back to its drawing. */
  document.addEventListener('error', e => {
    const img = e.target;
    if (!img || img.tagName !== 'IMG' || !img.dataset.cardId) return;
    const card = (window.DECK || []).find(c => c.id === img.dataset.cardId);
    if (!card || !window.cardSVG) return;
    const holder = document.createElement('div');
    holder.innerHTML = window.cardSVG(card, window.getLang ? window.getLang() : 'es');
    const svg = holder.firstElementChild;
    if (svg) img.replaceWith(svg);
  }, true);
})();
