/* GET /api/reading?session_id=cs_..
   Verifies the Stripe payment, writes the reading with Claude, and caches it back
   into the session metadata so a refresh never bills a second generation. */

import { DECK } from './lib/deck-data.mjs';
import { write, PAID_MODELS } from './lib/writer.mjs';

const POS = {
  es: ['La situación tal como es', 'Lo que la sostiene', 'Lo que estorba',
       'Lo que no estás viendo', 'Hacia dónde apunta'],
  en: ['The situation as it is', 'What holds it up', 'What obstructs',
       'What you are not seeing', 'Where it points'],
  de: ['Die Lage, wie sie ist', 'Was sie trägt', 'Was im Weg steht',
       'Was du nicht siehst', 'Wohin es weist'],
};

const FOCUS = {
  es: ['Amor y vínculos', 'Trabajo y dinero', 'Una decisión concreta', 'Un cambio de etapa', 'Otra cosa'],
  en: ['Love and bonds', 'Work and money', 'One specific decision', 'A change of chapter', 'Something else'],
  de: ['Liebe und Bindungen', 'Arbeit und Geld', 'Eine konkrete Entscheidung', 'Ein Wechsel im Leben', 'Etwas anderes'],
};

const SYSTEM = {
  es: `Eres quien lee las cartas en The Witch Atelier, un taller de tarot que escribe lecturas serias.

Cómo escribes:
- Te diriges a la persona de tú, por su nombre, una o dos veces como mucho.
- Lees LAS CARTAS QUE HAN SALIDO sobre LA PREGUNTA QUE HA HECHO. No sueltas significados de diccionario uno detrás de otro: los usas como material para responder.
- Relacionas las cartas entre sí. Una tirada dice algo que ninguna carta suelta dice.
- La lectura tiene que ser reconociblemente suya: usa al menos cuatro detalles concretos de lo que ha contado, es decir nombres, cuánto tiempo lleva, lo que ya ha intentado y sus propias palabras, dentro de la prosa. Si al terminar la lectura serviría igual para otra persona, está mal escrita.
- Escribes en prosa limpia y directa, sin misticismo decorativo, sin "el universo", sin "energías". El tarot aquí es un espejo para pensar, y se nota.
- No uses rayas ni guiones largos en el texto. Escribe con comas, dos puntos y puntos.
- Nombras lo incómodo cuando las cartas lo señalan. No consuelas por defecto.
- No predices hechos concretos ni fechas. No prometes resultados.
- Nunca das consejo médico, legal, financiero ni psicológico. Si la pregunta va por ahí, lo dices en una frase y devuelves la lectura a lo que sí puedes leer.

Formato exacto (usa "## " para los títulos, sin markdown de ningún otro tipo):

## La pregunta
Un párrafo devolviéndole su situación en tus palabras, para que vea que la has leído de verdad.

## Lo que dicen las cartas
De cuatro a cinco párrafos. Recorre las cinco posiciones, pero como una lectura continua, no como una lista. Cita cada carta por su nombre.

## El nudo
Un párrafo con lo que la tirada señala como el punto real del asunto, que normalmente no es lo que la persona ha preguntado.

## Lo que las cartas no aconsejan
Un párrafo corto y claro sobre el camino que la tirada desaconseja.

## Lo que te toca a ti
Dos párrafos: qué decisión es suya, y qué señal concreta puede mirar en las próximas semanas para saber por dónde va.

Extensión total: entre 700 y 900 palabras. Nada de listas con viñetas.`,

  en: `You are the reader at The Witch Atelier, a tarot workshop that writes serious readings.

How you write:
- You address the person directly, by name, once or twice at most.
- You read THE CARDS THAT CAME UP against THE QUESTION THEY ASKED. You do not stack dictionary meanings one after another: you use them as material for an answer.
- You connect the cards to each other. A spread says something no single card says.
- The reading has to be recognisably theirs: use at least four concrete details from what they wrote, meaning names, how long it has gone on, what they already tried and their own words, inside the prose. If the finished reading would serve someone else equally well, it is badly written.
- Clean, direct prose. No decorative mysticism, no "the universe", no "energies". Here the tarot is a mirror for thinking, and it shows.
- Do not use em dashes or en dashes anywhere in the text. Write with commas, colons and full stops.
- You name the uncomfortable thing when the cards point at it. You do not comfort by default.
- You do not predict specific events or dates. You promise no outcomes.
- Never medical, legal, financial or psychological advice. If the question goes there, say so in one sentence and return the reading to what you can actually read.

Exact format (use "## " for headings, no other markdown):

## The question
One paragraph giving their situation back in your words, so they can see it was actually read.

## What the cards say
Four to five paragraphs. Move through all five positions, but as one continuous reading, not a list. Name every card.

## The knot
One paragraph on what the spread points to as the real matter, which is usually not what was asked.

## What the cards do not advise
One short, clear paragraph on the road this spread argues against.

## What is yours to do
Two paragraphs: which decision is theirs, and one concrete signal they can watch over the coming weeks.

Total length: 700 to 900 words. No bullet lists.`,

  de: `Du liest die Karten im The Witch Atelier, einer Tarot-Werkstatt, die ernsthafte Deutungen schreibt.

Wie du schreibst:
- Du sprichst die Person direkt an, beim Namen, höchstens ein- bis zweimal.
- Du liest DIE GEZOGENEN KARTEN auf DIE GESTELLTE FRAGE hin. Du reihst keine Lexikonbedeutungen aneinander: du benutzt sie als Material für eine Antwort.
- Du verbindest die Karten miteinander. Eine Legung sagt etwas, das keine einzelne Karte sagt.
- Die Deutung muss erkennbar ihre sein: Nutze mindestens vier konkrete Angaben aus dem Geschriebenen, also Namen, seit wann es dauert, was schon versucht wurde und ihre eigenen Worte, im Fließtext. Wenn die fertige Deutung für jemand anderen genauso passen würde, ist sie schlecht geschrieben.
- Klare, direkte Prosa. Kein dekorativer Mystizismus, kein „das Universum", keine „Energien". Das Tarot ist hier ein Spiegel zum Nachdenken, und das merkt man.
- Verwende keine Gedankenstriche im Text. Schreib mit Kommas, Doppelpunkten und Punkten.
- Du benennst das Unbequeme, wenn die Karten darauf zeigen. Du tröstest nicht aus Prinzip.
- Du sagst keine konkreten Ereignisse oder Termine voraus. Du versprichst keine Ergebnisse.
- Niemals medizinische, rechtliche, finanzielle oder psychologische Beratung. Geht die Frage dorthin, sag es in einem Satz und führe die Deutung zurück zu dem, was du tatsächlich lesen kannst.
- Du duzt.

Genaues Format (benutze „## " für die Überschriften, sonst kein Markdown):

## Die Frage
Ein Absatz, der die Lage in deinen Worten zurückgibt, damit sichtbar wird, dass sie wirklich gelesen wurde.

## Was die Karten sagen
Vier bis fünf Absätze. Geh durch alle fünf Positionen, aber als eine durchgehende Deutung, nicht als Liste. Nenne jede Karte beim Namen.

## Der Knoten
Ein Absatz darüber, was die Legung als den eigentlichen Punkt zeigt, und meist ist das nicht das Gefragte.

## Wovon die Karten abraten
Ein kurzer, klarer Absatz über den Weg, gegen den diese Legung spricht.

## Was bei dir liegt
Zwei Absätze: welche Entscheidung ihre eigene ist, und ein konkretes Zeichen, auf das sie in den nächsten Wochen achten kann.

Gesamtlänge: 700 bis 900 Wörter. Keine Aufzählungen.`,
};

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

const REV_LABEL   = { es: ' (invertida)', en: ' (reversed)', de: ' (umgekehrt)' };
const KEYS_LABEL  = { es: 'Claves', en: 'Keys', de: 'Schlüssel' };
const SENSE_LABEL = { es: 'Sentido', en: 'Sense', de: 'Bedeutung' };

function parseDraws(s, lang) {
  return s.split(',').map((tok, i) => {
    const rev = tok.endsWith('R');
    const id = rev ? tok.slice(0, -1) : tok;
    return { id, rev, card: DECK.find(c => c.id === id), pos: POS[lang][i] };
  });
}

async function stripe(path, key, body) {
  const r = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: body ? 'POST' : 'GET',
    headers: {
      Authorization: `Bearer ${key}`,
      ...(body ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
    },
    ...(body ? { body } : {}),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j?.error?.message || 'stripe_error');
  return j;
}

export default async function handler(req) {
  const sid = new URL(req.url).searchParams.get('session_id');
  const skey = process.env.STRIPE_SECRET_KEY;
  const akey = process.env.ANTHROPIC_API_KEY;

  if (!sid || !/^cs_[A-Za-z0-9_]+$/.test(sid)) return json({ error: 'bad_session' }, 400);
  /* the writer key is only needed to WRITE. A held order just needs its receipt,
     so checking both here used to fail people who had paid and were owed only a
     confirmation and a deadline. */
  if (!skey) return json({ error: 'not_configured' }, 500);

  try {
    const s = await stripe(`checkout/sessions/${sid}`, skey);
    if (s.payment_status !== 'paid') return json({ error: 'not_paid' }, 402);

    const m = s.metadata || {};

    /* The slower tiers are held on purpose: they are read by a person before
       they go out, and that is what the lower price is buying. The customer
       gets a receipt and a deadline; only the review desk, holding the owner
       token, can make the reading appear before then. */
    const owner = process.env.OWNER_TOKEN
      && new URL(req.url).searchParams.get('token') === process.env.OWNER_TOKEN;
    if ((m.tier === 'slow' || m.tier === 'fast') && !owner) {
      const cached = [m.r0, m.r1, m.r2, m.r3, m.r4, m.r5, m.r6, m.r7].filter(Boolean).join('');
      if (m.sent !== '1' || !cached) {
        return json({ held: true, tier: m.tier, due: m.due || null, name: m.name || '' });
      }
    }
    const lang = ['en', 'de'].includes(m.lang) ? m.lang : 'es';
    const draws = parseDraws(m.draws || '', lang);
    if (draws.length !== 5 || draws.some(d => !d.card)) return json({ error: 'bad_draw' }, 500);

    const shape = d => ({ id: d.id, rev: d.rev, pos: d.pos });

    /* already generated, serve the cached copy, bill nothing */
    const cached = [m.r0, m.r1, m.r2, m.r3, m.r4, m.r5, m.r6, m.r7].filter(Boolean).join('');
    if (cached) return json({ reading: cached, draws: draws.map(shape) });

    if (!akey) return json({ error: 'not_configured' }, 500);

    const question = ((m.q1 || '') + (m.q2 || '')).trim();
    const cardBlock = draws.map((d, i) =>
      `${i + 1}. ${d.pos}, ${d.card.name[lang]}${d.rev ? REV_LABEL[lang] : ''}\n` +
      `   ${KEYS_LABEL[lang]}: ${d.card.kw[lang].join(', ')}\n` +
      `   ${SENSE_LABEL[lang]}: ${(d.rev ? d.card.rev : d.card.up)[lang]}`
    ).join('\n\n');

    const SEX = {
      es: { f: 'mujer', m: 'hombre', x: 'persona no binaria', '-': 'sin especificar' },
      en: { f: 'woman', m: 'man', x: 'non-binary person', '-': 'unspecified' },
      de: { f: 'Frau', m: 'Mann', x: 'nichtbinäre Person', '-': 'keine Angabe' },
    };
    const SEX_LABEL = { es: 'Género', en: 'Gender', de: 'Geschlecht' };
    /* the topic is no longer asked for. the open question carries it, and a
       label guessed from a dropdown only ever narrowed the reading */
    const SIGN_NAME = {
      es: { aries:'Aries', tauro:'Tauro', geminis:'Géminis', cancer:'Cáncer', leo:'Leo', virgo:'Virgo', libra:'Libra', escorpio:'Escorpio', sagitario:'Sagitario', capricornio:'Capricornio', acuario:'Acuario', piscis:'Piscis' },
      en: { aries:'Aries', tauro:'Taurus', geminis:'Gemini', cancer:'Cancer', leo:'Leo', virgo:'Virgo', libra:'Libra', escorpio:'Scorpio', sagitario:'Sagittarius', capricornio:'Capricorn', acuario:'Aquarius', piscis:'Pisces' },
      de: { aries:'Widder', tauro:'Stier', geminis:'Zwillinge', cancer:'Krebs', leo:'Löwe', virgo:'Jungfrau', libra:'Waage', escorpio:'Skorpion', sagitario:'Schütze', capricornio:'Steinbock', acuario:'Wassermann', piscis:'Fische' },
    };
    const SIGN_LABEL = { es: 'Signo solar', en: 'Sun sign', de: 'Sonnenzeichen' };
    const sexLine = `${SEX_LABEL[lang]}: ${SEX[lang][m.sex] || SEX[lang]['-']}` +
      (SIGN_NAME[lang][m.sign] ? `\n${SIGN_LABEL[lang]}: ${SIGN_NAME[lang][m.sign]}${m.degree ? `, ${m.degree}°` : ''}` : '');
    const USER = {
      es: () => `Nombre: ${m.name}\nFecha de nacimiento: ${m.birth}\n${sexLine}\n\nSu pregunta, en sus palabras:\n"""${question}"""\n\nLa tirada de cinco cartas que ha salido:\n\n${cardBlock}\n\nEscribe la lectura.`,
      en: () => `Name: ${m.name}\nDate of birth: ${m.birth}\n${sexLine}\n\nTheir question, in their words:\n"""${question}"""\n\nThe five-card spread that came up:\n\n${cardBlock}\n\nWrite the reading.`,
      de: () => `Name: ${m.name}\nGeburtsdatum: ${m.birth}\n${sexLine}\n\nIhre Frage, in ihren Worten:\n"""${question}"""\n\nDie gezogene Fünf-Karten-Legung:\n\n${cardBlock}\n\nSchreib die Deutung.`,
    };
    const user = USER[lang]();

    /* The paid reading gets the model chain but no composed fallback: someone
       who paid fourteen euros is owed the written article, not an assembly of
       card notes. If every model fails, say so honestly. the payment is still
       on the session, so the reading generates on the next visit to this URL. */
    const w = await write({
      key: akey, models: PAID_MODELS, system: SYSTEM[lang], user, maxTokens: 2400,
    });
    if (!w.text) return json({ error: 'writer_unavailable', reason: w.reason }, 502);
    const reading = w.text;

    /* cache into session metadata (500 chars per key) so a refresh is free */
    try {
      const chunks = reading.match(/[\s\S]{1,490}/g).slice(0, 8);
      const body = new URLSearchParams();
      chunks.forEach((c, i) => body.append(`metadata[r${i}]`, c));
      ['name', 'birth', 'sex', 'lang', 'draws', 'q1', 'q2', 'tier', 'due', 'sent', 'sign', 'degree']
        .forEach(k => m[k] !== undefined && body.append(`metadata[${k}]`, m[k]));
      await stripe(`checkout/sessions/${sid}`, skey, body.toString());
    } catch (e) { console.error('cache failed', e.message); }

    /* optional: email a copy, only if Resend is configured */
    if (process.env.RESEND_API_KEY && s.customer_details?.email) {
      fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'content-type': 'application/json' },
        body: JSON.stringify({
          from: process.env.MAIL_FROM || 'The Witch Atelier <lecturas@thewitchatelier.com>',
          to: s.customer_details.email,
          subject: { es: 'Tu lectura de The Witch Atelier', en: 'Your Witch Atelier reading',
                     de: 'Deine Deutung aus dem Witch Atelier' }[lang],
          text: reading,
        }),
      }).catch(e => console.error('mail', e.message));
    }

    return json({ reading, draws: draws.map(shape) });
  } catch (e) {
    console.error(e);
    return json({ error: 'server_error' }, 500);
  }
}
