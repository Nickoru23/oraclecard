/* ===== The Witch Atelier, daily horoscope =====
   Every sign gets three cards a day: love, work, and the day itself. The draw is
   seeded from the date and the sign, so it is the same card for everyone who
   looks at Leo today, in every language, and a different one tomorrow. No server
   call, no stored state, nothing to go stale. the date is the only input. */
(function () {
  const SIGNS = [
    { id: 'aries',       g: '♈', from: [3, 21],  to: [4, 19] },
    { id: 'tauro',       g: '♉', from: [4, 20],  to: [5, 20] },
    { id: 'geminis',     g: '♊', from: [5, 21],  to: [6, 20] },
    { id: 'cancer',      g: '♋', from: [6, 21],  to: [7, 22] },
    { id: 'leo',         g: '♌', from: [7, 23],  to: [8, 22] },
    { id: 'virgo',       g: '♍', from: [8, 23],  to: [9, 22] },
    { id: 'libra',       g: '♎', from: [9, 23],  to: [10, 22] },
    { id: 'escorpio',    g: '♏', from: [10, 23], to: [11, 21] },
    { id: 'sagitario',   g: '♐', from: [11, 22], to: [12, 21] },
    { id: 'capricornio', g: '♑', from: [12, 22], to: [1, 19] },
    { id: 'acuario',     g: '♒', from: [1, 20],  to: [2, 18] },
    { id: 'piscis',      g: '♓', from: [2, 19],  to: [3, 20] },
  ];

  /* xmur3 + mulberry32: small, seeded, and identical in every browser. which is
     the whole point. Math.random() would give each visitor a different Leo. */
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

  const COLOURS = [
    { hex: '#C9A227', k: 'col_gold' },   { hex: '#2E6E6B', k: 'col_teal' },
    { hex: '#8E3B46', k: 'col_wine' },   { hex: '#16314F', k: 'col_navy' },
    { hex: '#5E7B4A', k: 'col_moss' },   { hex: '#B96A3C', k: 'col_amber' },
    { hex: '#6C5B8E', k: 'col_violet' }, { hex: '#EDE6D6', k: 'col_bone' },
  ];

  const SLOTS = ['love', 'work', 'day'];

  /* the day key is the calendar date in the visitor's own timezone: the
     horoscope should turn over at their midnight, not at UTC's */
  function dayKey(d) {
    d = d || new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function forSign(signId, date) {
    const key = dayKey(date);
    const rnd = seeded(`${key}|${signId}`);
    const pool = window.DECK.slice();
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    const cards = SLOTS.map((slot, i) => ({ slot, card: pool[i], v: Math.floor(rnd() * 4) }));
    return {
      key,
      cards,
      open: Math.floor(rnd() * 4),
      close: Math.floor(rnd() * 4),
      number: 1 + Math.floor(rnd() * 99),
      colour: COLOURS[Math.floor(rnd() * COLOURS.length)],
    };
  }

  /* the richest text the card actually has for that slot. the majors carry
     written love and work passages, the rest carry their general meaning */
  function slotText(slot, card, lang) {
    if (slot === 'love' && card.love) return card.love[lang];
    if (slot === 'work' && card.work) return card.work[lang];
    return card.up[lang];
  }


  /* What each sign is taken to be like here, one clause, used to open the day.
     This is the part that makes it a horoscope rather than three card entries:
     the same card lands differently on someone who decides fast and on someone
     who weighs everything twice. */
  const TRAITS = {
    es: {
      aries: 'arrancas antes de tener el plan entero',
      tauro: 'no sueltas lo que ya has construido',
      geminis: 'piensas en voz alta y cambias de idea al hacerlo',
      cancer: 'te acuerdas de todo, sobre todo de lo que dolió',
      leo: 'no sabes hacer las cosas a medias',
      virgo: 'ves el fallo antes que nadie, incluido el tuyo',
      libra: 'pesas las dos versiones hasta que se enfrían',
      escorpio: 'no preguntas lo que ya has averiguado',
      sagitario: 'prefieres el sitio nuevo al sitio seguro',
      capricornio: 'aguantas más de lo que sería sensato',
      acuario: 'te niegas a hacerlo como se ha hecho siempre',
      piscis: 'absorbes el ánimo de la habitación sin querer',
    },
    en: {
      aries: 'you start before the plan is finished',
      tauro: 'you do not let go of what you have built',
      geminis: 'you think out loud and change your mind while doing it',
      cancer: 'you remember everything, the sore parts most of all',
      leo: 'you do not know how to do things by halves',
      virgo: 'you see the flaw before anyone else, your own included',
      libra: 'you weigh both versions until they go cold',
      escorpio: 'you do not ask what you have already worked out',
      sagitario: 'you prefer the new place to the safe one',
      capricornio: 'you endure longer than would be sensible',
      acuario: 'you refuse to do it the way it has always been done',
      piscis: 'you pick up the mood of a room without meaning to',
    },
    de: {
      aries: 'du gehst los, bevor der Plan fertig ist',
      tauro: 'du lässt nicht los, was du aufgebaut hast',
      geminis: 'du denkst laut und änderst dabei deine Meinung',
      cancer: 'du erinnerst dich an alles, an das Wunde zuerst',
      leo: 'du kannst nichts halb machen',
      virgo: 'du siehst den Fehler vor allen, auch den eigenen',
      libra: 'du wiegst beide Fassungen, bis sie kalt werden',
      escorpio: 'du fragst nicht, was du längst herausgefunden hast',
      sagitario: 'dir ist das neue Feld lieber als das sichere',
      capricornio: 'du hältst länger aus, als vernünftig wäre',
      acuario: 'du weigerst dich, es wie immer zu machen',
      piscis: 'du nimmst die Stimmung eines Raums ungewollt auf',
    },
  };

  /* ---- the horoscope as prose ----
     A card's dictionary entry is not a horoscope. These frames wrap the entry in
     a sentence addressed to the sign and the day, so the page reads like someone
     wrote it rather than like a lookup table. Four variants per slot, picked by
     the same seed as the cards, so a sign's phrasing changes with its cards
     instead of repeating word for word every morning. */
  const FRAMES = {
    es: {
      open: [
        '{s}: {t}. Hoy la carta que cubre el día es {c}, y ahí está el roce, porque te pide justo lo contrario de lo que te sale solo.',
        '{s}: {t}. El día viene marcado por {c}, que no te contradice; te pide que lo hagas despacio y a la vista.',
        '{s}: {t}. Y hoy sale {c}. La combinación funciona bien mientras no la fuerces antes de tiempo.',
        '{s}: {t}. Con {c} sobre la mesa, el día no pide carácter nuevo: pide el de siempre, mejor dirigido.',
      ],
      love: [
        'En lo afectivo aparece {c}, y lo que trae es esto:',
        'Para los vínculos, hoy manda {c}:',
        'En el amor, la carta del día es {c}. Dice así:',
        'Lo que toca hoy en lo afectivo lo marca {c}:',
      ],
      work: [
        'En el trabajo sale {c}, que apunta a algo concreto:',
        'Para lo profesional, hoy la carta es {c}:',
        'En lo laboral aparece {c}. Lo que señala:',
        'El terreno del trabajo lo ocupa hoy {c}:',
      ],
      day: [
        'Y para el día entero, {c}:',
        'Sobre el conjunto del día pesa {c}:',
        'La carta que cubre todo el día es {c}:',
        'Como fondo de la jornada, {c}:',
      ],
      close: [
        'Nada de esto es obligatorio. Si algo de aquí te suena, úsalo; si no, mañana hay otras tres.',
        'Tómalo como una pregunta, no como una respuesta: ¿dónde encaja esto en lo que ya sabías?',
        'La utilidad de una carta está en lo que te hace mirar, no en lo que te promete.',
        'Si el día va por otro sitio, el día tiene razón. Las cartas solo abren la conversación.',
      ],
    },
    en: {
      open: [
        '{s}: {t}. Today the card covering the day is {c}, and that is the friction, because it asks for the opposite of what comes naturally.',
        '{s}: {t}. The day is marked by {c}, which does not contradict you; it asks you to do it slowly and in the open.',
        '{s}: {t}. And today {c} comes up. The combination works well as long as you do not force it early.',
        '{s}: {t}. With {c} on the table, the day is not asking for a new character, it asks for your usual one, better aimed.',
      ],
      love: [
        'On the side of affection, {c} turns up, and here is what it brings:',
        'For bonds and closeness, today belongs to {c}:',
        'In love, the card of the day is {c}. It reads:',
        'What is in play today with people is set by {c}:',
      ],
      work: [
        'At work, {c} comes up, pointing at something concrete:',
        'For the professional side, today’s card is {c}:',
        'In working life {c} appears. What it marks:',
        'The ground of work is held today by {c}:',
      ],
      day: [
        'And for the day as a whole, {c}:',
        'Sitting over the whole day is {c}:',
        'The card covering the day entire is {c}:',
        'As the background of the day, {c}:',
      ],
      close: [
        'None of this is compulsory. If something here lands, use it; if not, tomorrow brings three more.',
        'Take it as a question rather than an answer: where does this fit with what you already knew?',
        'A card is useful for what it makes you look at, not for what it promises.',
        'If the day goes another way, the day is right. The cards only open the conversation.',
      ],
    },
    de: {
      open: [
        '{s}: {t}. Heute deckt {c} den Tag ab, und genau da reibt es, denn die Karte verlangt das Gegenteil von dem, was dir leichtfällt.',
        '{s}: {t}. Der Tag steht unter {c}; kein Widerspruch zu dir, nur die Bitte, es langsam und offen zu tun.',
        '{s}: {t}. Und heute kommt {c}. Die Verbindung trägt gut, solange du sie nicht zu früh erzwingst.',
        '{s}: {t}. Mit {c} auf dem Tisch verlangt der Tag keinen neuen Charakter, nur deinen gewohnten, besser gezielt.',
      ],
      love: [
        'Auf der Seite der Gefühle taucht {c} auf, und das bringt sie mit:',
        'Für Bindungen und Nähe gehört der Tag {c}:',
        'In der Liebe ist die Karte des Tages {c}. Sie sagt:',
        'Was heute zwischen Menschen im Spiel ist, setzt {c}:',
      ],
      work: [
        'In der Arbeit kommt {c} und zeigt auf etwas Konkretes:',
        'Für das Berufliche ist die Karte heute {c}:',
        'Im Arbeitsleben erscheint {c}. Was sie markiert:',
        'Den Boden der Arbeit hält heute {c}:',
      ],
      day: [
        'Und für den ganzen Tag, {c}:',
        'Über dem ganzen Tag liegt {c}:',
        'Die Karte, die den ganzen Tag abdeckt, ist {c}:',
        'Als Hintergrund des Tages, {c}:',
      ],
      close: [
        'Nichts davon ist Pflicht. Wenn etwas hier trifft, nimm es; wenn nicht, gibt es morgen drei neue.',
        'Nimm es als Frage, nicht als Antwort: Wo passt das zu dem, was du ohnehin wusstest?',
        'Eine Karte nützt durch das, worauf sie dich schauen lässt, nicht durch das, was sie verspricht.',
        'Geht der Tag anders, hat der Tag recht. Die Karten eröffnen nur das Gespräch.',
      ],
    },
  };

  const frame = (lang, kind, i, vars) => {
    const v = vars || {};
    return (FRAMES[lang] || FRAMES.es)[kind][i % 4]
      .replace('{s}', v.sign || '')
      .replace('{t}', v.trait || '')
      .replace('{c}', v.card || '');
  };
  const trait = (lang, id) => (TRAITS[lang] || TRAITS.es)[id];

  function signOf(month, day) {
    return SIGNS.find(s =>
      (month === s.from[0] && day >= s.from[1]) || (month === s.to[0] && day <= s.to[1])
    ) || SIGNS[0];
  }

  window.HOROSCOPE = { SIGNS, COLOURS, SLOTS, forSign, slotText, dayKey, signOf, frame, trait };
})();
