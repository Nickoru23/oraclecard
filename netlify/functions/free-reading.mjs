/* POST /api/free, the free one- or two-card consultation.
   No payment, so the only thing standing between this and someone's API bill is
   the limiter below: a signed cookie (per browser) plus a per-IP counter held in
   the instance. Neither is airtight, a cleared cookie on a new IP gets a fresh
   allowance, but together they stop the cheap, casual kind of abuse, which is
   the kind that actually happens. Real enforcement needs a store; this is the
   honest 95% version until there is one. */

import { DECK } from './lib/deck-data.mjs';
import { write, FREE_MODELS } from './lib/writer.mjs';
import { compose } from './lib/compose.mjs';

const PER_DAY = Number(process.env.FREE_PER_DAY || 3);
const PER_IP_DAY = Number(process.env.FREE_PER_IP_DAY || 12);
const SECRET = process.env.FREE_SECRET || process.env.STRIPE_SECRET_KEY || 'witch-atelier';

const POS = {
  1: {
    es: ['Lo que las cartas tienen que decirte'],
    en: ['What the cards have to say to you'],
    de: ['Was die Karten dir zu sagen haben'],
  },
  2: {
    es: ['Dónde estás ahora', 'Hacia dónde se mueve'],
    en: ['Where you are now', 'Where it is moving'],
    de: ['Wo du gerade stehst', 'Wohin es sich bewegt'],
  },
};

const REV = { es: ' (invertida)', en: ' (reversed)', de: ' (umgekehrt)' };
const SENSE = { es: 'Sentido', en: 'Sense', de: 'Bedeutung' };
const SEX = {
  es: { f: 'mujer', m: 'hombre', x: 'persona no binaria', '-': 'sin especificar' },
  en: { f: 'woman', m: 'man', x: 'non-binary person', '-': 'unspecified' },
  de: { f: 'Frau', m: 'Mann', x: 'nichtbinäre Person', '-': 'keine Angabe' },
};
const SEX_LABEL = { es: 'Género', en: 'Gender', de: 'Geschlecht' };

const SIGN_NAMES = {
  es: { aries:'Aries', tauro:'Tauro', geminis:'Géminis', cancer:'Cáncer', leo:'Leo', virgo:'Virgo',
        libra:'Libra', escorpio:'Escorpio', sagitario:'Sagitario', capricornio:'Capricornio',
        acuario:'Acuario', piscis:'Piscis' },
  en: { aries:'Aries', tauro:'Taurus', geminis:'Gemini', cancer:'Cancer', leo:'Leo', virgo:'Virgo',
        libra:'Libra', escorpio:'Scorpio', sagitario:'Sagittarius', capricornio:'Capricorn',
        acuario:'Aquarius', piscis:'Pisces' },
  de: { aries:'Widder', tauro:'Stier', geminis:'Zwillinge', cancer:'Krebs', leo:'Löwe', virgo:'Jungfrau',
        libra:'Waage', escorpio:'Skorpion', sagitario:'Schütze', capricornio:'Steinbock',
        acuario:'Wassermann', piscis:'Fische' },
};
const SIGN_LABEL = { es: 'Signo solar', en: 'Sun sign', de: 'Sonnenzeichen' };


const RULES = {
  es: `Eres quien lee las cartas en The Witch Atelier.

Cómo escribes:
- Te diriges a la persona de tú, por su nombre, una vez.
- Lees LAS CARTAS QUE HAN SALIDO sobre LA PREGUNTA QUE HA HECHO. No sueltas significados de diccionario: los usas como material para responder.
- Prosa limpia y directa. Sin misticismo decorativo, sin "el universo", sin "energías".
- No uses rayas ni guiones largos en el texto. Escribe con comas, dos puntos y puntos.
- Nombras lo incómodo cuando la carta lo señala. No consuelas por defecto.
- No predices hechos ni fechas, no prometes resultados.
- Nunca das consejo médico, legal, financiero ni psicológico. Si la pregunta va por ahí, lo dices en una frase y vuelves a lo que sí puedes leer.
- ESTO ES LO IMPORTANTE: la lectura tiene que ser reconociblemente sobre SU situación. Usa al menos tres detalles concretos que haya dado, como un nombre, cuánto tiempo lleva, algo que ya intentó o una palabra suya que repita, y devuélveselos dentro de la lectura, no en una lista.
- Si en la pregunta hay otra persona, di qué parte no depende de quien pregunta.
- Si la pregunta es una decisión entre dos opciones, no elijas por ella: nombra cuál de las dos está evitando mirar.

Formato exacto (usa "## " para los títulos, sin ningún otro markdown):

## Tu pregunta
Tres o cuatro frases devolviéndole su situación en tus palabras, con los detalles que ha dado, para que vea que la has leído de verdad. Nombra lo que está realmente en juego, aunque no lo haya dicho así.

## {CARDS_H}
{CARDS_BODY}

## {INSIDE_H}
Dos párrafos sobre la carta misma, para quien no conoce el tarot: qué escena representa, de dónde viene la imagen, qué significa cuando sale derecha y qué cambia cuando sale invertida. Esto se escribe como quien explica algo con gusto, no como una ficha.

## El nudo
Un párrafo con lo que la tirada señala como el punto real del asunto, que casi nunca es lo que la persona ha preguntado.

## Lo que las cartas no aconsejan
Un párrafo claro sobre el camino que esta tirada desaconseja, y por qué es tentador precisamente ahora.

## Lo que te toca a ti
Dos párrafos: qué decisión es suya, y dos señales concretas que puede observar en las próximas semanas para saber por dónde va la cosa. Nada de consejos genéricos.

Extensión total: entre 900 y 1100 palabras. Nada de viñetas. No menciones lecturas de pago ni precios.`,

  en: `You are the reader at The Witch Atelier.

How you write:
- You address the person directly, by name, once.
- You read THE CARDS THAT CAME UP against THE QUESTION THEY ASKED. No dictionary meanings stacked up: they are material for an answer.
- Clean, direct prose. No decorative mysticism, no "the universe", no "energies".
- Do not use em dashes or en dashes anywhere in the text. Write with commas, colons and full stops.
- You name the uncomfortable thing when the card points at it. You do not comfort by default.
- No predictions of events or dates, no promised outcomes.
- Never medical, legal, financial or psychological advice. If the question goes there, say so in one sentence and return to what you can read.
- THIS IS THE IMPORTANT ONE: the reading has to be recognisably about THEIR situation. Use at least three concrete details they gave, such as a name, how long it has been going on, something they already tried or a word of theirs that keeps returning, and give them back inside the prose, not as a list.
- If another person is in the question, say which part does not depend on the asker.
- If the question is a choice between two options, do not choose for them: name which of the two they have been avoiding looking at.

Exact format (use "## " for headings, no other markdown):

## Your question
Three or four sentences giving their situation back in your words, with the details they gave, so they can see it was actually read. Name what is really at stake, even if they did not put it that way.

## {CARDS_H}
{CARDS_BODY}

## {INSIDE_H}
Two paragraphs about the card itself, for someone who does not know tarot: what scene it shows, where the image comes from, what it means upright and what changes when it falls reversed. Written the way someone explains something they enjoy, not like a catalogue entry.

## The knot
One paragraph on what the spread points to as the real matter, which is almost never what was asked.

## What the cards do not advise
One clear paragraph on the road this spread argues against, and why that road is tempting right now in particular.

## What is yours to do
Two paragraphs: which decision is theirs, and two concrete signals they can watch over the coming weeks to see which way it is going. No generic advice.

Total length: 900 to 1100 words. No bullet points. Do not mention paid readings or prices.`,

  de: `Du liest die Karten im The Witch Atelier.

Wie du schreibst:
- Du sprichst die Person mit du an, einmal beim Namen.
- Du liest DIE GEZOGENEN KARTEN auf DIE GESTELLTE FRAGE hin. Keine aneinandergereihten Lexikonbedeutungen: sie sind Material für eine Antwort.
- Klare, direkte Prosa. Kein dekorativer Mystizismus, kein "das Universum", keine "Energien".
- Verwende keine Gedankenstriche im Text. Schreib mit Kommas, Doppelpunkten und Punkten.
- Du benennst das Unangenehme, wenn die Karte darauf zeigt. Du tröstest nicht von selbst.
- Keine Vorhersagen von Ereignissen oder Daten, keine versprochenen Ergebnisse.
- Nie medizinischer, rechtlicher, finanzieller oder psychologischer Rat. Geht die Frage dorthin, sag es in einem Satz und kehr zu dem zurück, was du lesen kannst.
- DAS IST DAS WICHTIGSTE: Die Deutung muss erkennbar von IHRER Lage handeln. Nutze mindestens drei konkrete Angaben aus ihrem Text, etwa einen Namen, seit wann es dauert, etwas, das sie schon versucht hat, oder ein Wort, das bei ihr wiederkehrt, und gib sie im Fließtext zurück, nicht als Liste.
- Steckt eine andere Person in der Frage, sag, welcher Teil nicht an der fragenden Person hängt.
- Ist die Frage eine Wahl zwischen zwei Optionen, entscheide nicht für sie: benenne, welche der beiden sie bisher nicht ansehen wollte.

Genaues Format (nutze "## " für Überschriften, kein anderes Markdown):

## Deine Frage
Drei bis vier Sätze, die ihre Lage mit ihren Angaben in deinen Worten zurückgeben, damit sie sieht, dass wirklich gelesen wurde. Benenne, was tatsächlich auf dem Spiel steht, auch wenn sie es nicht so gesagt hat.

## {CARDS_H}
{CARDS_BODY}

## {INSIDE_H}
Zwei Absätze über die Karte selbst, für jemanden ohne Tarot-Kenntnis: welche Szene sie zeigt, woher das Bild kommt, was sie aufrecht bedeutet und was sich umgekehrt ändert. Geschrieben wie von jemandem, der gern erklärt, nicht wie ein Katalogeintrag.

## Der Knoten
Ein Absatz darüber, was die Legung als den eigentlichen Punkt zeigt, und das ist fast nie das Gefragte.

## Wovon die Karten abraten
Ein klarer Absatz über den Weg, gegen den diese Legung spricht, und warum genau dieser Weg gerade jetzt verlockend ist.

## Was bei dir liegt
Zwei Absätze: welche Entscheidung ihre eigene ist, und zwei konkrete Zeichen, auf die sie in den nächsten Wochen achten kann, um zu sehen, wohin es geht. Keine allgemeinen Ratschläge.

Gesamtlänge: 900 bis 1100 Wörter. Keine Aufzählungen. Erwähne keine kostenpflichtigen Deutungen und keine Preise.`,
};

const INSIDE_H = {
  1: { es: 'La carta por dentro', en: 'Inside the card', de: 'Die Karte von innen' },
  2: { es: 'Las cartas por dentro', en: 'Inside the cards', de: 'Die Karten von innen' },
};
const CARDS_H = {
  1: { es: 'Lo que dice la carta', en: 'What the card says', de: 'Was die Karte sagt' },
  2: { es: 'Lo que dicen las cartas', en: 'What the cards say', de: 'Was die Karten sagen' },
};
const CARDS_BODY = {
  1: {
    es: 'Tres o cuatro párrafos sobre la carta que ha salido, leída contra su pregunta concreta. Cítala por su nombre. Un párrafo para lo que la carta dice; uno para cómo eso cae exactamente en la situación que ha contado, con sus detalles; uno para lo que la carta NO dice, que es donde la gente se equivoca; y uno para el punto incómodo, si lo hay.',
    en: 'Three or four paragraphs on the card that came up, read against their specific question. Name it. One paragraph for what the card says; one for how that lands in the exact situation they described, using their details; one for what the card does NOT say, which is where people go wrong; and one for the uncomfortable point, if there is one.',
    de: 'Drei bis vier Absätze über die gezogene Karte, gelesen auf ihre konkrete Frage hin. Nenne sie beim Namen. Ein Absatz für das, was die Karte sagt; einer dafür, wie das genau in die geschilderte Lage fällt, mit ihren Angaben; einer für das, was die Karte NICHT sagt, denn dort irren sich die meisten; und einer für den unangenehmen Punkt, falls es einen gibt.',
  },
  2: {
    es: 'Cuatro o cinco párrafos. La primera carta leída sobre su situación; la segunda igual; qué dice el paso de una a otra, que es lo que ninguna dice sola; y qué desaconseja la pareja de cartas. Cítalas por su nombre y usa los detalles que ha dado.',
    en: 'Four or five paragraphs. The first card read against their situation; the second the same; what the move from one to the other says, which is what neither says alone; and what the pair advises against. Name them and use the details they gave.',
    de: 'Vier bis fünf Absätze. Die erste Karte auf ihre Lage hin gelesen; die zweite ebenso; was der Übergang von der einen zur anderen sagt, das, was keine allein sagt; und wovon das Paar abrät. Nenne sie beim Namen und nutze ihre Angaben.',
  },
};

const json = (body, status = 200, headers = {}) =>
  new Response(JSON.stringify(body), {
    status, headers: { 'content-type': 'application/json', ...headers },
  });

const clean = (s, max) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
const today = () => new Date().toISOString().slice(0, 10);

/* ---- signed quota cookie ---------------------------------------------- */
async function sign(v) {
  const k = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(v));
  return [...new Uint8Array(sig)].slice(0, 12).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function readQuota(req) {
  const raw = (req.headers.get('cookie') || '')
    .split(';').map(s => s.trim()).find(s => s.startsWith('wa_free='));
  if (!raw) return 0;
  const [day, n, sig] = decodeURIComponent(raw.slice(8)).split('.');
  if (day !== today() || !sig) return 0;
  return (await sign(`${day}.${n}`)) === sig ? Number(n) || 0 : 0;
}

async function quotaCookie(n) {
  const v = `${today()}.${n}`;
  return `wa_free=${encodeURIComponent(`${v}.${await sign(v)}`)}; Path=/; Max-Age=86400; SameSite=Lax; Secure; HttpOnly`;
}

/* per-IP counter, per instance. a second net, not a wall */
const ipHits = new Map();
function ipOver(ip) {
  const d = today();
  const rec = ipHits.get(ip);
  if (!rec || rec.d !== d) { ipHits.set(ip, { d, n: 1 }); }
  else rec.n++;
  if (ipHits.size > 5000) ipHits.clear();
  return (ipHits.get(ip).n || 0) > PER_IP_DAY;
}

/* ---- handler ----------------------------------------------------------- */
export default async function handler(req) {
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  /* a missing key is not a reason to fail the page. it is a reason to skip
     straight to the composed reading and say so in the logs */
  const akey = process.env.ANTHROPIC_API_KEY;
  if (!akey) console.error('ANTHROPIC_API_KEY is not set, serving composed readings');

  try {
    const b = await req.json();
    const lang = ['en', 'de'].includes(b.lang) ? b.lang : 'es';
    const name = clean(b.name, 60);
    const birth = clean(b.birth, 12);
    const sex = ['f', 'm', 'x', '-'].includes(b.sex) ? b.sex : '-';
    const question = clean(b.question, 900);
    const sign = SIGN_NAMES.en[b.sign] ? b.sign : null;
    const degree = Number.isFinite(+b.degree) ? Math.max(0, Math.min(29, Math.floor(+b.degree))) : null;
    const ids = String(b.draws || '').split(',').filter(Boolean);

    /* the birth date is optional: it sharpens the reading, it does not gate it */
    if (!name) return json({ error: 'bad_input' }, 400);
    if (birth && !/^\d{4}-\d{2}-\d{2}$/.test(birth)) return json({ error: 'bad_input' }, 400);
    if (question.split(/\s+/).filter(Boolean).length < 20 || question.length < 80)
      return json({ error: 'question_too_short' }, 400);
    if (ids.length < 1 || ids.length > 2) return json({ error: 'bad_draw' }, 400);

    const draws = ids.map(t => {
      const rev = t.endsWith('R');
      const card = DECK.find(c => c.id === (rev ? t.slice(0, -1) : t));
      return card ? { card, rev } : null;
    });
    if (draws.some(d => !d)) return json({ error: 'bad_draw' }, 400);

    const n = draws.length;
    const used = await readQuota(req);
    if (used >= PER_DAY) return json({ error: 'free_limit', per_day: PER_DAY }, 429);

    const ip = req.headers.get('x-nf-client-connection-ip')
      || (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown';
    if (ipOver(ip)) return json({ error: 'free_limit', per_day: PER_DAY }, 429);

    const positions = POS[n][lang];
    const cardBlock = draws.map((d, i) =>
      `${i + 1}. ${positions[i]}, ${d.card.name[lang]}${d.rev ? REV[lang] : ''}\n` +
      `   ${SENSE[lang]}: ${(d.rev ? d.card.rev : d.card.up)[lang]}`
    ).join('\n\n');

    const system = RULES[lang]
      .replace('{CARDS_H}', CARDS_H[n][lang])
      .replace('{INSIDE_H}', INSIDE_H[n][lang])
      .replace('{CARDS_BODY}', CARDS_BODY[n][lang]);

    const HEAD = {
      es: `Nombre: ${name}\n${birth ? `Fecha de nacimiento: ${birth}\n` : ''}${SEX_LABEL.es}: ${SEX.es[sex]}${sign ? `\nSigno solar: ${SIGN_NAMES.es[sign]}${degree === null ? '' : `, ${degree}°`}` : ''}\n\nSu pregunta, en sus palabras:\n"""${question}"""\n\n${n === 1 ? 'La carta que ha salido' : 'Las dos cartas que han salido'}:\n\n${cardBlock}\n\nEscribe la lectura.`,
      en: `Name: ${name}\n${birth ? `Date of birth: ${birth}\n` : ''}${SEX_LABEL.en}: ${SEX.en[sex]}${sign ? `\nSun sign: ${SIGN_NAMES.en[sign]}${degree === null ? '' : `, ${degree}°`}` : ''}\n\nTheir question, in their words:\n"""${question}"""\n\n${n === 1 ? 'The card that came up' : 'The two cards that came up'}:\n\n${cardBlock}\n\nWrite the reading.`,
      de: `Name: ${name}\n${birth ? `Geburtsdatum: ${birth}\n` : ''}${SEX_LABEL.de}: ${SEX.de[sex]}${sign ? `\nSonnenzeichen: ${SIGN_NAMES.de[sign]}${degree === null ? '' : `, ${degree}°`}` : ''}\n\nIhre Frage, in ihren Worten:\n"""${question}"""\n\n${n === 1 ? 'Die gezogene Karte' : 'Die zwei gezogenen Karten'}:\n\n${cardBlock}\n\nSchreib die Deutung.`,
    };

    const r = akey
      ? await write({ key: akey, models: FREE_MODELS, system, user: HEAD[lang], maxTokens: 3000 })
      : { error: true, reason: 'no_key' };

    /* Whatever went wrong upstream, the visitor has already picked their cards.
       They get a reading either way, written if the writer answered, composed
       from the atelier's own card texts if it did not. `origin` and `reason`
       tell the owner which happened; the page shows neither. */
    const reading = r.text || compose({ name, question, draws, lang, sign, degree });

    return json(
      {
        reading,
        left: Math.max(0, PER_DAY - used - 1),
        origin: r.text ? 'written' : 'atelier',
        ...(r.text ? {} : { reason: r.reason }),
      },
      200,
      { 'set-cookie': await quotaCookie(used + 1) },
    );
  } catch (e) {
    console.error(e);
    return json({ error: 'server_error' }, 500);
  }
}
