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

// Grammatikken vælges af sitets sprog, ikke hardkodet. Med ét site er det
// stadig dansk — men et tysk site henter sin egen bygger samme vej.
const baselineProfile = profileBuilder(countryProfile().language);

export interface AthleteRow extends BaselineAthlete {
  id: number;
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
  "id, name, preferred_name, university, university_state, sport, position, " +
  "hometown, year_enrolled, expected_graduation, active, profile_summary";

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
export function eventsBlock(events: EventRow[]): string[] {
  const sorted = [...events].sort((a, b) => {
    const s = (a.season ?? "9999").localeCompare(b.season ?? "9999");
    if (s !== 0) return s;
    return (a.occurred_on ?? "").localeCompare(b.occurred_on ?? "");
  });
  return sorted.map((e) => {
    const label = e.award_name && e.award_name !== e.summary ? `${e.award_name}: ${e.summary}` : e.summary;
    return `- [${e.season ?? "ukendt sæson"}] ${label}`;
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

export function buildExpandPrompt(baseline: string, eventLines: string[]): string {
  return [
    "GRUNDFAKTA (roster):",
    baseline,
    "",
    "KILDEBELAGTE BEGIVENHEDER (fra vores egne artikler, kronologisk):",
    ...eventLines,
    "",
    'Svar KUN med JSON: {"profil": "<resuméet>"}',
  ].join("\n");
}

export const EXPAND_SYSTEM = [
  "Du skriver et kort karriere-resumé på dansk til en atletprofil på StudentAthlete.dk.",
  "Ufravigelige regler:",
  "1. Brug UDELUKKENDE de leverede grundfakta og begivenheder. Find ALDRIG selv på fakta, tal, priser eller klubber.",
  "2. Udelad hellere en begivenhed end at gætte på detaljer.",
  "3. Kronologisk fortælling i frit format: start med studiestart, derpå sæson for sæson.",
  "4. 60-140 ord, neutral nyhedstone, ingen citater, ingen superlativer uden belæg.",
  "5. Nævn sæsoner som i inputtet (fx 2025-26).",
  'Svar KUN med JSON-objektet {"profil": "..."} — ingen anden tekst.',
].join("\n");

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
    ? `id = ${onlyAthlete}`
    : "active = 1 AND profile_summary IS NULL AND profile_draft IS NULL AND profile_draft_at IS NULL";
  const r = await db.query<AthleteRow>(`SELECT ${ATHLETE_COLS} FROM athletes WHERE ${where}`);
  const rows = r.results ?? [];
  let queued = 0;
  for (const a of rows) {
    const transferRows = await db.query<{ summary: string }>(
      "SELECT summary FROM athlete_events WHERE athlete_id = ? AND kind = 'transfer' ORDER BY occurred_on ASC, id ASC",
      [a.id],
    );
    const draft = composeBaselineDraft(
      baselineProfile(a),
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
    `SELECT ${ATHLETE_COLS.split(", ").map((c) => `a.${c}`).join(", ")}, COUNT(e.id) AS event_count
     FROM athletes a JOIN athlete_events e ON e.athlete_id = a.id
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

    const baseline = baselineProfile(a);
    const lines = eventsBlock(events);
    const prompt = buildExpandPrompt(baseline, lines);

    try {
      const response = await chain.generate({
        system: EXPAND_SYSTEM,
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
