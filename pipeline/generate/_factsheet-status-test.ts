/**
 * Tests for what buildFactSheet writes back about a story.
 *
 * The distinction is the whole fix: 'failed' is a verdict on the story and is
 * permanent (main() never looks at it again), while 'transient' means the chain
 * never reached a model and main() must leave `fact_status` NULL. On 4-8
 * September 2026 every rate limit landed as 'failed' and 60 usable stories were
 * dropped without a single article being attempted.
 */
import { MAX_FACT_ATTEMPTS, buildFactSheet, isFinalVerdict, type ChainLike } from "./build-factsheet";
import { AllProvidersFailedError, LLMHttpError } from "../lib/llm/errors";

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

const story = {
  headline: "Barrett scores twice as UMass beat Rhode Island",
  summary: null,
  content_raw: "Emily Barrett scored in the 14th and 62nd minute as UMass won 3-1 at Rhode Island.",
  athlete_name: "Emily Barrett",
  sport: "Field hockey",
  university: "UMass",
};

function chainThatThrows(err: unknown): ChainLike {
  return { generate: () => Promise.reject(err) };
}
function chainThatReturns(text: string): ChainLike {
  return { generate: () => Promise.resolve({ text }) };
}

const cases: Array<[() => Promise<{ status: string }>, string, string]> = [
  // The real failure: the whole chain rate limited.
  [
    () => buildFactSheet(story, chainThatThrows(new AllProvidersFailedError("all quotas spent", true))),
    "transient",
    "whole chain rate limited → transient",
  ],
  [
    () => buildFactSheet(story, chainThatThrows(new LLMHttpError("mistral API fejl (429): Rate limit exceeded", 429))),
    "transient",
    "single provider 429 → transient",
  ],
  // Setup failure: no keys. Retrying every run forever helps nobody.
  [
    () => buildFactSheet(story, chainThatThrows(new AllProvidersFailedError("no keys set", false))),
    "failed",
    "no API keys → failed, not transient",
  ],
  // The model answered; the answer was unusable. Whether that is the story's
  // verdict is decided by isFinalVerdict below, not here.
  [
    () => buildFactSheet(story, chainThatReturns("I'm sorry, I can't help with that.")),
    "failed",
    "non-JSON answer → failed",
  ],
  [
    () => buildFactSheet(story, chainThatReturns('{"has_substance": true, "stats": [{"text": "2 goals", "source": "prose"}]}')),
    "built",
    "usable JSON → built",
  ],
  [
    () => buildFactSheet(story, chainThatReturns('{"has_substance": false}')),
    "no_substance",
    "source says nothing about the athlete → no_substance",
  ],
  // An empty source never justifies a model call in the first place.
  [
    () =>
      buildFactSheet(
        { ...story, headline: null, content_raw: "   " },
        chainThatThrows(new Error("must not be called")),
      ),
    "no_substance",
    "empty source → no_substance without calling the chain",
  ],
];

async function main(): Promise<void> {
  for (const [run, expected, name] of cases) {
    check((await run()).status, expected, name);
  }

  // ── When 'failed' becomes permanent ────────────────────────────────────────
  // The 24 stories burnt on 9 September were all on their first attempt.
  check(isFinalVerdict("failed", 1), false, "one unreadable answer is not a verdict");
  check(isFinalVerdict("failed", 2), false, "two is still not a verdict");
  check(isFinalVerdict("failed", MAX_FACT_ATTEMPTS), true, "the third failure stands");
  // A story that somehow banked attempts must never be retried forever.
  check(isFinalVerdict("failed", 9), true, "past the limit stays final");
  // Everything else is an answer the first time it is given.
  check(isFinalVerdict("built", 1), true, "'built' is final at once");
  check(isFinalVerdict("no_substance", 1), true, "'no_substance' is final at once");

  console.log(`\n${passed} bestået, ${failed} fejlet`);
  if (failed > 0) process.exit(1);
}

main();
