/**
 * Box scores — v2 berigelse af faktaarket (fase 1) + grundsandhed for TAL (fase 3).
 *
 * Box scores er GRUNDSANDHED for tal (slutresultat + atletens statline) og et
 * kryds-tjek — de er ALDRIG den eneste kilde og overstyrer ALDRIG den kvalitative
 * prosa. En stærk kamp uden stats fortælles fortsat via `qualitative[]` fra recap'en;
 * box scoren bekræfter blot tallene (fx 0 mål / 0 assists) uden at kvæle fortællingen.
 * Se [[feedback-article-prose-vs-stats]].
 *
 * VIGTIGT: box-score-/stats-domæner (sports-reference, statmuse m.fl.) står i
 * `extract-story.ts` BLOCKED_DOMAINS — den blocklist gælder IKKE her. Box scores
 * ønskes som FAKTA-kilder, ikke som artikel-kilder.
 */

import type { ChainLike, FactSheet } from "./build-factsheet";

export interface BoxScoreExtract {
  /** false hvis atleten ikke optræder på siden (forkert side / spillede ikke). */
  found: boolean;
  /** Slutresultat ordret som trykt, fx "Duke 2, UNC 1". */
  final_score: string | null;
  /** Atletens individuelle tal, hver ordret som trykt ("90 minutes", "1 goal"). */
  stat_line: string[];
}

/** Dependencies injiceres så orkestreringen kan unit-testes uden netværk/render. */
export interface BoxScoreDeps {
  /** Plain HTTP-hentning af kildesidens HTML (links bevaret — modsat content_raw). */
  fetchHtml(url: string): Promise<string | null>;
  /** CF Browser Rendering af box-score-siden (JS-tunge stats-sider). Kan kaste BrowserRenderError. */
  renderPage(url: string): Promise<string | null>;
  /** HTML → ren tekst (genbruger extract-story.extractMainText). */
  extractText(html: string): string | null;
}

const SYSTEM_MESSAGE =
  "You read a sports BOX SCORE / stats page and report exactly ONE athlete's individual " +
  "stat line and the game's final score, copied verbatim from the page. Output ONLY numbers " +
  "and results that appear on the page — never infer, estimate, or add anything. If the athlete " +
  "does not appear on the page, set found=false. Respond with ONLY a JSON object.";

/** Strip markdown-fences og udtræk første JSON-objekt (samme mønster som verify-story). */
function extractJson(text: string): string | null {
  const stripped = text.replace(/^```(?:json)?\s*/im, "").replace(/\s*```\s*$/im, "").trim();
  const m = stripped.match(/\{[\s\S]*\}/);
  return m ? m[0] : null;
}

/**
 * Kendte stats-/box-score-domæner som ER ønskede her (modsat artikel-kilder).
 * Et link til disse betragtes som en box score selv uden "box score"-ankertekst.
 */
const STATS_PROVIDER_HOSTS = [
  "sports-reference.com",
  "baseball-reference.com",
  "basketball-reference.com",
  "pro-football-reference.com",
  "hockey-reference.com",
  "statmuse.com",
  "fbref.com",
];

/** Ankertekst der utvetydigt peger på en box score (ikke den generiske "Stats"-nav). */
const BOX_SCORE_TEXT = /\bbox\s?score\b/i;
/** href-mønster: Sidearm m.fl. bruger /boxscore, box-score, box_score i stien/query. */
const BOX_SCORE_HREF = /box[-_\s]?score/i;

interface Candidate {
  url: string;
  /** Lavere = stærkere signal (vælges først). */
  priority: number;
}

function hostIncludes(url: string, needles: string[]): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return needles.some((n) => host.includes(n));
  } catch {
    return false;
  }
}

/**
 * Find et box-score-link i kildesidens HTML (deterministisk — ingen LLM).
 * Konservativ for at undgå at gribe den generiske "Stats"-navigation:
 *   1. href indeholder "boxscore"/"box-score"  (stærkeste)
 *   2. ankertekst indeholder "box score"
 *   3. href peger på et kendt stats-domæne (sports-reference, statmuse, …)
 * Returnerer absolut URL (relative opløses mod baseUrl), eller null.
 */
export function findBoxScoreUrl(html: string, baseUrl: string): string | null {
  if (!html) return null;
  const candidates: Candidate[] = [];

  // Letvægts-regex over <a ...>…</a> — undgår en fuld cheerio-load for et simpelt scan.
  const anchorRe = /<a\b[^>]*?href\s*=\s*(["'])(.*?)\1[^>]*>([\s\S]*?)<\/a>/gi;
  let m: RegExpExecArray | null;
  while ((m = anchorRe.exec(html)) !== null) {
    const rawHref = m[2].trim();
    const text = m[3].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    if (!rawHref || /^(javascript:|mailto:|#)/i.test(rawHref)) continue;

    let abs: string;
    try {
      abs = new URL(rawHref, baseUrl).toString();
    } catch {
      continue;
    }

    let priority: number | null = null;
    if (BOX_SCORE_HREF.test(rawHref)) priority = 1;
    else if (BOX_SCORE_TEXT.test(text)) priority = 2;
    else if (hostIncludes(abs, STATS_PROVIDER_HOSTS)) priority = 3;

    if (priority !== null) candidates.push({ url: abs, priority });
  }

  if (candidates.length === 0) return null;
  candidates.sort((a, b) => a.priority - b.priority);
  return candidates[0].url;
}

function asStringArray(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && x.trim().length > 0) : [];
}

/**
 * LLM-udtræk af atletens statline + slutresultat fra en (renderet) box-score-side.
 * Returnerer null ved LLM-/parsningsfejl (fail-open — så berigelsen blot udebliver,
 * artiklen blokeres aldrig af en box-score-fejl).
 */
export async function extractBoxScoreStats(
  input: { athleteName: string; sport: string; text: string },
  chain: ChainLike,
): Promise<BoxScoreExtract | null> {
  const text = input.text.slice(0, 6000);
  if (!text.trim()) return null;

  const prompt = [
    `Athlete: ${input.athleteName} (${input.sport})`,
    "",
    "BOX SCORE PAGE:",
    text,
    "",
    'Return ONLY this JSON: {"found": boolean, "final_score": string|null, "stat_line": ["<stat exactly as printed>", ...]}',
    'stat_line = this athlete\'s individual numbers (e.g. "90 minutes", "1 goal", "2 shots", "0 assists"). ' +
      "Use [] if the athlete appears but has no individual stats. found=false if the athlete is not on the page.",
  ].join("\n");

  let raw: string;
  try {
    const res = await chain.generate({ system: SYSTEM_MESSAGE, prompt, max_tokens: 400 });
    raw = res.text;
  } catch {
    return null;
  }

  const jsonStr = extractJson(raw);
  if (!jsonStr) return null;
  let parsed: { found?: unknown; final_score?: unknown; stat_line?: unknown };
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    return null;
  }

  return {
    found: parsed.found === true,
    final_score: typeof parsed.final_score === "string" && parsed.final_score.trim() ? parsed.final_score.trim() : null,
    stat_line: asStringArray(parsed.stat_line).map((s) => s.trim()),
  };
}

function normForDedupe(s: string): string {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

/**
 * Flet box-score-tal ind i faktaarket. Box-score-stats tagges `source:"boxscore"`.
 * Slutresultatet udfyldes KUN hvis prosaen ikke allerede har et. Stats der allerede
 * står i prosaen duplikeres ikke. Den kvalitative prosa røres aldrig.
 */
export function mergeBoxScoreIntoFactSheet(
  fs: FactSheet,
  extract: BoxScoreExtract,
  boxScoreUrl: string,
): FactSheet {
  const existing = new Set(fs.stats.map((s) => normForDedupe(s.text)));
  const boxStats = extract.stat_line
    .filter((t) => t.trim() && !existing.has(normForDedupe(t)))
    .map((text) => ({ text: text.trim(), source: "boxscore" as const }));

  let result = fs.result;
  if (extract.final_score) {
    if (!result) result = { final_score: extract.final_score, outcome: null, placement: null };
    else if (!result.final_score) result = { ...result, final_score: extract.final_score };
  }

  return {
    ...fs,
    stats: [...fs.stats, ...boxStats],
    result,
    box_score_url: boxScoreUrl,
    has_substance: fs.has_substance || boxStats.length > 0 || Boolean(extract.final_score),
  };
}

/**
 * Render den autoritative box-score-blok til fase 3 (kryds-tjek af TAL). Returnerer
 * null hvis ingen box score blev fundet (`box_score_url` ikke sat) — så verifikationen
 * opfører sig som før for historier uden box score.
 */
export function renderBoxScoreBlock(fs: FactSheet): string | null {
  if (!fs.box_score_url) return null;
  const boxStats = fs.stats.filter((s) => s.source === "boxscore").map((s) => s.text);
  const lines: string[] = [];
  if (fs.result?.final_score) lines.push(`Slutresultat: ${fs.result.final_score}`);
  if (boxStats.length) lines.push("Atletens officielle statline:\n" + boxStats.map((t) => `- ${t}`).join("\n"));
  return lines.length ? lines.join("\n") : null;
}

/**
 * Orkestrér box-score-berigelse for ét faktaark: hent kildesidens HTML → find
 * box-score-link → render box scoren → udtræk statline → flet ind. Renderer HØJST
 * én side (selve box scoren); kildesidens link-scan bruger plain fetch. Lader
 * BrowserRenderError (quotaExhausted) propagere så kalderen kan stoppe render for
 * resten af kørslen.
 *
 * @returns rendered = om en render blev forsøgt (kalderen tæller budget);
 *          found = om box-score-tal faktisk blev flettet ind.
 */
export async function enrichFactSheetWithBoxScore(
  fs: FactSheet,
  source: { sourceUrl: string | null; athleteName: string; sport: string },
  chain: ChainLike,
  deps: BoxScoreDeps,
): Promise<{ factSheet: FactSheet; rendered: boolean; found: boolean }> {
  const unchanged = { factSheet: fs, rendered: false, found: false };
  if (!source.sourceUrl) return unchanged;

  const html = await deps.fetchHtml(source.sourceUrl);
  if (!html) return unchanged;

  const boxUrl = findBoxScoreUrl(html, source.sourceUrl);
  if (!boxUrl) return unchanged;

  // Herfra forsøger vi en render (kan kaste BrowserRenderError → propagerer).
  const rendered = await deps.renderPage(boxUrl);
  if (!rendered) return { factSheet: fs, rendered: true, found: false };

  const text = deps.extractText(rendered);
  if (!text) return { factSheet: fs, rendered: true, found: false };

  const extract = await extractBoxScoreStats(
    { athleteName: source.athleteName, sport: source.sport, text },
    chain,
  );
  if (!extract || !extract.found || (extract.stat_line.length === 0 && !extract.final_score)) {
    return { factSheet: fs, rendered: true, found: false };
  }

  return { factSheet: mergeBoxScoreIntoFactSheet(fs, extract, boxUrl), rendered: true, found: true };
}
