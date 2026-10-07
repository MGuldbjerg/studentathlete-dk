/**
 * Multi-day tournaments: one recap, not one draft per day.
 * =======================================================
 *
 * Mikkel, 2026-10-07: «a recap of a 3-day tournament is better than 3 separate
 * "X round win/standing"». Golf and tennis schools publish a report every
 * evening of a tournament, and each became its own draft: Woodham «opens tied
 * for seventh», «ties for first», «leads», then the title. The day reports
 * were rejected by hand (#529, #542, #547 on 6-7 October) because by the time
 * they go live the tournament is over.
 *
 * So, for golf and tennis only:
 *   · a report on an UNFINISHED event waits up to 48 hours for the final one;
 *   · the final report is written with the day reports folded into its fact
 *     sheet as context, labelled by report — same event, same athlete, so no
 *     numbers from another match can leak in (two MATCHES are never combined);
 *   · after 48 hours with no final, the latest day report is written the same
 *     way. Waiting longer would bury a real result the source never finished.
 *
 * Single matches are never held — see PLAN-richer-articles.md.
 *
 * Pure functions. The decision needs the story, its siblings (same athlete,
 * last few days) and the clock; generate-articles.ts does the database work.
 */
import type { FactSheet } from "./build-factsheet";

export const MULTI_DAY_SPORTS = new Set(["golf", "tennis"]);
export const HOLD_HOURS = 48;
/** How far back a sibling report of the same tournament is looked for. */
export const SIBLING_DAYS = 5;

/**
 * Wording that only an UNFINISHED event uses. Checked on the headline and on
 * the fact sheet: «Women's Golf in Battle at Coyote Creek Classic» says
 * nothing, its sheet says «play was halted by darkness».
 */
const STILL_GOING =
  /\b(after (the )?(first|opening|second|third|1|2|3|one|two|three) (round|day|rounds|days)|(first|opening|second|third|1|2|3)[- ](round|day)|day (one|two|1|2)|through (18|36|54) holes|heading into (the )?final|into (the )?final (round|day)|halfway|midway|halted|suspended|darkness|opens?\b[^.]{0,40}\btied)\b/i;

/** Weaker signs of an unfinished event, overruled by a finishing word. */
const UNDER_WAY = /\b(sits|stands|leads|trails|paces?|climbs|reach(es)?|advances?|moves? (on|into)|quarterfinals?|semifinals?|semi-finals?|round of (128|64|32|16)|qualifying)\b/i;

/**
 * Wording of a finished event. «Ties for» is deliberately not here: «Woodham
 * ties for first at Argent Financial Classic» was day two of three.
 */
const FINISHED =
  /\b(wins?|won|claims?|claimed|captures?|captured|champions?|titles?|finish(es|ed)?|concludes?|concluded|clos(e|es|ed) out|wrap(s|ped)? up|runner-up|medalist|complete[sd]?|final day|final round)\b/i;

/**
 * The sheet only counts for the STRONGEST signs. A finished event's sheet says
 * «shot 68 in the second round» about its round-by-round scores, which the
 * headline pattern would read as unfinished (Mortensen, #7710).
 */
const STILL_GOING_SHEET =
  /\b(after (the )?(first|opening|second|third|1|2|3|one|two|three) (round|day|rounds|days)|through (18|36|54) holes|heading into (the )?final|halted|suspended|darkness)\b/i;

/**
 * Awards, watch lists and preseason teams are not tournament reports, even
 * when they name one («Woodham named Southland Golfer of the Week» after the
 * Argent Financial Classic). They are never held and never fold anything in.
 */
const NOT_A_REPORT = /\b(of the week|weekly|honou?r(s|ed)?|watch list|preseason|all-america\w*|award|named|tabbed|selected)\b/i;

export function isTournamentReport(headline: string | null): boolean {
  return !NOT_A_REPORT.test(headline ?? "");
}

function sheetText(fs: FactSheet | null): string {
  if (!fs) return "";
  const lines = [
    fs.event?.type, fs.event?.competition, fs.result?.placement, fs.result?.outcome,
    ...(fs.stats ?? []).map((s) => s.text),
    ...(fs.qualitative ?? []).map((s) => s.text),
    ...(fs.other_facts ?? []).map((s) => s.text),
    ...(fs.context ?? []).map((s) => s.text),
  ];
  return lines.filter((l): l is string => typeof l === "string").join(" . ");
}

export type Stage = "unfinished" | "finished" | "unclear";

/** Is the event this report describes over? Headline first, the sheet as backup. */
export function eventStage(headline: string | null, fs: FactSheet | null): Stage {
  const h = headline ?? "";
  if (STILL_GOING.test(h)) return "unfinished";
  if (FINISHED.test(h)) return "finished";
  if (UNDER_WAY.test(h)) return "unfinished";
  // The headline is silent: only the strong signs count from the sheet, since
  // a sheet mentions «leads the team in birdies» about finished events too.
  if (STILL_GOING_SHEET.test(sheetText(fs))) return "unfinished";
  return "unclear";
}

// ─── Same tournament? ───────────────────────────────────────────────────────

const GENERIC = new Set((
  "the a an at of in on for and to with as by from vs its his her their " +
  "men mens women womens men's women's golf tennis team teams day days one two three four first second third " +
  "fourth fifth sixth seventh eighth ninth tenth " +
  "final finals round rounds opening closing open leads lead led leads paces pace sits stands climbs trails " +
  "invitational invite classic championship championships tournament intercollegiate collegiate college " +
  "university ita conference masters individual individuals doubles singles flight title titles finish " +
  "finishes finished wins win won claims captures earns earn top tied ties tie place places placed " +
  "after through holes play played weekend fall spring season opener cup event action competes competition " +
  "regional regionals national nationals championship's no rv"
).split(/\s+/));

function tokens(text: unknown): Set<string> {
  const out = new Set<string>();
  // Sheets are model output: «competition» has been an array and an object.
  if (typeof text !== "string") return out;
  for (let t of text.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").split(/[^a-z]+/)) {
    if (t.length > 4 && t.endsWith("s")) t = t.slice(0, -1); // «All-Americans» = «All-American»
    if (t.length >= 4 && !GENERIC.has(t)) out.add(t);
  }
  return out;
}

/**
 * The tournament's NAME only: the sheet's competition, else the headline after
 * its last «at» / «of the» / «of». The whole headline was too loose — team
 * nicknames («Sycamores») and team-mates' names («Weaver, Whaley») tied
 * different tournaments together. A venue after « at » is cut from the
 * competition («Argent Financial Classic at Squire Creek»).
 */
function tournamentName(headline: string | null, fs: FactSheet | null): string[] {
  const names: string[] = [];
  const comp = fs?.event?.competition;
  if (typeof comp === "string") names.push(comp.split(/\s+at\s+/i)[0]);
  const m = /\b(?:at|of the|of)\s+(?:the\s+)?([^;:]+)$/i.exec(headline ?? "");
  if (m) names.push(m[1]);
  return names;
}

/** Words that name the TOURNAMENT, minus the athlete and the school. */
export function eventWords(headline: string | null, fs: FactSheet | null, exclude: string[]): Set<string> {
  const drop = new Set(exclude.flatMap((e) => [...tokens(e)]));
  const words = new Set(tournamentName(headline, fs).flatMap((n) => [...tokens(n)]));
  for (const d of drop) words.delete(d);
  return words;
}

/**
 * Same tournament when the two names share a word — «argent», «binghamton»,
 * «dolenc». A report whose name cannot be read matches nothing, and is
 * therefore written on its own as before.
 */
export function sameTournament(a: Set<string>, b: Set<string>): boolean {
  for (const w of a) if (b.has(w)) return true;
  return false;
}

// ─── The decision ───────────────────────────────────────────────────────────

export interface Report {
  id: number;
  headline: string | null;
  factSheet: FactSheet | null;
  discoveredAt: Date;
}

export type HoldDecision =
  | { action: "write"; earlier: Report[] }
  | { action: "hold"; reason: string }
  | { action: "covered"; byStoryId: number; reason: string };

/**
 * What to do with `story` now.
 *
 * `siblings` are the athlete's other reports of the last SIBLING_DAYS days
 * that are still waiting (not yet written); `written` are reports that already
 * became an article. Both are pre-filtered to the same athlete and site.
 */
export function holdDecision(
  story: Report,
  siblings: Report[],
  written: Report[],
  exclude: string[],
  now: Date,
): HoldDecision {
  if (!isTournamentReport(story.headline)) return { action: "write", earlier: [] };
  const words = eventWords(story.headline, story.factSheet, exclude);
  const same = (r: Report) =>
    r.id !== story.id && isTournamentReport(r.headline) && sameTournament(words, eventWords(r.headline, r.factSheet, exclude));
  const stage = eventStage(story.headline, story.factSheet);
  const waiting = siblings.filter(same).sort((x, y) => +x.discoveredAt - +y.discoveredAt);

  // A finished report is always written, whatever came before: a real final
  // must never be lost to an earlier article about the same event.
  if (stage !== "unfinished") {
    const earlier = waiting.filter((r) => r.discoveredAt <= story.discoveredAt || eventStage(r.headline, r.factSheet) === "unfinished");
    return { action: "write", earlier };
  }

  // Unfinished, and the event already has an article: the day report adds a
  // day the article was written after. Nothing to write.
  const done = written.find(same);
  if (done) return { action: "covered", byStoryId: done.id, reason: "the tournament already has an article" };

  // Unfinished, and a FINISHED report of the same event is waiting: that one
  // is written and takes this one along.
  const final = waiting.find((r) => eventStage(r.headline, r.factSheet) !== "unfinished");
  if (final) return { action: "covered", byStoryId: final.id, reason: "the final report of the same tournament is written instead" };

  // Unfinished, nothing final yet. The OLDEST report of the event sets the
  // clock, so a new day report does not restart the wait.
  const first = [story, ...waiting].reduce((a, b) => (a.discoveredAt <= b.discoveredAt ? a : b));
  const waitedHours = (+now - +first.discoveredAt) / 3_600_000;
  if (waitedHours < HOLD_HOURS) {
    return { action: "hold", reason: `tournament under way — waiting for the final report (${Math.floor(waitedHours)} of ${HOLD_HOURS} h)` };
  }

  // 48 hours and no final. The LATEST report is written, the rest go with it.
  const latest = [story, ...waiting].reduce((a, b) => (a.discoveredAt >= b.discoveredAt ? a : b));
  if (latest.id !== story.id) return { action: "covered", byStoryId: latest.id, reason: "a later day report of the same tournament is written instead" };
  return { action: "write", earlier: waiting };
}

/**
 * The written report's fact sheet with the earlier reports folded in as
 * labelled context. Everything downstream — rendering, the number check, the
 * admin panel — reads one sheet and needs no change.
 */
export function foldEarlierReports(main: FactSheet, earlier: Report[]): FactSheet {
  if (!earlier.length) return main;
  const extra: FactSheet["context"] = [];
  for (const r of earlier) {
    const label = `Earlier report («${(r.headline ?? "").slice(0, 80)}»)`;
    const fs = r.factSheet;
    if (!fs) continue;
    if (fs.result?.placement) extra.push({ text: `${label}: standing ${fs.result.placement}`, source: "prose" });
    for (const f of [...(fs.stats ?? []), ...(fs.qualitative ?? [])]) {
      extra.push({ text: `${label}: ${f.text}`, source: f.source });
    }
  }
  return { ...main, context: [...(main.context ?? []), ...extra] };
}
