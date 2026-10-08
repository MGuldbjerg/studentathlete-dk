/**
 * Text-only reels: which frames, and what each frame looks like (PLAN-reels.md).
 * ===========================================================================
 *
 * NO NEW TEXT. Every word on screen is either already published (the article
 * title, the athlete's name and hometown) or one of the dated, sourced lines
 * `records.ts` and the stats steps put on the fact sheet. The lines are parsed
 * back with regexes that match their exact wording — we wrote that wording, so
 * a line that doesn't match is dropped, never guessed at.
 *
 * Pure functions: parsing, frame choice, durations and the satori element tree.
 * Rendering and ffmpeg live in make-reel.ts.
 */
import { sportLabel } from "../../src/lib/i18n";
import { localizedEventDate } from "../../src/lib/og-card";

export const REEL_WIDTH = 1080;
export const REEL_HEIGHT = 1920;

const NAVY = "#00205B";
const RED = "#BF0A30";
const MUTED = "#C9CEDB";

export interface Frame {
  kind: "hook" | "headline" | "season" | "ranking" | "roster" | "earlier" | "end";
  kicker: string;
  big: string;
  line: string | null;
  foot: string | null;
  /** «earlier» only: our earlier headlines, with their event dates. */
  items?: Array<{ date: string | null; title: string }>;
}

export interface ReelInput {
  name: string;
  gender: string | null;
  hometown: string | null;
  university: string | null;
  sport: string | null;
  title: string;
  brand: string;
  /** The fact sheet's `records` lines, as stored. */
  records: string[];
}

/** The records lines say «soccer» (NCAA wording); the UK site says football. */
export const british = (text: string) => text.replace(/\bsoccer\b/g, "football");

// ─── The records lines, parsed back ─────────────────────────────────────────

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** «Chowan University's season statistics (stats page, 8 October 2026): X has …» */
const SEASON_RE = /^(.+?)'s season statistics \(stats page, ([^)]+)\): .+? has (.+)$/;
const OUTFIELD_RE = /^(\d+) goals? and (\d+) assists? in (\d+) games?(?: — (.+))?$/;
const KEEPER_RE = /^(\d+) games? in goal(.*)$/;

export function seasonFrame(line: string): Frame | null {
  const m = SEASON_RE.exec(line);
  if (!m) return null;
  const [, school, date, rest] = m;
  const foot = `${school} stats page · ${date}`;

  const o = OUTFIELD_RE.exec(rest);
  if (o) {
    const [g, a, n] = [Number(o[1]), Number(o[2]), Number(o[3])];
    const lead = o[4] ? ` — ${o[4]}` : "";
    if (g > 0) {
      return { kind: "season", kicker: "Season so far", big: plural(g, "goal", "goals"),
        line: `${plural(a, "assist", "assists")} in ${plural(n, "game", "games")}${lead}`, foot };
    }
    if (a > 0) {
      return { kind: "season", kicker: "Season so far", big: plural(a, "assist", "assists"),
        line: `in ${plural(n, "game", "games")}`, foot };
    }
    return null; // nothing to show: no goals, no assists
  }

  const k = KEEPER_RE.exec(rest);
  if (k) {
    const games = Number(k[1]);
    const parts = k[2].split(",").map((p) => p.trim()).filter(Boolean);
    const shutouts = parts.find((p) => /^\d+ shutouts?$/.test(p));
    const saves = parts.find((p) => /^\d+ saves?$/.test(p));
    const big = shutouts ?? saves;
    if (!big) return null;
    const others = parts.filter((p) => p !== big);
    return { kind: "season", kicker: "Season so far", big,
      line: [`${plural(games, "game", "games")} in goal`, ...others].join(", "), foot };
  }
  return null;
}

/** «NCAA statistics through games of 6 October 2026: Chowan rank tied for 1st in Division II men's soccer for goals per game (3.64, 11 games)» */
const RANKING_RE =
  /^NCAA statistics through games of ([^:]+): (.+?) rank (tied for )?(\d+(?:st|nd|rd|th)) in Division (I{1,3}) (.+?) for (.+?) \(([^,)]+)(?:, \d+ games)?\)$/;

export function rankingFrame(line: string): Frame | null {
  const m = RANKING_RE.exec(line);
  if (!m) return null;
  const [, date, team, tied, ord, div, sport, stat, value] = m;
  return {
    kind: "ranking",
    kicker: `The team · ${team}`,
    big: tied ? `Joint ${ord}` : ord,
    line: british(`in Division ${div} ${sport} for ${stat} (${value})`),
    foot: `NCAA statistics through ${date}`,
  };
}

/** «X is one of 4 British players on Chowan University's women's soccer roster (as of 7 October 2026)» */
const ROSTER_RE = /^.+? is one of (\d+) (\w+) players on (.+?)'s (.+?) roster \(as of ([^)]+)\)$/;

export function rosterFrame(line: string): Frame | null {
  const m = ROSTER_RE.exec(line);
  if (!m) return null;
  const [, n, nat, school, label, date] = m;
  return {
    kind: "roster",
    kicker: "On the roster",
    big: `1 of ${n}`,
    line: british(`${nat} players on ${school}'s ${label} roster`),
    foot: `Roster · ${date}`,
  };
}

/** «Our earlier article (event of Oct. 03, 2026): «title»» */
const EARLIER_RE = /^Our earlier article(?: \(event of ([^)]+)\))?: «(.+)»$/;

export function earlierFrame(lines: string[], brand: string): Frame | null {
  const items = lines
    .map((l) => EARLIER_RE.exec(l))
    .filter((m): m is RegExpExecArray => m !== null)
    .slice(0, 2)
    .map((m) => ({ date: localizedEventDate(m[1] ?? null, "en"), title: m[2] }));
  if (!items.length) return null;
  return { kind: "earlier", kicker: `Earlier on ${brand}`, big: "", line: null, foot: null, items };
}

// ─── Which frames ───────────────────────────────────────────────────────────

/** «Bolton, England» → «Bolton». The country is the site's; the town is the hook. */
export function hometownCity(hometown: string | null): string | null {
  const city = (hometown ?? "").split(",")[0].trim();
  return city || null;
}

/** At most two data frames sit between the headline and the end card. */
const MAX_DATA_FRAMES = 2;

export function buildFrames(input: ReelInput): Frame[] {
  const city = hometownCity(input.hometown);
  const label = input.sport ? sportLabel(input.sport, "en") : null;
  const who = input.gender === "f" ? "Women's" : input.gender === "m" ? "Men's" : null;
  const sport = label && who ? `${who} ${label.toLowerCase()}` : label;
  const hook: Frame = {
    kind: "hook",
    kicker: [sport, input.university].filter(Boolean).join(" · "),
    big: input.name,
    line: city ? `From ${city}` : null,
    foot: null,
  };
  const headline: Frame = { kind: "headline", kicker: input.brand, big: input.title, line: null, foot: null };

  // Order of preference: what the athlete did, then the team, then the angle.
  const data: Frame[] = [];
  const firstOf = (fn: (l: string) => Frame | null) => {
    for (const l of input.records) { const f = fn(l); if (f) return f; }
    return null;
  };
  for (const f of [firstOf(seasonFrame), firstOf(rankingFrame), firstOf(rosterFrame),
    earlierFrame(input.records, input.brand)]) {
    if (f && data.length < MAX_DATA_FRAMES) data.push(f);
  }

  const end: Frame = { kind: "end", kicker: input.brand, big: "Read the story", line: "Link in bio", foot: null };
  return [hook, headline, ...data, end];
}

// ─── Timing ─────────────────────────────────────────────────────────────────

/** Crossfade between frames, seconds. */
export const FADE = 0.4;

/** Seconds on screen: long enough to read, at ~3.5 words a second for the headline. */
export function frameSeconds(f: Frame): number {
  switch (f.kind) {
    case "hook":
    case "end":
      return 2.6;
    case "headline": {
      const words = f.big.split(/\s+/).length;
      return Math.min(5, Math.max(3.4, 1 + words / 3.5));
    }
    case "earlier":
      return 4;
    default:
      return 3.4;
  }
}

/** xfade offsets: each transition starts FADE before the previous frame ends. */
export function fadeOffsets(durations: number[]): number[] {
  const offsets: number[] = [];
  let t = 0;
  for (let i = 0; i < durations.length - 1; i++) {
    t += durations[i] - FADE;
    offsets.push(Math.round(t * 1000) / 1000);
  }
  return offsets;
}

export function totalSeconds(durations: number[]): number {
  return durations.reduce((a, b) => a + b, 0) - FADE * Math.max(0, durations.length - 1);
}

// ─── The element tree (satori: plain objects, display:flex on every parent) ──

type Style = Record<string, string | number>;
interface El { type: string; props: { style: Style; children?: unknown } }
const el = (type: string, style: Style, children?: unknown): El => ({ type, props: { style, children } });

/** Big text shrinks with length, so a long name or headline still fits the width. */
export function bigSize(f: Frame): number {
  const len = [...f.big].length;
  if (f.kind === "headline") return len > 90 ? 76 : len > 60 ? 88 : 100;
  if (f.kind === "hook") return len > 22 ? 100 : len > 14 ? 124 : 150;
  return len > 12 ? 150 : 210;
}

export function frameElement(f: Frame, index: number, total: number): El {
  const kicker = el("div", { display: "flex", alignItems: "center", gap: 24 }, [
    el("div", { width: 96, height: 6, backgroundColor: RED }),
    el("div", { fontFamily: "Noto Sans", fontWeight: 700, fontSize: 30, letterSpacing: 4,
      textTransform: "uppercase", color: MUTED, maxWidth: 760 }, f.kicker),
  ]);

  const middle: El[] = [];
  if (f.kind === "earlier") {
    for (const it of f.items ?? []) {
      middle.push(el("div", { display: "flex", flexDirection: "column", gap: 10, paddingTop: 28, paddingBottom: 28,
        borderTop: "2px solid rgba(255,255,255,0.25)" }, [
        el("div", { fontFamily: "Noto Sans", fontSize: 28, color: MUTED }, it.date ?? " "),
        el("div", { fontFamily: "Playfair Display", fontWeight: 700, fontSize: 58, lineHeight: 1.12 }, it.title),
      ]));
    }
  } else {
    middle.push(el("div", { fontFamily: "Playfair Display", fontWeight: 700, fontSize: bigSize(f), lineHeight: 1.02 }, f.big));
    if (f.line) {
      middle.push(el("div", { fontFamily: "Noto Sans", fontSize: f.kind === "end" ? 48 : 44, lineHeight: 1.3,
        color: "#FFFFFF", marginTop: 28 }, f.line));
    }
  }

  // Progress dots: the viewer sees how many frames are left.
  const dots = el("div", { display: "flex", gap: 12 },
    Array.from({ length: total }, (_, i) =>
      el("div", { width: i === index ? 40 : 14, height: 14, borderRadius: 7,
        backgroundColor: i === index ? "#FFFFFF" : "rgba(255,255,255,0.3)" })));

  return el("div", {
    width: REEL_WIDTH, height: REEL_HEIGHT, display: "flex", flexDirection: "column", justifyContent: "space-between",
    backgroundColor: NAVY, color: "#FFFFFF",
    // Instagram's own buttons cover the top ~250 px and the bottom ~380 px.
    paddingTop: 260, paddingBottom: 400, paddingLeft: 96, paddingRight: 96,
  }, [
    kicker,
    el("div", { display: "flex", flexDirection: "column" }, middle),
    el("div", { display: "flex", flexDirection: "column", gap: 28 }, [
      el("div", { fontFamily: "Noto Sans", fontSize: 26, color: MUTED }, f.foot ?? " "),
      dots,
    ]),
  ]);
}
