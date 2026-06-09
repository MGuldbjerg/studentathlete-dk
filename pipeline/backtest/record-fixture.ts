/**
 * RECORD MODE — fang en RIGTIG in-season-fixture og kør den ægte pipeline live én gang.
 *
 * Henter recap-siden (plain), finder box-score-linket, renderer box scoren (CF Browser
 * Rendering), og kører den RIGTIGE ProviderChain (gratis providers) gennem alle fire faser
 * mens hvert rå LLM-svar optages. Gemmer HTML-snapshots + en .fixture.json så kørslen
 * derefter kan afspilles GRATIS og deterministisk af run-backtest.ts.
 *
 * Kræver env: CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID (+ mindst én LLM-nøgle:
 * MISTRAL_API_KEY/GEMINI_API_KEY/GROQ_API_KEY).
 *
 * Kør:
 *   npx tsx pipeline/backtest/record-fixture.ts \
 *     --id svanholm-ucdavis --athlete "Lena Svanholm" --sport basketball \
 *     --university "UC Davis" --hometown "Denmark" \
 *     --url "https://ucdavisaggies.com/news/2026/2/12/...aspx"
 */
import * as fs from "fs";
import * as path from "path";
import { createD1Client } from "../lib/d1-client";
import { ProviderChain } from "../lib/llm/provider-chain";
import { extractMainText } from "../discover/extract-story";
import { renderPage, isBrowserRenderAvailable } from "../lib/browser-render";
import { buildFactSheet, renderFactSheet } from "../generate/build-factsheet";
import { enrichFactSheetWithBoxScore, findBoxScoreUrl, renderBoxScoreBlock } from "../generate/box-score";
import { verifyArticle } from "../generate/verify-article";
import { parseArticleOutput } from "../generate/parse-output";
import { newsPrompt, type ArticleContext } from "../generate/prompts/news";

const UA = "StudentAthlete.dk/1.0 (research, contact: info@studentathlete.dk)";
const WRITE_SYSTEM = "You are a Danish sports journalist writing a short factual article.";
const SNAP_DIR = path.join(__dirname, "snapshots");

type Phase = "factsheet" | "boxScore" | "article" | "verify";
function classify(system: string): Phase {
  const s = system.toLowerCase();
  if (s.includes("fact-checker")) return "verify";
  if (s.includes("box score")) return "boxScore";
  if (s.includes("fact sheet")) return "factsheet";
  return "article";
}

/** Wrapper om den ægte chain der optager hvert rå LLM-svar pr. fase. */
class RecordingChain {
  recorded: Partial<Record<Phase, string>> = {};
  constructor(private inner: { generate(o: { system: string; prompt: string; max_tokens: number; preferProvider?: string }): Promise<{ text: string }> }) {}
  async generate(opts: { system: string; prompt: string; max_tokens: number; preferProvider?: string }): Promise<{ text: string }> {
    const res = await this.inner.generate(opts);
    this.recorded[classify(opts.system)] = res.text;
    return res;
  }
}

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function plainFetch(url: string): Promise<string | null> {
  try {
    const r = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(20000), redirect: "follow" });
    return r.ok ? await r.text() : null;
  } catch {
    return null;
  }
}

async function main(): Promise<void> {
  const id = arg("id");
  const url = arg("url");
  const athleteName = arg("athlete");
  const sport = arg("sport") ?? "basketball";
  const university = arg("university") ?? "";
  const hometown = arg("hometown") ?? null;
  if (!id || !url || !athleteName) {
    console.error("Kræver --id, --url, --athlete (+ valgfri --sport --university --hometown).");
    process.exit(1);
  }
  if (!isBrowserRenderAvailable()) {
    console.error("CF Browser Rendering ikke tilgængelig (mangler CLOUDFLARE_API_TOKEN/ACCOUNT_ID).");
    process.exit(1);
  }
  fs.mkdirSync(SNAP_DIR, { recursive: true });

  console.log(`RECORD: ${athleteName} (${sport}) — ${url}`);

  // 1) Recap (plain — links bevaret).
  const recapHtml = await plainFetch(url);
  if (!recapHtml) { console.error("Kunne ikke hente recap."); process.exit(1); }
  const recapFile = path.join(SNAP_DIR, `${id}.recap.html`);
  fs.writeFileSync(recapFile, recapHtml);

  // 2) Box-score-link (deterministisk).
  const boxUrl = findBoxScoreUrl(recapHtml, url);
  console.log(`  findBoxScoreUrl → ${boxUrl ?? "(intet link)"}`);
  if (!boxUrl) { console.error("Ingen box-score-link i recap'en — vælg en anden recap."); process.exit(1); }

  // 3) Render box scoren (JS-tung stats-side). Sidearm-box-scores er tunge SPA'er:
  // networkidle0 (prod-default) timeouter ofte → brug networkidle2 + længere timeout.
  const boxHtml = await renderPage(boxUrl, { waitUntil: "networkidle2", timeoutMs: 50000 });
  if (!boxHtml) { console.error("Render gav ingen HTML."); process.exit(1); }
  const boxFile = path.join(SNAP_DIR, `${id}.box.html`);
  fs.writeFileSync(boxFile, boxHtml);
  console.log(`  renderet box score: ${boxHtml.length} tegn`);

  // 4) Kør den ægte pipeline med optagende chain over de hentede snapshots.
  const chain = new RecordingChain(new ProviderChain(createD1Client()));
  const deps = {
    async fetchHtml(u: string) { return u === url ? recapHtml : null; },
    async renderPage() { return boxHtml; },
    extractText: extractMainText,
  };

  const recapText = extractMainText(recapHtml) ?? recapHtml;
  const built = await buildFactSheet(
    { headline: athleteName, summary: null, content_raw: recapText, athlete_name: athleteName, sport, university },
    chain,
  );
  let factSheet = built.factSheet;
  if (!factSheet) { console.error(`buildFactSheet status=${built.status} — ingen substans.`); process.exit(1); }

  const enriched = await enrichFactSheetWithBoxScore(
    factSheet, { sourceUrl: url, athleteName, sport }, chain, deps,
  );
  factSheet = enriched.factSheet;

  const context: ArticleContext = {
    athleteName, preferredName: null, sport, university, hometown,
    sourceUrl: url, headline: athleteName, content: renderFactSheet(factSheet),
  };
  const written = await chain.generate({ system: WRITE_SYSTEM, prompt: newsPrompt(context), max_tokens: 700 });
  const article = parseArticleOutput(written.text);

  const factText = renderFactSheet(factSheet);
  const boxText = renderBoxScoreBlock(factSheet);
  const verdict = await verifyArticle({ title: article.title, content: article.content }, factText, `Name: ${athleteName}; Sport: ${sport}; University: ${university}`, chain, boxText);

  const boxStats = factSheet.stats.filter((s) => s.source === "boxscore").map((s) => s.text);

  // 5) Resultater (HÅNDVERIFICÉR disse mod den rigtige box score!).
  console.log("\n── LIVE RESULTAT (håndverificér mod den rigtige box score) ──");
  console.log(`  box-score fundet i recap: ${boxUrl}`);
  console.log(`  slutresultat: ${factSheet.result?.final_score ?? "(intet)"}`);
  console.log(`  ${athleteName}s box-score-statline: ${boxStats.length ? boxStats.join(" | ") : "(ingen — atlet ikke fundet på siden?)"}`);
  console.log(`  fabrication_risk: ${verdict?.fabrication_risk ?? "(uverificeret)"}${verdict?.flags.length ? ` — ${verdict.flags.join("; ")}` : ""}`);
  console.log(`\n  ARTIKEL:\n  ${article.title}\n  ${article.content.replace(/\n/g, "\n  ")}`);

  // 6) Gem fixture (afspilles gratis offline af run-backtest.ts via loadRealFixtures).
  const fixture = {
    id, kind: "real", athleteName, sport, university, hometown, sourceUrl: url,
    recapHtmlFile: path.basename(recapFile), boxScoreHtmlFile: path.basename(boxFile),
    llm: {
      factsheet: chain.recorded.factsheet ?? "{}",
      boxScore: chain.recorded.boxScore,
      article: chain.recorded.article ?? "",
      verify: chain.recorded.verify ?? '{"fabrication_risk":"low","flags":[]}',
    },
    expected: {
      linkDetected: boxUrl,
      finalScore: factSheet.result?.final_score ?? null,
      statLine: boxStats,
      fabricationRisk: verdict?.fabrication_risk ?? "low",
    },
  };
  const fixFile = path.join(SNAP_DIR, `${id}.fixture.json`);
  fs.writeFileSync(fixFile, JSON.stringify(fixture, null, 2));
  console.log(`\nGemt: ${fixFile} (+ .recap.html, .box.html). Verificér 'expected' og kør run-backtest.ts.`);
}

main().catch((err) => { console.error("Record fejlede:", err); process.exit(1); });
