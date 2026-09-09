/* What the checks walk. Kept in one place so adding a page adds it everywhere. */
export const BASE = 'http://127.0.0.1:4321/';
export const LANGS = ['es', 'en', 'de'];
export const PAGES = [
  'index.html', 'fortuna.html', 'horoscopo.html', 'consulta.html', 'lectura.html',
  'gracias.html', 'creditos.html', 'aviso-legal.html', 'privacidad.html',
  'cookies.html', 'atelier.html',
];

/* Where a page lives in a given language. The language is part of the address,
   so this is how a check reaches the English or German version of anything: the
   root addresses are the Spanish ones and the other two carry a prefix. */
export const addr = (page, lang) =>
  (lang === 'es' ? '' : '/' + lang) + '/' + page;

/* Every test browser starts with an empty store, so the daily fortune would
   open over whatever page is under test. What is under test is the page behind
   it, so each context begins with the day already greeted. The fortune has its
   own check, qa-fortune.mjs, which clears this and watches it arrive.

   The language is no longer set here, because it is no longer stored: the
   address decides it. What is left is only the greeting.

   Pass it to addInitScript: ctx.addInitScript(PREP). */
export function PREP() {
  try {
    const d = new Date();
    const day = d.getFullYear() + '-' +
                String(d.getMonth() + 1).padStart(2, '0') + '-' +
                String(d.getDate()).padStart(2, '0');
    localStorage.setItem('twa_greeted', day);
  } catch (e) {}
}
