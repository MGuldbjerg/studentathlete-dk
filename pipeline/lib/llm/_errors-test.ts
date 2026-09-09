/**
 * Tests for transient-vs-permanent classification.
 *
 * The cases are the REAL 429 bodies from the run on 8 September 2026 that lost
 * 60 stories. Each of them must classify as transient: had they done so then,
 * `fact_status` would have stayed NULL and the stories would have been retried
 * on the next run instead of being burned.
 */
import {
  AllProvidersFailedError,
  LLMHttpError,
  isRateLimitError,
  isServerError,
  isTransientLLMError,
  parseRetryDelayMs,
} from "./errors";

let passed = 0;
let failed = 0;

function check(actual: unknown, expected: unknown, name: string) {
  if (actual === expected) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failed++;
    console.error(`✗ ${name}: expected ${String(expected)}, got ${String(actual)}`);
  }
}

// ── The real bodies ──────────────────────────────────────────────────────────
const MISTRAL_429 =
  'mistral API fejl (429): {"object":"error","message":"Rate limit exceeded","type":"rate_limited","param":null,"code":"1300","raw_status_code":429}';
const GEMINI_429 =
  'Gemini API fejl (429): {"error":{"code":429,"message":"You exceeded your current quota","status":"RESOURCE_EXHAUSTED","details":[{"@type":"type.googleapis.com/google.rpc.RetryInfo","retryDelay":"54s"}]}}';
const GROQ_429 =
  'groq API fejl (429): {"error":{"message":"Rate limit reached for model `openai/gpt-oss-120b` ... on tokens per minute (TPM): Limit 8000, Used 5947, Requested 4714. Please try again in 19.9575s.","type":"tokens","code":"rate_limit_exceeded"}}';

check(isRateLimitError(new LLMHttpError(MISTRAL_429, 429)), true, "Mistral 429 is a rate limit");
check(isRateLimitError(new LLMHttpError(GEMINI_429, 429)), true, "Gemini 429 is a rate limit");
check(isRateLimitError(new LLMHttpError(GROQ_429, 429)), true, "Groq 429 is a rate limit");

// A provider that answers RESOURCE_EXHAUSTED under another status code.
check(
  isRateLimitError(new LLMHttpError("Gemini API fejl (503): RESOURCE_EXHAUSTED", 503)),
  true,
  "RESOURCE_EXHAUSTED under a non-429 status",
);

// ── Outages: the provider is unwell, which is also not the story's fault ─────
// Gemini answered this during the run on 9 September, between two rate limits.
const GEMINI_503 =
  'Gemini API fejl (503): {"error":{"code":503,"message":"This model is currently experiencing high demand.","status":"UNAVAILABLE"}}';
check(isServerError(new LLMHttpError(GEMINI_503, 503)), true, "503 is a server error");
check(isTransientLLMError(new LLMHttpError(GEMINI_503, 503)), true, "503 is transient");
check(isRateLimitError(new LLMHttpError(GEMINI_503, 503)), false, "503 is not a rate limit");
check(isServerError(new LLMHttpError("bad request", 400)), false, "400 is not a server error");

// ── What must NOT count as transient ─────────────────────────────────────────
// A malformed request is our bug and will fail identically on every retry.
check(isRateLimitError(new LLMHttpError("mistral API fejl (400): bad request", 400)), false, "400 is permanent");
check(isRateLimitError(new Error("Unexpected token < in JSON")), false, "parse failure is not a rate limit");
check(isTransientLLMError(new Error("Unexpected token < in JSON")), false, "parse failure is not transient");
check(
  isTransientLLMError(new AllProvidersFailedError("no keys set", false)),
  false,
  "missing API keys is a setup failure, not weather",
);
check(
  isTransientLLMError(new AllProvidersFailedError("all quotas spent", true)),
  true,
  "whole chain rate limited is transient",
);

// ── Suggested wait ───────────────────────────────────────────────────────────
check(parseRetryDelayMs(new Headers({ "retry-after": "30" }), ""), 30_000, "Retry-After header");
check(parseRetryDelayMs(new Headers(), GEMINI_429), 54_000, "Gemini retryDelay in body");
check(parseRetryDelayMs(new Headers(), GROQ_429), 19_958, "Groq prose delay");
check(parseRetryDelayMs(new Headers(), MISTRAL_429), undefined, "no suggestion when none is given");
// The header wins: it is the protocol answer, the body text is a courtesy.
check(
  parseRetryDelayMs(new Headers({ "retry-after": "5" }), GEMINI_429),
  5_000,
  "header beats body",
);

console.log(`\n${passed} bestået, ${failed} fejlet`);
if (failed > 0) process.exit(1);
