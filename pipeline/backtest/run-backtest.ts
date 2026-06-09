/**
 * Backtest-orkestrator for box-score + to-fase-pipelinen.
 *
 * Kører de RIGTIGE pipeline-funktioner (buildFactSheet → enrichFactSheetWithBoxScore →
 * skriv → verifyArticle) mod offline fixtures via injicerede replay-deps + en stub-chain.
 * INGEN DB-skrivninger, intet netværk, ingen LLM/CF-creds. Omgår SQL-recency-gaten helt
 * (den er irrelevant for box-score-/to-fase-KVALITET).
 *
 * Kør:
 *   npx tsx pipeline/backtest/run-backtest.ts
 *   npx tsx pipeline/backtest/run-backtest.ts --only normal-volleyball --verbose
 *   npx tsx pipeline/backtest/run-backtest.ts --now 2025-02-15
 */
import { buildFactSheet, renderFactSheet } from "../generate/build-factsheet";
import { enrichFactSheetWithBoxScore, findBoxScoreUrl, renderBoxScoreBlock } from "../generate/box-score";
import { verifyArticle } from "../generate/verify-article";
import { parseArticleOutput } from "../generate/parse-output";
import { newsPrompt, type ArticleContext } from "../generate/prompts/news";
import { extractMainText } from "../discover/extract-story";
import { getAcademicYear } from "../lib/class-year";
import { FIXTURES } from "./fixtures";
import { makeReplayDeps, StubChain } from "./replay-deps";
import { scoreFixture, printScorecard, type ActualResult } from "./scorecard";
import type { Fixture } from "./types";

const WRITE_SYSTEM = "You are a Danish sports journalist writing a short factual article.";

function parseArgs(): { only: string | null; verbose: boolean; now: Date } {
  const args = process.argv.slice(2);
  let only: string | null = null;
  let verbose = false;
  let now = new Date();
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--only" && args[i + 1]) only = args[++i];
    else if (args[i] === "--verbose") verbose = true;
    else if (args[i] === "--now" && args[i + 1]) now = new Date(args[++i]);
  }
  return { only, verbose, now };
}

function profileString(f: Fixture): string {
  return [
    `Name: ${f.athleteName}`,
    `Sport: ${f.sport}`,
    `University: ${f.university}`,
    f.hometown ? `Hometown: ${f.hometown}` : "",
  ].filter(Boolean).join("; ");
}

async function runFixture(fixture: Fixture, verbose: boolean): Promise<ActualResult> {
  const chain = new StubChain(fixture);
  const deps = makeReplayDeps(fixture);

  // Fase 1: faktaark fra recap-indholdet (stub leverer det scriptede faktaark).
  const recapText = extractMainText(fixture.recapHtml) ?? fixture.recapHtml;
  const built = await buildFactSheet(
    {
      headline: "Match Recap",
      summary: null,
      content_raw: recapText,
      athlete_name: fixture.athleteName,
      sport: fixture.sport,
      university: fixture.university,
    },
    chain,
  );
  let factSheet = built.factSheet;

  // Link-detektion (uafhængig af om mergen lykkes) — direkte til scorecardet.
  const linkDetected = findBoxScoreUrl(fixture.recapHtml, fixture.sourceUrl);

  // Box-score-berigelse via de injicerede replay-deps.
  if (factSheet) {
    const enriched = await enrichFactSheetWithBoxScore(
      factSheet,
      { sourceUrl: fixture.sourceUrl, athleteName: fixture.athleteName, sport: fixture.sport },
      chain,
      deps,
    );
    factSheet = enriched.factSheet;
  }

  const fs = factSheet ?? {
    has_substance: false, event: null, result: null,
    stats: [], qualitative: [], quotes: [], other_facts: [], box_score_url: null,
  };

  // Fase 2: skriv artikel fra faktaarket (stub leverer den scriptede artikel).
  const context: ArticleContext = {
    athleteName: fixture.athleteName,
    preferredName: null,
    sport: fixture.sport,
    university: fixture.university,
    hometown: fixture.hometown,
    sourceUrl: fixture.sourceUrl,
    headline: "Match Recap",
    content: renderFactSheet(fs),
  };
  const written = await chain.generate({ system: WRITE_SYSTEM, prompt: newsPrompt(context), max_tokens: 700 });
  const article = parseArticleOutput(written.text);

  // Fase 3: verifikation mod faktaark + box-score-blok (stub leverer verdict).
  const factText = renderFactSheet(fs);
  const boxText = renderBoxScoreBlock(fs);
  const verdict = await verifyArticle(
    { title: article.title, content: article.content },
    factText,
    profileString(fixture),
    chain,
    boxText,
  );

  if (verbose) {
    console.log(`\n── ${fixture.id} ──`);
    console.log("faktaark:\n" + factText);
    if (boxText) console.log("box-score-blok:\n" + boxText);
    console.log("artikel:\n" + article.title + "\n" + article.content);
    console.log("verdict:", verdict);
    console.log("chain-kald:", chain.callCounts());
  }

  const boxStats = fs.stats.filter((s) => s.source === "boxscore").map((s) => s.text);
  return {
    linkDetected,
    finalScore: fs.result?.final_score ?? null,
    statLine: boxStats,
    fabricationRisk: verdict?.fabrication_risk ?? "low",
    articleText: `${article.title}\n${article.content}`,
    factText: `${factText}\n${boxText ?? ""}`,
  };
}

async function main(): Promise<void> {
  const { only, verbose, now } = parseArgs();
  const fixtures = only ? FIXTURES.filter((f) => f.id === only) : FIXTURES;

  if (fixtures.length === 0) {
    console.error(`Ingen fixture med id "${only}". Tilgængelige: ${FIXTURES.map((f) => f.id).join(", ")}`);
    process.exit(1);
  }

  console.log(`Backtest: ${fixtures.length} fixture(s) | "mid-season"-kontekst: akademisk år ${getAcademicYear(now)} (now=${now.toISOString().slice(0, 10)})`);
  console.log("Bemærk: box-score/to-fase-KVALITET afhænger af kilde-indhold, ikke af datoen — datoen vises kun som kontekst.");

  const rows = [];
  for (const fixture of fixtures) {
    const result = await runFixture(fixture, verbose);
    rows.push({ fixture, result: scoreFixture(fixture, result) });
  }

  const allPass = printScorecard(rows);
  if (!allPass) process.exit(1);
}

main().catch((err) => {
  console.error("Backtest fejlede:", err);
  process.exit(1);
});
