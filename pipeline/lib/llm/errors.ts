/**
 * Error types for the LLM chain.
 *
 * The whole point is telling TRANSIENT from PERMANENT. A 429 says "come back in
 * a minute" — it says nothing about the story. Collapsing the two wrote quota
 * failures into the database as a property of the source, and the story was
 * never retried (60 stories lost 4-8 September 2026).
 */

/** HTTP error from a provider. `status` is kept so 429 can be told from 400. */
export class LLMHttpError extends Error {
  constructor(
    message: string,
    readonly status: number,
    /** The provider's own suggested wait, when it gave one. */
    readonly retryAfterMs?: number,
  ) {
    super(message);
    this.name = "LLMHttpError";
  }
}

/** Thrown when the WHOLE chain is spent. `transient` = nothing reached a model. */
export class AllProvidersFailedError extends Error {
  constructor(
    message: string,
    /** True if every failure was a quota or an outage — retry later. */
    readonly transient: boolean,
  ) {
    super(message);
    this.name = "AllProvidersFailedError";
  }
}

/**
 * Is this a quota / rate limit?
 *
 * The status code is the reliable part; the text catches providers that wrap a
 * quota failure in another code (Gemini answers RESOURCE_EXHAUSTED).
 */
export function isRateLimitError(err: unknown): boolean {
  if (err instanceof LLMHttpError && (err.status === 429 || err.status === 402)) return true;
  const msg = err instanceof Error ? err.message : String(err);
  return /\(429\)|rate.?limit|quota|RESOURCE_EXHAUSTED|daglig grænse|neurons|daily free allocation/i.test(msg);
}

/**
 * Is this the provider being unwell? A 5xx is never the story's fault.
 *
 * Gemini answers 503 UNAVAILABLE ("experiencing high demand") under load, which
 * is a wait, not a verdict — but it is not a quota either, so it needs its own
 * question.
 */
export function isServerError(err: unknown): boolean {
  if (err instanceof LLMHttpError) return err.status >= 500;
  const msg = err instanceof Error ? err.message : String(err);
  return /\(5\d\d\)|UNAVAILABLE/.test(msg);
}

/** Should the caller retry the story later rather than burn it? */
export function isTransientLLMError(err: unknown): boolean {
  if (err instanceof AllProvidersFailedError) return err.transient;
  return isRateLimitError(err) || isServerError(err);
}

/**
 * The provider's suggested wait, in milliseconds.
 *
 * Three formats in use: the `Retry-After` header (seconds), Gemini's
 * `"retryDelay": "54s"` in the JSON body, and Groq's "try again in 19.95s" prose.
 */
export function parseRetryDelayMs(headers: Headers, body: string): number | undefined {
  const header = headers.get("retry-after");
  if (header) {
    const secs = Number(header);
    if (Number.isFinite(secs) && secs > 0) return Math.round(secs * 1000);
  }
  const structured = body.match(/"retryDelay"\s*:\s*"([\d.]+)s"/i);
  if (structured) return Math.round(parseFloat(structured[1]) * 1000);
  const prose = body.match(/try again in ([\d.]+)\s*s/i);
  if (prose) return Math.round(parseFloat(prose[1]) * 1000);
  return undefined;
}
