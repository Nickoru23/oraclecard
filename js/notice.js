/* ===== The Witch Atelier, privacy notice =====
   Deliberately a NOTICE, not a consent gate. The site sets no cookies and loads
   nothing from third parties, so there is no lawful basis question to ask about. putting an "accept / reject" choice here would be theatre. It states the fact,
   links to the detail, and gets out of the way once dismissed. */
(function () {
  var KEY = 'umbral.notice';
  var T = {
    es: {
      body: 'Sin analítica, sin publicidad, sin recursos de terceros. Solo una cookie técnica para las consultas gratuitas, y el idioma que eliges.',
      more: 'Detalles',
      ok: 'Entendido',
      label: 'Aviso de privacidad',
    },
    en: {
      body: 'No analytics, no advertising, nothing loaded from third parties. Just one technical cookie for the free consultations, and the language you pick.',
      more: 'Details',
      ok: 'Got it',
      label: 'Privacy notice',
    },
    de: {
      body: 'Keine Analyse, keine Werbung, nichts von Dritten geladen. Nur ein technisches Cookie für die Gratis-Beratungen und die Sprache, die du wählst.',
      more: 'Details',
      ok: 'Verstanden',
      label: 'Datenschutzhinweis',
    },
  };

  function seen() { try { return localStorage.getItem(KEY) === '1'; } catch (e) { return false; } }
  function remember() { try { localStorage.setItem(KEY, '1'); } catch (e) {} }

  /* must match the rule in app.js and on the legal pages, or the notice can
     come up in one language while the page is in the other */
  function lang() {
    if (window.getLang) return window.getLang();
    var stored = null;
    try { stored = localStorage.getItem('umbral.lang'); } catch (e) {}
    if (stored === 'en' || stored === 'es' || stored === 'de') return stored;
    var nav = (navigator.language || 'es').slice(0, 2).toLowerCase();
    return nav === 'en' ? 'en' : nav === 'de' ? 'de' : 'es';
  }

  var current = null;

  /* the notice is built once, but the visitor can switch language while it is
     still on screen. repaint it instead of leaving it in the old one */
  function repaint() {
    if (!current) return;
    var S = T[lang()];
    current.setAttribute('aria-label', S.label);
    current.querySelector('p').innerHTML =
      S.body + ' <a href="/cookies.html">' + S.more + '</a>';
    current.querySelector('button').textContent = S.ok;
  }

  function build() {
    if (seen()) return;
    var S = T[lang()];
    var el = document.createElement('div');
    el.className = 'privacy-notice';
    el.setAttribute('role', 'region');
    el.setAttribute('aria-label', S.label);
    el.innerHTML =
      '<p>' + S.body + ' <a href="/cookies.html">' + S.more + '</a></p>' +
      '<button type="button" class="btn btn-ghost">' + S.ok + '</button>';
    el.querySelector('button').addEventListener('click', function () {
      remember();
      el.classList.add('is-out');
      setTimeout(function () { el.remove(); current = null; }, 260);
    });
    document.body.appendChild(el);
    current = el;
    requestAnimationFrame(function () { el.classList.add('is-in'); });
  }

  document.addEventListener('langchange', repaint);

  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', build);
  else build();
})();
