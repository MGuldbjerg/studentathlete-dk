/**
 * Genererer artikeludkast fra fundne historier via LLM provider-kæde.
 * Kør med: npx tsx pipeline/generate/generate-articles.ts
 *
 * Prøver gratis providere i rækkefølge: Mistral → Gemini → Groq → CF AI → Anthropic.
 * Gemmer kladder i articles-tabellen med published = 0.
 */

import { createD1Client, type D1Client } from "../lib/d1-client";
import { generateSlug } from "../../src/lib/slug";
import { ProviderChain } from "../lib/llm/provider-chain";
import type { StyleCorrectionEntry } from "./prompts/system";
import { promptsFor, promptForType, type PromptSet } from "./prompts";
import { countryProfile, DEFAULT_COUNTRY, siteCountrySql } from "../../src/lib/countries";
import { parseArticleOutputSmart, type ParsedArticle, salvageTruncatedJson, stripShortArticleHeadings } from "./parse-output";
import { renderFactSheet, type FactSheet } from "./build-factsheet";
import type { ArticleContext } from "./prompts/news";
import type { Story } from "../lib/types";
import { timelineForGeneration, currentSeasonStart, type AthleteEvent } from "./timeline";
import { sensitiveCareBlock, type SensitiveType } from "../discover/sensitive";
import { checkStoryIdentity, hasUnsourcedQuote } from "./identity-guard";
import { checkEventTiming } from "./event-timing";
import { groupBySourceAndCountry } from "./group-stories";
import { MULTI_DAY_SPORTS, SIBLING_DAYS, foldEarlierReports, holdDecision, type Report } from "./tournament-hold";
import { PARENT_DAYS, cleanSection, findParent, isWeeklyAward, sectionPrompt } from "./award-section";
import { ADDITION_TYPE, appendAddition } from "../../src/lib/article-addition";
import { earlierLines, rosterLine, withRecords } from "./records";
import { MAX_AGE_DAYS, ncaaDivision, ncaaSport, rankingLines, schoolKeys, type StoredRanking } from "../stats/ncaa-rankings";
import { numbersIn, unsupportedNumbers, unstableNumbers } from "./fact-numbers";
import { MIN_RELEVANCE_GENERATE } from "../discover/extract-story";
import { notifyDraftsReady, notifyFailure } from "../lib/notify";

export interface StoryWithAthlete extends Story {
  athlete_name: string;
  preferred_name: string | null;
  sport: string;
  university: string;
  hometown: string | null;
  position: string | null;
  division: string | null;
  class_year: string | null;
  previous_school: string | null;
  expected_graduation: string | null;
  fact_sheet: string | null;
  sensitive: string | null;
  /** Atletens nationalitet (migration 034). Bestemmer sprog OG artiklens site. */
  home_country: string | null;
  /** "f" | "m" | null (migration 039). Stedord er fakta, ikke et gæt fra kilden. */
  gender: string | null;
  /** Tekniske generings-forsøg brugt på historien (migration 052). */
  gen_attempts: number | null;
}

/**
 * Hvor mange gange må en historie fejle TEKNISK, før vi holder op?
 *
 * Ét afbrudt modelsvar er ikke evidens om historien — det er vejret. Tre er.
 * Samme tal og samme begrundelse som MAX_FACT_ATTEMPTS i build-factsheet.ts:
 * 13. september 2026 fejlede historie 5153 og 4914 i ALLE dagens kørsler, og
 * intet i loggen sagde at de havde været der før.
 */
export const MAX_GEN_ATTEMPTS = 3;

/** Er historiens tekniske forsøg brugt op? */
export function generationExhausted(attempts: number, max = MAX_GEN_ATTEMPTS): boolean {
  return attempts >= max;
}

/**
 * Hvilket sprog skal artiklen skrives på? Nationaliteten er data, så den
 * afgør både promptsæt og hvilket site artiklen tilhører — ikke en antagelse
 * om at alt i basen er dansk.
 */
function siteFor(story: StoryWithAthlete): { country: string; prompts: PromptSet } {
  const country = (story.home_country ?? DEFAULT_COUNTRY).toUpperCase();
  return { country, prompts: promptsFor(countryProfile(country).language) };
}

export function selectArticleType(story: StoryWithAthlete): string {
  const headline = (story.headline ?? "").toLowerCase();
  const content = (story.content_raw ?? "").toLowerCase();
  const text = `${headline} ${content}`;

  // Lange formater (feature/season_update) kræver reelt indhold — ellers tvinges
  // modellen til at fylde 400-1200 ord med opdigtet stof. Headline-only → news.
  const hasRichContent =
    !!story.content_raw || (story.summary?.length ?? 0) > 100;

  // ⚠️ ORDGRÆNSER, ikke delstrenge. `text.includes("sign")` matcher inde i
  // «significant» — et helt almindeligt ord i sportsreferater — og sendte
  // 30. august tre KAMPREFERATER ned ad rekrutterings-prompten. Resultatet
  // var kladder der påstod at en spiller «joins Florida Southern», mens
  // kilden handlede om hans to mål i sæsonpremieren.
  const RECRUITING_RE =
    /\b(commits?|committed|commitment|signs?|signed|signing|recruit(s|ed|ing|ment)?)\b/i;

  // Og uanset ordvalg: har faktaarket en MODSTANDER og et RESULTAT, er det et
  // kampreferat. En kamp kan ikke være en rekrutteringsnyhed.
  const isMatch = Boolean(story.fact_sheet && /"opponent":\s*"[^"]/.test(story.fact_sheet)
    && /"final_score":\s*"[^"]/.test(story.fact_sheet));

  if (!isMatch && RECRUITING_RE.test(text)) {
    return "recruiting";
  }
  if (hasRichContent && (text.includes("season") || text.includes("recap") || text.includes("wrap"))) {
    return "season_update";
  }
  if (hasRichContent && story.relevance_score > 70) return "feature";
  return "news";
}

/**
 * Instruks når ÉN kilde dækker flere af vores atleter fra SAMME land.
 * Garantien er MEKANISK — der laves kun én artikel pr. (kilde, land) — og
 * denne blok afgør kun HVORDAN de øvrige omtales.
 */
function teammatesBlock(names: string[], language: string): string {
  const list = names.join(", ");
  if (language === "da") {
    return [
      "FLERE AF VORES ATLETER I SAMME BEGIVENHED",
      `Kilden dækker også: ${list}.`,
      "Skriv ÉN artikel om begivenheden, ikke én pr. spiller. Nævn hver af dem",
      "med præcis den rolle faktaarket giver dem — hverken mere eller mindre.",
      "Giver faktaarket dem ingen rolle, så nævn dem ikke.",
      "Overskriften skal handle om begivenheden, medmindre faktaarket viser at",
      "ÉN var afgørende. Skriv aldrig at nogen «sikrede» eller «fyrede» holdet",
      "frem, hvis det var en anden der scorede.",
    ].join("\n");
  }
  return [
    "SEVERAL OF OUR ATHLETES IN THE SAME EVENT",
    `This source also covers: ${list}.`,
    "Write ONE article about the event, not one per player. Give each of them",
    "exactly the role the fact sheet gives them — no more, no less. If the fact",
    "sheet gives them no role, do not mention them.",
    "The headline must be about the event unless the fact sheet shows ONE was",
    "decisive. Never write that someone sealed or fired the team to anything if",
    "someone else scored.",
  ].join("\n");
}

/**
 * Reparationsprompt: ret PRÆCIS de tal der ikke har dækning.
 *
 * Hvorfor reparation frem for en strengere instruks: ARTICLE-ACCURACY.md har
 * allerede afgjort at gratis-modellerne ikke følger pålidelige negative
 * instrukser. «Opfind aldrig tal» virker ikke. «Du skrev 33; faktaarket siger
 * 32» virker, fordi opgaven er konkret og lille.
 */
/** Faktaarket som læsbar tekst — samme gengivelse som skrivefasen fik. */
function factSheetText(story: StoryWithAthlete): string {
  if (!story.fact_sheet) return "";
  try {
    return renderFactSheet(JSON.parse(story.fact_sheet) as FactSheet);
  } catch {
    return story.fact_sheet;
  }
}
function repairNumbersPrompt(
  title: string,
  content: string,
  bad: string[],
  factsBlock: string,
  language: string,
): string {
  const list = bad.join(", ");
  const head = language === "da"
    ? [
        `Følgende tal i teksten har INGEN dækning i faktaarket: ${list}.`,
        "Ret hvert af dem til det tal faktaarket faktisk angiver — eller fjern",
        "sætningen, hvis faktaarket ikke siger noget om det. Lav ikke andre",
        "ændringer: samme historie, samme længde, samme sprog.",
      ].join(String.fromCharCode(10))
    : [
        `These numbers in the text have NO support in the fact sheet: ${list}.`,
        "Correct each to the number the fact sheet actually gives — or remove the",
        "sentence if the fact sheet says nothing about it. Make no other changes:",
        "same story, same length, same language.",
      ].join(String.fromCharCode(10));
  return [head, "", "FAKTAARK:", factsBlock, "", "TITEL:", title, "", "TEKST:", content].join(String.fromCharCode(10));
}
export function buildPrompt(
  story: StoryWithAthlete,
  articleType: string,
  prompts: PromptSet,
  timeline = "",
  teammates: StoryWithAthlete[] = [],
): string {
  // KILDEINDHOLD = faktaarket (fase 1). Det er det ENESTE skrivefasen må bruge.
  let factsBlock = "";
  if (story.fact_sheet) {
    try {
      factsBlock = renderFactSheet(JSON.parse(story.fact_sheet) as FactSheet);
    } catch {
      /* falder tilbage til rå indhold nedenfor */
    }
  }
  const context: ArticleContext = {
    athleteName: story.athlete_name,
    preferredName: story.preferred_name,
    sport: story.sport,
    university: story.university,
    hometown: story.hometown,
    position: story.position,
    division: story.division,
    classYear: story.class_year,
    previousSchool: story.previous_school,
    expectedGraduation: story.expected_graduation,
    gender: story.gender,
    sourceUrl: story.source_url,
    headline: story.headline ?? "",
    content: factsBlock || story.content_raw?.slice(0, 4000) || story.summary?.slice(0, 2000) || "",
    timeline,
  };

  let prompt = promptForType(prompts, articleType, context);

  // Følsom historie (anholdelse/disciplin/spilleberettigelse/personligt) →
  // nøgternheds-instruks. Kladden skal desuden altid gennem Mikkels skærpede
  // review (rød badge i admin via stories.sensitive).
  if (story.sensitive) {
    prompt += `\n\n${sensitiveCareBlock(story.sensitive as SensitiveType)}`;
  }
  if (teammates.length > 0) {
    prompt += `\n\n${teammatesBlock(teammates.map((t) => t.athlete_name), prompts.language)}`;
  }
  return prompt;
}

// ─── Sikkerhedsnet ──────────────────────────────────────────────────────────
// Maks antal artikler per kørsel (forhindrer løbsk token-forbrug).
// Hævet 5 → 12 den 2026-08-26. Fem pladser om dagen var langt under BÅDE
// gratis-kvoten (målt forbrug var 2-32 LLM-kald/dag mod ~2.650 tilgængelige)
// og køens længde: 20 færdige faktaark ventede, så en historie lå fire-fem
// dage før den blev skrevet — derfor de gamle kilder i kladderne.
// Det RIGTIGE loft er MAX_PENDING_DRAFTS nedenfor: gennemgangskøen, ikke
// tokens. Løber kladderne op, pauser genereringen af sig selv.
const MAX_ARTICLES_PER_RUN = 12;
// Maks antal kladder der må ligge ugodkendt (pause hvis for mange hober sig op)
const MAX_PENDING_DRAFTS = 20;

/**
 * `--dry-run` og `--story N` findes fordi der 15. september ikke fandtes NOGEN
 * måde at se hvorfor genereringen fejlede. Ti historier i træk blev kasseret med
 * «modellen returnerede afbrudt JSON», og det eneste spor var den linje: svaret
 * selv blev aldrig vist, og at køre scriptet igen brændte endnu et forsøg af på
 * hver historie (gen_attempts, tre strikes → `gen_failed`).
 *
 * `--dry-run` skriver INTET: ingen kladde, intet forsøg talt op, ingen status
 * rørt. Den bygger den rigtige prompt, kalder modellen og viser det RÅ svar.
 */
function parseArgs(): {
  maxAgeDays: number;
  dryRun: boolean;
  storyId: number | null;
  forceProvider: string | null;
  noJson: boolean;
} {
  const args = process.argv.slice(2);
  let maxAgeDays = 7; // 7 dage: fanger nyheder der er opdaget men ikke endnu genereret
  let dryRun = false;
  let storyId: number | null = null;
  let forceProvider: string | null = null;
  let noJson = false;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--max-age-days" && args[i + 1]) {
      maxAgeDays = parseInt(args[i + 1], 10) || 7;
    }
    if (args[i] === "--dry-run") dryRun = true;
    if (args[i] === "--story" && args[i + 1]) storyId = parseInt(args[i + 1], 10) || null;
    // Kun til fejlsøgning: tving en bestemt provider, og slå JSON-tilstand fra.
    // De to sammen svarer på «er det modellen eller er det tvangs-JSON?».
    if (args[i] === "--provider" && args[i + 1]) forceProvider = args[i + 1];
    if (args[i] === "--no-json") noJson = true;
  }
  return { maxAgeDays, dryRun, storyId, forceProvider, noJson };
}

interface ReportRow {
  id: number;
  athlete_id: number;
  headline: string | null;
  fact_sheet: string | null;
  discovered_at: string;
}

/** D1 writes datetime('now') as «2026-10-07 12:13:00», in UTC. */
function utc(stamp: string): Date {
  return new Date(stamp.replace(" ", "T") + (stamp.endsWith("Z") ? "" : "Z"));
}

function asReport(r: ReportRow): Report {
  let factSheet: FactSheet | null = null;
  try {
    factSheet = r.fact_sheet ? (JSON.parse(r.fact_sheet) as FactSheet) : null;
  } catch {
    /* an unreadable sheet only weakens the match, it never blocks */
  }
  return { id: r.id, headline: r.headline, factSheet, discoveredAt: utc(r.discovered_at) };
}

/**
 * Hold, cover or write each golf/tennis story — see tournament-hold.ts.
 *
 * Removes held and covered stories from `stories` in place and returns, per
 * story that IS written, the earlier day reports to fold into its sheet.
 * A story covered by a report that is still waiting is left 'new': that
 * report folds it in when it is written. Only a story covered by an article
 * that already exists is closed here ('merged').
 */
async function applyTournamentHold(
  db: D1Client,
  stories: StoryWithAthlete[],
  dryRun: boolean,
): Promise<Map<number, Report[]>> {
  const earlierById = new Map<number, Report[]>();
  const multi = stories.filter((s) => MULTI_DAY_SPORTS.has(s.sport));
  if (!multi.length) return earlierById;

  const ids = [...new Set(multi.map((s) => s.athlete_id))];
  const marks = ids.map(() => "?").join(",");
  // Both through athlete_id indexes (idx_stories_athlete, idx_articles_athlete).
  const waiting = (
    await db.query<ReportRow>(
      `SELECT id, athlete_id, headline, fact_sheet, discovered_at FROM stories
        WHERE athlete_id IN (${marks}) AND status = 'new' AND fact_status = 'built'
          AND discovered_at >= datetime('now', '-${SIBLING_DAYS} days')`,
      ids,
    )
  ).results;
  const written = (
    await db.query<ReportRow & { article_id: number }>(
      `SELECT s.id, a.athlete_id, s.headline, s.fact_sheet, s.discovered_at, a.id AS article_id
         FROM articles a JOIN stories s ON s.id = a.story_id
        WHERE a.athlete_id IN (${marks}) AND a.created_at >= datetime('now', '-${SIBLING_DAYS + 2} days')`,
      ids,
    )
  ).results;

  const now = new Date();
  for (const st of multi) {
    const mine = (rows: ReportRow[]) => rows.filter((r) => r.athlete_id === st.athlete_id && r.id !== st.id).map(asReport);
    const exclude = [st.athlete_name, st.preferred_name ?? "", st.university];
    const self: Report = asReport({ ...st, discovered_at: String(st.discovered_at) } as ReportRow);
    const decision = holdDecision(self, mine(waiting), mine(written), exclude, now);

    if (decision.action === "write") {
      if (decision.earlier.length) {
        earlierById.set(st.id, decision.earlier);
        console.log(`  ⛳ Story ${st.id} (${st.athlete_name}): tournament recap — folds in ${decision.earlier.map((r) => r.id).join(", ")}`);
      }
      continue;
    }
    stories.splice(stories.indexOf(st), 1);
    if (decision.action === "hold") {
      console.log(`  ⏸ Story ${st.id} (${st.athlete_name}): ${decision.reason}`);
      continue;
    }
    const byArticle = written.find((w) => w.id === decision.byStoryId)?.article_id;
    console.log(`  ↪ Story ${st.id} (${st.athlete_name}): ${decision.reason}${byArticle ? ` (#${byArticle})` : ""}`);
    if (byArticle && !dryRun) {
      await db.execute(
        `UPDATE stories SET status = 'merged', merged_into = ?, processed_at = datetime('now') WHERE id = ?`,
        [byArticle, st.id],
      );
    }
  }
  return earlierById;
}

/**
 * A weekly award for a match we already reported: a section on that report
 * instead of a second article — see award-section.ts. Returns the title to
 * announce when it handled the story, null when the award should be written
 * as its own article as before (no report found, or the section failed).
 */
async function addAwardToReport(
  db: D1Client,
  chain: ProviderChain,
  story: StoryWithAthlete,
  preferProvider: string,
  dryRun: boolean,
): Promise<string | null> {
  const { country, prompts } = siteFor(story);
  const lang = prompts.language === "en" ? "en" : "da";
  // Through idx_articles_athlete: this athlete's articles only.
  const rows = (
    await db.query<{ id: number; title: string; content: string; published: number; article_type: string | null; fact_sheet: string | null }>(
      `SELECT a.id, a.title, a.content, a.published, a.article_type, s.fact_sheet
         FROM articles a LEFT JOIN stories s ON s.id = a.story_id
        WHERE a.athlete_id = ? AND UPPER(COALESCE(a.country, ?)) = ?
          AND a.created_at >= datetime('now', '-${PARENT_DAYS} days')
        ORDER BY a.created_at DESC`,
      [story.athlete_id, DEFAULT_COUNTRY, country],
    )
  ).results;
  const parent = findParent(
    [story.headline, story.summary, story.content_raw].filter(Boolean).join("\n"),
    rows.map((r) => {
      let factSheet: FactSheet | null = null;
      try { factSheet = r.fact_sheet ? (JSON.parse(r.fact_sheet) as FactSheet) : null; } catch { /* no sheet, no match */ }
      return { id: r.id, title: r.title, published: r.published, articleType: r.article_type, factSheet };
    }),
  );
  if (!parent) return null;
  const parentRow = rows.find((r) => r.id === parent.id)!;

  let facts = "";
  try {
    facts = story.fact_sheet ? renderFactSheet(JSON.parse(story.fact_sheet) as FactSheet) : "";
  } catch {
    return null;
  }
  if (!facts) return null;

  const { system, prompt } = sectionPrompt(lang, parentRow.content, facts);
  const response = await chain.generate({ system, prompt, max_tokens: 400, json: false, preferProvider });
  const section = cleanSection(response.text ?? "");
  if (!section) {
    console.log(`  ✗ Story ${story.id}: award section unusable — written as its own article`);
    return null;
  }
  // Every number must be in the award's facts or the report itself.
  const bad = unsupportedNumbers(section, `${facts}\n${parentRow.content}`);
  if (bad.length) {
    console.log(`  ✗ Story ${story.id}: award section has unsourced numbers (${bad.join(", ")}) — written as its own article`);
    return null;
  }

  console.log(`  ⊕ Story ${story.id} (${story.athlete_name}): award → ${parent.published ? "addition to live" : "appended to draft"} #${parent.id}`);
  console.log(`    «${section}»`);
  if (dryRun) return section;

  if (!parent.published) {
    // Nobody has read the draft yet: the award simply becomes part of it.
    await db.execute(`UPDATE articles SET content = ?, updated_at = datetime('now') WHERE id = ?`, [
      appendAddition(parentRow.content, section, { live: false, lang, when: new Date() }),
      parent.id,
    ]);
    await db.execute(
      `UPDATE stories SET status = 'merged', merged_into = ?, processed_at = datetime('now') WHERE id = ?`,
      [parent.id, story.id],
    );
    return `${parentRow.title} (+ ${story.headline ?? "award"})`;
  }

  // The report is live: a pending addition, reviewed and published like a draft.
  const title = lang === "da" ? `Tilføjelse til «${parentRow.title}»` : `Addition to «${parentRow.title}»`;
  await db.execute(
    `INSERT INTO articles
       (title, slug, content, summary, article_type, athlete_id, source_url, story_id,
        model_used, tokens_input, tokens_output, published, author, llm_provider,
        original_content, country, parent_article_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?)`,
    [
      title, `${ADDITION_TYPE}-${parent.id}-${story.id}`, section, story.headline ?? null, ADDITION_TYPE,
      story.athlete_id, story.source_url, story.id, response.model, response.tokens_input,
      response.tokens_output, countryProfile(country).brand, response.provider, section, country, parent.id,
    ],
  );
  await db.execute('UPDATE stories SET status = ?, processed_at = datetime("now") WHERE id = ?', ["drafted", story.id]);
  return title;
}

async function main(): Promise<void> {
  const { maxAgeDays, dryRun, storyId, forceProvider, noJson } = parseArgs();
  if (dryRun) console.log("DRY-RUN: ingen kladder, ingen forsøg talt op." + String.fromCharCode(10));
  const db = createD1Client();
  const chain = new ProviderChain(db);

  const available = chain.getAvailableProviders();
  if (available.length === 0) {
    console.log(
      "Ingen LLM-providere tilgængelige. Sæt mindst én af:\n" +
        "  MISTRAL_API_KEY, GEMINI_API_KEY, GROQ_API_KEY,\n" +
        "  CLOUDFLARE_API_TOKEN + CLOUDFLARE_ACCOUNT_ID, ANTHROPIC_API_KEY",
    );
    return;
  }
  console.log(`Tilgængelige LLM-providere: ${available.join(", ")}`);

  // Hent stilguide-rettelser
  const corrResult = await db.query<StyleCorrectionEntry>(
    "SELECT wrong_phrase, correct_phrase, note, rule_type FROM style_corrections WHERE active = 1 LIMIT 50",
  );
  const corrections = corrResult.results;
  // System-prompten bygges PR. HISTORIE nede i løkken, ikke her: sproget følger
  // atletens nationalitet, så en dansk og en britisk historie i samme kørsel
  // skal have hver sit promptsæt.
  console.log(`Stilguide: ${corrections.length} rettelse(r) loaded`);

  // Sikkerhedsnet 1: Tjek antal ventende kladder
  const draftCount = await db.query<{ cnt: number }>(
    "SELECT COUNT(*) as cnt FROM articles WHERE published = 0",
  );
  const pendingDrafts = draftCount.results[0]?.cnt ?? 0;
  if (pendingDrafts >= MAX_PENDING_DRAFTS) {
    console.log(
      `⚠ ${pendingDrafts} ugodkendte kladder — springer generering over. Godkend eller afvis kladder i admin-panelet.`,
    );
    console.log(`SKIP_REASON=max_pending_drafts pending=${pendingDrafts} threshold=${MAX_PENDING_DRAFTS}`);
    return;
  }

  // Sikkerhedsnet 2: Reset stories der har siddet i "drafting" i over 1 time (crashed run)
  // — springes over i dry-run, som ikke må røre nogen status.
  if (!dryRun) await db.execute(
    `UPDATE stories SET status = 'new'
     WHERE status = 'drafting'
     AND datetime(discovered_at, '+1 hour') < datetime('now')`,
  );

  // Diagnostik: vis hvad der faktisk ligger i databasen
  const diagResult = await db.query<{
    total: number;
    has_content: number;
    summary_only: number;
    headline_only: number;
    too_old: number;
  }>(
    `SELECT
       COUNT(CASE WHEN datetime(discovered_at, '+' || ? || ' days') >= datetime('now') THEN 1 END) as total,
       COUNT(CASE WHEN content_raw IS NOT NULL AND datetime(discovered_at, '+' || ? || ' days') >= datetime('now') THEN 1 END) as has_content,
       COUNT(CASE WHEN content_raw IS NULL AND summary IS NOT NULL AND datetime(discovered_at, '+' || ? || ' days') >= datetime('now') THEN 1 END) as summary_only,
       COUNT(CASE WHEN content_raw IS NULL AND summary IS NULL AND datetime(discovered_at, '+' || ? || ' days') >= datetime('now') THEN 1 END) as headline_only,
       COUNT(CASE WHEN datetime(discovered_at, '+' || ? || ' days') < datetime('now') THEN 1 END) as too_old
     FROM stories WHERE status = 'new'`,
    [maxAgeDays, maxAgeDays, maxAgeDays, maxAgeDays, maxAgeDays],
  );
  const diag = diagResult.results[0];
  console.log(`\nHistorier (status='new', seneste ${maxAgeDays} dage):`);
  console.log(`  Fuldt indhold (content_raw): ${diag?.has_content ?? 0}`);
  console.log(`  Kun summary:                 ${diag?.summary_only ?? 0}`);
  console.log(`  Kun headline:                ${diag?.headline_only ?? 0}`);
  console.log(`  For gamle (ignoreres):       ${diag?.too_old ?? 0}`);
  console.log(`  Total inden for vindue:      ${diag?.total ?? 0}\n`);

  // Faktaark-status (skrivefasen kræver fact_status='built' — kør build-factsheet.ts først)
  const fsRes = await db.query<{ built: number; pending: number; no_substance: number }>(
    `SELECT
       COUNT(CASE WHEN fact_status = 'built' THEN 1 END) as built,
       COUNT(CASE WHEN fact_status IS NULL THEN 1 END) as pending,
       COUNT(CASE WHEN fact_status = 'no_substance' THEN 1 END) as no_substance
     FROM stories
     WHERE status = 'new' AND datetime(discovered_at, '+' || ? || ' days') >= datetime('now')`,
    [maxAgeDays],
  );
  const fs = fsRes.results[0];
  console.log(`Faktaark: ${fs?.built ?? 0} klar · ${fs?.pending ?? 0} mangler (kør build-factsheet) · ${fs?.no_substance ?? 0} uden substans\n`);

  // Hent nye historier der endnu ikke er konverteret.
  // content_raw er ikke påkrævet — summary fra RSS-feeds er nok til artikelgenerering.
  // Sortering: foretrækker rigt indhold (content_raw > summary > headline).
  const result = await db.query<StoryWithAthlete>(
    `SELECT s.*, a.name as athlete_name, a.preferred_name, a.sport, a.university, a.hometown,
            a.position, a.division, a.class_year, a.expected_graduation, a.home_country,
            a.previous_school,
            a.gender
     FROM stories s
     JOIN athletes a ON s.athlete_id = a.id
     WHERE s.status = 'new'
     AND s.fact_status = 'built'
     -- Only countries with a site. siteFor() falls back to DK for any other
     -- code, so a collected Australian would get a Danish draft.
     AND ${siteCountrySql()}
     -- Et efternavns-match (35) er nok til at OVERVÅGE en historie, men ikke
     -- til at skrive om et navngivent menneske. Se MIN_RELEVANCE_GENERATE.
     AND s.relevance_score >= ?
     AND datetime(s.discovered_at, '+' || ? || ' days') >= datetime('now')
     ${storyId ? "AND s.id = " + String(storyId) : ""}
     ORDER BY
       -- Aldrig-prøvede historier først: en der allerede har brændt to forsøg
       -- må ikke tage pladsen fra en frisk (samme regel som fact_attempts).
       s.gen_attempts ASC,
       CASE WHEN s.content_raw IS NOT NULL THEN 0 WHEN s.summary IS NOT NULL THEN 1 ELSE 2 END,
       s.relevance_score DESC
     LIMIT ?`,
    // Twice the run's cap: held tournament reports stay 'new' and come back
    // every run, and must not take the slots of stories that can be written.
    // The cap itself is applied after the hold below.
    [MIN_RELEVANCE_GENERATE, maxAgeDays, MAX_ARTICLES_PER_RUN * 2],
  );

  // Grouping below only sees ONE run. A second British player from the same
  // match report, found by a later discovery, used to get an article of his
  // own (2026-09-27: Lopez/Ford, Gill/Christie, Hulme/Baxter — all merged by
  // hand). A story whose (source, site) already has an article is attached to
  // that article instead of written again.
  const stories: StoryWithAthlete[] = [];
  for (const st of result.results) {
    const existing = (
      await db.query<{ id: number; published: number }>(
        `SELECT id, published FROM articles
          WHERE source_url = ? AND UPPER(COALESCE(country, ?)) = ?
          ORDER BY id LIMIT 1`,
        [st.source_url, DEFAULT_COUNTRY, siteFor(st).country],
      )
    ).results[0];
    if (!existing) {
      stories.push(st);
      continue;
    }
    console.log(
      `  ↪ Story ${st.id} (${st.athlete_name}): same report as article #${existing.id}` +
        `${existing.published ? " (published)" : ""} — attached, not rewritten. Add a line about them by hand.`,
    );
    if (dryRun) continue;
    await db.execute(
      `INSERT OR IGNORE INTO article_athletes (article_id, athlete_id, role) VALUES (?, ?, 'featured')`,
      [existing.id, st.athlete_id],
    );
    await db.execute(
      'UPDATE stories SET status = ?, processed_at = datetime("now") WHERE id = ?',
      ["drafted", st.id],
    );
  }

  // Multi-day tournaments: one recap, not a draft per day — see
  // tournament-hold.ts. Two indexed queries for the whole run (athlete_id),
  // never one per story.
  const earlierById = await applyTournamentHold(db, stories, dryRun);
  stories.splice(MAX_ARTICLES_PER_RUN);

  // Én artikel pr. (kilde, land) — se group-stories.ts for hvorfor landet er
  // skillelinjen og ikke atleten.
  const { primaries, companions } = groupBySourceAndCountry(stories);
  if (primaries.length < stories.length) {
    console.log(
      `  ${stories.length} historier samles til ${primaries.length} artikel(er) — samme kilde og land.`,
    );
  }

  if (stories.length === 0) {
    console.log("Ingen nye historier at generere artikler fra.");
    if ((diag?.too_old ?? 0) > 0) {
      console.log(`  Tip: ${diag?.too_old} historier findes men er ældre end ${maxAgeDays} dage. Kør med --max-age-days 7 for at inkludere dem.`);
    }
    console.log(`SKIP_REASON=no_eligible_stories window_days=${maxAgeDays} has_content=${diag?.has_content ?? 0} summary_only=${diag?.summary_only ?? 0} headline_only=${diag?.headline_only ?? 0} too_old=${diag?.too_old ?? 0} pending_drafts=${pendingDrafts}`);
    return;
  }

  console.log(`Genererer artikler for ${stories.length} historie(r) (maks ${MAX_ARTICLES_PER_RUN} per kørsel)...\n`);

  let generated = 0;
  let totalTokens = 0;
  // Kladder pr. land: hvert site har sin egen kø og sin egen Discord-kanal, så
  // beskeden "n kladder klar" skal kunne sendes ét sted pr. land.
  const draftsByCountry = new Map<string, string[]>();
  const failuresByCountry = new Map<string, string[]>();
  let blockedByGuard = 0;
  // Afbrudt modeloutput tælles for sig: det er en TEKNISK fejl der kan prøves
  // igen, ikke en kladde vagterne har dømt ude.
  let brokenOutput = 0;
  // ... og historier hvor de tre forsøg nu ER brugt op.
  let abandoned = 0;

  /**
   * Én teknisk fejl på én historie — tælles, og efter tre gives der op.
   *
   * Det ENESTE sted status sættes efter en teknisk fejl, så de tre kaldesteder
   * (afbrudt JSON, ubrugelig overskrift, kastet fejl) ikke kan drive fra
   * hinanden. Guard-afvisninger går IKKE herigennem: de er domme, ikke forsøg.
   */
  async function recordTechnicalFailure(
    story: StoryWithAthlete,
    reason: string,
  ): Promise<void> {
    const attempts = (story.gen_attempts ?? 0) + 1;
    const giveUp = generationExhausted(attempts);
    await db.execute(
      giveUp
        ? "UPDATE stories SET status = 'gen_failed', gen_attempts = ?, processed_at = datetime('now') WHERE id = ?"
        : "UPDATE stories SET status = 'new', gen_attempts = ? WHERE id = ?",
      [attempts, story.id],
    );
    if (giveUp) {
      console.log(
        `    → ${reason}, forsøg ${attempts}/${MAX_GEN_ATTEMPTS} — opgivet (gen_failed)`,
      );
      abandoned++;
    } else {
      console.log(
        `    → ${reason}, forsøg ${attempts}/${MAX_GEN_ATTEMPTS} — prøves igen næste kørsel`,
      );
      brokenOutput++;
    }
  }

  for (const story of primaries) {
    // Sikkerhedsnet 3: Tjek om der allerede findes en artikel for denne story
    const existing = await db.query<{ cnt: number }>(
      "SELECT COUNT(*) as cnt FROM articles WHERE story_id = ?",
      [story.id],
    );
    if ((existing.results[0]?.cnt ?? 0) > 0) {
      console.log(`  ⊘ Story ${story.id} har allerede en artikel — springer over.`);
      await db.execute('UPDATE stories SET status = ? WHERE id = ?', ["drafted", story.id]);
      continue;
    }

    // A tournament recap: the earlier day reports go into the sheet as
    // labelled context, so every step below — prompt, number check, the
    // admin panel — reads one sheet. See tournament-hold.ts.
    const earlier = earlierById.get(story.id) ?? [];
    if (earlier.length && story.fact_sheet) {
      try {
        story.fact_sheet = JSON.stringify(foldEarlierReports(JSON.parse(story.fact_sheet) as FactSheet, earlier));
      } catch {
        /* an unreadable sheet is written as before, without the earlier days */
      }
    }

    // OUR OWN RECORDS on the sheet — the national angle on the roster and our
    // earlier articles this season (records.ts). Two queries through indexes
    // (idx_athletes_uni_active_country, idx_articles_athlete). They never
    // block an article.
    let recordsAdded = false;
    if (story.fact_sheet) {
      try {
        const cc = (story.home_country ?? "").toUpperCase();
        const lines: string[] = [];
        const count = (
          await db.query<{ n: number }>(
            `SELECT COUNT(*) AS n FROM athletes
              WHERE university = ? AND active = 1 AND home_country = ? AND sport = ? AND COALESCE(gender, '') = ?`,
            [story.university, cc, story.sport, story.gender ?? ""],
          )
        ).results[0]?.n ?? 0;
        const roster = rosterLine(story.athlete_name, count, cc, story.university, story.sport, story.gender, new Date());
        if (roster) lines.push(roster);
        // National top-10 placings from NCAA.com (ncaa-rankings.ts), exact
        // school match only, and only from a table through games of the last
        // MAX_AGE_DAYS — an older one is out of season.
        try {
          const slug = ncaaSport(story.sport, story.gender);
          const div = ncaaDivision(story.division);
          if (slug && div) {
            const school = (
              await db.query<{ common_name: string | null }>("SELECT common_name FROM schools WHERE name = ? LIMIT 1", [story.university])
            ).results[0];
            const keys = schoolKeys(story.university, school?.common_name ?? null);
            if (keys.length) {
              const ranks = (
                await db.query<StoredRanking>(
                  `SELECT sport, division, stat, rank, tied, team, value, value_label, games, fetched_on
                     FROM team_rankings
                    WHERE team_key IN (${keys.map(() => "?").join(",")}) AND sport = ? AND division = ?
                      AND fetched_on >= date('now', '-${MAX_AGE_DAYS} days')`,
                  [...keys, slug, div],
                )
              ).results;
              lines.push(...rankingLines(ranks));
            }
          }
        } catch {
          /* no rankings: the other records still go in */
        }
        const prior = (
          await db.query<{ title: string; source_url: string | null; fact_sheet: string | null }>(
            `SELECT a.title, a.source_url, s.fact_sheet
               FROM articles a LEFT JOIN stories s ON s.id = a.story_id
              WHERE a.athlete_id = ? AND a.published = 1 AND a.published_at >= ?
                AND COALESCE(a.article_type, '') != '${ADDITION_TYPE}'
              ORDER BY a.published_at DESC LIMIT 4`,
            [story.athlete_id, `${currentSeasonStart()}-07-01`],
          )
        ).results;
        lines.push(
          ...earlierLines(
            prior.map((p) => {
              let factSheet: FactSheet | null = null;
              try { factSheet = p.fact_sheet ? (JSON.parse(p.fact_sheet) as FactSheet) : null; } catch { /* title alone */ }
              return { title: p.title, sourceUrl: p.source_url, factSheet };
            }),
            story.source_url,
          ),
        );
        if (lines.length) {
          story.fact_sheet = JSON.stringify(withRecords(JSON.parse(story.fact_sheet) as FactSheet, lines));
          recordsAdded = true;
        }
      } catch {
        /* our records are extra; a failed lookup writes the article without them */
      }
    }

    /**
     * IDENTITETSVAGT — før modellen overhovedet kaldes.
     *
     * Handler kilden om DEN atlet vi har koblet den til? To af de fem første
     * britiske kladder handlede om et andet menneske med samme efternavn
     * (2026-08-06). Ingen promptregel kan redde det: modellen får en atlet-blok
     * om ét menneske og et faktaark om et andet.
     */
    const identity = checkStoryIdentity({
      athleteName: story.athlete_name,
      gender: story.gender,
      sport: story.sport,
      sourceText: [story.headline, story.summary, story.content_raw, story.fact_sheet]
        .filter(Boolean)
        .join("\n"),
    });
    if (!identity.ok) {
      console.log(`  ⛔ Story ${story.id} (${story.athlete_name}): ${identity.reason}`);
      await db.execute(
        "UPDATE stories SET status = 'rejected', processed_at = datetime('now') WHERE id = ?",
        [story.id],
      );
      blockedByGuard++;
      continue;
    }

    /**
     * FORHÅNDSOMTALE-VAGT — også før modellen kaldes.
     *
     * En kampannoncering har en dato og ingenting andet. Får modellen den, skriver
     * den referatet alligevel og finder på indholdet (kladde #107, 2026-08-16).
     *
     * Afvises permanent, ikke sat i kø: annonceringen bliver aldrig til et referat
     * — skolen udgiver referatet som en SELVSTÆNDIG nyhed, som discovery finder
     * som sin egen historie med sit eget faktaark. Ventede vi i stedet på at
     * datoen passerede, ville præcis den samme tomme mappe gå videre til modellen.
     */
    const timing = checkEventTiming({ factSheet: story.fact_sheet, now: new Date() });
    if (!timing.ok) {
      console.log(`  ⏳ Story ${story.id} (${story.athlete_name}): ${timing.reason}`);
      await db.execute(
        "UPDATE stories SET status = 'rejected', processed_at = datetime('now') WHERE id = ?",
        [story.id],
      );
      blockedByGuard++;
      continue;
    }

    // A WEEKLY AWARD for a match we already reported becomes a section on that
    // report, not a second article (Mikkel, 2026-10-07). Only for a story about
    // one athlete; anything that goes wrong falls through to the usual article.
    if (!(companions.get(story.id)?.length) && isWeeklyAward(story.headline)) {
      try {
        const done = await addAwardToReport(
          db, chain, story,
          forceProvider ?? (available.includes("anthropic") ? "anthropic" : "gemini"),
          dryRun,
        );
        if (done) {
          if (!dryRun) {
            const c = siteFor(story).country;
            draftsByCountry.set(c, [...(draftsByCountry.get(c) ?? []), done]);
            generated++;
          }
          continue;
        }
      } catch (err) {
        console.log(`  ✗ Story ${story.id}: award section failed (${err instanceof Error ? err.message : String(err)}) — written as its own article`);
      }
    }

    const articleType = selectArticleType(story);
    let timeline = "";
    try {
      const evRes = await db.query<AthleteEvent>(
        "SELECT season, award_name, significance, summary FROM athlete_events WHERE athlete_id = ?",
        [story.athlete_id],
      );
      const lines = timelineForGeneration(
        evRes.results ?? [], currentSeasonStart(),
        siteFor(story).prompts.language === "en" ? "en" : "da",
      );
      if (lines.length) timeline = lines.join("\n");
    } catch {
      /* tidslinje må aldrig blokere generering */
    }
    const { country, prompts } = siteFor(story);
    // JSON-mode: providerens API håndhæver gyldig JSON → ingen fed-titel/tomme
    // kladder fra gratis-modeller. parseArticleOutputSmart falder tilbage til
    // linjeformatet hvis en provider alligevel svarer med rå markdown.
    const systemPrompt = prompts.buildSystemPrompt(corrections, { jsonOutput: true });
    const mates = companions.get(story.id) ?? [];
    const prompt = buildPrompt(story, articleType, prompts, timeline, mates);

    const contentSource = story.content_raw ? "content_raw" : story.summary ? "summary" : "headline only";
    console.log(
      `  → Story ${story.id}: ${story.athlete_name} — kilde: ${contentSource}, type: ${articleType}, land: ${country} (${prompts.language})`,
    );

    // Marker som "drafting" så den ikke behandles igen.
    // Dry-run springer over: den efterlod historie 5392 i 'drafting' første
    // gang flaget blev brugt (15-09) — sikkerhedsnettet ovenfor rydder op efter
    // en time, men en diagnose må ikke ændre tilstand overhovedet.
    if (!dryRun) await db.execute('UPDATE stories SET status = ? WHERE id = ?', [
      "drafting",
      story.id,
    ]);

    try {
      /**
       * HVEM SKRIVER ARTIKLEN.
       *
       * Kæden har `ministral-8b` forrest med vilje: 188 rpm mod Geminis 5, og
       * for korte opgaver (faktaark, gennemgang) er den rigelig. Men
       * artikelskrivning er kædens tungeste opgave — målt 15-09: 3.959 tokens
       * ind, en hel artikel ud, i streng JSON — og en 8B-model taber tråden.
       * Den stoppede ved 433 tokens ud af et budget på 2.000, og andre gange
       * gik den i selvsving på tomrum. Redningen ovenfor fanger følgerne; DEN
       * HER linje fjerner årsagen.
       *
       * Claude når nøglen findes, ellers Gemini 2.5 Flash. Bliver Gemini
       * rate-limited (5 rpm), falder kæden selv tilbage til mistral — og så
       * står redningen klar. Det er derfor en PRÆFERENCE og ikke et krav.
       */
      const preferProvider = available.includes("anthropic") ? "anthropic" : "gemini";
      const response = await chain.generate({
        system: systemPrompt,
        prompt,
        max_tokens: 2000,
        json: !noJson,
        preferProvider: forceProvider ?? preferProvider,
      });

      // null = modellen blev klippet af midt i sit JSON-svar. Før guarden faldt
      // sådan et svar ned i linjeparseren og blev til en kladde med titlen «{»
      // og TOM slug — se parse-output.ts. Kasseres, så historien kan prøves igen.
      if (dryRun) {
        const raw = response.text ?? "";
        // Grov token-tommelfingerregel: ~4 tegn pr. token.
        const tok = (t: string) => Math.round(t.length / 4);
        const runs = (prompt + systemPrompt).match(/\s{20,}/g) ?? [];
        const longest = runs.reduce((a, b) => (b.length > a.length ? b : a), "");
        console.log(
          `  [dry-run] prompt: ${systemPrompt.length + prompt.length} tegn ` +
            `(~${tok(systemPrompt) + tok(prompt)} tokens) · max_tokens: 2000`,
        );
        console.log(
          `  [dry-run] tomrums-løb i prompten: ${runs.length} stk, længste ${longest.length} tegn`,
        );
        console.log(
          `  [dry-run] provider-svar: ${raw.length} tegn · provider: ${response.provider}` +
            ` · model: ${response.model} · tokens ind/ud: ${response.tokens_input}/${response.tokens_output}`,
        );
        console.log(`  [dry-run] RÅ SVAR:${String.fromCharCode(10)}${raw.slice(0, 1500)}`);
        const direkte = parseArticleOutputSmart(raw, articleType);
        const reddet = direkte ? null : salvageTruncatedJson(raw);
        const efterRedning = reddet ? parseArticleOutputSmart(reddet, articleType) : null;
        console.log(
          `  [dry-run] parser: ${direkte ? "OK" : "NULL"}` +
            (direkte ? "" : ` · redning: ${efterRedning ? "OK — artiklen var færdig" : "nægtet (ikke færdig)"}`),
        );
        if (efterRedning) console.log(`  [dry-run] reddet titel: ${efterRedning.title}`);
        continue;
      }

      let first = parseArticleOutputSmart(response.text, articleType);

      // Afbrudt JSON: var artiklen FÆRDIG og kun opmærkningen væk, kan den
      // reddes mekanisk (se salvageTruncatedJson — den nægter at lukke en
      // tekst der stopper midt i en sætning). Ellers kasseres den som før.
      if (!first) {
        const salvaged = salvageTruncatedJson(response.text);
        if (salvaged) {
          first = parseArticleOutputSmart(salvaged, articleType);
          if (first) {
            console.log(`  🔧 Story ${story.id}: afbrudt JSON reddet — artiklen var færdig, kun «}» manglede`);
          }
        }
      }

      if (!first) {
        console.log(`  ⛔ Story ${story.id}: modellen returnerede afbrudt JSON — kasseret`);
        await recordTechnicalFailure(story, "afbrudt JSON");
        continue;
      }
      let parsed: ParsedArticle = first;

      /**
       * CITATVAGT: ord lagt i munden på et navngivent menneske er den værste
       * fejl sitet kan lave. Har faktaarket ingen citater, må kladden ikke
       * indeholde ét — den skrives ikke til basen, så den kan ikke godkendes
       * ved et uheld. Kladde #99 (2026-08-06) tillagde en cheftræner to
       * sætninger han aldrig har sagt.
       */
      let sheetQuoteCount = 0;
      try {
        sheetQuoteCount = story.fact_sheet
          ? ((JSON.parse(story.fact_sheet) as FactSheet).quotes ?? []).length
          : 0;
      } catch {
        sheetQuoteCount = 0;
      }
      if (hasUnsourcedQuote(`${parsed.title}\n${parsed.content}`, sheetQuoteCount)) {
        console.log(`  ⛔ Story ${story.id}: kladden indeholder et citat, men faktaarket har ingen — kasseret`);
        await db.execute(
          "UPDATE stories SET status = 'rejected', processed_at = datetime('now') WHERE id = ?",
          [story.id],
        );
        blockedByGuard++;
        continue;
      }

      /**
       * TALVAGT — et opdigtet minuttal ligner et ægte til forveksling.
       *
       * Kladde #199 skrev «10. minut» og «33. minut»; kilden sagde 4. og 32.
       * LLM-verifikatoren fangede ét af tre. Et tal kræver ikke skøn: det står
       * i faktaarket, kilden eller atletens profil — eller også gør det ikke.
       */
      const allowedFacts = [
        story.fact_sheet ?? "",
        story.content_raw ?? "",
        String(story.class_year ?? ""),
        String(story.expected_graduation ?? ""),
      ].join(" ");
      let badNumbers = unsupportedNumbers(`${parsed.title} ${parsed.content}`, allowedFacts);

      if (badNumbers.length > 0) {
        console.log(`  ⚠ Story ${story.id}: tal uden dækning (${badNumbers.join(", ")}) — forsøger reparation`);
        try {
          const repair = await chain.generate({
            system: systemPrompt,
            prompt: repairNumbersPrompt(parsed.title, parsed.content, badNumbers, factSheetText(story), prompts.language),
            max_tokens: 2000,
            json: true,
          });
          const reparsed = parseArticleOutputSmart(repair.text, articleType);
          // En afbrudt reparation er ingen reparation — behold den oprindelige.
          const stillBad = reparsed
            ? unsupportedNumbers(`${reparsed.title} ${reparsed.content}`, allowedFacts)
            : badNumbers;
          // Kun hvis reparationen faktisk gjorde det BEDRE. En model der
          // «retter» ved at digte videre skal ikke belønnes.
          if (reparsed && stillBad.length < badNumbers.length && reparsed.content) {
            parsed = reparsed;
            badNumbers = stillBad;
            console.log(`    → repareret, ${stillBad.length} tilbage`);
          }
        } catch {
          /* en fejlet reparation må ikke vælte genereringen */
        }
      }

      /**
       * ANDEN MENING — to modeller om samme faktaark.
       *
       * Fanger dét taltjekket ikke kan se: et tal der ER i kilden, men hængt
       * på det forkerte. «10. minut» slap forbi, fordi 10 optræder et sted i
       * 37 kB kildetekst; kilden sagde 4. To modeller er enige om de tal der
       * faktisk står i faktaarket — et opdigtet tal er et tilfældigt valg, og
       * to modeller træffer sjældent det samme tilfældige valg.
       *
       * Prisen er ét ekstra kald pr. artikel. Målt forbrug er 63 kald/dag mod
       * ~2.650 tilgængelige, så det er en afrundingsfejl.
       *
       * Vi SKIFTER ikke til kladde B. Den er ikke bedre prosa, bare et andet
       * vidne — og et vidne skal ikke skrive artiklen. Uenigheden noteres, og
       * mennesket afgør.
       */
      let unstable: string[] = [];
      /**
       * SLÅET FRA som standard efter måling (2026-08-31).
       *
       * Bagudtesten mod 38 menneskeredigerede artikler gav 22 % præcision:
       * 46 af 59 uenigheder var tal Mikkel BEHOLDT. Talvagten ovenfor ligger
       * på 73 %.
       *
       * Fejlen i idéen: fravær er ikke modsigelse. To modeller skriver ikke
       * den samme artikel — den ene nævner skudstatistikken, den anden gør
       * ikke — og det siger intet om, hvem der har ret. Kun en MODSIGELSE er
       * et signal, og den kræver at man spørger den anden model om det samme
       * konkrete tal («i hvilket minut scorede X?»), ikke at man beder den
       * skrive en hel artikel og sammenligner posen af tal.
       *
       * Værre endnu: et støjende flag ødelægger det gode. Ligger de side om
       * side i fact_flags, lærer man at ignorere begge.
       *
       * Koden bliver stående, og second-opinion-backtest.ts kan måle en ny
       * udgave. Tænd med SECOND_OPINION=1.
       */
      const secondOpinionOff = process.env.SECOND_OPINION !== "1";
      const others = chain
        .getAvailableProviders()
        .filter((n) => n !== response.provider);
      if (!secondOpinionOff && others.length > 0 && numbersIn(parsed.content).length > 0) {
        try {
          const second = await chain.generate({
            system: systemPrompt,
            prompt,
            max_tokens: 2000,
            json: true,
            preferProvider: others[0],
          });
          // Kun hvis den ANDEN udbyder faktisk svarede — falder kæden tilbage
          // til den samme model, er der ingen uafhængighed og intet at måle.
          if (second.provider !== response.provider) {
            const parsedSecond = parseArticleOutputSmart(second.text, articleType);
            // KUN tal der HAR dækning i kilden. De udækkede er allerede fanget
            // af talvagten ovenfor, og to flag om samme tal er støj. Tilbage
            // står den interessante klasse: et tal kilden kender, som den
            // anden model ikke brugte — altså muligvis hængt på det forkerte.
            // Svarede den anden model med afbrudt JSON, er der intet at holde
            // op imod — en tom anden mening er ikke uenighed.
            if (parsedSecond) {
              const badSet = new Set(badNumbers);
              unstable = unstableNumbers(
                `${parsed.title} ${parsed.content}`,
                `${parsedSecond.title} ${parsedSecond.content}`,
              ).filter((n) => !badSet.has(n));
              if (unstable.length > 0) {
                console.log(
                  `  ⚖ Story ${story.id}: ${second.provider} skrev ikke ${unstable.join(", ")}`,
                );
              }
            }
          }
        } catch {
          /* en anden mening er en bonus, ikke en betingelse */
        }
      }

      // Sproget med, som i save-draft.ts og apply-draft-decisions.ts: uden det
      // faldt kaldet tilbage på DEFAULT_LANGUAGE ("da"), så UK-slugs blev
      // translittereret dansk (ø→oe).
      const slug = generateSlug(parsed.title, 120, prompts.language);
      // Sidste værn om den tomme slug. En overskrift uden ét eneste bogstav
      // eller tal giver "" — og kun ÉN række kan have den, så nummer to vælter
      // med UNIQUE constraint failed og tager hele kørslens historie med sig.
      if (!slug) {
        console.log(`  ⛔ Story ${story.id}: overskriften «${parsed.title}» giver ingen slug — kasseret`);
        await recordTechnicalFailure(story, "ubrugelig overskrift");
        continue;
      }

      // Rule 10 enforced, not asked for: no subheadings in short articles.
      parsed = { ...parsed, content: stripShortArticleHeadings(parsed.content) };

      // Gem som kladde (published = 0) — original_content gemmer LLM-output inden redigering
      const inserted = await db.execute(
        // `country` afgør hvilket site artiklen hører til (migration 034), og
        // `author` er sitets eget brand — ikke en konstant, nu hvor der er
        // mere end ét site.
        `INSERT INTO articles
         (title, slug, content, summary, article_type, athlete_id,
          source_url, story_id, model_used, tokens_input, tokens_output,
          published, author, llm_provider, original_content, country)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?)`,
        [
          parsed.title,
          slug,
          parsed.content,
          parsed.summary,
          parsed.article_type,
          story.athlete_id,
          story.source_url,
          story.id,
          response.model,
          response.tokens_input,
          response.tokens_output,
          countryProfile(country).brand,
          response.provider,
          parsed.content,
          country,
        ],
      );


      /**
       * Overlevede tallene reparationen, må kladden ikke ligne en ren en af
       * slagsen i admin.
       *
       * Den KASSERES ikke, som et ukildebelagt citat gør. Citatvagten er gammel
       * og præcis; taltjekket er nyt, og dets falske alarmer (skrevne tal,
       * klassetrin) er først lige luget ud. At smide en ellers god artikel væk
       * på et umodent tjek er en dyrere fejl end at vise den med en advarsel.
       * Når backtesten kan måle præcisionen, kan det her strammes til.
       */
      const mechanicalFlags: string[] = [
        ...badNumbers.map(
          (n) => `numbers: ${n} — står hverken i kilde eller faktaark (mekanisk tjek)`,
        ),
        ...unstable.map(
          (n) => `numbers: ${n} — den anden model skrev det ikke (anden mening)`,
        ),
      ];
      if (mechanicalFlags.length > 0) {
        const articleId = (inserted.meta as { last_row_id?: number } | undefined)?.last_row_id;
        // Uden dækning i kilden er værre end uenighed mellem to modeller: det
        // første er en påstand ingen kan bekræfte, det andet er et spørgsmål.
        const risk = badNumbers.length > 0 ? "high" : "medium";
        if (articleId) {
          await db.execute(
            `UPDATE articles SET fabrication_risk = ?, fact_flags = ? WHERE id = ?`,
            [risk, JSON.stringify(mechanicalFlags), articleId],
          );
        }
        console.log(
          `  ⛳ Story ${story.id}: ${mechanicalFlags.length} mekanisk(e) flag — markeret ${risk}`,
        );
      }
      // Opdater story status
      await db.execute(
        'UPDATE stories SET status = ?, processed_at = datetime("now") WHERE id = ?',
        ["drafted", story.id],
      );

      // Søskende-historierne er DÆKKET af artiklen ovenfor. Lukkes de ikke,
      // bliver de valgt igen næste kørsel og giver dubletten vi lige undgik.
      // Kun ved SUCCES: fejler eller blokeres kladden, skal de kunne prøve igen.
      for (const mate of mates) {
        await db.execute(
          'UPDATE stories SET status = ?, processed_at = datetime("now") WHERE id = ?',
          ["drafted", mate.id],
        );
      }
      if (mates.length > 0) {
        console.log(
          `    + dækker også ${mates.map((m) => m.athlete_name).join(", ")}`,
        );
      }

      // Every athlete the article covers, so the Instagram collab step can
      // invite each of them — not just the one in articles.athlete_id.
      const newArticleId = (inserted.meta as { last_row_id?: number } | undefined)?.last_row_id;
      if (newArticleId) {
        await db.execute(
          `INSERT OR IGNORE INTO article_athletes (article_id, athlete_id, role) VALUES (?, ?, 'primary')`,
          [newArticleId, story.athlete_id],
        );
        for (const mate of mates) {
          await db.execute(
            `INSERT OR IGNORE INTO article_athletes (article_id, athlete_id, role) VALUES (?, ?, 'featured')`,
            [newArticleId, mate.athlete_id],
          );
        }
      }

      // The day reports this recap folded in: the folded sheet is kept on the
      // story (the admin panel and the reviews read it from there), and each
      // day report points at the article, so its source is shown with it.
      // The sheet as the writer saw it — with folded day reports and our own
      // records — is kept on the story: the admin panel and the reviews read it
      // from there, so neither looks unsourced.
      if ((earlier.length || recordsAdded) && newArticleId) {
        await db.execute(`UPDATE stories SET fact_sheet = ? WHERE id = ?`, [story.fact_sheet, story.id]);
      }
      if (earlier.length && newArticleId) {
        for (const r of earlier) {
          await db.execute(
            `UPDATE stories SET status = 'merged', merged_into = ?, processed_at = datetime('now') WHERE id = ?`,
            [newArticleId, r.id],
          );
        }
        console.log(`    + tournament recap: folded in ${earlier.length} day report(s)`);
      }

      generated++;
      totalTokens += response.tokens_input + response.tokens_output;
      draftsByCountry.set(country, [...(draftsByCountry.get(country) ?? []), parsed.title]);
      console.log(
        `  ✓ "${parsed.title}" (${response.provider}/${response.model}, ${response.tokens_input}+${response.tokens_output} tokens)`,
      );
    } catch (err) {
      console.error(`  ✗ Fejl ved story ${story.id}: ${err}`);
      failuresByCountry.set(country, [
        ...(failuresByCountry.get(country) ?? []),
        `Story ${story.id} (${story.athlete_name}): ${err}`,
      ]);
      // Tilbage til "new" så den kan prøves igen — men tælt, så den tredje
      // gang bliver den sidste i stedet for at køre i ring (migration 052).
      await recordTechnicalFailure(story, "kørselsfejl");
    }
  }

  console.log(`\nFærdig. Genereret ${generated} artikeludkast. Token-forbrug: ~${totalTokens}.`);
  if (blockedByGuard > 0) {
    console.log(`${blockedByGuard} historie(r) afvist af identitets-/citatvagten — se ⛔ ovenfor.`);
  }
  if (brokenOutput > 0) {
    console.log(`${brokenOutput} historie(r) kasseret på teknisk fejl — prøves igen næste kørsel.`);
  }
  if (abandoned > 0) {
    console.log(`${abandoned} historie(r) opgivet efter ${MAX_GEN_ATTEMPTS} tekniske forsøg (status 'gen_failed').`);
  }

  // Notifikationer til sidst: én besked pr. land frem for én pr. kladde, og
  // efter løkken så en webhook-fejl aldrig kan afbryde genereringen.
  for (const [country, titles] of draftsByCountry) {
    await notifyDraftsReady(country, titles.length, titles);
  }
  for (const [country, errors] of failuresByCountry) {
    await notifyFailure(
      country,
      `Generering fejlede for ${errors.length} historie(r)`,
      errors.join("\n"),
    );
  }
}

// Kør kun main() når filen eksekveres direkte (ikke ved import i tests).
if (process.argv[1] && process.argv[1].includes("generate-articles")) {
  main().catch((err) => {
    console.error("Artikelgenerering fejlede:", err);
    process.exit(1);
  });
}
