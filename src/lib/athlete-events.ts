/**
 * Karriere-tidslinje pr. atlet (slice 1: udtrækning).
 * Konservativ, regelbaseret udtrækning af kildebelagte priser/æresbevisninger
 * fra en artikels tekst (titel + ingress + brødtekst + faktaark). Engelsk
 * (faktaark) + dansk (artikel). Kun klare match → resten kan kurateres i admin.
 *
 * significance styrer recall-vinduet i genereringen:
 *   honor   → år/karriere (All-American, Player of the Year, mesterskab, draftet)
 *   notable → ~en sæson   (ugens spiller, rekord)
 *   routine → uger        (almindelige resultater — udtrækkes ikke her endnu)
 */
export type Significance = "routine" | "notable" | "honor";

export interface ExtractedEvent {
  kind: string; // award | championship | record | transfer
  award_name: string; // kanonisk
  significance: Significance;
  summary: string;
}

interface Pattern {
  re: RegExp;
  kind: string;
  award: string;
  significance: Significance;
}

/**
 * Konference-forkortelser, som «All-ACC» og «All-SoCon» bygges af.
 *
 * Skolerne skriver næsten aldrig «All-Conference». De skriver forkortelsen, og
 * mønstret herunder fangede den ikke: NC State-bioen siger «Tabbed to All-ACC
 * Team for the second consecutive year», og udtrækket gav nul (17. september
 * 2026). Listen er EKSPLICIT frem for `All-[A-Z]{2,}`, fordi den generelle form
 * også ville tage «All-Time», «All-Access» og «All-Star».
 */
const CONFERENCES =
  "ACC|SEC|Big Ten|Big 12|Pac-12|Big East|Big Sky|Big South|SoCon|MAC|CUSA|C-USA|MVC|CAA|WCC|SSC|GSC|GLIAC|GLVC|ECC|NEC|OVC|Sun Belt|AAC|Ivy|Patriot|Horizon|Summit|WAC|MEAC|SWAC|America East|ASUN|Southland|SLC|NE-10|PSAC|RMAC|SIAC|MIAA|NSIC|GNAC|PacWest|Lone Star|MIAC|NCAC|NESCAC|SCIAC|UAA|Landmark|Empire 8";

const PATTERNS: Pattern[] = [
  // Academic All-America er en ANDEN pris end All-America og skal stå først;
  // den generelle form nedenfor ser bevidst bort fra den.
  {
    // "All-America Scholar(s)" (golf, swimming, …) is academic too: Lamar's
    // "six golf All-America Scholars" became an athletic All-American for
    // Nathan Woodham, and a draft repeated it (2026-09-30).
    re: /\bacademic\s+all[-\s]?americ(a|ans?)\b|\ball[-\s]?america(n)?\s+scholars?\b|\bscholar[-\s]all[-\s]?americ(a|ans?)\b/i,
    kind: "award",
    award: "Academic All-American",
    significance: "honor",
  },
  // «All-America Second Team» er den almindelige skrivemåde — uden n.
  // The plural counts too: "became Tiffin's first-ever All Americans" (2026-10-07).
  {
    re: /(?<!academic\s)(?<!scholar[-\s])\ball[-\s]?americ(a|ans?)\b(?!\s+scholars?\b)/i,
    kind: "award",
    award: "All-American",
    significance: "honor",
  },
  { re: /\ball[-\s]?conference\b/i, kind: "award", award: "All-Conference", significance: "honor" },
  {
    re: new RegExp(`\\ball[-\\s]?(${CONFERENCES})\\b`, "i"),
    kind: "award",
    award: "All-Conference",
    significance: "honor",
  },
  { re: /\ball[-\s]?(region|district)\b/i, kind: "award", award: "All-Region", significance: "honor" },
  {
    re: /\b(player|athlete|freshman|rookie|defensive player|offensive player|pitcher|golfer|swimmer|newcomer) of the year\b/i,
    kind: "award",
    award: "Player of the Year",
    significance: "honor",
  },
  { re: /\bårets (spiller|atlet|nykommer)\b/i, kind: "award", award: "Årets spiller", significance: "honor" },
  { re: /\b(player|athlete) of the week\b/i, kind: "award", award: "Player of the Week", significance: "notable" },
  { re: /\bugens (spiller|atlet)\b/i, kind: "award", award: "Ugens spiller", significance: "notable" },
  { re: /\b(rookie|freshman) of the (week|month)\b/i, kind: "award", award: "Rookie of the Week/Month", significance: "notable" },
  { re: /\bmvp\b|\bmost valuable player\b/i, kind: "award", award: "MVP", significance: "honor" },
  /**
   * AT DELTAGE ER IKKE AT VINDE.
   *
   * Mønstret var `(national|conference|ncaa)\s+champion(ship)?s?` og matchede
   * derfor «competed at the NCAA Championships» — altså en kvalifikation — som
   * et mesterskab. På en stikprøve 17. september 2026 var det den hyppigste
   * udmærkelse i høsten, og det ville have skrevet på navngivne menneskers
   * profiler, at de har vundet noget, de har deltaget i.
   *
   * Nu kræves enten et sejr-udsagnsord tæt på, eller ordet «champion» om
   * PERSONEN (uden -ship). Grænsen på 60 tegn holder sig inden for sætningen.
   */
  {
    re: /\b(won|winner of|claimed|captured|secured)\b[^.]{0,60}\bchampionship\b|\bchampionship\b[^.]{0,40}\b(title|winners?)\b|\b(national|conference|ncaa|league)\s+champions?\b(?!hip)|\bvandt\b[^.]{0,60}\bmesterskab\b|\b(danmarks|verdens|europa)mester\b/i,
    kind: "championship",
    award: "Mesterskab",
    significance: "honor",
  },
  // "personlig rekord" is a personal best, not a record (2026-09-30).
  { re: /\b(school|national|conference|meet|ncaa)\s+record\b|(?<!personlig\s)\brekord\b/i, kind: "record", award: "Rekord", significance: "notable" },
  { re: /\bdrafted\b|\bdraftet\b|\bdraft pick\b/i, kind: "transfer", award: "Draftet", significance: "honor" },
];

/**
 * Words around an award name that make it something else (2026-09-30, from the
 * 2026-27 rows): a forecast ("preseason All-America", "watch list"), a
 * tournament ("ITA All-American Championships", "… qualifying draw"), or a
 * non-athletic team ("All-Sun Belt Community Service Team").
 */
const NOT_AN_AWARD_BEFORE = /\bpre-?season\b[^.]{0,40}$/i;
/** A forecast anywhere in a short text (a headline) — Danish compounds too ("preseason-hold"). */
const FORECAST = /\bpre-?season|\bwatch list\b/i;
const NOT_AN_AWARD_AFTER = /^[^.]{0,30}\b(championships?|qualifying|pre-qualifying|main draw|final|watch list|community service|sportsmanship)\b/i;

function isRealAward(p: Pattern, text: string): boolean {
  const m = p.re.exec(text);
  if (!m) return false;
  if (p.kind !== "award") return true;
  const before = text.slice(Math.max(0, m.index - 60), m.index);
  const after = text.slice(m.index + m[0].length, m.index + m[0].length + 60);
  return !NOT_AN_AWARD_BEFORE.test(before) && !NOT_AN_AWARD_AFTER.test(after);
}

/** Udtræk distinkte begivenheder (max én pr. award_name) fra fritekst. */
export function extractEvents(text: string): ExtractedEvent[] {
  if (!text) return [];
  const seen = new Set<string>();
  const out: ExtractedEvent[] = [];
  for (const p of PATTERNS) {
    if (isRealAward(p, text) && !seen.has(p.award)) {
      seen.add(p.award);
      out.push({ kind: p.kind, award_name: p.award, significance: p.significance, summary: p.award });
    }
  }
  return out;
}

/** Akademisk sæson (US college, aug–jul) fra en ISO-dato (eller nu). */
/**
 * The season an event belongs to. Season-level honours (All-American,
 * All-Conference, Player of the Year) are announced in June-August for the
 * season just ended; dating them by announcement put Woodham's summer honours
 * in 2026-27 before a ball was struck. Weekly awards and results stay on the
 * date's own season.
 */
export function seasonForEvent(iso: string | null, significance: string): string {
  const d = iso ? new Date(iso) : new Date();
  const m = d.getUTCMonth() + 1;
  if (significance === "honor" && m >= 6 && m <= 8) {
    // Date it to May of the same year: the season that has just ended.
    return seasonFromDate(new Date(Date.UTC(d.getUTCFullYear(), 4, 1)).toISOString());
  }
  return seasonFromDate(iso);
}

/** Awards that recur within a season: one row per article, not per season. */
export const WEEKLY_AWARDS = [
  "Player of the Week", "Rookie of the Week/Month", "Ugens spiller",
  // From conference releases (pipeline/scrape/conference-honors.ts, 2026-10-07).
  "Honor Roll", "Crew of the Week",
];

export function seasonFromDate(iso: string | null): string {
  const d = iso ? new Date(iso) : new Date();
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth() + 1;
  const start = m >= 7 ? y : y - 1;
  return `${start}-${String((start + 1) % 100).padStart(2, "0")}`;
}

/** Lagret begivenhed (visning + admin). */
export interface AthleteEventRow {
  id: number;
  season: string | null;
  kind: string;
  award_name: string | null;
  summary: string;
  significance: Significance;
  source_url: string | null;
  occurred_on: string | null;
}

/**
 * Prisens navn på sitets eget sprog.
 *
 * `award_name` er en KANONISK nøgle, ikke visningstekst — den skrives af
 * mønstrene ovenfor og er derfor på blandet dansk/engelsk ("Mesterskab",
 * "All-American"). Gemt som den er, og renderet råt, stod der «Mesterskab» og
 * «Rekord» på britiske profiler (fundet på student-athlete.co.uk/time-esan
 * 17. september 2026). Sproget hører til sitet, ikke til rækken i basen — så
 * oversættelsen sker HER, ved visning.
 *
 * Navne der er egennavne (All-American, MVP) er ens på begge sprog og står
 * kun én gang. Ukendte nøgler vises som de er: en manglende oversættelse skal
 * ligne en manglende oversættelse, ikke en tom celle.
 */
const AWARD_LABELS: Record<string, { da: string; en: string }> = {
  "All-American": { da: "All-American", en: "All-American" },
  "Academic All-American": { da: "Academic All-American", en: "Academic All-American" },
  "All-Conference": { da: "All-Conference", en: "All-Conference" },
  "All-Region": { da: "All-Region", en: "All-Region" },
  "Player of the Year": { da: "Årets spiller", en: "Player of the Year" },
  "Årets spiller": { da: "Årets spiller", en: "Player of the Year" },
  "Player of the Week": { da: "Ugens spiller", en: "Player of the Week" },
  "Ugens spiller": { da: "Ugens spiller", en: "Player of the Week" },
  "Rookie of the Week/Month": { da: "Ugens/månedens nykommer", en: "Rookie of the Week/Month" },
  MVP: { da: "MVP", en: "MVP" },
  Mesterskab: { da: "Mesterskab", en: "Championship" },
  Rekord: { da: "Rekord", en: "Record" },
  Draftet: { da: "Draftet", en: "Drafted" },
  // Conference releases (2026-10-07). The honour roll is the weekly athletic
  // one — the academic and commissioner's rolls are never harvested.
  "Honor Roll": { da: "Ugens æresliste", en: "Weekly Honour Roll" },
  "Crew of the Week": { da: "Ugens båd", en: "Crew of the Week" },
  "All-Freshman": { da: "All-Freshman", en: "All-Freshman Team" },
  "All-Conference HM": { da: "All-Conference (honorable mention)", en: "All-Conference Honourable Mention" },
  "All-Region HM": { da: "All-Region (honorable mention)", en: "All-Region Honourable Mention" },
  "All-American HM": { da: "All-American (honorable mention)", en: "All-American Honourable Mention" },
};

export function awardLabel(awardName: string | null, lang: string): string {
  if (!awardName) return "";
  const entry = AWARD_LABELS[awardName];
  if (!entry) return awardName;
  return lang === "da" ? entry.da : entry.en;
}

// ─── Harvest from a published article (one place, three callers) ───────────

/**
 * The row insert every harvester uses. Dedup is the unique index from
 * migration 060: one row per athlete + award + season, except weekly awards,
 * which get one row per article so "twice this season" can be counted.
 */
export const HARVEST_INSERT_SQL = `INSERT OR IGNORE INTO athlete_events
  (athlete_id, occurred_on, season, kind, award_name, summary, significance, source_url, article_id, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`;

export interface HarvestInput {
  athleteId: number;
  articleId: number;
  sourceUrl: string | null;
  /** When the article went live (ISO); null = now. */
  publishedAt: string | null;
  title: string;
  summary: string | null;
}

/**
 * Parameter rows for HARVEST_INSERT_SQL. Reads the HEADLINE and STANDFIRST only
 * (2026-09-30): they are always about the athlete, while the body and fact sheet
 * mention team-mates' awards too, and every harvested row may end up as a
 * claim about a named person ("his second Rookie of the Week this season").
 * Used by publishArticle (admin), apply-draft-decisions and backfill-events.
 */
export function harvestRows(a: HarvestInput): unknown[][] {
  // A headline about a forecast (preseason team, watch list) is not an event.
  if (FORECAST.test(a.title)) return [];
  const text = [a.title, a.summary].filter(Boolean).join("\n");
  const occurred = (a.publishedAt ?? new Date().toISOString()).slice(0, 10);
  // Weekly awards count only when the HEADLINE is about one: a standfirst saying
  // "twice CAA Rookie of the Week" recaps old awards, and counting it would make
  // Cameron Keay's two into three (2026-09-30).
  const inHeadline = new Set(extractEvents(a.title).map((e) => e.award_name));
  return extractEvents(text)
    .filter((e) => !WEEKLY_AWARDS.includes(e.award_name) || inHeadline.has(e.award_name))
    .map((e) => [
    a.athleteId, occurred, seasonForEvent(a.publishedAt, e.significance), e.kind,
    e.award_name, e.summary, e.significance, a.sourceUrl, a.articleId,
  ]);
}
