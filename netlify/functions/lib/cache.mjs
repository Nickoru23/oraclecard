/* The generated reading, cached back into the Stripe Checkout Session.

   There is no database on this site. Stripe's session metadata is the only
   place a paid reading can be kept, and it is a good enough one: the session
   already exists, it already carries the order, and it lives as long as Stripe
   keeps the payment. What it costs is a shape.

   Stripe's limits on a metadata hash are 50 keys, a key of at most 40
   characters, and a VALUE OF AT MOST 500 CHARACTERS. So the reading is cut into
   490 character pieces across numbered keys.

   How many pieces matters more than it looks. The paid reading is specified at
   700 to 900 words, which runs from about 4,300 characters in English to about
   5,800 in German. An earlier eight key cache held 3,920, so most readings were
   silently truncated in the cache while the visitor's first view showed the
   whole thing. Twenty keys hold 9,800 characters, which clears the longest
   reading the prompt can produce, and 20 plus the dozen order keys is still
   well inside Stripe's 50.                                                    */

export const CHUNK_SIZE = 490;
export const CHUNK_COUNT = 20;

export const CHUNK_KEYS = Array.from({ length: CHUNK_COUNT }, (_, i) => 'r' + i);

/* the order's own keys, carried through every metadata write */
export const ORDER_KEYS = ['name', 'birth', 'sex', 'lang', 'draws', 'q1', 'q2',
                           'tier', 'due', 'sent', 'sent_at', 'sign', 'degree'];

/** the cached reading, or '' if none was stored */
export function joinCached(metadata = {}) {
  return CHUNK_KEYS.map(k => metadata[k]).filter(Boolean).join('');
}

/** true when this session already carries a written reading */
export const isWritten = (metadata = {}) => CHUNK_KEYS.some(k => metadata[k]);

/** the reading as metadata form fields, plus the order keys it must not lose */
export function cacheBody(reading, metadata = {}) {
  const body = new URLSearchParams();
  const chunks = String(reading).match(new RegExp(`[\\s\\S]{1,${CHUNK_SIZE}}`, 'g')) || [];
  if (chunks.length > CHUNK_COUNT) {
    /* Never store a reading cut off mid sentence: a short cache is refilled by
       the next visit, a truncated one is served as if it were the whole thing. */
    const e = new Error(`reading is ${reading.length} chars, over the ${CHUNK_COUNT * CHUNK_SIZE} the cache holds`);
    e.code = 'too_long';
    throw e;
  }
  chunks.forEach((c, i) => body.append(`metadata[r${i}]`, c));
  ORDER_KEYS.forEach(k => metadata[k] !== undefined && body.append(`metadata[${k}]`, metadata[k]));
  return body;
}
