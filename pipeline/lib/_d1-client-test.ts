/**
 * Tests for hvad D1-klienten regner for en FORBIGÅENDE fejl.
 * Kør: npx tsx pipeline/lib/_d1-client-test.ts
 *
 * Regressionen: foto-kørslen 2026-08-26 kl. 18:33 UTC døde tolv minutter inde
 * på ét `502 Bad Gateway` fra Cloudflare, uden ét eneste genforsøg — klienten
 * prøvede kun igen ved fejl på transportlaget.
 */

import { isTransient } from "./d1-client";

let passed = 0;
let failed = 0;

function assert(cond: boolean, msg: string): void {
  if (cond) { passed++; }
  else { failed++; console.error(`  ✗ ${msg}`); }
}

/** Efterlign klientens egen HTTP-fejl: besked + statuskode. */
function httpError(status: number): Error {
  const err = new Error(`D1 API fejl (${status}): <html>…</html>`) as Error & { status?: number };
  err.status = status;
  return err;
}

// ── HTTP: 5xx og 429 er forbigående ────────────────────────────────────
assert(isTransient(httpError(502)), "502 Bad Gateway — dén der væltede kørslen");
assert(isTransient(httpError(500)), "500 prøves igen");
assert(isTransient(httpError(503)), "503 prøves igen");
assert(isTransient(httpError(504)), "504 prøves igen");
assert(isTransient(httpError(429)), "429 rate limit prøves igen");

// ── HTTP: 4xx er permanente ────────────────────────────────────────────
// En forkert nøgle eller ugyldig SQL bliver ikke rigtig af tre forsøg.
assert(!isTransient(httpError(401)), "401 er en nøglefejl, ikke et blip");
assert(!isTransient(httpError(403)), "403 er en rettighedsfejl");
assert(!isTransient(httpError(404)), "404 er permanent");
assert(!isTransient(httpError(400)), "400 er en ugyldig forespørgsel");

// ── Transportlaget: som før ────────────────────────────────────────────
assert(isTransient(new TypeError("fetch failed")), "TypeError fra fetch");
assert(isTransient(new Error("ECONNRESET")), "ECONNRESET");
assert(isTransient(new Error("ETIMEDOUT")), "ETIMEDOUT");
assert(isTransient(new Error("socket hang up")), "socket hang up");
assert(isTransient(new Error("EAI_AGAIN")), "DNS-blip");

// ── SQL-fejl fra D1 selv er ALDRIG forbigående ─────────────────────────
assert(!isTransient(new Error("D1 query fejl: no such column: status")), "SQL-fejl prøves ikke igen");
assert(!isTransient(new Error("D1 query fejl: too many SQL variables")), "for mange variable er permanent");

// ── Rammer ─────────────────────────────────────────────────────────────
assert(!isTransient(null), "null er ikke forbigående");
assert(!isTransient("502"), "en streng er ikke en fejl");
assert(!isTransient(undefined), "undefined er ikke forbigående");

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
