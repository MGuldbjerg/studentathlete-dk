/**
 * The check view (/admin/tjek/<id>): draft and source as plain text, with every
 * number and name in the draft looked up in the source.
 *
 * Pure functions, no DB — the page computes everything on the server and the
 * client only renders. Tested in pipeline/checks/_check-view-test.ts.
 *
 * What "missing" means matters more than anything else here: a red mark on a
 * fact that IS in the source teaches the reviewer to ignore red. So a name
 * counts as found when its surname is (box scores write "Hulme, Laura"), a
 * month counts when its three-letter stem or US number is ("Sep. 26", "9/26/2026"), weekdays are never
 * checked (sources rarely print them), and anything known from our own athlete
 * record is marked as coming from the database, not as invented.
 */

/**
 * `missing` is for names: an invented name or hometown is the costly error.
 * `loose` is a number not found verbatim — often still true (a half-time 2-0
 * the source never prints), so it gets a softer mark than a missing name.
 */
export type KeyStatus = "source" | "db" | "missing" | "loose";

export interface CheckKey {
  start: number;
  end: number;
  kind: "number" | "name" | "month";
  status: KeyStatus;
  /** The text actually searched for in the source (a surname, a month stem). */
  needle: string;
  /** Source line indices where the needle occurs, first few only. */
  lines: number[];
}

export interface CheckFinding {
  severity: string;
  claim: string;
  why: string;
}

export interface CheckSentence {
  text: string;
  keys: CheckKey[];
  findings: CheckFinding[];
}

// ─── Source ─────────────────────────────────────────────────────────────────

/**
 * Scraped source text as readable lines. Box scores arrive as one table cell
 * per line with blank lines between, so short consecutive lines are joined into
 * one row ("Chowan · 0 · 1 · 1"); a run of blank lines ends the row.
 */
export function cleanSource(raw: string | null): string[] {
  if (!raw) return [];
  const out: string[] = [];
  let row: string[] = [];
  let blanks = 0;
  const flush = () => {
    if (row.length) out.push(row.join(" · "));
    row = [];
  };
  for (const rawLine of raw.replace(/\r/g, "").split("\n")) {
    const line = rawLine.replace(/\s+/g, " ").trim();
    if (!line) {
      blanks++;
      continue;
    }
    if (blanks >= 3) flush();
    blanks = 0;
    if (line.length > 40) {
      flush();
      out.push(line);
    } else {
      row.push(line);
    }
  }
  flush();
  // Box-score headers repeat each cell ("Chowan · CHOWAN"); drop the shout.
  return out.map((l) =>
    l
      .split(" · ")
      .filter((cell, i, cells) => {
        if (i === 0 || cell !== cell.toUpperCase() || !/[A-ZÆØÅ]/.test(cell)) return true;
        const prev = cells[i - 1];
        return prev === cell || !prev.toUpperCase().startsWith(cell);
      })
      .join(" · "),
  );
}

// ─── Draft ──────────────────────────────────────────────────────────────────

/** Markdown/HTML to plain paragraphs. */
export function stripMarkdown(md: string): string[] {
  return md
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^[ \t]{0,3}#{1,6}[ \t]*/gm, "")
    .replace(/^[ \t]*[-*+][ \t]+/gm, "")
    .replace(/^[ \t]*>[ \t]?/gm, "")
    .replace(/(\*\*|__|\*|_|`)/g, "")
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s*\n\s*/g, " ").trim())
    .filter(Boolean);
}

const ABBREVIATIONS = new Set([
  "no", "nr", "st", "mr", "mrs", "ms", "dr", "jr", "sr", "vs", "etc", "ca", "bl", "fx",
  "jan", "feb", "mar", "apr", "jun", "jul", "aug", "sep", "sept", "oct", "okt", "nov", "dec",
]);

/** Sentences, without splitting on "Sep. 26", "No. 5" or an initial like "J. Smith". */
export function splitSentences(paragraph: string): string[] {
  const out: string[] = [];
  let start = 0;
  const re = /[.!?]["”’)]?\s+(?=["“‘(]?[A-ZÆØÅ0-9])/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(paragraph))) {
    const before = paragraph.slice(start, m.index);
    const lastWord = (before.match(/(\S+)$/)?.[1] ?? "").replace(/^["“‘(]/, "");
    if (ABBREVIATIONS.has(lastWord.toLowerCase()) || /^[A-ZÆØÅ]$/.test(lastWord)) continue;
    const end = m.index + m[0].trimEnd().length;
    out.push(paragraph.slice(start, end).trim());
    start = m.index + m[0].length;
  }
  const rest = paragraph.slice(start).trim();
  if (rest) out.push(rest);
  return out;
}

// ─── Keys ───────────────────────────────────────────────────────────────────

/** Capitalised words that start sentences, not names. English and Danish. */
const NOT_NAMES = new Set([
  "the", "a", "an", "it", "its", "he", "she", "his", "her", "they", "their", "this", "that",
  "these", "those", "after", "before", "in", "on", "at", "with", "but", "and", "as", "for",
  "from", "by", "of", "to", "when", "while", "then", "there", "both", "one", "two", "three",
  "four", "five", "six", "seven", "eight", "nine", "ten", "senior", "junior", "sophomore",
  "freshman", "graduate", "goalkeeper", "defender", "midfielder", "forward", "coach",
  "head", "last", "next", "first", "second", "third", "fourth", "his", "i", "we", "our",
  "det", "den", "de", "han", "hun", "hans", "hendes", "efter", "før", "på", "med", "men",
  "og", "som", "da", "når", "der", "et", "en", "to", "tre", "fire", "fem", "også", "hvor",
]);

const WEEKDAYS = new Set([
  "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday",
  "mandag", "tirsdag", "onsdag", "torsdag", "fredag", "lørdag", "søndag",
]);

const MONTHS: Record<string, string> = {
  january: "jan", february: "feb", march: "mar", april: "apr", may: "may", june: "jun",
  july: "jul", august: "aug", september: "sep", october: "oct", november: "nov", december: "dec",
  januar: "jan", februar: "feb", marts: "mar", maj: "maj", juni: "jun", juli: "jul",
  oktober: "okt",
};

const MONTH_NUMBER: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, maj: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, okt: 10, nov: 11, dec: 12,
};

interface RawKey {
  start: number;
  end: number;
  kind: CheckKey["kind"];
  text: string;
}

export function extractKeys(sentence: string): RawKey[] {
  const keys: RawKey[] = [];
  for (const m of sentence.matchAll(/\d+(?:[.,:\-–]\d+)*/g)) {
    keys.push({ start: m.index!, end: m.index! + m[0].length, kind: "number", text: m[0] });
  }
  const nameRe = /[A-ZÆØÅ][\p{L}'’\-]+(?:\s+(?:de |van |von |da |di |le |la |O’|O')?[A-ZÆØÅ][\p{L}'’\-]+)*/gu;
  for (const m of sentence.matchAll(nameRe)) {
    let words = m[0].split(/\s+/);
    let offset = m.index!;
    // Peel sentence-starter words off the front ("After Hulme" → "Hulme").
    while (words.length && NOT_NAMES.has(words[0].toLowerCase())) {
      offset += words[0].length + 1;
      words = words.slice(1);
    }
    if (!words.length) continue;
    const text = words.join(" ");
    if (words.length === 1 && WEEKDAYS.has(text.toLowerCase())) continue;
    const lower = text.toLowerCase();
    const kind = words.length === 1 && MONTHS[lower] ? "month" : "name";
    // "Hulme's" should be looked up as "Hulme".
    const clean = text.replace(/['’]s$/, "");
    keys.push({ start: offset, end: offset + clean.length, kind, text: clean });
  }
  return keys.sort((a, b) => a.start - b.start);
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function linesMatching(lines: string[], re: RegExp, limit = 5): number[] {
  const hits: number[] = [];
  for (let i = 0; i < lines.length && hits.length < limit; i++) {
    re.lastIndex = 0;
    if (re.test(lines[i])) hits.push(i);
  }
  return hits;
}

/** Regex that finds a key in text; numbers tolerate "1-0" vs "1–0". */
export function needleRegex(kind: CheckKey["kind"], needle: string): RegExp {
  // A month as a US date ("9/" → "9/26/2026").
  if (kind === "month" && /^\d+\/$/.test(needle)) {
    return new RegExp(`(?<![\\d])0?${needle}\\d`, "i");
  }
  if (kind === "number") {
    // "5:13" also matches "05:13"; "1-0" also matches "1–0".
    const body = needle.split(/[.,:\-–]/).map(escapeRe).join("[.,:\\-–]");
    return new RegExp(`(?<![\\d])0?${body}(?![\\d])`, "i");
  }
  return new RegExp(`(?<![\\p{L}])${escapeRe(needle)}`, "iu");
}

export function resolveKey(raw: RawKey, sourceLines: string[], dbText: string): CheckKey {
  const candidates: string[] =
    raw.kind === "month"
      ? [MONTHS[raw.text.toLowerCase()], `${MONTH_NUMBER[MONTHS[raw.text.toLowerCase()]]}/`, raw.text]
      : raw.kind === "name"
        ? [raw.text, raw.text.split(" ").slice(-1)[0]]
        : [raw.text];
  for (const needle of candidates) {
    const lines = linesMatching(sourceLines, needleRegex(raw.kind, needle));
    if (lines.length) return { start: raw.start, end: raw.end, kind: raw.kind, status: "source", needle, lines };
  }
  const inDb = candidates.some((n) => needleRegex(raw.kind, n).test(dbText));
  return {
    start: raw.start,
    end: raw.end,
    kind: raw.kind,
    status: inDb ? "db" : raw.kind === "number" ? "loose" : "missing",
    needle: candidates[0],
    lines: [],
  };
}

// ─── Findings ───────────────────────────────────────────────────────────────

function words(s: string): Set<string> {
  return new Set(s.toLowerCase().match(/[\p{L}\d]+/gu) ?? []);
}

/**
 * Which sentence a reviewer's finding is about. Claude quotes the draft in
 * `claim`, usually verbatim, sometimes trimmed; fall back to word overlap.
 * Returns -1 when nothing fits well enough — shown above the draft instead.
 */
export function locateClaim(claim: string, sentences: string[]): number {
  const c = claim.toLowerCase().replace(/["“”‘’]/g, "").trim();
  if (!c) return -1;
  const exact = sentences.findIndex((s) => s.toLowerCase().replace(/["“”‘’]/g, "").includes(c));
  if (exact >= 0) return exact;
  const cw = words(c);
  let best = -1, bestScore = 0;
  sentences.forEach((s, i) => {
    const sw = words(s);
    let shared = 0;
    for (const w of cw) if (sw.has(w)) shared++;
    const score = shared / cw.size;
    if (score > bestScore) { bestScore = score; best = i; }
  });
  return bestScore >= 0.6 ? best : -1;
}

// ─── The whole view ─────────────────────────────────────────────────────────

export interface CheckModel {
  title: CheckSentence;
  paragraphs: CheckSentence[][];
  unplaced: CheckFinding[];
  sourceLines: string[];
  counts: Record<KeyStatus, number>;
}

export function buildCheckModel(input: {
  title: string;
  content: string;
  sourceRaw: string | null;
  findings: CheckFinding[];
  /** Everything our own records know about the athletes: names, hometowns, schools. */
  dbFacts: string[];
}): CheckModel {
  const sourceLines = cleanSource(input.sourceRaw);
  const dbText = input.dbFacts.join(" \n ");
  const mk = (text: string): CheckSentence => ({
    text,
    keys: extractKeys(text).map((k) => resolveKey(k, sourceLines, dbText)),
    findings: [],
  });

  const title = mk(input.title);
  const paragraphs = stripMarkdown(input.content).map((p) => splitSentences(p).map(mk));
  const flat = [title, ...paragraphs.flat()];
  const unplaced: CheckFinding[] = [];
  for (const f of input.findings) {
    const i = locateClaim(f.claim, flat.map((s) => s.text));
    if (i >= 0) flat[i].findings.push(f);
    else unplaced.push(f);
  }
  const counts: Record<KeyStatus, number> = { missing: 0, loose: 0, db: 0, source: 0 };
  for (const s of flat) for (const k of s.keys) counts[k.status]++;
  return { title, paragraphs, unplaced, sourceLines, counts };
}
