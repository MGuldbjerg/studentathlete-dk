/**
 * Deterministic check of an LLM fact sheet against its own source.
 * =================================================================
 *
 * The fact sheet is the ONLY thing the writer may use, so a wrong fact on it is
 * a wrong fact in the article — and no later step can tell, because the draft
 * faithfully follows its sheet. Measured on the 20 British drafts of
 * 23-09-2026: the sheet itself was wrong in at least six of them —
 *
 *   · a number the source never states     "outshot Rider 11-1"  (source: 11-9)
 *   · a sequence the source never states    doubles "6-2, 6-0"    (source: 6-2)
 *   · a date the model worked out itself   "vs NC State on 2026-09-17" (source: "last Tuesday")
 *   · a stat credited to the wrong person  Mujica "assisted" a goal Maragos assisted
 *
 * This module only REMOVES. It never adds or rewrites a fact — a check that
 * repairs text would be one more place to invent it. What it removes is kept
 * in `unverified` on the sheet, so /admin and the fix pack can show it.
 *
 * Three rules, all mechanical, no LLM:
 *
 *   1. GROUNDING — every score, record, clock time and score sequence in a fact
 *      must appear in the source. Plain numbers must appear as a number.
 *   2. DATES — a date on the sheet must be written in the source in some form.
 *      A date the model derived from "Tuesday" is dropped, never guessed.
 *   3. ATTRIBUTION — a number in `stats` credited to the athlete must be stated
 *      about the athlete somewhere in the source (sentence-level, see
 *      numberIsAthletes).
 *
 * Where it cannot decide (qualitative text without numbers, quotes), it keeps
 * the fact: this is a net for the error classes above, not a second model.
 */
import type { FactSheet } from "./build-factsheet";

export interface UnverifiedFact {
  field: "event.date" | "result.final_score" | "stats" | "qualitative" | "other_facts";
  text: string;
  reason: string;
}

type Fact = { text: string; source: "prose" | "boxscore" };

// ─── Canonical text ─────────────────────────────────────────────────────────

const NUMBER_WORDS: Record<string, number> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9,
  ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16,
  seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20, twice: 2, thrice: 3, brace: 2,
  first: 1, second: 2, third: 3, fourth: 4, fifth: 5, sixth: 6, seventh: 7, eighth: 8,
  ninth: 9, tenth: 10, eleventh: 11, twelfth: 12, thirteenth: 13, fourteenth: 14,
  fifteenth: 15, sixteenth: 16, seventeenth: 17, eighteenth: 18, nineteenth: 19, twentieth: 20,
};
/**
 * Ordinals in a FACT are not checked: "the second set", "his first goal" are
 * mostly the model's own ordering of events the source lists, and dropping
 * them cost true facts. In the SOURCE they still become digits, so a fact that
 * writes "3rd" matches a source that writes "third".
 */
const ORDINAL_WORDS = new Set(["first", "second", "third", "fourth", "fifth", "sixth", "seventh", "eighth",
  "ninth", "tenth", "eleventh", "twelfth", "thirteenth", "fourteenth", "fifteenth", "sixteenth",
  "seventeenth", "eighteenth", "nineteenth", "twentieth"]);
const NUMBER_WORD_RE = new RegExp(`\\b(${Object.keys(NUMBER_WORDS).join("|")})\\b`, "g");

/**
 * Lower-case, one dash, digits for number words, no ordinal suffixes, no
 * spaces inside a score. Source and fact go through the same function, so
 * "four saves" matches "4 saves" and "6 - 2" matches "6-2".
 */
export function canon(text: string, ordinalWords = true): string {
  return text
    .toLowerCase()
    .replace(/[\u00a0\u2009\u202f]/g, " ")
    .replace(/[\u2010-\u2015\u2212]/g, "-")
    .replace(NUMBER_WORD_RE, (w) => (ordinalWords || !ORDINAL_WORDS.has(w) ? String(NUMBER_WORDS[w]) : w))
    .replace(/\b(\d+)(st|nd|rd|th)\b/g, "$1")
    .replace(/(\d),(\d{3})(?!\d)/g, "$1$2") // 1,500 → 1500
    .replace(/(?<![\d.])0\.(\d)/g, ".$1") // 0.57 → .57 (sources write both)
    .replace(/(\d)\s*-\s*(\d)/g, "$1-$2")
    .replace(/(\d+-\d+),? and (\d+-\d)/g, "$1, $2") // "6-2 and 6-3" is the sequence "6-2, 6-3"
    .replace(/(\d)\s*,\s*(\d+-\d)/g, "$1, $2")
    .replace(/\s+/g, " ");
}

// ─── Dates ──────────────────────────────────────────────────────────────────

const MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august",
  "september", "october", "november", "december"];
const MONTH_ABBR = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

/** Month (1-12) and day of a date string the model wrote, or null. */
export function parseMonthDay(dateText: string): { m: number; d: number } | null {
  const t = dateText.trim().toLowerCase();
  let r = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(t);
  if (r) return { m: +r[2], d: +r[3] };
  r = /^(\d{1,2})[/.](\d{1,2})(?:[/.](\d{2,4}))?$/.exec(t);
  if (r) return { m: +r[1], d: +r[2] }; // US order: the sources are American
  r = /\b([a-z]{3,9})\.?\s+(\d{1,2})\b/.exec(t);
  if (r) {
    const mi = MONTH_ABBR.indexOf(r[1].slice(0, 3));
    if (mi >= 0) return { m: mi + 1, d: +r[2] };
  }
  r = /\b(\d{1,2})\s+([a-z]{3,9})\b/.exec(t);
  if (r) {
    const mi = MONTH_ABBR.indexOf(r[2].slice(0, 3));
    if (mi >= 0) return { m: mi + 1, d: +r[1] };
  }
  return null;
}

/** Is this month/day written in the source, in any of the forms sources use? */
export function dateInSource(md: { m: number; d: number }, canonSource: string): boolean {
  const { m, d } = md;
  const mm = String(m).padStart(2, "0");
  const dd = String(d).padStart(2, "0");
  const names = [MONTHS[m - 1], MONTH_ABBR[m - 1], m === 9 ? "sept" : null].filter(Boolean) as string[];
  const patterns = [
    ...names.map((n) => `\\b${n}\\.?\\s+0?${d}(?!\\d)`), // Sept. 17 / September 17 (and "September 15Diallo")
    ...names.map((n) => `\\b0?${d}\\s+${n}\\b`), // 17 September
    `(?<!\\d)0?${m}[/.]0?${d}(?!\\d)`, // 9/17, 09.17.26, "honors09/21/2026"
    `${mm}/${dd}/\\d{4}`, // "2-009/04/2026": a full date glued to a score
    `\\d{4}-${mm}-${dd}(?!\\d)`, // 2026-09-17
  ];
  return patterns.some((p) => new RegExp(p).test(canonSource));
}

const MONTH_WORD =
  "(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sept?(?:ember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)";
// Month words must be whole words: "2 decision" and "1 margin" are not dates.
const DATE_IN_FACT_RE = new RegExp(
  `\\b\\d{4}-\\d{1,2}-\\d{1,2}\\b|\\b\\d{1,2}\\/\\d{1,2}(?:\\/\\d{2,4})?\\b|\\b${MONTH_WORD}\\.?\\s+\\d{1,2}(?!\\d)|\\b\\d{1,2}\\s+${MONTH_WORD}\\b`,
  "g",
);

// ─── Numbers ────────────────────────────────────────────────────────────────

/** Escape for RegExp. */
function esc(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Positions where `token` occurs as a whole number in `hay`.
 *
 * A composite ("6-0", "18:32.0") must stand alone — "6-0" is not in the record
 * "6-0-1". A plain number may be part of a score or range: the fact "Radford
 * had 11 shots" is stated by "an 11-8 edge in total shots", and a golf round
 * "69" by "67-69-72". It may not be part of a longer number or decimal.
 */
function occursAsNumber(hay: string, token: string): number[] {
  const composite = /[-:]/.test(token);
  const re = composite
    ? new RegExp(`(?<!\\d)(?<!\\d[.:,-])${esc(token)}(?!\\d|[.:-]\\d)`, "g")
    : new RegExp(`(?<![\\d.])(?<!\\d[.:])${esc(token)}(?!\\d|[.:]\\d)`, "g");
  const at: number[] = [];
  for (let m = re.exec(hay); m; m = re.exec(hay)) at.push(m.index);
  return at;
}

/** Does a plain number occur on its own, not as part of a score/range/record? */
function standsAlone(hay: string, token: string): boolean {
  return new RegExp(`(?<![\\d.])(?<!\\d[.:-])${esc(token)}(?!\\d|[.:-]\\d)`).test(hay);
}

interface NumberTokens {
  sequences: string[]; // "6-2, 6-0"
  composites: string[]; // "11-9", "62:48", "1-0-0"
  plain: string[]; // "4", "2.5"
}

/** Numbers a (canonical) fact states, most specific first. Dates are removed first. */
export function numberTokens(canonFact: string): NumberTokens {
  // Dates, season ranges ("2026-27") and bare years are not stats.
  let rest = canonFact
    .replace(DATE_IN_FACT_RE, " ")
    .replace(/\b(19|20)\d{2}-(\d{2}|\d{4})\b/g, " ")
    .replace(/\b(19|20)\d{2}\b/g, " ");
  const sequences = rest.match(/\d+-\d+(?:-\d+)?(?:, \d+-\d+(?:-\d+)?)+/g) ?? [];
  // Clock/race times are one token with all their parts: "18:32.0", "1:16:08.06".
  const COMPOSITE = /\d+-\d+(?:-\d+)?|\d+(?::\d{2})+(?:\.\d+)?/g;
  const composites = rest.match(COMPOSITE) ?? [];
  rest = rest.replace(COMPOSITE, " ");
  // A bare 1 is skipped: sources write "an assist", and a 1 occurs everywhere.
  const plain = (rest.match(/\.\d+|\d+(?:\.\d+)?/g) ?? []).filter((n) => n !== "1");
  return { sequences, composites, plain };
}

/** A two-part score may be written from either side ("1-0" / "0-1"). Records with three parts may not. */
function compositeVariants(c: string): string[] {
  const p = c.split("-");
  return p.length === 2 ? [c, `${p[1]}-${p[0]}`] : [c];
}

// ─── Attribution ────────────────────────────────────────────────────────────

/** Words that start a fact about the athlete without naming them ("Scored…", "Recorded…"). */
const IMPLICIT_SUBJECT = /^(\d|[a-z]+ed\b|made\b|won\b|had\b|went\b|set\b|led\b|took\b|shot\b|scored\b|ran\b|hit\b|threw\b|finished\b|posted\b|played\b|tied\b|earned\b|recorded\b|assisted\b|named\b|placed\b|carded\b|swam\b|kept\b|got\b)/i;

/** Who a fact is about: the athlete, or someone/something else. */
export function factSubject(text: string, surnames: string[]): "athlete" | "other" {
  const t = text.trim();
  const lower = t.toLowerCase();
  if (surnames.some((s) => hasWord(lower, s))) return "athlete";
  if (IMPLICIT_SUBJECT.test(t) || /^(her|his|she|he)\b/i.test(t)) return "athlete";
  return "other";
}

/** Name parts that identify the athlete in running text. */
export function surnamesOf(athleteName: string): string[] {
  const parts = athleteName.toLowerCase().trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2) return parts;
  const last = parts[parts.length - 1];
  // "Worsfold-Gregg" is also written "Worsfold"; recaps also say "Luca" for
  // Luca Rosen («1 goal or 2 assists will see Luca stand alone»).
  const first = parts[0].length > 2 ? [parts[0]] : [];
  return [...new Set([last, ...last.split("-").filter((p) => p.length > 2), ...first])];
}

function hasWord(hay: string, word: string): boolean {
  return new RegExp(`(?<![a-z])${esc(word)}(?![a-z])`).test(hay);
}

/** Capitalised words in a fact — the people and teams it mentions besides the athlete. */
function namesIn(text: string, surnames: string[]): string[] {
  return (text.match(/\b[A-Z][a-zA-Z'’-]{2,}\b/g) ?? [])
    .map((w) => w.toLowerCase().replace(/['’]s$/, ""))
    .filter((w) => !surnames.includes(w));
}

/**
 * Capitalised words that open a sentence without being its subject's NAME.
 * «The London, England, native registered an 11-7 record» is about the
 * athlete; «Johnson collected three assists» is not.
 */
const NOT_A_NAME = new Set(("the a an she he her his it its they their this that these those in on at after " +
  "before with during for from following through over under since against as by of to when while also and " +
  "but both each all senior junior sophomore freshman graduate redshirt first-year fifth-year no head coach " +
  "monday tuesday wednesday thursday friday saturday sunday january february march april may june july " +
  "august september october november december game match final round day week season").split(" "));

/** The person a sentence opens with, lower-cased, or null when it opens with no name. */
export function sentenceSubject(orig: string): string[] | null {
  const t = orig.replace(/^[\s•·*\-–—"“]+/, "");
  // «The Denmark native finished 113th» — a name never takes "the".
  if (/^(the|a|an|this|that)\s/i.test(t)) return null;
  const lead = /^((?:[A-Z][\w'’.-]*\s+){1,4})[a-z]/.exec(t + " x");
  if (!lead) return null;
  const words = lead[1].trim().split(/\s+/).map((w) => w.toLowerCase().replace(/['’]s$|[.,]$/g, ""));
  const names = words.filter((w) => !NOT_A_NAME.has(w));
  return names.length ? names : null;
}

/** How far above a verb-first list line the athlete's name may stand. */
const LIST_LOOKBACK = 8;

const PERSON_TIE = /\b(she|he|her|his|him|native|freshman|sophomore|junior|senior|graduate|first-year|goalkeeper|keeper|forward|midfielder|defender|back|setter|libero|runner|golfer)\b/;

/** Below this length a "sentence" is a table cell; the lines above it are its context. */
const CELL = 40;
const CELL_CONTEXT = 4;
/** Lines below a cell: a scoring summary puts the time first and the scorer on the next line. */
const CELL_BELOW = 2;

interface Sentence { orig: string; canon: string }

/** The source prepared once per sheet: canonical text plus its sentences. */
export interface PreparedSource { canon: string; sentences: Sentence[] }

export function prepareSource(source: string): PreparedSource {
  // Split the ORIGINAL text — the subject rule needs capitals — and canonicalise
  // each piece. Only a stop followed by whitespace and a non-digit ends a
  // sentence, so "No. 23 UNCW" and "5.70" stay whole. (A regex loop that
  // matched sentences instead stopped at the first "No. 23" — measured.)
  const sentences: Sentence[] = source
    .split(/(?<=[.!?])\s+(?=[^\d\s])|\n+/)
    .map((orig) => orig.trim())
    .filter(Boolean)
    .map((orig) => ({ orig, canon: canon(orig) }));
  return { canon: canon(source), sentences };
}

/**
 * Is `token` stated about the athlete in any sentence that contains it?
 *
 * A sentence supports the athlete when it names them, or when it opens with no
 * name at all («The London native registered an 11-7 record», «The 67 was his
 * 12th round in the 60s»), or when it opens with someone the FACT names
 * (Pickard's 89th-minute goal, which Whitaker assisted). It does NOT when it
 * opens with somebody else — «Johnson collected three assists and has five on
 * the season», the sentence the «Joss has five assists» fact came from.
 *
 * Table cells have no sentence; the lines around them are the context, so
 * «62:48 / Kyndra Obermeyer / Assisted By: Olivia Maragos» is not Mujica's,
 * while «57:50 / Harry McLean (3)» is McLean's.
 */
function statedAboutAthlete(src: PreparedSource, token: string, surnames: string[], factNames: string[]): boolean {
  const names = (t: string) => surnames.some((n) => hasWord(t, n));
  return src.sentences.some((s, i) => {
    const variants = /^\d+-\d+$/.test(token) ? compositeVariants(token) : [token];
    if (!variants.some((v) => occursAsNumber(s.canon, v).length)) return false;
    if (names(s.canon)) return true;
    // A plain number found only INSIDE a score or record ("improve to 5-3")
    // is not a stat of anyone unnamed — only a sentence naming the athlete
    // may lend it to them. This is what let «Joss has five assists» through.
    if (!/[-:]/.test(token) && !standsAlone(s.canon, token)) return false;
    // A table cell is short AND unpunctuated; «She beat Gwen Gray 6-4, 6-2.» is prose.
    if (s.orig.length < CELL && !/[.!?]$/.test(s.orig)) {
      const ctx = src.sentences.slice(Math.max(0, i - CELL_CONTEXT), i + 1 + CELL_BELOW).map((x) => x.canon).join(" ");
      return names(ctx);
    }
    const subject = sentenceSubject(s.orig);
    // No name opens the sentence. It is the athlete's only if something ties it
    // to a person — a pronoun or a role word («the Denmark native», «the 67 was
    // his 12th round») — or it carries on from a sentence naming them. «The
    // Black and Gold doubled their lead… five minutes into the quarter» is not.
    if (!subject) {
      if (PERSON_TIE.test(s.canon)) return true;
      // «The Black and Gold doubled their lead…» opens with a team: it does not
      // carry on the previous sentence's person, whoever that was.
      if (/^(?:[Tt]he|[Aa]n?)\s+[A-Z]/.test(s.orig.replace(/^[\s•·*\-–—"“]+/, ""))) return false;
      if (i > 0 && names(src.sentences[i - 1].canon)) return true;
      // An award list under the athlete's name: «- Made 11 saves against
      // Augustana on Sunday». A line that opens with a verb has no other subject.
      const line = s.orig.replace(/^[\s•·*\-–—]+/, "");
      if (IMPLICIT_SUBJECT.test(line) && !/^\d/.test(line)) {
        const above = src.sentences.slice(Math.max(0, i - LIST_LOOKBACK), i).map((x) => x.canon).join(" ");
        return names(above);
      }
      return false;
    }
    return subject.some((w) => factNames.includes(w));
  });
}

// ─── One fact ───────────────────────────────────────────────────────────────

/** Why this fact cannot be trusted, or null when it passes. */
export function checkFact(text: string, src: PreparedSource, surnames: string[], attribute = true): string | null {
  const f = canon(text, false);

  for (const d of f.match(DATE_IN_FACT_RE) ?? []) {
    const md = parseMonthDay(d);
    if (md && !dateInSource(md, src.canon)) return `date «${d}» is not written in the source`;
  }

  const { sequences, composites, plain } = numberTokens(f);
  for (const seq of sequences) {
    if (!src.canon.includes(seq)) return `sequence «${seq}» does not appear in the source`;
  }
  const positions: Array<[string, number[]]> = [];
  for (const c of composites) {
    const at = compositeVariants(c).flatMap((v) => occursAsNumber(src.canon, v));
    if (!at.length) return `«${c}» does not appear in the source`;
    positions.push([c, at]);
  }
  for (const n of plain) {
    const at = occursAsNumber(src.canon, n);
    if (!at.length) return `the number ${n} does not appear in the source`;
    positions.push([n, at]);
  }

  // Attribution: only for facts about the athlete that carry a number. The
  // most specific number identifies the event — a stray "2" is near every name.
  if (attribute && positions.length && factSubject(text, surnames) === "athlete") {
    const anchor = [...positions].sort((a, b) => a[1].length - b[1].length)[0][0];
    if (!statedAboutAthlete(src, anchor, surnames, namesIn(text, surnames)))
      return "the number is only stated about someone else";
  }
  return null;
}

/**
 * A box score writes the final as two columns, not "1-0": «winner florida tech
 * … 1 final sep. 19, 2026 0 saint leo». Accept the score when both numbers
 * stand within a short distance of "final".
 */
function scoreInTable(score: string, canonSource: string): boolean {
  const [a, b] = score.split("-");
  if (b === undefined) return false;
  const re = /final/g;
  for (let m = re.exec(canonSource); m; m = re.exec(canonSource)) {
    const win = canonSource.slice(Math.max(0, m.index - 120), m.index + 120);
    if (occursAsNumber(win, a).length && occursAsNumber(win, b).length) return true;
  }
  return false;
}

// ─── The sheet ──────────────────────────────────────────────────────────────

/**
 * Verify a fact sheet against the text the model read.
 *
 * `boxscore`-sourced facts are checked against `boxScoreText` when given and
 * kept untouched otherwise — they came from a different page than `source`.
 */
export function verifyFactSheet(
  fs: FactSheet,
  source: string,
  athleteName: string,
  boxScoreText?: string,
): { factSheet: FactSheet; unverified: UnverifiedFact[] } {
  const prose = prepareSource(source);
  const box = boxScoreText ? prepareSource(boxScoreText) : null;
  const surnames = surnamesOf(athleteName);
  const unverified: UnverifiedFact[] = [];

  const keep = (field: UnverifiedFact["field"], list: Fact[]): Fact[] =>
    list.filter((fact) => {
      const src = fact.source === "boxscore" ? box : prose;
      if (src === null) return true;
      // Attribution only for `stats` — that is where the athlete's own numbers
      // live, and where both misattributions were. A qualitative line like
      // "Joss, Johnson and Funes teamed up for Funes' second goal" is true
      // and names its own subject.
      const why = checkFact(fact.text ?? "", src, surnames, field === "stats");
      if (why) unverified.push({ field, text: fact.text, reason: why });
      return !why;
    });

  let event = fs.event;
  if (event?.date) {
    const md = parseMonthDay(String(event.date));
    if (md && !dateInSource(md, prose.canon)) {
      unverified.push({ field: "event.date", text: String(event.date), reason: "the date is not written in the source" });
      event = { ...event, date: null };
    }
  }

  let result = fs.result;
  if (result?.final_score) {
    const { composites, plain } = numberTokens(canon(String(result.final_score)));
    const grounded = composites.length
      ? composites.some((c) => compositeVariants(c).some((v) => occursAsNumber(prose.canon, v).length)) ||
        composites.some((c) => scoreInTable(c, prose.canon))
      : plain.every((n) => occursAsNumber(prose.canon, n).length);
    if (!grounded) {
      unverified.push({ field: "result.final_score", text: String(result.final_score), reason: "the score does not appear in the source" });
      result = { ...result, final_score: null };
    }
  }

  const factSheet: FactSheet = {
    ...fs,
    event,
    result,
    stats: keep("stats", fs.stats),
    qualitative: keep("qualitative", fs.qualitative),
    other_facts: keep("other_facts", fs.other_facts),
  };
  return { factSheet, unverified };
}
