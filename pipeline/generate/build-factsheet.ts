/**
 * Fase 1 — Fakta-finding. Udtrækker et struktureret FAKTAARK fra en historie,
 * som er det ENESTE skrivefasen (generate-articles.ts) må bruge. Faktaarket
 * indeholder BÅDE tal (stats/resultater) OG kvalitative observationer som kilden
 * faktisk beskriver (fx "styrede midtbanen", "nøglepasninger i opspillet") — hver
 * tagget med kilde. Intet opfindes; kun hvad kilden eksplicit siger.
 *
 * Kør: npx tsx pipeline/generate/build-factsheet.ts [--limit N] [--max-age-days N] [--dry-run]
 */

import { createD1Client } from "../lib/d1-client";
import { ProviderChain } from "../lib/llm/provider-chain";
import { fetchHtml } from "../discover/extract-story";
import { renderPage, isBrowserRenderAvailable, BrowserRenderError } from "../lib/browser-render";
import { enrichFactSheetWithBoxScore, extractBoxScoreText } from "./box-score";

interface StoryRow {
  id: number;
  headline: string | null;
  summary: string | null;
  content_raw: string | null;
  source_url: string;
  athlete_name: string;
  sport: string;
  university: string;
}

export interface FactSheet {
  has_substance: boolean;
  event: { type: string | null; date: string | null; opponent: string | null; competition: string | null } | null;
  result: { final_score: string | null; outcome: string | null; placement: string | null } | null;
  stats: Array<{ text: string; source: "prose" | "boxscore" }>;
  qualitative: Array<{ text: string; source: "prose" | "boxscore" }>;
  quotes: Array<{ text: string; speaker: string; source: "prose" | "boxscore" }>;
  other_facts: Array<{ text: string; source: "prose" | "boxscore" }>;
  box_score_url: string | null;
}

/** Minimal interface — accepterer ProviderChain eller en stub i tests. */
export interface ChainLike {
  generate(opts: { system: string; prompt: string; max_tokens: number; json?: boolean }): Promise<{ text: string }>;
}

const SYSTEM_MESSAGE =
  "You extract a structured fact sheet from a sports-news source about a specific " +
  "college athlete. Output ONLY facts the SOURCE explicitly states — capture BOTH " +
  "quantitative facts (scores, stats, times, placements) AND qualitative observations " +
  "the source reports (e.g. 'controlled midfield', 'made key passes in the build-up', " +
  "'praised by the coach'). Qualitative observations are first-class facts — do not drop " +
  "them just because they are not numbers. NEVER infer, embellish, or add anything not in " +
  "the source. Keep facts in the source's original language. Respond with ONLY a JSON object.";

const SCHEMA_HINT = `{
  "has_substance": boolean,   // false ONLY if the source says nothing specific about THIS athlete
  "event": {"type": string|null, "date": string|null, "opponent": string|null, "competition": string|null},
  "result": {"final_score": string|null, "outcome": string|null, "placement": string|null},
  "stats": [{"text": string, "source": "prose"}],          // numbers the source states
  "qualitative": [{"text": string, "source": "prose"}],     // descriptive performance the source reports
  "quotes": [{"text": string, "speaker": string, "source": "prose"}],
  "other_facts": [{"text": string, "source": "prose"}],
  "box_score_url": string|null   // if the source links a box score / stats page
}`;

function parseArgs(): { limit: number; maxAgeDays: number; dryRun: boolean; boxScore: boolean; boxScoreBudget: number } {
  const args = process.argv.slice(2);
  let limit = 20;
  let maxAgeDays = 14;
  let dryRun = false;
  let boxScore = true; // box-score-berigelse via CF render (slå fra med --no-boxscore)
  let boxScoreBudget = 8; // max box-score-renders per kørsel (beskytter gratis browser-tid)
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--limit" && args[i + 1]) limit = parseInt(args[i + 1], 10) || 20;
    if (args[i] === "--max-age-days" && args[i + 1]) maxAgeDays = parseInt(args[i + 1], 10) || 14;
    if (args[i] === "--dry-run") dryRun = true;
    if (args[i] === "--no-boxscore") boxScore = false;
    if (args[i] === "--boxscore-budget" && args[i + 1]) boxScoreBudget = parseInt(args[i + 1], 10) || 8;
  }
  return { limit, maxAgeDays, dryRun, boxScore, boxScoreBudget };
}

/** Strip markdown-fences og udtræk første JSON-objekt. */
function extractJson(text: string): string | null {
  const stripped = text.replace(/^```(?:json)?\s*/im, "").replace(/\s*```\s*$/im, "").trim();
  const m = stripped.match(/\{[\s\S]*\}/);
  return m ? m[0] : null;
}

function asArray<T>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : [];
}

/** Normalisér rå LLM-JSON til et FactSheet og afgør has_substance defensivt. */
export function normalizeFactSheet(raw: Record<string, unknown>): FactSheet {
  const stats = asArray<{ text: string; source: "prose" | "boxscore" }>(raw.stats);
  const qualitative = asArray<{ text: string; source: "prose" | "boxscore" }>(raw.qualitative);
  const quotes = asArray<{ text: string; speaker: string; source: "prose" | "boxscore" }>(raw.quotes);
  const other_facts = asArray<{ text: string; source: "prose" | "boxscore" }>(raw.other_facts);
  const event = (raw.event && typeof raw.event === "object" ? raw.event : null) as FactSheet["event"];
  const result = (raw.result && typeof raw.result === "object" ? raw.result : null) as FactSheet["result"];

  // has_substance = der findes mindst ét reelt atlet-fakta (tal ELLER kvalitativt).
  // En stærk kamp uden stats kvalificerer via qualitative[] (jf. [[feedback-article-prose-vs-stats]]).
  // Modellens eget flag er kun rådgivende — fakta vinder.
  const has_substance =
    stats.length > 0 ||
    qualitative.length > 0 ||
    quotes.length > 0 ||
    other_facts.length > 0 ||
    Boolean(result && (result.final_score || result.outcome || result.placement)) ||
    Boolean(event && (event.opponent || event.competition || event.type));

  return {
    has_substance,
    event,
    result,
    stats,
    qualitative,
    quotes,
    other_facts,
    box_score_url: typeof raw.box_score_url === "string" ? raw.box_score_url : null,
  };
}

/**
 * Render et faktaark som tekstblok til skrivefasen (FAKTAARK = den ENESTE kilde
 * writeren må bruge). Kvalitative observationer fremhæves som materiale til at
 * fortælle om præstationen — også når der ingen stats er.
 */
export function renderFactSheet(fs: FactSheet): string {
  const blocks: string[] = [];
  if (fs.event) {
    const e = fs.event;
    const parts = [e.type, e.opponent ? `mod ${e.opponent}` : null, e.competition, e.date].filter(Boolean);
    if (parts.length) blocks.push(`Begivenhed: ${parts.join(", ")}`);
  }
  if (fs.result && (fs.result.final_score || fs.result.outcome || fs.result.placement)) {
    const r = fs.result;
    const parts = [r.outcome, r.final_score, r.placement].filter(Boolean);
    blocks.push(`Resultat: ${parts.join(", ")}`);
  }
  if (fs.stats.length) blocks.push("Statistik:\n" + fs.stats.map((s) => `- ${s.text}`).join("\n"));
  if (fs.qualitative.length)
    blocks.push(
      "Observationer (kvalitativ kontekst — skriv i egne ord; parafraser ikke kildens formuleringer):\n" +
        fs.qualitative.map((q) => `- ${q.text}`).join("\n"),
    );
  if (fs.quotes.length)
    blocks.push(
      "Citater (gengiv HØJST ét — kun hvis relevant — ordret og attribueret):\n" +
        fs.quotes.map((q) => `- "${q.text}"${q.speaker ? ` — ${q.speaker}` : ""}`).join("\n"),
    );
  if (fs.other_facts.length)
    blocks.push("Andre fakta:\n" + fs.other_facts.map((f) => `- ${f.text}`).join("\n"));
  return blocks.join("\n\n");
}

/** Byg faktaark for én historie. Returnerer faktaark + status ('built'|'no_substance'|'failed'). */
export async function buildFactSheet(
  story: Pick<StoryRow, "headline" | "summary" | "content_raw" | "athlete_name" | "sport" | "university">,
  chain: ChainLike,
): Promise<{ factSheet: FactSheet | null; status: "built" | "no_substance" | "failed" }> {
  const source = (story.content_raw ?? story.summary ?? story.headline ?? "").slice(0, 8000);
  if (!source.trim()) return { factSheet: null, status: "no_substance" };

  const prompt = [
    `Athlete: ${story.athlete_name}, ${story.sport}, ${story.university}`,
    "",
    "SOURCE:",
    story.headline ? `Headline: ${story.headline}` : "",
    source,
    "",
    `Return ONLY this JSON shape (omit nothing; use null/[] where the source is silent):`,
    SCHEMA_HINT,
  ].filter(Boolean).join("\n");

  let text: string;
  try {
    const res = await chain.generate({ system: SYSTEM_MESSAGE, prompt, max_tokens: 900, json: true });
    text = res.text;
  } catch {
    return { factSheet: null, status: "failed" };
  }

  const jsonStr = extractJson(text);
  if (!jsonStr) return { factSheet: null, status: "failed" };
  let raw: Record<string, unknown>;
  try {
    raw = JSON.parse(jsonStr) as Record<string, unknown>;
  } catch {
    return { factSheet: null, status: "failed" };
  }

  const factSheet = normalizeFactSheet(raw);
  return { factSheet, status: factSheet.has_substance ? "built" : "no_substance" };
}

async function main(): Promise<void> {
  const { limit, maxAgeDays, dryRun, boxScore, boxScoreBudget } = parseArgs();
  const db = createD1Client();
  const chain = new ProviderChain(db);

  const renderEnabled = boxScore && isBrowserRenderAvailable();
  let rendersUsed = 0;
  let renderQuotaExhausted = false;
  let boxScoreFound = 0;
  if (renderEnabled) console.log(`Box-score-berigelse aktiv (budget: ${boxScoreBudget} render/kørsel).`);

  const result = await db.query<StoryRow>(
    `SELECT s.id, s.headline, s.summary, s.content_raw, s.source_url,
            a.name as athlete_name, a.sport, a.university
     FROM stories s
     JOIN athletes a ON s.athlete_id = a.id
     WHERE s.status = 'new'
       AND s.fact_status IS NULL
       AND datetime(s.discovered_at, '+' || ? || ' days') >= datetime('now')
     ORDER BY (s.content_raw IS NOT NULL) DESC, s.relevance_score DESC
     LIMIT ?`,
    [maxAgeDays, limit],
  );
  const stories = result.results;
  console.log(`Bygger faktaark for ${stories.length} historie(r)${dryRun ? " (DRY-RUN)" : ""}...\n`);

  let built = 0, noSubstance = 0, failed = 0;
  for (const story of stories) {
    const result = await buildFactSheet(story, chain);
    let factSheet = result.factSheet;
    const status = result.status;

    // Box-score-berigelse: grundsandhed for TAL (aldrig erstatning for kvalitativ prosa).
    // Kun for byggede faktaark, inden for render-budget, og kun hvis quota ikke er opbrugt.
    if (factSheet && status === "built" && renderEnabled && !renderQuotaExhausted && rendersUsed < boxScoreBudget) {
      try {
        const enriched = await enrichFactSheetWithBoxScore(
          factSheet,
          { sourceUrl: story.source_url, athleteName: story.athlete_name, sport: story.sport },
          chain,
          { fetchHtml, renderPage: (u) => renderPage(u), extractText: extractBoxScoreText },
        );
        if (enriched.rendered) rendersUsed++;
        if (enriched.found) {
          factSheet = enriched.factSheet;
          boxScoreFound++;
        }
      } catch (err) {
        if (err instanceof BrowserRenderError && err.quotaExhausted) {
          renderQuotaExhausted = true;
          console.warn(`  ⚠ Browser Rendering opbrugt — box scores stoppet resten af kørslen (${err.message})`);
        } else {
          console.warn(`  ⚠ Box-score-fejl [${story.id}]: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
    }

    const boxStats = factSheet ? factSheet.stats.filter((s) => s.source === "boxscore").length : 0;
    const facts = factSheet
      ? factSheet.stats.length + factSheet.qualitative.length + factSheet.quotes.length
      : 0;
    console.log(
      `  [${status}] ${story.id} ${story.headline?.slice(0, 60) ?? ""} (${facts} fakta${boxStats ? `, ${boxStats} box-score` : ""})`,
    );

    if (!dryRun) {
      await db.execute(
        `UPDATE stories SET fact_sheet = ?, fact_status = ? WHERE id = ?`,
        [factSheet ? JSON.stringify(factSheet) : null, status, story.id],
      );
    }
    if (status === "built") built++;
    else if (status === "no_substance") noSubstance++;
    else failed++;
  }

  console.log(
    `\nFærdig. Bygget: ${built} | Uden substans: ${noSubstance} | Fejlet: ${failed}` +
      (renderEnabled ? ` | Box scores: ${boxScoreFound} fundet (${rendersUsed}/${boxScoreBudget} render)` : ""),
  );
}

// Kør kun main() når filen eksekveres direkte (ikke ved import i tests).
if (process.argv[1] && process.argv[1].includes("build-factsheet")) {
  main().catch((err) => {
    console.error("Faktaark-bygning fejlede:", err);
    process.exit(1);
  });
}
