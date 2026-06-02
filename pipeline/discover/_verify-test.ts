/**
 * Co-located unit tests for verify-story.ts.
 * Uses stub ProviderChain — no real LLM calls.
 *
 * Run: npx tsx pipeline/discover/_verify-test.ts
 */

import { verifyStory } from "./verify-story.js";
import type { VerifyCandidate, VerifyAthlete } from "./verify-story.js";

// ── Helpers ────────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function assert(label: string, condition: boolean, detail?: string): void {
  if (condition) {
    console.log(`  PASS  ${label}`);
    passed++;
  } else {
    console.error(`  FAIL  ${label}${detail ? " — " + detail : ""}`);
    failed++;
  }
}

// ── Stubs ──────────────────────────────────────────────────────────────────

/** Happy-path stub: returns valid JSON wrapped in markdown fences. */
const stubChainFenced = {
  generate: async (_opts: unknown) => ({
    text: '```json\n{"match": true, "confidence": 0.9, "reason": "same sport and school"}\n```',
    tokens_input: 0,
    tokens_output: 0,
  }),
};

/** Stub that returns raw JSON (no fences). */
const stubChainRaw = {
  generate: async (_opts: unknown) => ({
    text: '{"match": false, "confidence": 0.2, "reason": "different sport entirely"}',
    tokens_input: 0,
    tokens_output: 0,
  }),
};

/** Stub that returns confidence outside [0,1] — should be clamped. */
const stubChainClamp = {
  generate: async (_opts: unknown) => ({
    text: '{"match": true, "confidence": 1.8, "reason": "very confident"}',
    tokens_input: 0,
    tokens_output: 0,
  }),
};

/** Stub that returns malformed text — triggers fail-open fallback. */
const stubChainMalformed = {
  generate: async (_opts: unknown) => ({
    text: "Sorry, I cannot determine the answer.",
    tokens_input: 0,
    tokens_output: 0,
  }),
};

/** Stub that throws an error — triggers fail-open fallback. */
const stubChainThrows = {
  generate: async (_opts: unknown) => {
    throw new Error("rate limit exceeded");
  },
};

// ── Test fixtures ──────────────────────────────────────────────────────────

const candidate: VerifyCandidate = {
  headline: "Mikkel Hansen scores 28 points to lead Iowa Hawkeyes",
  summary: "The Danish freshman played a key role in Iowa's victory.",
};

const athlete: VerifyAthlete = {
  name: "Mikkel Hansen",
  sport: "basketball",
  university: "University of Iowa",
  hometown: "Copenhagen, Denmark",
  position: "Guard",
};

// ── Test cases ─────────────────────────────────────────────────────────────

async function runTests(): Promise<void> {
  console.log("\n=== verify-story tests ===\n");

  // 1. Fenced JSON: match=true, confidence=0.9
  {
    const result = await verifyStory(candidate, athlete, stubChainFenced);
    assert("fenced JSON: isAboutAthlete = true", result.isAboutAthlete === true);
    assert("fenced JSON: confidence = 0.9", result.confidence === 0.9, `got ${result.confidence}`);
    assert("fenced JSON: reason preserved", result.reason === "same sport and school");
  }

  // 2. Raw JSON (no fences): match=false
  {
    const result = await verifyStory(candidate, athlete, stubChainRaw);
    assert("raw JSON: isAboutAthlete = false", result.isAboutAthlete === false);
    assert("raw JSON: confidence = 0.2", result.confidence === 0.2, `got ${result.confidence}`);
  }

  // 3. Confidence clamped from 1.8 → 1.0
  {
    const result = await verifyStory(candidate, athlete, stubChainClamp);
    assert("clamp: confidence clamped to 1", result.confidence === 1, `got ${result.confidence}`);
    assert("clamp: isAboutAthlete = true", result.isAboutAthlete === true);
  }

  // 4. Malformed text → fail-open fallback
  {
    const result = await verifyStory(candidate, athlete, stubChainMalformed);
    assert("malformed: isAboutAthlete fails open = true", result.isAboutAthlete === true);
    assert("malformed: confidence = 0.5", result.confidence === 0.5, `got ${result.confidence}`);
    assert("malformed: reason starts with 'verification unavailable'",
      result.reason.startsWith("verification unavailable"));
  }

  // 5. Thrown error → fail-open fallback
  {
    const result = await verifyStory(candidate, athlete, stubChainThrows);
    assert("throws: isAboutAthlete fails open = true", result.isAboutAthlete === true);
    assert("throws: confidence = 0.5", result.confidence === 0.5, `got ${result.confidence}`);
    assert("throws: reason contains error message", result.reason.includes("rate limit exceeded"));
  }

  // 6. Partial athlete (no optional fields) — should not crash
  {
    const minimalAthlete: VerifyAthlete = { name: "Lars Bak" };
    const result = await verifyStory({ headline: "Lars Bak wins 100m sprint" }, minimalAthlete, stubChainRaw);
    assert("minimal athlete: returns a result without crashing", typeof result.isAboutAthlete === "boolean");
  }

  // ── Summary ──────────────────────────────────────────────────────────────
  console.log(`\n--- ${passed + failed} tests: ${passed} passed, ${failed} failed ---\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Unexpected test runner error:", err);
  process.exit(1);
});
