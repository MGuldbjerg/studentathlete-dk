/**
 * Profiludkast-pipeline — fylder athletes.profile_draft; PUBLICERER ALDRIG.
 * Godkendelse sker manuelt i /admin/profiler (draft → profile_summary).
 *
 * To tilstande:
 *   --baseline  Regelbaseret "startede på X og spiller Y"-udkast (INGEN LLM)
 *               for aktive atleter helt uden profiltekst. Kører fx efter
 *               roster-scrape, så nyopdagede freshmen får et udkast.
 *   --expand    Sommer-jobbet: udvid profilen til et karriere-resumé ud fra
 *               atletens KILDEBELAGTE athlete_events (høstet ved publicering
 *               af egne artikler) + de strukturerede roster-fakta. LLM'en
 *               (gratis ProviderChain) må KUN omskrive de leverede fakta til
 *               løbende prosa; en deterministisk verifikation afviser udkast
 *               med tal der ikke findes i inputtet.
 *
 * Udkast-konvention (deles med src/lib/admin.ts):
 *   profile_draft != NULL                     → afventer godkendelse
 *   godkend: summary=tekst, draft+draft_at=NULL
 *   afvis:   draft=NULL, draft_at BEHOLDES    → baseline genforeslår ALDRIG
 *            (expand må gerne — den køres eksplicit og har nyt materiale)
 *
 * Kørsel (fra repo-rod):
 *   npx tsx pipeline/profiles/build-profile-drafts.ts --baseline [--dry-run]
 *   npx tsx pipeline/profiles/build-profile-drafts.ts --expand [--limit N] [--athlete N] [--dry-run]
 */
import { createD1Client, D1Client } from "../lib/d1-client";
import { ProviderChain } from "../lib/llm/provider-chain";
import { type BaselineAthlete } from "../../src/lib/profile-baseline";
import { profileBuilder } from "../../src/lib/i18n/profile-builders";
import { countryProfile } from "../../src/lib/countries";

/**
 * Sproget følger ATLETEN, ikke processen. Kørslen er landeagnostisk (samme
 * cron dækker alle lande), så en modul-konstant valgt ud fra standardlandet
 * gav danske udkast til britiske atleter — teksten skal vælges pr. række.
 */
export function languageFor(a: { home_country: string | null }): string {
  return countryProfile(a.home_country ?? undefined).language;
}

function baselineFor(a: AthleteRow): string {
  return profileBuilder(languageFor(a))(a);
}

export interface AthleteRow extends BaselineAthlete {
  id: number;
  home_country: string | null;
  profile_summary: string | null;
}

export interface EventRow {
  season: string | null;
  kind: string;
  award_name: string | null;
  summary: string;
  significance: string;
  occurred_on: string | null;
}

const ATHLETE_COLS =
  "a.id, a.name, a.preferred_name, a.university, a.university_state, a.sport, a.position, " +
  "a.hometown, a.year_enrolled, a.expected_graduation, a.active, a.home_country, a.profile_summary, " +
  // Skolens brugsnavn. LEFT JOIN: en atlet hvis skole ikke findes i `schools`
  // skal stadig få et udkast — så falder navnet tilbage på det officielle.
  "s.common_name AS university_common_name";

// ── Prompt-input (eksporteret til test) ──────────────────────────────────────

/**
 * Skade-/helbredsbegivenheder holdes UDE af profilteksten: helbred er GDPR
 * art. 9-særkategori, og den journalistiske undtagelse står svagere for en
 * struktureret bio-generator end for artikler (se JURA-vurdering-2026-07-08.md
 * i Mikkels eget/StudentAthlete.dk/, pkt. 1).
 */
export function excludeHealthEvents(events: EventRow[]): EventRow[] {
  const healthRe = /skade|injur|sygdom|illness|surgery|operation/i;
  return events.filter(
    (e) => !/injury/i.test(e.kind) && !healthRe.test(e.summary) && !healthRe.test(e.award_name ?? ""),
  );
}

/** Kronologiske fakta-linjer fra athlete_events (sæson, derefter dato). */
export function eventsBlock(events: EventRow[], lang: string = "da"): string[] {
  const unknownSeason = lang === "da" ? "ukendt sæson" : "unknown season";
  const sorted = [...events].sort((a, b) => {
    const s = (a.season ?? "9999").localeCompare(b.season ?? "9999");
    if (s !== 0) return s;
    return (a.occurred_on ?? "").localeCompare(b.occurred_on ?? "");
  });
  return sorted.map((e) => {
    const label = e.award_name && e.award_name !== e.summary ? `${e.award_name}: ${e.summary}` : e.summary;
    return `- [${e.season ?? unknownSeason}] ${label}`;
  });
}

/**
 * Sammensæt basis-teksten med kildebelagte skifte-sætninger (athlete_events,
 * kind='transfer', skrevet af scrape-rosters.ts som allerede-færdig dansk
 * prosa: "Skiftede fra X til Y."). Kronologisk, ingen dubletter. Rent
 * hjælpefunktion (DB-uafhængig) så den kan testes uden D1.
 */
export function composeBaselineDraft(baseline: string, transferSummaries: string[]): string {
  return [baseline, ...transferSummaries].filter(Boolean).join(" ");
}

export function buildExpandPrompt(
  baseline: string,
  eventLines: string[],
  lang: string = "da",
): string {
  const t =
    lang === "da"
      ? {
          facts: "GRUNDFAKTA (roster):",
          events: "KILDEBELAGTE BEGIVENHEDER (fra vores egne artikler, kronologisk):",
          answer: 'Svar KUN med JSON: {"profil": "<resuméet>"}',
        }
      : {
          facts: "BASE FACTS (roster):",
          events: "SOURCED EVENTS (from our own articles, in chronological order):",
          answer: 'Answer with JSON ONLY: {"profil": "<the summary>"}',
        };
  return [t.facts, baseline, "", t.events, ...eventLines, "", t.answer].join("\n");
}

/**
 * Systemprompten skal skrives PÅ målsproget — en dansk instruktion med engelske
 * fakta får de gratis modeller til at svare på dansk. JSON-nøglen `profil` er
 * bevidst den samme på alle sprog (den er kode, ikke tekst).
 */
const EXPAND_SYSTEMS: Record<string, string> = {
  da: [
    "Du skriver et kort karriere-resumé på dansk til en atletprofil på StudentAthlete.dk.",
    "Ufravigelige regler:",
    "1. Brug UDELUKKENDE de leverede grundfakta og begivenheder. Find ALDRIG selv på fakta, tal, priser eller klubber.",
    "2. Udelad hellere en begivenhed end at gætte på detaljer.",
    "3. Kronologisk fortælling i frit format: start med studiestart, derpå sæson for sæson.",
    "4. 60-140 ord, neutral nyhedstone, ingen citater, ingen superlativer uden belæg.",
    "5. Nævn sæsoner som i inputtet (fx 2025-26).",
    'Svar KUN med JSON-objektet {"profil": "..."} — ingen anden tekst.',
  ].join("\n"),
  en: [
    "You write a short career summary in British English for an athlete profile on student-athlete.co.uk.",
    "Absolute rules:",
    "1. Use ONLY the base facts and events provided. NEVER invent facts, numbers, awards or clubs.",
    "2. Leave an event out rather than guessing at the details.",
    "3. Free-form chronological account: start with enrolment, then season by season.",
    "4. 60-140 words, neutral news tone, no quotes, no superlatives without evidence.",
    "5. Refer to seasons exactly as they appear in the input (e.g. 2025-26).",
    'Answer with the JSON object {"profil": "..."} ONLY — no other text.',
  ].join("\n"),
};

export function expandSystem(lang: string = "da"): string {
  return EXPAND_SYSTEMS[lang] ?? EXPAND_SYSTEMS.da;
}

// ── Parse + deterministisk verifikation (eksporteret til test) ───────────────

/** Fail-safe udtræk af profil-teksten fra LLM-svaret. */
export function extractProfileText(raw: string): string | null {
  const attempt = (s: string): string | null => {
    try {
      const obj = JSON.parse(s) as { profil?: unknown };
      return typeof obj.profil === "string" && obj.profil.trim() ? obj.profil.trim() : null;
    } catch {
      return null;
    }
  };
  const direct = attempt(raw.trim());
  if (direct) return direct;
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) {
    const f = attempt(fenced[1].trim());
    if (f) return f;
  }
  const brace = raw.match(/\{[\s\S]*\}/);
  return brace ? attempt(brace[0]) : null;
}

/**
 * Deterministisk anti-hallucinations-tjek: alle talfølger i udkastet skal
 * findes i input-korpusset, atletens navn skal optræde, og formen skal være
 * ren brødtekst. Tom liste = OK.
 */
export function verifyDraft(draft: string, corpus: string, athleteName: string): string[] {
  const problems: string[] = [];

  const corpusNums = new Set(corpus.match(/\d+/g) ?? []);
  for (const num of new Set(draft.match(/\d+/g) ?? [])) {
    if (!corpusNums.has(num)) problems.push(`opfundet tal: ${num}`);
  }

  const nameTokens = athleteName.split(/\s+/).filter((t) => t.length > 1);
  if (!nameTokens.some((t) => draft.includes(t))) {
    problems.push("atletens navn mangler i udkastet");
  }

  if (draft.length < 40) problems.push("for kort");
  if (draft.length > 1200) problems.push("for langt");
  if (/https?:\/\//.test(draft)) problems.push("indeholder URL");
  if (/^#|\n#/.test(draft)) problems.push("indeholder markdown-overskrift");

  return problems;
}

// ── Kørsel ───────────────────────────────────────────────────────────────────

async function runBaseline(db: D1Client, dryRun: boolean, onlyAthlete: number | null): Promise<void> {
  // draft_at IS NULL = aldrig afvist; baseline genforeslår ikke afviste udkast.
  const where = onlyAthlete
    ? `a.id = ${onlyAthlete}`
    : "a.active = 1 AND a.profile_summary IS NULL AND a.profile_draft IS NULL AND a.profile_draft_at IS NULL";
  const r = await db.query<AthleteRow>(`SELECT ${ATHLETE_COLS} FROM athletes a LEFT JOIN schools s ON s.name = a.university WHERE ${where}`);
  const rows = r.results ?? [];
  let queued = 0;
  for (const a of rows) {
    const transferRows = await db.query<{ summary: string }>(
      "SELECT summary FROM athlete_events WHERE athlete_id = ? AND kind = 'transfer' ORDER BY occurred_on ASC, id ASC",
      [a.id],
    );
    const draft = composeBaselineDraft(
      baselineFor(a),
      (transferRows.results ?? []).map((row) => row.summary),
    );
    if (dryRun) {
      console.log(`[dry-run] #${a.id} ${a.name}: ${draft}`);
    } else {
      await db.query(
        "UPDATE athletes SET profile_draft = ?, profile_draft_at = datetime('now') WHERE id = ?",
        [draft, a.id],
      );
    }
    queued++;
  }
  console.log(`Baseline: ${queued} udkast${dryRun ? " (dry-run)" : ""} af ${rows.length} kandidater.`);
}

async function runExpand(
  db: D1Client,
  dryRun: boolean,
  onlyAthlete: number | null,
  limit: number,
): Promise<void> {
  const where = onlyAthlete ? `AND a.id = ${onlyAthlete}` : "";
  const r = await db.query<AthleteRow & { event_count: number }>(
    `SELECT ${ATHLETE_COLS}, COUNT(e.id) AS event_count
     FROM athletes a
     JOIN athlete_events e ON e.athlete_id = a.id
     LEFT JOIN schools s ON s.name = a.university
     WHERE a.profile_draft IS NULL ${where}
     GROUP BY a.id ORDER BY event_count DESC LIMIT ?`,
    [limit],
  );
  const rows = r.results ?? [];
  const chain = new ProviderChain(db);
  let queued = 0;
  let rejected = 0;

  for (const a of rows) {
    const ev = await db.query<EventRow>(
      "SELECT season, kind, award_name, summary, significance, occurred_on FROM athlete_events WHERE athlete_id = ? ORDER BY id",
      [a.id],
    );
    const events = excludeHealthEvents(ev.results ?? []);
    if (events.length === 0) continue;

    const lang = languageFor(a);
    const baseline = baselineFor(a);
    const lines = eventsBlock(events, lang);
    const prompt = buildExpandPrompt(baseline, lines, lang);

    try {
      const response = await chain.generate({
        system: expandSystem(lang),
        prompt,
        max_tokens: 600,
        json: true,
      });
      const draft = extractProfileText(response.text);
      if (!draft) {
        rejected++;
        console.warn(`  ✗ #${a.id} ${a.name}: kunne ikke parse LLM-svar`);
        continue;
      }
      const problems = verifyDraft(draft, `${baseline}\n${lines.join("\n")}`, a.name);
      if (problems.length > 0) {
        rejected++;
        console.warn(`  ✗ #${a.id} ${a.name}: afvist (${problems.join("; ")})`);
        continue;
      }
      if (dryRun) {
        console.log(`[dry-run] #${a.id} ${a.name} (${events.length} events):\n${draft}\n`);
      } else {
        await db.query(
          "UPDATE athletes SET profile_draft = ?, profile_draft_at = datetime('now') WHERE id = ?",
          [draft, a.id],
        );
      }
      queued++;
    } catch (err) {
      rejected++;
      console.warn(`  ✗ #${a.id} ${a.name}: LLM-fejl — ${err instanceof Error ? err.message : err}`);
    }
  }
  console.log(
    `Expand: ${queued} udkast${dryRun ? " (dry-run)" : ""}, ${rejected} afvist, af ${rows.length} kandidater.`,
  );
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const flag = (name: string): boolean => args.includes(`--${name}`);
  const num = (name: string): number | null => {
    const i = args.indexOf(`--${name}`);
    return i >= 0 && args[i + 1] ? parseInt(args[i + 1], 10) : null;
  };

  const doBaseline = flag("baseline");
  const doExpand = flag("expand");
  if (!doBaseline && !doExpand) {
    console.error("Angiv --baseline og/eller --expand. Se filens header for brug.");
    process.exit(1);
  }

  const db = createD1Client();
  const dryRun = flag("dry-run");
  const onlyAthlete = num("athlete");
  const limit = num("limit") ?? 40;

  if (doBaseline) await runBaseline(db, dryRun, onlyAthlete);
  if (doExpand) await runExpand(db, dryRun, onlyAthlete, limit);
}

// Kør kun main når filen eksekveres direkte (ikke ved import i tests).
if (process.argv[1]?.includes("build-profile-drafts")) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
