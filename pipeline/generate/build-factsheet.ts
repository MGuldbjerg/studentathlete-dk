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
import { stripForwardLooking } from "./forward-looking";
import { ProviderChain } from "../lib/llm/provider-chain";
import { fetchHtml } from "../discover/extract-story";
import { parseMatchFacts, type MatchFacts } from "./match-facts";
import { renderPage, isBrowserRenderAvailable, BrowserRenderError } from "../lib/browser-render";
import { enrichFactSheetWithBoxScore, extractBoxScoreText,
  looksLikeMatchStory,
} from "./box-score";
import { isTransientLLMError } from "../lib/llm/errors";

interface StoryRow {
  id: number;
  headline: string | null;
  summary: string | null;
  content_raw: string | null;
  source_url: string;
  athlete_name: string;
  sport: string;
  university: string;
  fact_attempts: number;
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
  /**
   * KAMPEN SELV — scoringsoversigt og holdstatistik, læst regelbaseret ud af
   * kilden (se match-facts.ts). Faktaarket fangede før kun ATLETENS egen
   * linje, og det var netop dér de ti afviste kampreferater hentede deres
   * fejl: forkert målrækkefølge, forkerte redningstal, opfundne oplæg.
   */
  match?: MatchFacts | null;
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

function parseArgs(): { limit: number; maxAgeDays: number; dryRun: boolean; boxScore: boolean; boxScoreBudget: number; paceMs: number } {
  const args = process.argv.slice(2);
  // 20 → 60 (2026-08-26): faktaark-bygningen fodrer generate-articles, og med
  // 12 artikler pr. kørsel × flere kørsler skal der være ark nok at vælge
  // imellem. Udtrækket er ét LLM-kald pr. historie, og vi bruger ~1% af kvoten.
  let limit = 60;
  let maxAgeDays = 14;
  let dryRun = false;
  let boxScore = true; // box-score-berigelse via CF render (slå fra med --no-boxscore)
  let boxScoreBudget = 8; // max box-score-renders per kørsel (beskytter gratis browser-tid)
  // Free tiers meter per MINUTE (Gemini 5 rpm, Groq 8k tpm, Mistral ~1 rps).
  // 60 stories back to back with no pause blow them in under a minute, however
  // ample the daily quota — this broke factsheet building 4-8 September 2026.
  let paceMs = 2000;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--limit" && args[i + 1]) limit = parseInt(args[i + 1], 10) || 20;
    if (args[i] === "--max-age-days" && args[i + 1]) maxAgeDays = parseInt(args[i + 1], 10) || 14;
    if (args[i] === "--dry-run") dryRun = true;
    if (args[i] === "--no-boxscore") boxScore = false;
    if (args[i] === "--boxscore-budget" && args[i + 1]) boxScoreBudget = parseInt(args[i + 1], 10) || 8;
    if (args[i] === "--pace-ms" && args[i + 1]) paceMs = Math.max(0, parseInt(args[i + 1], 10) || 0);
  }
  return { limit, maxAgeDays, dryRun, boxScore, boxScoreBudget, paceMs };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
/**
 * Ugedagen for en kampdato — UDREGNET, ikke gættet.
 *
 * Modellen skrev ugedagen selv ud fra datoen og tog fejl 4 gange ud af 5 i
 * kladderne fra 27.-28. august 2026: «Wednesday evening» om en torsdag,
 * «Thursday» om en fredag. Den slags kan ingen nedstrøms kontrol fange —
 * faktaarket sagde jo ikke noget forkert, det sagde bare ingenting.
 *
 * Nu står dagen i faktaarket, så skrivefasen kan læse den i stedet for at
 * regne. Kan datoen ikke forstås, skrives der ingen dag — så er «onsdag»
 * i det mindste ikke vores påfund.
 */
export function weekdayOf(dateText: string | null | undefined): string | null {
  const raw = (dateText ?? "").trim();
  if (!raw) return null;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  // Årstal uden dag ("July 2026") giver 1. i måneden og dermed en tilfældig
  // ugedag — kræv derfor at datoteksten indeholder et dagtal.
  if (!/\b\d{1,2}\b/.test(raw.replace(/\b(19|20)\d{2}\b/, ""))) return null;

  // ⚠️ De to skrivemåder lander i HVER SIN tidszone: "2026-08-27" tolkes som
  // UTC-midnat, "Aug. 27, 2026" som LOKAL midnat. Formateres de ens, skifter
  // den ene dag — min første udgave svarede «Wednesday» på begge amerikanske
  // formater. Vi normaliserer derfor til UTC-middag ud fra de lokale dele.
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw);
  const utc = iso
    ? new Date(Date.UTC(+iso[1], +iso[2] - 1, +iso[3], 12))
    : new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), 12));
  return utc.toLocaleDateString("en-GB", { weekday: "long", timeZone: "UTC" });
}

export function renderFactSheet(fs: FactSheet): string {
  const blocks: string[] = [];
  if (fs.event) {
    const e = fs.event;
    const weekday = weekdayOf(e.date);
    const parts = [
      e.type,
      e.opponent ? `mod ${e.opponent}` : null,
      e.competition,
      // Ugedagen står EFTER datoen og er udregnet — modellen må ikke selv
      // udlede den (4 fejl ud af 5 målt 2026-08-29).
      e.date ? (weekday ? `${e.date} (${weekday})` : e.date) : null,
    ].filter(Boolean);
    if (parts.length) blocks.push(`Begivenhed: ${parts.join(", ")}`);
  }
  if (fs.result && (fs.result.final_score || fs.result.outcome || fs.result.placement)) {
    const r = fs.result;
    const parts = [r.outcome, r.final_score, r.placement].filter(Boolean);
    blocks.push(`Resultat: ${parts.join(", ")}`);
  }
  if (fs.match?.goals.length) {
    // Rækkefølgen er kildens egen. Skrivefasen skal kunne se HVEM der scorede
    // hvornår — uden det opfinder den forløbet.
    blocks.push(
      "Kampens mål (kildens egen oversigt — brug rækkefølgen som den står):\n" +
        fs.match.goals
          .map((g) => {
            const who = g.team ? `${g.scorer} (${g.team})` : g.scorer;
            const how = g.penalty ? " straffespark" : "";
            const assist = g.assists.length ? ` — oplæg: ${g.assists.join(", ")}` : "";
            return `- ${g.time} ${who}${how}${assist}`;
          })
          .join("\n"),
    );
  }
  if (fs.match?.teamStats?.rows.length) {
    const t = fs.match.teamStats;
    const head = t.teams.length === 2 ? ` (${t.teams.join(" / ")})` : "";
    blocks.push(
      `Holdstatistik${head}:\n` +
        t.rows.map((r) => `- ${r.label}: ${r.values.join(" - ")}`).join("\n"),
    );
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

/** `transient` is never written to the database — it means "not attempted yet". */
export type FactStatus = "built" | "no_substance" | "failed" | "transient";

/**
 * Attempts before 'failed' is written for good.
 *
 * One unparseable answer is not evidence about the story — a degraded fallback
 * model produced 24 of them in a single run on 9 September 2026, with no rate
 * limit in sight. Three is evidence.
 */
export const MAX_FACT_ATTEMPTS = 3;

/**
 * Is this status the last word on the story?
 *
 * Everything except 'failed' is: 'built' and 'no_substance' are answers, and
 * 'transient' never reaches this question. Only 'failed' has to earn its
 * permanence by repeating.
 */
export function isFinalVerdict(status: FactStatus, attempts: number, max = MAX_FACT_ATTEMPTS): boolean {
  return status !== "failed" || attempts >= max;
}

/**
 * Byg faktaark for én historie.
 *
 * `transient` is not a verdict on the story: the chain never reached a model
 * (quota / rate limit). It MUST leave `fact_status` untouched so the story is
 * picked up by the next run — see main() below.
 */
export async function buildFactSheet(
  story: Pick<StoryRow, "headline" | "summary" | "content_raw" | "athlete_name" | "sport" | "university">,
  chain: ChainLike,
): Promise<{ factSheet: FactSheet | null; status: FactStatus }> {
  // Kildens «UP NEXT» er sand når referatet skrives, men ikke når vi genererer
  // dage senere. Fjern den FØR faktaarket bygges — se forward-looking.ts.
  const source = stripForwardLooking(story.content_raw ?? story.summary ?? story.headline ?? "").slice(0, 8000);
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
    // 900 truncated the JSON on fact-rich sources, and a cut-off object parses
    // as nothing: story 3992 (35 kB, 24 facts) failed on every model at 900 and
    // built 29 facts at 1600. 2400 found no more, so the ceiling was the only
    // thing wrong. Measured 2026-09-09 with pipeline/backtest/model-bakeoff.ts.
    const res = await chain.generate({ system: SYSTEM_MESSAGE, prompt, max_tokens: 1600, json: true });
    text = res.text;
  } catch (err) {
    // A quota failure is the weather, not the story.
    return { factSheet: null, status: isTransientLLMError(err) ? "transient" : "failed" };
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
  const { limit, maxAgeDays, dryRun, boxScore, boxScoreBudget, paceMs } = parseArgs();
  const db = createD1Client();
  const chain = new ProviderChain(db);

  const renderEnabled = boxScore && isBrowserRenderAvailable();
  let rendersUsed = 0;
  let renderQuotaExhausted = false;
  let boxScoreFound = 0;
  if (renderEnabled) console.log(`Box-score-berigelse aktiv (budget: ${boxScoreBudget} render/kørsel).`);

  const result = await db.query<StoryRow>(
    `SELECT s.id, s.headline, s.summary, s.content_raw, s.source_url,
            s.fact_attempts,
            a.name as athlete_name, a.sport, a.university
     FROM stories s
     JOIN athletes a ON s.athlete_id = a.id
     WHERE s.status = 'new'
       AND s.fact_status IS NULL
       AND datetime(s.discovered_at, '+' || ? || ' days') >= datetime('now')
     ORDER BY (s.content_raw IS NOT NULL) DESC, s.fact_attempts ASC, s.relevance_score DESC
     LIMIT ?`,
    [maxAgeDays, limit],
  );
  const stories = result.results;
  console.log(`Bygger faktaark for ${stories.length} historie(r)${dryRun ? " (DRY-RUN)" : ""}...\n`);

  let built = 0, noSubstance = 0, failed = 0, transient = 0, matchFactsFound = 0;
  // If the chain is spent, it is spent for the NEXT story too. Three in a row
  // is not bad luck, it is an exhausted quota — stop rather than burn the rest
  // of the window on calls that cannot succeed.
  const MAX_CONSECUTIVE_TRANSIENT = 3;
  let retrying = 0;
  let consecutiveTransient = 0;
  let index = 0;

  for (const story of stories) {
    // Pause BETWEEN calls, not before the first.
    if (index++ > 0 && paceMs > 0) await sleep(paceMs);

    const result = await buildFactSheet(story, chain);
    let factSheet = result.factSheet;
    const status = result.status;

    if (status === "transient") {
      // NO write: fact_status stays NULL, so the story is back in the next run.
      // Writing 'failed' here is what lost it forever.
      transient++;
      consecutiveTransient++;
      console.log(`  [${status}] ${story.id} ${story.headline?.slice(0, 60) ?? ""} — chain is rate limited, retried next run`);
      if (consecutiveTransient >= MAX_CONSECUTIVE_TRANSIENT) {
        console.log(`\n⏸ ${MAX_CONSECUTIVE_TRANSIENT} stories in a row with no answer from any provider — stopping the run here.`);
        break;
      }
      continue;
    }
    consecutiveTransient = 0;

    // KAMPEN SELV, før alt andet: regelbaseret, ingen LLM, ingen browser-render.
    // Prøv den gemte kildetekst først — en tredjedel af historierne bærer
    // allerede oversigten — og hent kun siden hvis den ikke gør.
    if (factSheet && status === "built" && looksLikeMatchStory(factSheet)) {
      try {
        let match = parseMatchFacts(story.content_raw ?? "");
        if (!match.goals.length && story.source_url) {
          const html = await fetchHtml(story.source_url);
          if (html) match = parseMatchFacts(html);
        }
        if (match.goals.length || match.teamStats) {
          factSheet = { ...factSheet, match };
          matchFactsFound++;
          console.log(`    + kampforløb: ${match.goals.length} mål${match.teamStats ? `, ${match.teamStats.rows.length} nøgletal` : ""}`);
        }
      } catch (err) {
        // En manglende scoringsoversigt må aldrig vælte faktaarket.
        console.warn(`  ⚠ Kampforløb [${story.id}]: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

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

    // A model answered, but we could not read the answer. Count the attempt and
    // leave fact_status NULL so the story comes back — until the count itself
    // says the source, not the weather, is the problem.
    const attempts = (story.fact_attempts ?? 0) + 1;
    const giveUp = isFinalVerdict(status, attempts);

    if (!dryRun) {
      if (giveUp) {
        await db.execute(
          `UPDATE stories SET fact_sheet = ?, fact_status = ?, fact_attempts = ? WHERE id = ?`,
          [factSheet ? JSON.stringify(factSheet) : null, status, attempts, story.id],
        );
      } else {
        await db.execute(`UPDATE stories SET fact_attempts = ? WHERE id = ?`, [attempts, story.id]);
      }
    }

    if (status === "built") built++;
    else if (status === "no_substance") noSubstance++;
    else if (giveUp) failed++;
    else {
      retrying++;
      console.log(`    → unreadable answer, attempt ${attempts}/${MAX_FACT_ATTEMPTS} — retried next run`);
    }
  }

  console.log(
    `\nFærdig. Bygget: ${built} | Uden substans: ${noSubstance} | Fejlet: ${failed}` +
    (transient ? ` | Afventer kvote: ${transient}` : "") +
    (retrying ? ` | Prøves igen: ${retrying}` : "") +
    ` | Med kampforløb: ${matchFactsFound}` +
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
