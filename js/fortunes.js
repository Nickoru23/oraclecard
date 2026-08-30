/* ===== The Witch Atelier — the fortune cookie =====

   One cookie a day. Not a reading and not pretending to be one: a short line to
   carry around, and the card that came with it.

   The draw is seeded from the date and a small random id kept in the visitor's
   own browser, so two people cracking a cookie on the same morning get different
   ones, and the same person gets the same one all day however many times they
   reload. Nothing is sent anywhere. */
(function () {
  const F = {
    es: [
      'Lo que hoy te parece una señal probablemente sea cansancio. Duerme antes de decidir.',
      'La conversación que llevas tres días ensayando dura en realidad cuatro minutos.',
      'Hoy alguien va a interpretar tu silencio. No va a acertar.',
      'Esa cosa pequeña que llevas semanas posponiendo se hace en once minutos.',
      'No te falta información. Te falta ganas de que la respuesta sea esa.',
      'Hoy es mejor día para deshacer que para empezar.',
      'La persona en la que estás pensando también está pensando en otra cosa. Y no pasa nada.',
      'Si hoy dices que sí por educación, mañana lo pagas con intereses.',
      'Lo que estás llamando intuición hoy tiene nombre y apellidos: miedo.',
      'Hoy vas a tener razón en algo y no va a servirte de nada. Suéltalo.',
      'Alguien te va a dar un consejo que en realidad se está dando a sí mismo.',
      'Lo que se resuelve hoy no se resuelve hablando. Se resuelve esperando.',
      'Esa puerta que crees cerrada solo está atascada. Empuja distinto.',
      'Hoy no te toca ser fuerte. Te toca ser preciso.',
      'La mitad de lo que te agobia hoy no es tuyo. Devuélvelo.',
      'Vas a encontrar algo que dabas por perdido, y ya no lo vas a querer.',
      'Hoy el atajo es el camino largo. Otra vez.',
      'Lo que no digas hoy se dirá solo dentro de tres semanas, peor.',
      'Alguien se acordará hoy de ti por algo que ya no recuerdas haber hecho.',
      'La prisa de hoy es prestada. Mira de quién la has cogido.',
      'Hoy te van a ofrecer lo que pediste hace un año. Fíjate si aún lo quieres.',
      'El detalle que estás pasando por alto es el que resuelve el asunto.',
      'No hace falta que te guste para que sea verdad.',
      'Hoy empieza algo que en su momento no vas a notar que empezó.',
    ],
    en: [
      'What looks like a sign today is probably tiredness. Sleep before deciding.',
      'The conversation you have been rehearsing for three days actually takes four minutes.',
      'Someone will read your silence today. They will get it wrong.',
      'That small thing you have put off for weeks takes eleven minutes.',
      'You are not missing information. You are missing the wish for that answer to be true.',
      'Today is a better day for undoing than for starting.',
      'The person you are thinking about is thinking about something else. That is allowed.',
      'If you say yes out of politeness today, you pay it back with interest tomorrow.',
      'What you are calling intuition today has a plainer name. It is fear.',
      'You will be right about something today and it will get you nowhere. Let it go.',
      'Someone will give you advice they are really giving themselves.',
      'What settles today does not settle by talking. It settles by waiting.',
      'That door you think is locked is only stuck. Push differently.',
      'Today is not for being strong. Today is for being precise.',
      'Half of what is weighing on you today is not yours. Give it back.',
      'You will find something you had given up on, and you will not want it any more.',
      'Today the shortcut is the long way round. Again.',
      'What you do not say today will say itself in three weeks, worse.',
      'Someone will remember you today for something you no longer remember doing.',
      'The hurry you feel today is borrowed. Look at who you took it from.',
      'You will be offered today what you asked for a year ago. Check whether you still want it.',
      'The detail you keep skipping over is the one that settles the matter.',
      'It does not have to please you to be true.',
      'Something starts today that you will not notice starting.',
    ],
    de: [
      'Was heute wie ein Zeichen aussieht, ist vermutlich Müdigkeit. Schlaf, bevor du entscheidest.',
      'Das Gespräch, das du seit drei Tagen probst, dauert in Wirklichkeit vier Minuten.',
      'Heute wird jemand dein Schweigen deuten. Er wird danebenliegen.',
      'Die kleine Sache, die du seit Wochen aufschiebst, dauert elf Minuten.',
      'Dir fehlen keine Informationen. Dir fehlt der Wunsch, dass die Antwort so ausfällt.',
      'Heute ist ein besserer Tag zum Rückgängigmachen als zum Anfangen.',
      'Die Person, an die du denkst, denkt gerade an etwas anderes. Das ist in Ordnung.',
      'Wenn du heute aus Höflichkeit Ja sagst, zahlst du es morgen mit Zinsen.',
      'Was du heute Intuition nennst, hat einen schlichteren Namen. Es ist Angst.',
      'Du wirst heute in einer Sache recht haben, und es wird dir nichts nützen. Lass es.',
      'Jemand wird dir einen Rat geben, den er eigentlich sich selbst gibt.',
      'Was sich heute klärt, klärt sich nicht durch Reden. Es klärt sich durch Warten.',
      'Die Tür, die du für verschlossen hältst, klemmt nur. Drück anders.',
      'Heute musst du nicht stark sein. Heute musst du genau sein.',
      'Die Hälfte dessen, was heute auf dir liegt, gehört dir nicht. Gib es zurück.',
      'Du wirst etwas wiederfinden, das du aufgegeben hattest, und es nicht mehr wollen.',
      'Heute ist die Abkürzung der lange Weg. Wieder einmal.',
      'Was du heute nicht sagst, sagt sich in drei Wochen von selbst, schlechter.',
      'Jemand wird sich heute an dich erinnern, für etwas, das du längst vergessen hast.',
      'Die Eile von heute ist geliehen. Schau, bei wem du sie geholt hast.',
      'Heute wird dir angeboten, worum du vor einem Jahr gebeten hast. Prüfe, ob du es noch willst.',
      'Die Kleinigkeit, die du überspringst, ist die, die die Sache entscheidet.',
      'Es muss dir nicht gefallen, um wahr zu sein.',
      'Heute beginnt etwas, dessen Anfang du nicht bemerken wirst.',
    ],
  };

  /* one line about the card that came with it, so the cookie is still tarot */
  const WITH_CARD = {
    es: 'La carta que venía dentro',
    en: 'The card that came with it',
    de: 'Die Karte, die dabei lag',
  };

  const KEY = 'umbral.cookie';

  /* a small id that never leaves the browser, so two people get different
     cookies on the same day without us knowing anything about either of them */
  function visitorId() {
    try {
      let v = localStorage.getItem('umbral.vid');
      if (!v) {
        v = String(Math.floor(Math.random() * 1e9));
        localStorage.setItem('umbral.vid', v);
      }
      return v;
    } catch (e) { return '0'; }
  }

  function seeded(str) {
    let h = 1779033703 ^ str.length;
    for (let i = 0; i < str.length; i++) {
      h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
      h = (h << 13) | (h >>> 19);
    }
    let a = (h ^= h >>> 16) >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const dayKey = d => {
    d = d || new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  function todaysCookie(lang) {
    const key = dayKey();
    const rnd = seeded(`${key}|${visitorId()}`);
    const list = F[lang] || F.es;
    const fortune = list[Math.floor(rnd() * list.length)];
    const card = window.DECK[Math.floor(rnd() * window.DECK.length)];
    return { key, fortune, card, label: (WITH_CARD[lang] || WITH_CARD.es) };
  }

  /* opened state and the streak, both kept in this browser only */
  function state() {
    try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { return {}; }
  }
  function save(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {} }

  function openedToday() { return state().day === dayKey(); }

  function markOpened() {
    const s = state(), today = dayKey();
    if (s.day === today) return s;
    const y = new Date(); y.setDate(y.getDate() - 1);
    /* a streak only counts if yesterday was the last one, otherwise it restarts */
    s.streak = s.day === dayKey(y) ? (s.streak || 1) + 1 : 1;
    s.day = today;
    s.total = (s.total || 0) + 1;
    save(s);
    return s;
  }

  window.COOKIE = { todaysCookie, openedToday, markOpened, state, dayKey };
})();
