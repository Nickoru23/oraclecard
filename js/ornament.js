/* ===== The Witch Atelier — ornament =====
   The reference does not put a heading on a page, it sets it into a ribbon and
   runs a tail out to each side. This does that at load: any element carrying
   data-banner gets wrapped, and section breaks get their compass rule.
   Pure decoration, so it is added after the content exists and never blocks it. */
(function () {
  function banner(el) {
    if (!el || el.closest('.banner')) return;
    const wrap = document.createElement('div');
    wrap.className = 'banner-wrap';
    const left = document.createElement('span');
    left.className = 'banner-tail l';
    left.setAttribute('aria-hidden', 'true');
    const right = document.createElement('span');
    right.className = 'banner-tail';
    right.setAttribute('aria-hidden', 'true');
    const band = document.createElement('span');
    band.className = 'banner';
    el.parentNode.insertBefore(wrap, el);
    band.appendChild(el);
    wrap.append(left, band, right);
  }

  function run() {
    document.querySelectorAll('[data-banner]').forEach(banner);
  }

  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', run);
  else run();
})();
