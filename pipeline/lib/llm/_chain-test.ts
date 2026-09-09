/**
 * Tests for what the chain does with an answer it has already been given.
 *
 * The run on 9 September 2026 produced this line:
 *
 *   ⚠ cloudflare-ai fejlede: D1 API fejl (400): NOT NULL constraint failed:
 *     llm_usage.tokens_output
 *
 * The model had answered. `recordUsage` sat inside the same try block, before
 * the return, so a failed bookkeeping write threw the finished factsheet away
 * and recorded the provider as broken. Accounting must never cost an answer.
 */
import type { D1Client } from "../d1-client";
import type { LLMProvider, LLMResponse } from "./types";
import { ProviderChain } from "./provider-chain";
import { AllProvidersFailedError, LLMHttpError } from "./errors";

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

/** A database whose writes fail the way the live one did. */
function brokenDb(): D1Client {
  return {
    query: async () => ({ results: [] }),
    execute: async () => {
      throw new Error("D1 API fejl (400): NOT NULL constraint failed: llm_usage.tokens_output");
    },
  } as unknown as D1Client;
}

function workingDb(): D1Client {
  return {
    query: async () => ({ results: [] }),
    execute: async () => ({ results: [] }),
  } as unknown as D1Client;
}

function provider(name: string, behaviour: () => Promise<LLMResponse>): LLMProvider {
  return { name, isAvailable: () => true, generate: behaviour };
}

const answer: LLMResponse = {
  text: '{"has_substance": true}',
  model: "test",
  provider: "good",
  tokens_input: 100,
  tokens_output: 50,
};

const opts = { system: "s", prompt: "p", max_tokens: 100 };

async function main(): Promise<void> {
  // The bug itself.
  const chain = new ProviderChain(brokenDb(), [provider("good", () => Promise.resolve(answer))]);
  const got = await chain.generate(opts).catch((err: unknown) => err);
  check(
    got instanceof Error ? `threw: ${got.message}` : got.text,
    answer.text,
    "an unwritable usage row does not discard the answer",
  );

  // A count we cannot estimate is a zero, not a NULL. The chain must survive
  // handing one over — this is what NaN did in production.
  const nanChain = new ProviderChain(workingDb(), [
    provider("nan", () => Promise.resolve({ ...answer, tokens_output: NaN })),
  ]);
  check((await nanChain.generate(opts)).text, answer.text, "a NaN token count still returns the answer");

  // Fallback still works: first provider rate limited, second answers.
  const fallback = new ProviderChain(workingDb(), [
    provider("limited", () => Promise.reject(new LLMHttpError("limited (429)", 429))),
    provider("good", () => Promise.resolve(answer)),
  ]);
  check((await fallback.generate(opts)).provider, "good", "a limited provider falls through to the next");

  // A provider that answered 429 is rested rather than asked again this run.
  let limitedCalls = 0;
  const resting = new ProviderChain(workingDb(), [
    provider("limited", () => {
      limitedCalls++;
      return Promise.reject(new LLMHttpError("limited (429)", 429, 60_000));
    }),
    provider("good", () => Promise.resolve(answer)),
  ]);
  await resting.generate(opts);
  await resting.generate(opts);
  await resting.generate(opts);
  check(limitedCalls, 1, "a rate-limited provider is asked once, not once per story");

  // Everything spent: transient, so the caller retries rather than burning the story.
  const spent = new ProviderChain(workingDb(), [
    provider("a", () => Promise.reject(new LLMHttpError("limited (429)", 429))),
    provider("b", () => Promise.reject(new LLMHttpError("overloaded (503)", 503))),
  ]);
  const err = await spent.generate(opts).catch((e: unknown) => e);
  check(err instanceof AllProvidersFailedError, true, "a spent chain throws AllProvidersFailedError");
  check((err as AllProvidersFailedError).transient, true, "quota + outage is transient");

  // A genuinely broken request is ours to fix, and must not read as weather.
  const bad = new ProviderChain(workingDb(), [
    provider("a", () => Promise.reject(new LLMHttpError("bad request (400)", 400))),
  ]);
  const badErr = await bad.generate(opts).catch((e: unknown) => e);
  check((badErr as AllProvidersFailedError).transient, false, "a 400 is not transient");

  console.log(`\n${passed} bestået, ${failed} fejlet`);
  if (failed > 0) process.exit(1);
}

main();
