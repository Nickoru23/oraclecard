/* The reading that gets written when the writer cannot be reached.

   A visitor who has picked their cards has done their part of the ritual; ending
   that with "try again in a minute" is the one outcome the page must never have.
   So the free consultation falls back to this: a reading assembled from the
   atelier's own written card texts, arranged against the question that was asked.

   It reads the question before it answers. Not with a model, with a small,
   honest analysis: what the question is about, how long it has been going on,
   whether somebody else is in it, and whether they are asking to choose or
   asking to understand. Those four things change which frames get used, so the
   result is about their situation rather than about tarot in general.

   The response carries origin:'atelier' so the site owner can tell the two apart
   in the logs while the visitor simply gets their reading. */

const CUT = 260;

const esc = s => String(s).replace(/[<>&]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));

/* ---------- reading the question ---------- */

const TOPIC_WORDS = {
  love: {
    es: ['pareja', 'novi', 'amor', 'relación', 'relacion', 'ex ', 'marido', 'esposa', 'cita', 'enamor', 'matrimoni', 'separa', 'divorci', 'querer a', 'me gusta'],
    en: ['partner', 'boyfriend', 'girlfriend', 'love', 'relationship', 'my ex', 'husband', 'wife', 'dating', 'marriage', 'break up', 'breakup', 'in love'],
    de: ['partner', 'freund', 'freundin', 'liebe', 'beziehung', 'mein ex', 'ehemann', 'ehefrau', 'ehe', 'trennung', 'verliebt', 'date'],
  },
  work: {
    es: ['trabajo', 'jefe', 'jefa', 'empresa', 'curro', 'oficina', 'contrato', 'ascenso', 'despid', 'negocio', 'proyecto', 'sueldo', 'cliente', 'carrera', 'estudi'],
    en: ['job', 'boss', 'work', 'company', 'office', 'contract', 'promotion', 'fired', 'redundan', 'business', 'project', 'salary', 'client', 'career', 'stud'],
    de: ['job', 'chef', 'arbeit', 'firma', 'büro', 'buero', 'vertrag', 'beförderung', 'gekündigt', 'kündigung', 'projekt', 'gehalt', 'kunde', 'karriere', 'studi'],
  },
  money: {
    es: ['dinero', 'deuda', 'pagar', 'ahorr', 'hipoteca', 'factura', 'alquiler'],
    en: ['money', 'debt', 'afford', 'savings', 'mortgage', 'bills', 'rent'],
    de: ['geld', 'schulden', 'sparen', 'miete', 'rechnung', 'kredit'],
  },
  family: {
    es: ['madre', 'padre', 'hijo', 'hija', 'familia', 'hermano', 'hermana', 'mi casa'],
    en: ['mother', 'father', 'mum', 'dad', 'son', 'daughter', 'family', 'brother', 'sister'],
    de: ['mutter', 'vater', 'sohn', 'tochter', 'familie', 'bruder', 'schwester'],
  },
  move: {
    es: ['mudar', 'mudanza', 'país', 'pais', 'ciudad', 'irme', 'volver a vivir', 'emigrar'],
    en: ['move to', 'moving', 'country', 'city', 'relocate', 'emigrat'],
    de: ['umziehen', 'umzug', 'land', 'stadt', 'auswandern'],
  },
};

const DECIDE_WORDS = {
  es: ['decidir', 'decisión', 'decision', 'elegir', 'no sé si', 'no se si', 'debería', 'deberia', 'me quedo', 'me voy', 'o no'],
  en: ['decide', 'decision', 'choose', 'whether', 'should i', 'do i stay', 'do i leave', 'or not'],
  de: ['entscheid', 'wählen', 'soll ich', 'ob ich', 'bleiben oder', 'oder nicht'],
};

const OTHER_WORDS = {
  es: [' él', ' ella', ' ellos', 'mi pareja', 'mi jefe', 'mi madre', 'mi padre', 'nos '],
  en: [' he ', ' she ', ' they ', 'my partner', 'my boss', 'my mother', 'my father', ' we '],
  de: [' er ', ' sie ', 'mein partner', 'mein chef', 'meine mutter', 'mein vater', ' wir '],
};

const DURATION = {
  es: /\b(\d{1,2}|un|una|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|once|doce)\s+(d[ií]as?|semanas?|meses|mes|años?|anos?)\b/i,
  en: /\b(\d{1,2}|a|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\s+(days?|weeks?|months?|years?)\b/i,
  de: /\b(\d{1,2}|ein(?:em|en|er)?|zwei|drei|vier|fünf|sechs|sieben|acht|neun|zehn|elf|zwölf)\s+(tagen?|wochen?|monaten?|monate|jahren?|jahre)\b/i,
};

export function analyse(question, lang) {
  const q = ' ' + String(question || '').toLowerCase() + ' ';
  const hit = list => (list[lang] || list.es).some(w => q.includes(w));

  let topic = 'open';
  let best = 0;
  for (const [name, words] of Object.entries(TOPIC_WORDS)) {
    const list = words[lang] || words.es;
    const n = list.filter(w => q.includes(w)).length;
    if (n > best) { best = n; topic = name; }
  }
  const m = String(question || '').match(DURATION[lang] || DURATION.es);
  return {
    topic,
    deciding: hit(DECIDE_WORDS),
    other: hit(OTHER_WORDS),
    howLong: m ? m[0] : null,
  };
}


/* the sun sign, computed from the birth date on the page and passed through */
const SIGN_NAME = {
  es: { aries:'Aries', tauro:'Tauro', geminis:'Géminis', cancer:'Cáncer', leo:'Leo', virgo:'Virgo', libra:'Libra', escorpio:'Escorpio', sagitario:'Sagitario', capricornio:'Capricornio', acuario:'Acuario', piscis:'Piscis' },
  en: { aries:'Aries', tauro:'Taurus', geminis:'Gemini', cancer:'Cancer', leo:'Leo', virgo:'Virgo', libra:'Libra', escorpio:'Scorpio', sagitario:'Sagittarius', capricornio:'Capricorn', acuario:'Aquarius', piscis:'Pisces' },
  de: { aries:'Widder', tauro:'Stier', geminis:'Zwillinge', cancer:'Krebs', leo:'Löwe', virgo:'Jungfrau', libra:'Waage', escorpio:'Skorpion', sagitario:'Schütze', capricornio:'Steinbock', acuario:'Wassermann', piscis:'Fische' },
};
const SIGN_TRAIT = {
  es: { aries:'arrancas antes de tener el plan entero', tauro:'no sueltas lo que ya has construido', geminis:'piensas en voz alta y cambias de idea al hacerlo', cancer:'te acuerdas de todo, sobre todo de lo que dolió', leo:'no sabes hacer las cosas a medias', virgo:'ves el fallo antes que nadie, incluido el tuyo', libra:'pesas las dos versiones hasta que se enfrían', escorpio:'no preguntas lo que ya has averiguado', sagitario:'prefieres el sitio nuevo al sitio seguro', capricornio:'aguantas más de lo que sería sensato', acuario:'te niegas a hacerlo como se ha hecho siempre', piscis:'absorbes el ánimo de la habitación sin querer' },
  en: { aries:'you start before the plan is finished', tauro:'you do not let go of what you have built', geminis:'you think out loud and change your mind while doing it', cancer:'you remember everything, the sore parts most of all', leo:'you do not know how to do things by halves', virgo:'you see the flaw before anyone else, your own included', libra:'you weigh both versions until they go cold', escorpio:'you do not ask what you have already worked out', sagitario:'you prefer the new place to the safe one', capricornio:'you endure longer than would be sensible', acuario:'you refuse to do it the way it has always been done', piscis:'you pick up the mood of a room without meaning to' },
  de: { aries:'du gehst los, bevor der Plan fertig ist', tauro:'du lässt nicht los, was du aufgebaut hast', geminis:'du denkst laut und änderst dabei deine Meinung', cancer:'du erinnerst dich an alles, an das Wunde zuerst', leo:'du kannst nichts halb machen', virgo:'du siehst den Fehler vor allen, auch den eigenen', libra:'du wiegst beide Fassungen, bis sie kalt werden', escorpio:'du fragst nicht, was du längst herausgefunden hast', sagitario:'dir ist das neue Feld lieber als das sichere', capricornio:'du hältst länger aus, als vernünftig wäre', acuario:'du weigerst dich, es wie immer zu machen', piscis:'du nimmst die Stimmung eines Raums ungewollt auf' },
};
const SIGN_LINE = {
  es: (n, d, t) => `Naciste con el Sol en ${n}${d === null || d === undefined ? '' : `, grado ${d}`}, y de ahí viene una parte del asunto: ${t}. Eso no es un destino, es una tendencia, y las tendencias se pueden usar a favor cuando se ven.`,
  en: (n, d, t) => `You were born with the Sun in ${n}${d === null || d === undefined ? '' : `, at ${d} degrees`}, and part of this comes from there: ${t}. That is not a fate, it is a tendency, and tendencies can be used in your favour once you can see them.`,
  de: (n, d, t) => `Du bist mit der Sonne in ${n}${d === null || d === undefined ? '' : `, bei ${d} Grad`} geboren, und ein Teil davon kommt daher: ${t}. Das ist kein Schicksal, das ist eine Neigung, und Neigungen lassen sich nutzen, sobald man sie sieht.`,
};

/* ---------- the frames ---------- */

const T = {
  es: {
    q: 'Tu pregunta', one: 'Lo que dice la carta', two: 'Lo que dicen las cartas',
    you: 'Lo que te toca a ti',
    asked: n => `${n}, esto es lo que has traído a la mesa:`,
    drew1: c => `Sobre eso ha salido <strong>${c}</strong>.`,
    drew2: (a, b) => `Sobre eso han salido dos cartas: <strong>${a}</strong>, donde estás ahora, y <strong>${b}</strong>, hacia dónde se mueve.`,
    posA: 'Dónde estás ahora', posB: 'Hacia dónde se mueve',
    topic: {
      love: 'Lo que preguntas es de vínculos, y eso cambia cómo se lee la tirada: aquí no hay una respuesta correcta esperándote, hay dos personas y dos ritmos distintos.',
      work: 'Lo que preguntas es de trabajo. Esas preguntas casi nunca son solo del trabajo: debajo suele haber algo sobre cuánto de ti estás dispuesto a gastar y a cambio de qué.',
      money: 'Lo que preguntas tiene una parte de números, y los números no se leen en cartas. Lo que sí se lee es el miedo o la prisa con la que estás mirando esos números.',
      family: 'Lo que preguntas es de familia, que es el terreno donde más cuesta separar lo que quieres de lo que te enseñaron a querer.',
      move: 'Lo que preguntas es de irte o quedarte en un sitio. La tirada no dice qué ciudad: dice qué estás buscando dejar atrás.',
      open: 'Lo que has escrito no cabe en una etiqueta, y mejor así: la tirada responde a la situación entera, no a un tema.',
    },
    deciding: 'Y lo traes como una decisión entre dos caminos. Conviene decir una cosa antes de seguir: las cartas no eligen. Lo que hacen es enseñarte cuál de los dos estás evitando mirar de verdad.',
    other: 'Hay otra persona dentro de la pregunta, así que hay una parte de esto que no depende de ti. La lectura solo puede hablar de tu mitad.',
    howLong: d => `Y llevas ${d} en ello. Ese dato importa: a esas alturas la costumbre pesa tanto como el deseo, y cuesta distinguirlos.`,
    apply: {
      love: 'Llevado a tu vínculo: mira si esto describe lo que sientes o lo que has decidido sentir.',
      work: 'Llevado a tu trabajo: pregúntate si describe el puesto o la idea que te has hecho del puesto.',
      money: 'Llevado a lo tuyo: separa lo que es cuenta de lo que es susto. No son lo mismo y no se arreglan igual.',
      family: 'Llevado a los tuyos: casi siempre describe un papel viejo que sigues interpretando sin querer.',
      move: 'Llevado a tu caso: fíjate si habla del sitio nuevo o de la prisa por salir del actual.',
      open: 'Llevado a tu caso: quédate con la frase que te haya incomodado al leerla. Suele ser la que iba contigo.',
    },
    bridge: (a, b) => `El paso de ${a} a ${b} es lo que ninguna de las dos dice por separado: no describe un final, describe una dirección. Lo que hoy pesa no tiene por qué seguir pesando igual, y lo que se mueve todavía admite que lo empujes.`,
    keys: k => `Las palabras que trae la tirada: ${k}.`,
    close1: 'Ninguna carta decide por ti. Lo que hace una tirada es enseñarte el asunto sin los adornos con los que te lo cuentas, y dejarte a solas con la parte que sí depende de ti.',
    close2: d => `Una cosa concreta para estas semanas: fíjate en ${d}. No para confirmar la lectura, para tener un dato en vez de una sensación.`,
    signals: {
      love: 'quién de los dos propone los planes',
      work: 'cuánto tardas en volver a estar bien el domingo por la tarde',
      money: 'cuántas decisiones tomas por miedo y cuántas por cálculo',
      family: 'de qué conversaciones sales cansado y de cuáles no',
      move: 'si hablas más del sitio nuevo o del que quieres dejar',
      open: 'qué te da energía esta semana y qué te la quita',
    },
    inside1: 'La carta por dentro', inside2: 'Las cartas por dentro',
    knot: 'El nudo', against: 'Lo que las cartas no aconsejan',
    knotText: {
      love: 'El nudo casi nunca es la otra persona. Suele ser la pregunta que no te haces en voz alta: si esto siguiera exactamente igual durante un año, ¿lo firmarías? La respuesta a esa pregunta es la que ya sabes.',
      work: 'El nudo casi nunca es el puesto. Suele ser cuánto de tu identidad has puesto ahí dentro, y qué queda de ti si eso se retira.',
      money: 'El nudo casi nunca son los números. Suele ser lo que crees que dice de ti tener más o tener menos, que es una conversación distinta y más vieja.',
      family: 'El nudo casi nunca es lo que se dijo. Suele ser el papel que te tocó a los doce años y que nadie ha revisado desde entonces.',
      move: 'El nudo casi nunca es el sitio. Suele ser si te vas hacia algo o si te vas de algo, porque las dos cosas hacen la maleta igual y terminan muy distinto.',
      open: 'El nudo casi nunca es lo que preguntaste. Suele estar en la frase que escribiste de paso, esa que parecía contexto y no lo era.',
    },
    againstText: {
      love: 'Esta tirada desaconseja el gesto grande: la conversación definitiva, el mensaje larguísimo, el ultimátum. Ahora mismo eso resolvería tu ansiedad, no la situación.',
      work: 'Esta tirada desaconseja decidir en caliente un domingo por la noche. Lo que se decide con ese ánimo casi siempre se revisa el miércoles.',
      money: 'Esta tirada desaconseja el movimiento defensivo apresurado. El miedo administra mal, y lo hace además muy rápido.',
      family: 'Esta tirada desaconseja el ajuste de cuentas retroactivo. Puedes cambiar el trato de ahora en adelante, pero no vas a ganar la discusión de hace quince años.',
      move: 'Esta tirada desaconseja irte sin nombrar de qué te vas. Lo que no se nombra se mete en la maleta y aparece en la ciudad nueva.',
      open: 'Esta tirada desaconseja resolverlo entero de una vez. Lo que tienes delante se deshace por partes, no de un tirón.',
    },
    close3: 'Y una última cosa: si vuelves dentro de un mes con la misma pregunta y salen otras cartas, no es que el tarot falle. Es que tú te has movido, y eso también es información.',
    reversed: 'invertida',
  },

  en: {
    q: 'Your question', one: 'What the card says', two: 'What the cards say',
    you: 'What is yours to do',
    asked: n => `${n}, this is what you brought to the table:`,
    drew1: c => `For that, <strong>${c}</strong> came up.`,
    drew2: (a, b) => `For that, two cards came up: <strong>${a}</strong>, where you are now, and <strong>${b}</strong>, where it is moving.`,
    posA: 'Where you are now', posB: 'Where it is moving',
    topic: {
      love: 'What you are asking about is a bond, and that changes how the spread reads: there is no correct answer waiting for you here, there are two people and two different tempos.',
      work: 'What you are asking about is work. Those questions are almost never only about work, underneath there is usually something about how much of yourself you are willing to spend, and in exchange for what.',
      money: 'Part of what you are asking is arithmetic, and arithmetic is not read in cards. What can be read is the fear or the hurry you are looking at those numbers with.',
      family: 'What you are asking about is family, which is the ground where it is hardest to separate what you want from what you were taught to want.',
      move: 'What you are asking is whether to go or stay somewhere. The spread does not name a city, it names what you are trying to leave behind.',
      open: 'What you wrote does not fit a label, and that is better: the spread answers the whole situation, not a category.',
    },
    deciding: 'And you bring it as a choice between two roads. One thing is worth saying before going on: cards do not choose. What they do is show you which of the two you have been avoiding looking at properly.',
    other: 'There is another person inside the question, so part of this does not depend on you. The reading can only speak about your half.',
    howLong: d => `And you have been in it ${d}. That detail matters: by then habit weighs as much as wanting, and the two are hard to tell apart.`,
    apply: {
      love: 'Brought to your bond: notice whether this describes what you feel or what you decided to feel.',
      work: 'Brought to your work: ask whether it describes the job or the idea of the job you have built.',
      money: 'Brought to yours: separate what is arithmetic from what is fright. They are not the same and they are not fixed the same way.',
      family: 'Brought to yours: it almost always describes an old role you are still playing without meaning to.',
      move: 'Brought to your case: notice whether it speaks about the new place or about the hurry to leave the current one.',
      open: 'Brought to your case: keep the sentence that made you uncomfortable reading it. That is usually the one that was about you.',
    },
    bridge: (a, b) => `The move from ${a} to ${b} is what neither card says on its own: it does not describe an ending, it describes a direction. What weighs on you today does not have to keep weighing the same, and what is moving will still take a push from you.`,
    keys: k => `The words this spread carries: ${k}.`,
    close1: 'No card decides anything for you. What a spread does is show you the matter without the trimmings you usually tell it with, and leave you alone with the part that genuinely depends on you.',
    close2: d => `One concrete thing for the coming weeks: watch ${d}. Not to confirm the reading, to have a fact instead of a feeling.`,
    signals: {
      love: 'which of you suggests the plans',
      work: 'how long it takes you to feel alright again on a Sunday evening',
      money: 'how many decisions you make out of fear and how many out of arithmetic',
      family: 'which conversations leave you tired and which do not',
      move: 'whether you talk more about the new place or the one you want to leave',
      open: 'what gives you energy this week and what takes it',
    },
    inside1: 'Inside the card', inside2: 'Inside the cards',
    knot: 'The knot', against: 'What the cards do not advise',
    knotText: {
      love: 'The knot is almost never the other person. It is usually the question you do not ask out loud: if this stayed exactly as it is for a year, would you sign for it? You already know the answer to that one.',
      work: 'The knot is almost never the job. It is usually how much of your identity you parked in there, and what is left of you if that is withdrawn.',
      money: 'The knot is almost never the numbers. It is usually what you believe having more or having less says about you, which is a different and much older conversation.',
      family: 'The knot is almost never what was said. It is usually the role you were handed at twelve, which nobody has reviewed since.',
      move: 'The knot is almost never the place. It is whether you are going towards something or away from something, because both pack the same suitcase and end very differently.',
      open: 'The knot is almost never what you asked. It is usually in the sentence you wrote in passing, the one that looked like context and was not.',
    },
    againstText: {
      love: 'This spread argues against the grand gesture: the definitive conversation, the very long message, the ultimatum. Right now that would settle your anxiety, not the situation.',
      work: 'This spread argues against deciding hot on a Sunday night. What gets decided in that mood almost always gets revisited on Wednesday.',
      money: 'This spread argues against the hurried defensive move. Fear manages badly, and it does it very fast.',
      family: 'This spread argues against the retroactive settling of accounts. You can change the terms from here on, but you are not going to win the argument from fifteen years ago.',
      move: 'This spread argues against leaving without naming what you are leaving. What goes unnamed gets into the suitcase and turns up in the new city.',
      open: 'This spread argues against solving the whole thing at once. What is in front of you comes apart in pieces, not in one pull.',
    },
    close3: 'One last thing: if you come back in a month with the same question and different cards turn up, that is not the tarot failing. It is you having moved, and that is information too.',
    reversed: 'reversed',
  },

  de: {
    q: 'Deine Frage', one: 'Was die Karte sagt', two: 'Was die Karten sagen',
    you: 'Was bei dir liegt',
    asked: n => `${n}, das hast du auf den Tisch gelegt:`,
    drew1: c => `Darauf kam <strong>${c}</strong>.`,
    drew2: (a, b) => `Darauf kamen zwei Karten: <strong>${a}</strong>, wo du gerade stehst, und <strong>${b}</strong>, wohin es sich bewegt.`,
    posA: 'Wo du gerade stehst', posB: 'Wohin es sich bewegt',
    topic: {
      love: 'Du fragst nach einer Bindung, und das ändert, wie die Legung zu lesen ist: Hier wartet keine richtige Antwort auf dich, hier sind zwei Menschen mit zwei verschiedenen Tempi.',
      work: 'Du fragst nach Arbeit. Solche Fragen sind fast nie nur Arbeitsfragen, darunter liegt meist die Frage, wie viel von dir du auszugeben bereit bist und wofür.',
      money: 'Ein Teil deiner Frage ist Rechnen, und Rechnen liest man nicht in Karten. Lesen lässt sich die Angst oder die Eile, mit der du auf diese Zahlen schaust.',
      family: 'Du fragst nach Familie, dem Gelände, auf dem es am schwersten fällt, das Eigene von dem zu trennen, was man dich wollen gelehrt hat.',
      move: 'Du fragst, ob du gehen oder bleiben sollst. Die Legung nennt keine Stadt, sie nennt, was du hinter dir lassen willst.',
      open: 'Was du geschrieben hast, passt in kein Etikett, und das ist besser so: Die Legung antwortet auf die ganze Lage, nicht auf ein Thema.',
    },
    deciding: 'Und du bringst es als Wahl zwischen zwei Wegen. Eines vorweg: Karten wählen nicht. Sie zeigen dir, welchen der beiden du bisher nicht richtig angesehen hast.',
    other: 'In der Frage steckt noch ein anderer Mensch, also hängt ein Teil davon nicht an dir. Die Deutung kann nur über deine Hälfte sprechen.',
    howLong: d => `Und du bist seit ${d} darin. Das ist wichtig: So weit wiegt Gewohnheit so schwer wie Wollen, und beide sind kaum auseinanderzuhalten.`,
    apply: {
      love: 'Auf deine Bindung bezogen: Prüfe, ob das beschreibt, was du fühlst, oder was du zu fühlen beschlossen hast.',
      work: 'Auf deine Arbeit bezogen: Frag dich, ob es die Stelle beschreibt oder dein Bild von der Stelle.',
      money: 'Auf dich bezogen: Trenne das Rechnen vom Schreck. Das ist nicht dasselbe und wird nicht gleich behoben.',
      family: 'Auf die Deinen bezogen: Fast immer beschreibt es eine alte Rolle, die du ungewollt weiterspielst.',
      move: 'Auf deinen Fall bezogen: Achte darauf, ob es vom neuen Ort spricht oder von der Eile, den jetzigen zu verlassen.',
      open: 'Auf deinen Fall bezogen: Behalte den Satz, der dich beim Lesen unangenehm berührt hat. Meist war das der, der dich meinte.',
    },
    bridge: (a, b) => `Der Übergang von ${a} zu ${b} ist das, was keine der beiden allein sagt: Er beschreibt kein Ende, sondern eine Richtung. Was heute schwer wiegt, muss nicht gleich schwer bleiben, und was sich bewegt, lässt sich von dir noch schieben.`,
    keys: k => `Die Wörter, die diese Legung mitbringt: ${k}.`,
    close1: 'Keine Karte entscheidet etwas für dich. Eine Legung zeigt dir die Sache ohne die Verzierungen, mit denen du sie dir sonst erzählst, und lässt dich mit dem Teil allein, der wirklich an dir liegt.',
    close2: d => `Eine konkrete Sache für die nächsten Wochen: Achte auf ${d}. Nicht um die Deutung zu bestätigen, um eine Tatsache statt eines Gefühls zu haben.`,
    signals: {
      love: 'wer von euch die Pläne vorschlägt',
      work: 'wie lange du am Sonntagabend brauchst, bis es dir wieder gut geht',
      money: 'wie viele Entscheidungen du aus Angst triffst und wie viele aus Rechnung',
      family: 'aus welchen Gesprächen du müde herausgehst und aus welchen nicht',
      move: 'ob du mehr über den neuen Ort sprichst oder über den, den du verlassen willst',
      open: 'was dir diese Woche Energie gibt und was sie nimmt',
    },
    inside1: 'Die Karte von innen', inside2: 'Die Karten von innen',
    knot: 'Der Knoten', against: 'Wovon die Karten abraten',
    knotText: {
      love: 'Der Knoten ist fast nie die andere Person. Meist ist es die Frage, die du nicht laut stellst: Würdest du unterschreiben, wenn es genau so ein Jahr lang bliebe? Die Antwort darauf kennst du schon.',
      work: 'Der Knoten ist fast nie die Stelle. Meist ist es, wie viel deiner Identität du dort abgestellt hast, und was von dir bleibt, wenn das wegfällt.',
      money: 'Der Knoten sind fast nie die Zahlen. Meist ist es das, was mehr oder weniger zu haben deiner Meinung nach über dich sagt, und das ist ein anderes, viel älteres Gespräch.',
      family: 'Der Knoten ist fast nie das Gesagte. Meist ist es die Rolle, die dir mit zwölf zugeteilt wurde und die seitdem niemand überprüft hat.',
      move: 'Der Knoten ist fast nie der Ort. Es ist die Frage, ob du zu etwas hin oder von etwas weg gehst, denn beides packt denselben Koffer und endet sehr verschieden.',
      open: 'Der Knoten ist fast nie das Gefragte. Meist steckt er in dem Satz, den du nebenbei geschrieben hast, der wie Kontext aussah und keiner war.',
    },
    againstText: {
      love: 'Diese Legung rät von der großen Geste ab: dem endgültigen Gespräch, der sehr langen Nachricht, dem Ultimatum. Das würde jetzt deine Unruhe beruhigen, nicht die Lage.',
      work: 'Diese Legung rät davon ab, sonntagabends im Affekt zu entscheiden. Was in dieser Stimmung entschieden wird, steht mittwochs wieder zur Debatte.',
      money: 'Diese Legung rät vom hastigen Abwehrzug ab. Angst verwaltet schlecht, und sie tut es außerdem sehr schnell.',
      family: 'Diese Legung rät von der nachträglichen Abrechnung ab. Du kannst die Bedingungen ab jetzt ändern, aber den Streit von vor fünfzehn Jahren gewinnst du nicht mehr.',
      move: 'Diese Legung rät davon ab, zu gehen, ohne zu benennen, wovon du gehst. Was unbenannt bleibt, kommt in den Koffer und taucht in der neuen Stadt wieder auf.',
      open: 'Diese Legung rät davon ab, alles auf einmal zu lösen. Was vor dir liegt, geht in Teilen auseinander, nicht in einem Zug.',
    },
    close3: 'Und noch etwas: Wenn du in einem Monat mit derselben Frage wiederkommst und andere Karten fallen, versagt nicht das Tarot. Dann hast du dich bewegt, und auch das ist eine Information.',
    reversed: 'umgekehrt',
  },
};

export function compose({ name, question, draws, lang, sign, degree }) {
  const S = T[lang] || T.es;
  const a = analyse(question, lang);
  const q = question.length > CUT ? question.slice(0, CUT).replace(/\s+\S*$/, '') + '…' : question;
  const nm = draws.map(d => d.card.name[lang] + (d.rev ? ` (${S.reversed})` : ''));
  const body = d => (d.rev ? d.card.rev : d.card.up)[lang];
  const out = [];

  /* --- the question, read back --- */
  out.push(`## ${S.q}`);
  out.push(S.asked(esc(name)));
  out.push(`“${esc(q)}”`);
  out.push(S.topic[a.topic]);
  if (a.howLong) out.push(S.howLong(esc(a.howLong)));
  if (a.deciding) out.push(S.deciding);
  else if (a.other) out.push(S.other);
  if (sign && SIGN_LINE[lang] && SIGN_TRAIT[lang][sign]) {
    out.push(SIGN_LINE[lang](SIGN_NAME[lang][sign], degree, SIGN_TRAIT[lang][sign]));
  }
  out.push(draws.length === 1 ? S.drew1(nm[0]) : S.drew2(nm[0], nm[1]));

  /* --- the cards, applied to it --- */
  if (draws.length === 1) {
    const d = draws[0];
    out.push(`## ${S.one}`);
    out.push(body(d));
    if (d.card.love) out.push(d.card.love[lang]);
    if (d.card.work) out.push(d.card.work[lang]);
    out.push(S.apply[a.topic]);
    out.push(S.keys(d.card.kw[lang].slice(0, 4).join(', ')));
  } else {
    out.push(`## ${S.two}`);
    out.push(`<strong>${S.posA}. ${nm[0]}</strong>`);
    out.push(body(draws[0]));
    if (a.topic === 'love' && draws[0].card.love) out.push(draws[0].card.love[lang]);
    if (a.topic === 'work' && draws[0].card.work) out.push(draws[0].card.work[lang]);
    out.push(`<strong>${S.posB}. ${nm[1]}</strong>`);
    out.push(body(draws[1]));
    if (a.topic === 'love' && draws[1].card.love) out.push(draws[1].card.love[lang]);
    if (a.topic === 'work' && draws[1].card.work) out.push(draws[1].card.work[lang]);
    out.push(S.bridge(draws[0].card.name[lang], draws[1].card.name[lang]));
    out.push(S.apply[a.topic]);
    out.push(S.keys([...draws[0].card.kw[lang].slice(0, 2), ...draws[1].card.kw[lang].slice(0, 2)].join(', ')));
  }

  /* --- what the card actually is, for someone new to a deck --- */
  out.push(`## ${draws.length === 1 ? S.inside1 : S.inside2}`);
  draws.forEach(d => cardSchool(d.card, d.rev, lang).forEach(line => out.push(line)));

  /* --- the knot, and the road it argues against --- */
  out.push(`## ${S.knot}`);
  out.push(S.knotText[a.topic]);
  out.push(`## ${S.against}`);
  out.push(S.againstText[a.topic]);

  /* --- and what is left to them --- */
  out.push(`## ${S.you}`);
  out.push(S.close1);
  out.push(S.close2(S.signals[a.topic]));
  out.push(S.close3);
  return out.join('\n');
}


/* ---------- the teaching part ----------
   Someone who has never handled a deck gets more out of a reading if they are
   told what they are looking at: which suit, which number, what those two facts
   mean before any question is asked. This is the material the written reading
   produces on its own and the composed one has to carry itself. */

export const SUITS = {
  w: {
    es: ['Bastos', 'el fuego, la acción y lo que se emprende', 'Los Bastos hablan de impulso y de voluntad: lo que quieres hacer antes de saber si puedes.'],
    en: ['Wands', 'fire, action and what gets started', 'Wands speak of drive and will: what you want to do before you know whether you can.'],
    de: ['Stäbe', 'Feuer, Handlung und das, was begonnen wird', 'Die Stäbe sprechen von Antrieb und Wille: was du tun willst, bevor du weißt, ob du kannst.'],
  },
  c: {
    es: ['Copas', 'el agua, los vínculos y lo que se siente', 'Las Copas hablan de afecto y de memoria: lo que te mueve aunque no lo hayas decidido.'],
    en: ['Cups', 'water, bonds and what is felt', 'Cups speak of affection and memory: what moves you even when you did not decide it.'],
    de: ['Kelche', 'Wasser, Bindungen und das Gefühlte', 'Die Kelche sprechen von Zuneigung und Erinnerung: was dich bewegt, auch wenn du es nicht entschieden hast.'],
  },
  s: {
    es: ['Espadas', 'el aire, el pensamiento y el conflicto', 'Las Espadas hablan de claridad y de corte: lo que entiendes, y lo que entender te cuesta.'],
    en: ['Swords', 'air, thought and conflict', 'Swords speak of clarity and of cutting: what you understand, and what understanding costs you.'],
    de: ['Schwerter', 'Luft, Denken und Konflikt', 'Die Schwerter sprechen von Klarheit und vom Schnitt: was du verstehst und was das Verstehen kostet.'],
  },
  p: {
    es: ['Oros', 'la tierra, el cuerpo y lo que se sostiene en el tiempo', 'Los Oros hablan de trabajo, dinero y salud: lo que hay que mantener, no solo empezar.'],
    en: ['Pentacles', 'earth, the body and what holds over time', 'Pentacles speak of work, money and health: what has to be maintained, not only begun.'],
    de: ['Münzen', 'Erde, Körper und das, was über die Zeit trägt', 'Die Münzen sprechen von Arbeit, Geld und Gesundheit: was gehalten werden muss, nicht nur begonnen.'],
  },
};

export const RANKS = {
  1:  { es: 'el as, que es la semilla pura del palo, antes de que nadie la haya usado',
        en: 'the ace, the pure seed of the suit, before anyone has used it',
        de: 'das Ass, der reine Same der Farbe, bevor ihn jemand benutzt hat' },
  2:  { es: 'el dos, que es la primera relación: algo se pone frente a otra cosa',
        en: 'the two, the first relation: something is set against something else',
        de: 'die Zwei, die erste Beziehung: etwas wird einem anderen gegenübergestellt' },
  3:  { es: 'el tres, donde lo empezado toma forma y ya se ve desde fuera',
        en: 'the three, where what was started takes shape and can be seen from outside',
        de: 'die Drei, wo das Begonnene Form annimmt und von außen sichtbar wird' },
  4:  { es: 'el cuatro, la estructura: descanso si aguanta, encierro si no',
        en: 'the four, structure: rest if it holds, confinement if it does not',
        de: 'die Vier, die Struktur: Ruhe, wenn sie trägt, Enge, wenn nicht' },
  5:  { es: 'el cinco, la pérdida y el roce, que es donde el palo aprende',
        en: 'the five, loss and friction, which is where the suit learns',
        de: 'die Fünf, Verlust und Reibung, dort lernt die Farbe' },
  6:  { es: 'el seis, el arreglo después del golpe: se sigue, con menos',
        en: 'the six, the repair after the blow: it continues, with less',
        de: 'die Sechs, die Reparatur nach dem Schlag: es geht weiter, mit weniger' },
  7:  { es: 'el siete, donde hay que elegir y ninguna opción está limpia',
        en: 'the seven, where a choice is needed and no option is clean',
        de: 'die Sieben, wo gewählt werden muss und keine Option sauber ist' },
  8:  { es: 'el ocho, el oficio y la repetición, que es la parte que nadie aplaude',
        en: 'the eight, craft and repetition, the part nobody applauds',
        de: 'die Acht, Handwerk und Wiederholung, der Teil, den niemand beklatscht' },
  9:  { es: 'el nueve, casi el final: la carta más solitaria del palo',
        en: 'the nine, almost the end: the loneliest card of the suit',
        de: 'die Neun, fast das Ende: die einsamste Karte der Farbe' },
  10: { es: 'el diez, el palo llevado a su extremo, para bien y para mal',
        en: 'the ten, the suit taken to its extreme, for better and for worse',
        de: 'die Zehn, die Farbe in ihrem Äußersten, im Guten wie im Schlechten' },
  11: { es: 'la sota, que es quien aprende: entusiasmo sin oficio todavía',
        en: 'the page, the one who is learning: enthusiasm without craft yet',
        de: 'der Bube, der Lernende: Begeisterung noch ohne Handwerk' },
  12: { es: 'el caballero, que es quien va: velocidad, y poco freno',
        en: 'the knight, the one who goes: speed, and not much brake',
        de: 'der Ritter, der Gehende: Tempo, und wenig Bremse' },
  13: { es: 'la reina, que es quien sostiene desde dentro y conoce el terreno',
        en: 'the queen, who holds it from within and knows the ground',
        de: 'die Königin, die es von innen hält und das Gelände kennt' },
  14: { es: 'el rey, que es quien responde por ello ante los demás',
        en: 'the king, who answers for it in front of everyone else',
        de: 'der König, der dafür vor allen anderen geradesteht' },
};

export const MAJOR = {
  es: 'Es un arcano mayor, y eso cambia la escala: los mayores no describen un episodio de la semana, describen un capítulo. Cuando sale uno, el asunto es más grande de lo que parecía al preguntar.',
  en: 'It is a major arcanum, and that changes the scale: the majors do not describe an episode of the week, they describe a chapter. When one turns up, the matter is larger than it looked when you asked.',
  de: 'Es ist ein großes Arkanum, und das ändert den Maßstab: Die Großen beschreiben keine Episode der Woche, sondern ein Kapitel. Wenn eines kommt, ist die Sache größer, als sie beim Fragen aussah.',
};

const REV_NOTE = {
  es: 'Ha salido invertida, que no significa lo contrario: significa la misma fuerza atascada, exagerada o vuelta hacia dentro.',
  en: 'It came up reversed, which does not mean the opposite: it means the same force stuck, exaggerated, or turned inward.',
  de: 'Sie kam umgekehrt, was nicht das Gegenteil heißt: dieselbe Kraft, nur blockiert, übertrieben oder nach innen gewendet.',
};

const UP_NOTE = {
  es: 'Derecha, la carta se lee tal cual: la fuerza está disponible y se puede usar.',
  en: 'Upright, the card reads plainly: the force is available and can be used.',
  de: 'Aufrecht liest sich die Karte geradeheraus: Die Kraft ist da und lässt sich nutzen.',
};

export function cardSchool(card, rev, lang) {
  const out = [];
  if (card.a === 'major') {
    out.push(`<strong>${card.name[lang]}</strong>. ${MAJOR[lang]}`);
  } else {
    const suit = SUITS[card.id[0]];
    const rank = RANKS[Number(card.id.slice(1))];
    if (suit && rank) {
      const [nm, gov, line] = suit[lang];
      out.push(`<strong>${card.name[lang]}</strong>. ${
        { es: `Es ${rank[lang]}, en el palo de ${nm}, que gobierna ${gov}.`,
          en: `It is ${rank[lang]}, in the suit of ${nm}, which governs ${gov}.`,
          de: `Sie ist ${rank[lang]}, in der Farbe der ${nm}, die ${gov} regiert.` }[lang]
      } ${line}`);
    } else {
      out.push(`<strong>${card.name[lang]}</strong>.`);
    }
  }
  out.push(rev ? REV_NOTE[lang] : UP_NOTE[lang]);
  return out;
}
