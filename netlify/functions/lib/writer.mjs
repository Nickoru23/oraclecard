/* Talking to Anthropic, defensively.

   The free consultation kept dying with "the reading could not be written" and
   the visitor got a card with nothing under it. The cause is almost always one
   of three dull things, a model id that has been renamed, a key that was never
   set or was rotated away, or no credit on the account. and none of those are
   the visitor's problem. So: try a short chain of model ids rather than one, and
   report which failure it was so the site owner can see it in the logs and in
   /api/diag instead of guessing. */

/* Ordered by preference: cheap first for the free path, then the workhorse.
   Anthropic retires and renames ids over time; a chain survives that, a single
   hard-coded string does not. */
export const FREE_MODELS = [
  process.env.ANTHROPIC_FREE_MODEL,
  'claude-haiku-4-5',
  'claude-3-5-haiku-latest',
  'claude-sonnet-4-5',
  'claude-3-5-sonnet-latest',
].filter(Boolean);

export const PAID_MODELS = [
  process.env.ANTHROPIC_MODEL,
  'claude-sonnet-4-5',
  'claude-3-5-sonnet-latest',
  'claude-opus-4-1',
].filter(Boolean);

/* what went wrong, in words a person can act on */
export function classify(status, msg) {
  const m = String(msg || '').toLowerCase();
  if (status === 401 || status === 403 || /api key|authentication|invalid x-api-key/.test(m))
    return 'auth';                    // key missing, wrong, or rotated away
  if (status === 402 || /credit|billing|quota|insufficient/.test(m))
    return 'credit';                  // account out of funds
  if (status === 404 || /model/.test(m))
    return 'model';                   // this id does not exist any more
  if (status === 429) return 'rate';
  if (status >= 500) return 'upstream';
  return 'other';
}

/* Returns { text, model } on success, or { error, reason, status, detail }.
   Never throws for an API-level failure, the caller decides what to show. */
export async function write({ key, models, system, user, maxTokens }) {
  let last = { error: true, reason: 'other', status: 0, detail: 'no attempt made' };

  for (const model of models) {
    let r, j;
    try {
      r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': key,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model,
          max_tokens: maxTokens,
          system,
          messages: [{ role: 'user', content: user }],
        }),
      });
      j = await r.json();
    } catch (e) {
      last = { error: true, reason: 'network', status: 0, detail: e.message, model };
      continue;                        // a dropped connection deserves the next id
    }

    if (r.ok) {
      const text = (j.content || []).filter(c => c.type === 'text').map(c => c.text).join('').trim();
      if (text) return { text, model };
      last = { error: true, reason: 'empty', status: 200, detail: 'no text in response', model };
      continue;
    }

    const reason = classify(r.status, j?.error?.message);
    last = { error: true, reason, status: r.status, detail: j?.error?.message || '', model };
    console.error(`anthropic ${model} → ${r.status} ${reason}: ${last.detail}`);

    /* a bad key or an empty account will fail identically on every model, trying three more is just three more seconds of the visitor waiting */
    if (reason === 'auth' || reason === 'credit') break;
  }

  return last;
}
