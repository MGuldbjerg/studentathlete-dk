/**
 * Co-located unit tests for box-score.ts (fase 1 berigelse + fase 3 grundsandhed).
 * Stub'er ProviderChain + deps — ingen netværk eller rigtige LLM-kald.
 *
 * Run: npx tsx pipeline/generate/_boxscore-test.ts
 */

import {
  findBoxScoreUrl,
  extractBoxScoreStats,
  mergeBoxScoreIntoFactSheet,
  renderBoxScoreBlock,
  enrichFactSheetWithBoxScore,
  type BoxScoreDeps,
} from "./box-score";
import type { FactSheet } from "./build-factsheet";
import { BrowserRenderError } from "../lib/browser-render";

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

/** Minimalt komplet faktaark; overrides flettes ovenpå. */
function makeFs(overrides: Partial<FactSheet> = {}): FactSheet {
  return {
    has_substance: true,
    event: null,
    result: null,
    stats: [],
    qualitative: [],
    quotes: [],
    other_facts: [],
    box_score_url: null,
    ...overrides,
  };
}

/** Chain-stub der returnerer en fast tekst. */
const chainReturning = (text: string) => ({
  generate: async (_opts: unknown) => ({ text, tokens_input: 0, tokens_output: 0 }),
});
/** Chain-stub der kaster. */
const chainThrows = {
  generate: async (_opts: unknown) => {
    throw new Error("rate limit");
  },
};

// ── findBoxScoreUrl ──────────────────────────────────────────────────────────

async function testFindBoxScoreUrl(): Promise<void> {
  console.log("\n— findBoxScoreUrl —");

  assert(
    "boxscore href resolves to absolute",
    findBoxScoreUrl('<a href="/boxscore.aspx?id=99">Box Score</a>', "https://goduke.com/news/recap") ===
      "https://goduke.com/boxscore.aspx?id=99",
  );

  assert(
    'anchor text "Box Score" matches even without boxscore href',
    findBoxScoreUrl('<a href="/sports/wsoc/g/12345">View Box Score</a>', "https://x.com") ===
      "https://x.com/sports/wsoc/g/12345",
  );

  assert(
    "generic Stats nav link is NOT matched",
    findBoxScoreUrl('<a href="/sports/wsoc/stats">Stats</a>', "https://x.com") === null,
  );

  assert(
    "plain recap link is NOT matched",
    findBoxScoreUrl('<a href="/sports/wsoc/2024/results">Match Recap</a>', "https://x.com") === null,
  );

  assert(
    "stats-provider domain (sports-reference) is matched",
    findBoxScoreUrl(
      '<a href="https://www.sports-reference.com/cbb/boxscores/2024-01-01-duke.html">Game</a>',
      "https://x.com",
    ) === "https://www.sports-reference.com/cbb/boxscores/2024-01-01-duke.html",
  );

  assert(
    "boxscore href wins over a generic stats-domain link (priority)",
    findBoxScoreUrl(
      '<a href="https://statmuse.com/x">Stats</a> <a href="/boxscore?id=7">Box Score</a>',
      "https://goduke.com",
    ) === "https://goduke.com/boxscore?id=7",
  );

  assert(
    "relative href without leading slash resolves against path",
    findBoxScoreUrl('<a href="boxscore?id=5">Box Score</a>', "https://x.com/a/b") ===
      "https://x.com/a/boxscore?id=5",
  );

  assert(
    "javascript: href is ignored",
    findBoxScoreUrl('<a href="javascript:void(0)">Box Score</a>', "https://x.com") === null,
  );

  assert("empty html → null", findBoxScoreUrl("", "https://x.com") === null);
}

// ── extractBoxScoreStats ──────────────────────────────────────────────────────

async function testExtractBoxScoreStats(): Promise<void> {
  console.log("\n— extractBoxScoreStats —");
  const input = { athleteName: "Daniel Helle", sport: "fodbold", text: "Duke 2, UNC 1. Helle: 1 goal, 90 min." };

  {
    const r = await extractBoxScoreStats(
      input,
      chainReturning('```json\n{"found": true, "final_score": "Duke 2, UNC 1", "stat_line": ["1 goal", "90 minutes"]}\n```'),
    );
    assert("fenced JSON: found = true", r?.found === true);
    assert("fenced JSON: final_score parsed", r?.final_score === "Duke 2, UNC 1");
    assert("fenced JSON: stat_line parsed", JSON.stringify(r?.stat_line) === JSON.stringify(["1 goal", "90 minutes"]));
  }

  {
    const r = await extractBoxScoreStats(input, chainReturning('{"found": false, "final_score": null, "stat_line": []}'));
    assert("raw JSON: found = false", r?.found === false);
    assert("raw JSON: stat_line empty", r?.stat_line.length === 0);
  }

  {
    const r = await extractBoxScoreStats(input, chainReturning("Sorry, no idea."));
    assert("malformed → null (fail-open)", r === null);
  }

  {
    const r = await extractBoxScoreStats(input, chainThrows);
    assert("throws → null (fail-open)", r === null);
  }

  {
    const r = await extractBoxScoreStats({ ...input, text: "   " }, chainReturning("{}"));
    assert("empty text → null (no LLM call)", r === null);
  }
}

// ── mergeBoxScoreIntoFactSheet ────────────────────────────────────────────────

async function testMerge(): Promise<void> {
  console.log("\n— mergeBoxScoreIntoFactSheet —");

  {
    const fs = makeFs({ stats: [{ text: "spillede fra start", source: "prose" }] });
    const merged = mergeBoxScoreIntoFactSheet(
      fs,
      { found: true, final_score: "Duke 2, UNC 1", stat_line: ["1 goal", "90 minutes"] },
      "https://goduke.com/boxscore?id=1",
    );
    const box = merged.stats.filter((s) => s.source === "boxscore");
    assert("adds 2 boxscore stats", box.length === 2);
    assert("keeps the prose stat", merged.stats.some((s) => s.source === "prose" && s.text === "spillede fra start"));
    assert("fills empty final_score", merged.result?.final_score === "Duke 2, UNC 1");
    assert("sets box_score_url", merged.box_score_url === "https://goduke.com/boxscore?id=1");
    assert("does not mutate input", fs.stats.length === 1 && fs.box_score_url === null);
  }

  {
    // Dedupe: prosa har allerede "1 Goal" → box-score "1 goal" tilføjes ikke igen.
    const fs = makeFs({ stats: [{ text: "1 Goal", source: "prose" }] });
    const merged = mergeBoxScoreIntoFactSheet(fs, { found: true, final_score: null, stat_line: ["1 goal"] }, "u");
    assert("dedupes stat already in prose", merged.stats.filter((s) => s.source === "boxscore").length === 0);
  }

  {
    // Overstyrer ikke et eksisterende slutresultat fra prosaen.
    const fs = makeFs({ result: { final_score: "1-0", outcome: "sejr", placement: null } });
    const merged = mergeBoxScoreIntoFactSheet(fs, { found: true, final_score: "9-9", stat_line: [] }, "u");
    assert("does not overwrite existing final_score", merged.result?.final_score === "1-0");
  }
}

// ── renderBoxScoreBlock ───────────────────────────────────────────────────────

async function testRenderBlock(): Promise<void> {
  console.log("\n— renderBoxScoreBlock —");

  assert("no box_score_url → null", renderBoxScoreBlock(makeFs()) === null);

  const fs = makeFs({
    box_score_url: "u",
    result: { final_score: "Duke 2, UNC 1", outcome: null, placement: null },
    stats: [
      { text: "tidligere prosa-stat", source: "prose" },
      { text: "1 goal", source: "boxscore" },
    ],
  });
  const block = renderBoxScoreBlock(fs);
  assert("includes final score", Boolean(block?.includes("Duke 2, UNC 1")));
  assert("includes boxscore stat", Boolean(block?.includes("1 goal")));
  assert("excludes prose-only stat", !block?.includes("tidligere prosa-stat"));
}

// ── enrichFactSheetWithBoxScore (orkestrering via stub-deps) ───────────────────

function makeDeps(over: Partial<BoxScoreDeps> = {}): BoxScoreDeps {
  return {
    fetchHtml: async () => '<a href="/boxscore?id=1">Box Score</a>',
    renderPage: async () => "<html>Duke 2, UNC 1 — Helle 1 goal</html>",
    extractText: () => "Duke 2, UNC 1 — Helle 1 goal",
    ...over,
  };
}
const source = { sourceUrl: "https://goduke.com/recap", athleteName: "Daniel Helle", sport: "fodbold" };
const foundChain = chainReturning('{"found": true, "final_score": "Duke 2, UNC 1", "stat_line": ["1 goal"]}');

async function testEnrich(): Promise<void> {
  console.log("\n— enrichFactSheetWithBoxScore —");

  {
    const r = await enrichFactSheetWithBoxScore(makeFs(), source, foundChain, makeDeps());
    assert("happy path: found = true", r.found === true);
    assert("happy path: rendered = true", r.rendered === true);
    assert("happy path: boxscore stat merged", r.factSheet.stats.some((s) => s.source === "boxscore"));
    assert("happy path: box_score_url set", r.factSheet.box_score_url === "https://goduke.com/boxscore?id=1");
  }

  {
    const r = await enrichFactSheetWithBoxScore(makeFs(), { ...source, sourceUrl: null }, foundChain, makeDeps());
    assert("no sourceUrl → unchanged, not rendered", r.found === false && r.rendered === false);
  }

  {
    const r = await enrichFactSheetWithBoxScore(makeFs(), source, foundChain, makeDeps({ fetchHtml: async () => null }));
    assert("fetchHtml null → unchanged, not rendered", r.found === false && r.rendered === false);
  }

  {
    const r = await enrichFactSheetWithBoxScore(
      makeFs(),
      source,
      foundChain,
      makeDeps({ fetchHtml: async () => "<a href=\"/results\">Recap</a>" }),
    );
    assert("no box-score link → unchanged, not rendered", r.found === false && r.rendered === false);
  }

  {
    const r = await enrichFactSheetWithBoxScore(makeFs(), source, foundChain, makeDeps({ renderPage: async () => null }));
    assert("render null → rendered=true, found=false", r.rendered === true && r.found === false);
    assert("render null → stats unchanged", r.factSheet.stats.length === 0);
  }

  {
    const r = await enrichFactSheetWithBoxScore(
      makeFs(),
      source,
      chainReturning('{"found": false, "final_score": null, "stat_line": []}'),
      makeDeps(),
    );
    assert("athlete not on page → rendered=true, found=false", r.rendered === true && r.found === false);
  }

  {
    let threw = false;
    try {
      await enrichFactSheetWithBoxScore(
        makeFs(),
        source,
        foundChain,
        makeDeps({
          renderPage: async () => {
            throw new BrowserRenderError(429, "quota", true);
          },
        }),
      );
    } catch (e) {
      threw = e instanceof BrowserRenderError && e.quotaExhausted;
    }
    assert("propagates BrowserRenderError(quotaExhausted) to caller", threw);
  }
}

// ── Runner ─────────────────────────────────────────────────────────────────

async function runTests(): Promise<void> {
  console.log("\n=== box-score tests ===");
  await testFindBoxScoreUrl();
  await testExtractBoxScoreStats();
  await testMerge();
  await testRenderBlock();
  await testEnrich();
  console.log(`\n--- ${passed + failed} tests: ${passed} passed, ${failed} failed ---\n`);
  if (failed > 0) process.exit(1);
}

runTests().catch((err) => {
  console.error("Unexpected test runner error:", err);
  process.exit(1);
});
