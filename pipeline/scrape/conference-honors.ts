/**
 * Honours from CONFERENCE award releases → `athlete_events` → the profile table.
 *
 * Why a second source: the bio-page harvest (scrape-honors.ts) has read every
 * bio it can — 479 of 2,767 British profiles carry an honour, and the nightly
 * run finds one or two more (2026-10-06). Conferences publish what the bios
 * leave out: weekly awards, all-conference teams, honour rolls. A measurement on
 * five conferences (2026-10-06/07) found real athletic honours for about one in
 * ten athletes who had none.
 *
 * THE RULE IS LIST POSITION, NOT MENTION. A name in a conference story is not an
 * honour: previews, recaps, an opponent in someone else's Player of the Week
 * write-up, and "Other Nominees" all name our athletes. The measurement's raw
 * name-match was right about 2 times in 3. So a name counts only where a release
 * LISTS honourees — at the start of a short entry line ("Issy Baileff, Yale",
 * "Sept. 16: Darcy Moffat (FSC)", "Hugo Hewitt: 5,000m") or as an item in a
 * semicolon list ("Honor Roll: …; Olly Spicer, Dartmouth; …") — under a label
 * that names the award. Narrative sentences are never read for honours, except
 * one narrow case: the headline carries the athlete's surname and an award, and
 * the sentence names the athlete and the award together.
 *
 * Academic honours are OUT (Mikkel, 2026-10-06), and so are nominees, coaches,
 * forecasts and tournament teams: a label like that BLOCKS the list beneath it
 * until the next label. Weekly honour-roll mentions are IN (Mikkel, 2026-10-07).
 *
 * Pure functions; the fetching and writing live in scrape-conference-honors.ts.
 */
import { extractEvents, type Significance } from "../../src/lib/athlete-events";

// ── Text ─────────────────────────────────────────────────────────────────────

/** Lower case, accents off, everything but letters and digits to one space. */
export function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function decodeEntities(s: string): string {
  return s
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&rsquo;|&lsquo;/g, "'")
    .replace(/&ndash;/g, "–")
    .replace(/&mdash;/g, "—")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(parseInt(n, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z])(acute|grave|uml|circ|tilde|cedil|ring|slash);/gi, (_, c) => c)
    .replace(/&[a-z]+;/gi, " ");
}

/**
 * Just the story, without the site around it.
 *
 * Two Sidearm templates (2026-10-07): most put the body in
 * `.sidearm-story-template-text`, followed by a related-stories block; the
 * Sunshine State template wraps it in `<article>` instead. The page around it
 * is never read — its navigation carries award words and other athletes' names
 * (the SSC menu has an "Honor Roll" link).
 */
export function storyBody(html: string): string {
  const tpl = html.search(/class="[^"]*sidearm-story-template-text/);
  if (tpl >= 0) {
    return html.slice(tpl).split(/class="[^"]*sidearm-story-template-related|Related Stories/)[0];
  }
  const art = html.search(/<article[\s>]/i);
  if (art >= 0) {
    const end = html.indexOf("</article>", art);
    return html.slice(art, end >= 0 ? end : undefined);
  }
  return "";
}

/**
 * The story body as lines, one per block element or `<br>`. Table cells become
 * separate lines too (the all-conference tables put the name in its own cell).
 */
export function storyLines(html: string): string[] {
  let body = storyBody(html);
  body = body
    .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<br\s*\/?>|<\/(p|li|tr|td|th|h[1-6]|div|table|ul|ol)>/gi, "\n")
    .replace(/<[^>]+>/g, "");
  return decodeEntities(body)
    .split("\n")
    .map((l) => l.replace(/[\s ]+/g, " ").trim())
    .filter(Boolean);
}

// ── Labels ───────────────────────────────────────────────────────────────────

export interface Award {
  award_name: string;
  kind: string;
  significance: Significance;
}

/**
 * What a label stops. Academic honours (Mikkel, 2026-10-06), nominees (SSC lists
 * "Other Nominees" right under the winner), coaches, forecasts, tournament
 * teams, and the non-athletic awards.
 */
const BLOCK =
  /academic|scholar|commissioner|\bdean|honou?r society|\bgpa\b|nominee|watch ?list|pre-?season|\bcoach|\bstaff\b|sportsmanship|community|all-tournament|tournament team|postgraduate|elite (90|24|18)/i;

/** Within an all-conference list: "First Team", "Second Team", "Honorable Mention". */
const TIER = /^(first|second|third|1st|2nd|3rd|all)[- ]?team\b|^honou?rable mention\b/i;

/** Tokens after "All-" that are not a conference. */
const NOT_A_CONFERENCE =
  /^(time|access|star|stars|tournament|freshman|rookie|newcomer|america|american|academic|region|district|conference|east region|west region|south region|north region|around)\b/i;

/**
 * The award a label names, "block", or null when the text is not a label.
 *
 * Built on extractEvents() for the national honours (All-American, All-Region),
 * plus what conferences write that bios do not: the many "X of the Week" forms
 * (Crew, Golfer, Runner …), the honour roll, and "All-<abbreviation>" for every
 * conference — the shared pattern list knows only some abbreviations, and on a
 * conference's own site every "All-MEC" is that conference's team.
 */
export function classifyLabel(text: string): Award | "block" | null {
  const t = text.trim();
  if (!t) return null;
  if (BLOCK.test(t)) return "block";
  if (/\bhonou?r roll\b/i.test(t)) return { award_name: "Honor Roll", kind: "award", significance: "notable" };
  if (/\bcrew of the week\b/i.test(t)) return { award_name: "Crew of the Week", kind: "award", significance: "notable" };
  if (/\b(rookie|freshman|newcomer) of the (week|month)\b/i.test(t)) {
    return { award_name: "Rookie of the Week/Month", kind: "award", significance: "notable" };
  }
  if (/\bof the week\b|\bweekly (award|honou?r)s?\b/i.test(t)) {
    return { award_name: "Player of the Week", kind: "award", significance: "notable" };
  }
  if (/\b[a-z-]+ of the year\b/i.test(t)) {
    return { award_name: "Player of the Year", kind: "award", significance: "honor" };
  }
  if (/\ball[-\s](freshman|rookie|newcomer)\b/i.test(t)) {
    return { award_name: "All-Freshman", kind: "award", significance: "notable" };
  }
  // "All-American Conference" is the American Conference's team, not All-America.
  if (/\ball[-\s]american (athletic )?conference\b/i.test(t)) {
    return { award_name: "All-Conference", kind: "award", significance: "honor" };
  }
  const national = extractEvents(t).find((e) => e.kind === "award");
  if (national) return { award_name: national.award_name, kind: "award", significance: national.significance };
  const all = /\ball-([a-z0-9][a-z0-9 -]{0,20})/i.exec(t);
  if (all && !NOT_A_CONFERENCE.test(all[1])) {
    return { award_name: "All-Conference", kind: "award", significance: "honor" };
  }
  return null;
}

/** The honourable-mention tier of a season team keeps its own name. */
function honourableMention(base: Award | null): Award | null {
  if (!base) return null;
  if (!["All-Conference", "All-Region", "All-American"].includes(base.award_name)) return base;
  return { award_name: `${base.award_name} HM`, kind: "award", significance: "notable" };
}

// ── Sport ────────────────────────────────────────────────────────────────────

export interface SportSex {
  sport: string;
  gender: "m" | "f" | null;
}

const SPORT_WORDS: [RegExp, string][] = [
  [/\bfield hockey\b/i, "field-hockey"],
  [/\bice hockey\b|\bhockey\b/i, "ice-hockey"],
  [/\bbeach volleyball\b|\bvolleyball\b/i, "volleyball"],
  [/\bsoccer\b/i, "soccer"],
  [/\blacrosse\b/i, "lacrosse"],
  [/\browing\b|\bcrew\b/i, "rowing"],
  [/\bcross country\b|\btrack\b|\bxc\b/i, "track-and-field"],
  [/\bswimming\b|\bdiving\b|\bswim\b/i, "swimming-and-diving"],
  [/\bgolf\b/i, "golf"],
  [/\btennis\b/i, "tennis"],
  [/\bbasketball\b/i, "basketball"],
  [/\bsoftball\b/i, "softball"],
  [/\bbaseball\b/i, "baseball"],
  [/\bflag football\b/i, "flag-football"],
  [/\bfootball\b/i, "football"],
  [/\bgymnastics\b/i, "gymnastics"],
  [/\bwrestling\b/i, "wrestling"],
  [/\bwater polo\b/i, "water-polo"],
  [/\bfencing\b/i, "fencing"],
  [/\bsquash\b/i, "squash"],
  [/\brugby\b/i, "rugby"],
  [/\bbowling\b/i, "bowling"],
  [/\bsailing\b/i, "sailing"],
  [/\bskiing\b/i, "skiing"],
  [/\btriathlon\b/i, "triathlon"],
  [/\bacrobatics\b/i, "acrobatics-tumbling"],
];

/** The sport (and men's/women's) a heading or category names, or null. */
export function sportOf(text: string): SportSex | null {
  for (const [re, sport] of SPORT_WORDS) {
    if (re.test(text)) {
      const gender = /\bwomen'?s?\b|\bwomen[’']s\b|\bladies\b/i.test(text)
        ? "f"
        : /\bmen'?s?\b|\bmen[’']s\b/i.test(text)
          ? "m"
          : null;
      return { sport, gender };
    }
  }
  return null;
}

// ── Candidates ───────────────────────────────────────────────────────────────

export interface Candidate {
  id: number;
  name: string;
  sport: string;
  gender: string | null;
  /** Normalised school names the release may use ("princeton", "penn"). */
  schoolAliases: string[];
  /** The athlete's school is in the conference that published the story. */
  inConference: boolean;
}

/** Normalised full name → athletes. Single-word names are left out: "Hal" matches anyone. */
export function indexCandidates(cands: Candidate[]): Map<string, Candidate[]> {
  const idx = new Map<string, Candidate[]>();
  for (const c of cands) {
    const key = norm(c.name);
    if (key.split(" ").length < 2) continue;
    const list = idx.get(key);
    if (list) list.push(c);
    else idx.set(key, [c]);
  }
  return idx;
}

/** Names the school by in a release: full name, common name, and the name without "University of". */
export function schoolAliases(name: string, commonName: string | null): string[] {
  const out = new Set<string>();
  for (const s of [name, commonName ?? ""]) {
    const n = norm(s);
    if (n.length >= 4) out.add(n);
    const core = norm(s.replace(/\b(the|university|college|of|at|in the city of new york)\b/gi, " "));
    if (core.length >= 4) out.add(core);
  }
  return [...out];
}

// ── Extraction ───────────────────────────────────────────────────────────────

export interface StoryMeta {
  url: string;
  headline: string;
  /** ISO date the story was posted. */
  date: string;
  /** Sidearm's sport category for the story ("Men's Soccer", "General"), or null. */
  category: string | null;
}

export interface FoundHonour extends Award {
  athleteId: number;
  occurred_on: string;
  source_url: string;
  /** The line it came from — for the log and for review, never stored. */
  evidence: string;
}

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

/** "Sept. 16 –", "9/15:", "Feb. 24 -" at the start of an entry line. */
const DATE_PREFIX =
  /^(?:(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+(\d{1,2})|(\d{1,2})\/(\d{1,2}))\s*[:–—-]\s*/i;

/** The year comes from the story: a December list read in January is last year's December. */
function dateFrom(m: RegExpExecArray, storyIso: string): string {
  const month = m[1] ? MONTHS[m[1].slice(0, 3).toLowerCase()] : parseInt(m[3], 10);
  const day = parseInt(m[2] ?? m[4], 10);
  const sy = parseInt(storyIso.slice(0, 4), 10);
  const sm = parseInt(storyIso.slice(5, 7), 10);
  const year = month > sm + 1 ? sy - 1 : sy;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** A role before the name that is not itself a label: "Offense:", "Defensive:", "Special Teams:". */
const ROLE_PREFIX = /^(offen[cs]e|offensive|defen[cs]e|defensive|special teams|men|women|men's|women's|singles|doubles|field|track|goalkeeper|specialist|coxswain|cox)\s*:\s*/i;

/** What may follow a name in an entry: a separator, or nothing. */
const AFTER_NAME = /^\s*($|[,/(:*‡†;&–—-]|\band\b)/;

/** Narrative, not a list: long and without semicolons. */
function isNarrative(line: string): boolean {
  const words = line.split(/\s+/).length;
  const semis = (line.match(/;/g) ?? []).length;
  return words > 30 && semis < 2;
}

/** A regex for the name at the very start of `s`, tolerant of accents and punctuation between parts. */
function nameAtStart(s: string, name: string): RegExpExecArray | null {
  const parts = norm(name).split(" ").map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const plain = s.normalize("NFD").replace(/[̀-ͯ]/g, "");
  const re = new RegExp(`^[^A-Za-z0-9]*${parts.join("[^A-Za-z0-9]+")}(?![A-Za-z0-9])`, "i");
  return re.exec(plain);
}

/** The first 2-5 words of an item, as lookup keys into the name index (longest first). */
function prefixKeys(item: string): string[] {
  const toks = norm(item).split(" ").filter(Boolean);
  const keys: string[] = [];
  for (let n = Math.min(5, toks.length); n >= 2; n--) keys.push(toks.slice(0, n).join(" "));
  return keys;
}

function sportFits(c: Candidate, s: SportSex | null): boolean | null {
  if (!s) return null; // unknown
  if (s.sport !== c.sport) return false;
  if (s.gender && c.gender && s.gender !== c.gender) return false;
  return true;
}

function mentionsSchool(c: Candidate, normLine: string): boolean {
  const padded = ` ${normLine} `;
  return c.schoolAliases.some((a) => padded.includes(` ${a} `));
}

/**
 * Pick the one athlete an entry is about, or none.
 *
 * Sport must agree when the story says which sport it is. The school must be on
 * the line — or, when the line does not name it (many releases use "FSC",
 * "ERAU"), the athlete's school must belong to the conference that published
 * the story. Two athletes with the same name need the school to tell them apart.
 */
function choose(cands: Candidate[], sport: SportSex | null, normLine: string): Candidate | null {
  // One athlete can be indexed under two spellings (name and roster name).
  const unique = [...new Map(cands.map((c) => [c.id, c])).values()];
  const fit = unique.filter((c) => sportFits(c, sport) !== false);
  const named = fit.filter((c) => mentionsSchool(c, normLine));
  if (named.length === 1) return named[0];
  if (named.length > 1) return null;
  if (fit.length !== 1) return null;
  const c = fit[0];
  return c.inConference ? c : null;
}

/**
 * Every honour the release gives an athlete we follow.
 *
 * Walks the lines once, keeping the current sport (from headings) and the
 * current label (from label lines; a sport heading resets it to the headline's
 * award). Entry lines are split into items and each item is checked for a known
 * name at its start.
 */
export function extractConferenceHonours(
  meta: StoryMeta,
  lines: string[],
  index: Map<string, Candidate[]>,
): FoundHonour[] {
  const storyAward = headlineAward(meta.headline);
  if (storyAward === "skip") return [];
  const storySport = sportOf(meta.headline) ?? (meta.category ? sportOf(meta.category) : null);

  const found: FoundHonour[] = [];
  const seen = new Set<string>();
  const add = (c: Candidate, award: Award, occurred: string, evidence: string) => {
    const key = `${c.id}|${award.award_name}|${occurred}`;
    if (seen.has(key)) return;
    seen.add(key);
    found.push({ ...award, athleteId: c.id, occurred_on: occurred, source_url: meta.url, evidence });
  };

  let sport = storySport;
  let label: Award | "block" | null = storyAward;

  for (const raw of lines) {
    const line = raw.trim();
    const words = line.split(/\s+/).length;

    // A short line naming a sport is a section heading.
    const lineSport = words <= 12 ? sportOf(line) : null;
    if (lineSport && words <= 6 && !line.includes(":") && classifyLabel(line) === null) {
      sport = lineSport.gender || !storySport ? lineSport : { ...lineSport, gender: storySport.gender };
      label = storyAward;
      continue;
    }

    if (isNarrative(line)) {
      // Narrative is not read for honours — but an academic paragraph tells us
      // the list after it is academic.
      if (BLOCK.test(line) && /academic|scholar/i.test(line)) label = "block";
      continue;
    }

    // Tier lines inside a season team.
    if (TIER.test(line) && words <= 6) {
      label = /^honou?rable/i.test(line) ? honourableMention(storyAward) : storyAward;
      continue;
    }

    // Label lines: "Honor Roll:", "SSC OFFENSIVE PLAYER OF THE WEEK".
    let rest = line;
    let inline: Award | "block" | null = null;
    const colon = line.indexOf(":");
    if (colon > 0 && colon <= 80) {
      const head = line.slice(0, colon);
      const cls = classifyLabel(head);
      if (cls !== null) {
        inline = cls;
        rest = line.slice(colon + 1).trim();
        if (!rest) {
          label = cls;
          if (lineSport) sport = lineSport;
          continue;
        }
      }
    }
    if (inline === null && words <= 12 && classifyLabel(line) !== null && !nameLike(line, index)) {
      label = classifyLabel(line);
      if (lineSport) sport = lineSport;
      continue;
    }

    const award = inline ?? label;
    if (!award || award === "block") continue;

    // Entry line: optional date, optional role, then items.
    let occurred = meta.date.slice(0, 10);
    const d = DATE_PREFIX.exec(rest);
    if (d) {
      occurred = dateFrom(d, meta.date);
      rest = rest.slice(d[0].length);
    }
    rest = rest.replace(ROLE_PREFIX, "");

    const items = rest.split(/;|\s&\s|\s+and\s+/);
    const normLine = norm(line);
    for (const item of items) {
      for (const key of prefixKeys(item)) {
        const cands = index.get(key);
        if (!cands) continue;
        const m = nameAtStart(item, cands[0].name);
        if (!m || !AFTER_NAME.test(item.normalize("NFD").replace(/[̀-ͯ]/g, "").slice(m[0].length))) break;
        const c = choose(cands, sport, normLine);
        if (c) add(c, award, occurred, line);
        break;
      }
    }
  }

  // Narrow narrative case: the headline names the athlete's surname and an award,
  // and one sentence names the athlete with the award ("Emily Barrett and Jemimah
  // Choi became Tiffin University's first-ever ITA women's tennis All Americans").
  if (storyAward) {
    const headWords = new Set(norm(meta.headline).split(" "));
    const named = [...index].filter(([key]) => headWords.has(key.split(" ").pop()!));
    if (named.length > 0) {
      for (const line of lines) {
        const cls = classifyLabel(line);
        if (cls === null || cls === "block") continue;
        const normLine = ` ${norm(line)} `;
        for (const [key, cands] of named) {
          if (!normLine.includes(` ${key} `)) continue;
          const c = choose(cands, storySport, normLine);
          if (c) add(c, storyAward, meta.date.slice(0, 10), line);
        }
      }
    }
  }

  return found;
}

/**
 * The award a headline announces, null for none, "skip" for a story that is
 * academic or a forecast. A coaching award beside a team ("Lightweight Men's
 * Rowing All-Ivy, Coaching Staff of the Year Announced") does not block the team.
 */
export function headlineAward(headline: string): Award | null | "skip" {
  if (/academic|scholar|pre-?season|watch ?list|nominee/i.test(headline)) return "skip";
  const cleaned = headline.replace(/,?\s*(coach(ing)?( staff)?|staff)( and staff)? of the (year|week)/gi, " ");
  const cls = classifyLabel(cleaned);
  return cls === "block" ? null : cls;
}

/** A short line that starts with a known name is an entry, even if it contains award words. */
function nameLike(line: string, index: Map<string, Candidate[]>): boolean {
  const stripped = line.replace(DATE_PREFIX, "").replace(ROLE_PREFIX, "");
  return prefixKeys(stripped).some((k) => index.has(k));
}
