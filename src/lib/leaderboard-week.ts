/**
 * The weekly leaderboard update: how the season-long leaderboard moved in the
 * week (Mikkel 2026-10-22: «an update on the seasonlong leaderboard», not a
 * leaderboard for the week). A dated page under the leaderboard,
 * /statistics/leaderboard/2026-11-03 and /statistik/topscorere/2026-11-03.
 * ===========================================================================
 *
 * Built on Mondays by pipeline/stats/fill-season-stats.ts, after the weekend's
 * games, from the same rows as the leaderboard and the history snapshot a week
 * back. Stored as data (stats_cache key 'leaderboard_week:<date>') and written
 * into sentences at request time in the reader's language — so every sentence
 * is a number we hold, never a model's paraphrase.
 *
 * «New in the top 10» is claimed only for a player we already had numbers for
 * a week ago: someone whose stats page we read for the first time this week
 * did not «enter» anything, we just had not seen them.
 */
import { buildLeaderboard, type BoardInput, type Leaderboard } from "./leaderboard";
import { sportLabel } from "./i18n";

export const WEEK_KEY_PREFIX = "leaderboard_week:";
/** Monday: the week's update follows the weekend's games. */
export const WEEK_DAY = 1;
/** Players listed per stat in «the best week». */
const BEST_N = 5;
/** Climbers listed at most. */
const CLIMBERS_N = 8;

type Stat = "goals" | "assists" | "shutouts";

interface Who { name: string; slug: string; school: string }
interface TableId { sport: string; gender: string | null; stat: Stat }

export interface WeekLeader extends Who, TableId {
  value: number;
  gained: number | null;   // null: no numbers for them a week ago
  isNew: boolean;          // was not first a week ago
  sharedWith: Who[];       // others on the same value at the top
}
export interface WeekClimber extends Who, TableId { value: number; rank: number; tied: boolean; prevRank: number | null }
export interface WeekBest extends Who { sport: string; gender: string | null; gained: number }
export interface WeekMilestone extends Who { stat: Stat; n: number }

export interface LeaderboardWeek {
  country: string;
  from: string;            // the history snapshot movement is measured against
  to: string;              // the stats' date
  active: number;          // players who added to a total this week
  leaders: WeekLeader[];
  climbers: WeekClimber[];
  best: Partial<Record<Stat, WeekBest[]>>;
  milestones: WeekMilestone[];
}

const STAT_OF: Record<Stat, (r: BoardInput) => number> = {
  goals: (r) => r.goals, assists: (r) => r.assists, shutouts: (r) => r.shutouts,
};

/**
 * The week from `previous` (each player's totals at `from`) to `current`. Null
 * when nothing moved — no page beats a thin one.
 */
export function buildLeaderboardWeek(
  country: string, from: string, to: string,
  current: BoardInput[], previous: BoardInput[], milestones: WeekMilestone[],
): LeaderboardWeek | null {
  const board: Leaderboard = buildLeaderboard(country, to, current, previous, from);
  const prevById = new Map(previous.map((p) => [p.athlete_id, p]));
  const bySlug = new Map(current.map((c) => [c.slug, c]));
  const gainOf = (slug: string, stat: Stat): number | null => {
    const c = bySlug.get(slug);
    const p = c ? prevById.get(c.athlete_id) : undefined;
    return c && p ? STAT_OF[stat](c) - STAT_OF[stat](p) : null;
  };
  const who = (r: Who): Who => ({ name: r.name, slug: r.slug, school: r.school });

  const leaders: WeekLeader[] = [];
  const climbers: WeekClimber[] = [];
  for (const tb of board.tables.filter((t) => t.division === null)) {
    const id: TableId = { sport: tb.sport, gender: tb.gender, stat: tb.stat };
    const top = tb.rows.filter((r) => r.rank === 1);
    leaders.push({
      ...who(top[0]), ...id, value: top[0].value, gained: gainOf(top[0].slug, tb.stat),
      isNew: top.every((r) => r.prevRank !== 1), sharedWith: top.slice(1).map(who),
    });
    for (const r of tb.rows) {
      if (r.rank === 1) continue;
      const known = prevById.has(bySlug.get(r.slug)?.athlete_id ?? -1);
      const climbed = r.prevRank !== null ? r.prevRank - r.rank >= 2 : known;
      if (climbed) climbers.push({ ...who(r), ...id, value: r.value, rank: r.rank, tied: r.tied, prevRank: r.prevRank });
    }
  }
  climbers.sort((a, b) => ((b.prevRank ?? 11) - b.rank) - ((a.prevRank ?? 11) - a.rank) || a.rank - b.rank);

  const best: LeaderboardWeek["best"] = {};
  const gainedAny = new Set<number>();
  for (const stat of ["goals", "assists", "shutouts"] as const) {
    const gains = current
      .map((c) => ({ c, p: prevById.get(c.athlete_id) }))
      .filter((x) => x.p && x.c.kind === x.p.kind)
      .map((x) => ({ c: x.c, gained: STAT_OF[stat](x.c) - STAT_OF[stat](x.p!) }))
      .filter((x) => x.gained > 0)
      .sort((a, b) => b.gained - a.gained || a.c.name.localeCompare(b.c.name));
    gains.forEach((g) => gainedAny.add(g.c.athlete_id));
    if (!gains.length) continue;
    const cut = gains[Math.min(BEST_N, gains.length) - 1].gained;
    best[stat] = gains.filter((g) => g.gained >= cut).slice(0, BEST_N + 3)
      .map((g) => ({ ...who(g.c), sport: g.c.sport, gender: g.c.gender, gained: g.gained }));
  }
  const active = gainedAny.size;
  if (!active) return null;
  return { country, from, to, active, leaders, climbers: climbers.slice(0, CLIMBERS_N), best, milestones };
}

// ── Sentences ───────────────────────────────────────────────────────────────

/** A sentence: text, with athletes as links to their profiles. */
export type Part = string | { name: string; slug: string };
export interface WeekSection { heading: string; lines: Part[][] }

const NOUN: Record<string, Record<Stat, [string, string]>> = {
  en: { goals: ["goal", "goals"], assists: ["assist", "assists"], shutouts: ["clean sheet", "clean sheets"] },
  da: { goals: ["mål", "mål"], assists: ["assist", "assists"], shutouts: ["clean sheet", "clean sheets"] },
};

/** «men's football», «herrernes fodbold». */
function group(sport: string, gender: string | null, lang: string): string {
  const s = sportLabel(sport, lang).toLowerCase();
  if (lang === "da") return gender === "m" ? `herrernes ${s}` : gender === "f" ? `damernes ${s}` : s;
  return gender === "m" ? `men's ${s}` : gender === "f" ? `women's ${s}` : s;
}

function ordinal(n: number): string {
  const s = n % 100 >= 11 && n % 100 <= 13 ? "th" : ["th", "st", "nd", "rd"][n % 10] ?? "th";
  return `${n}${s}`;
}
function place(n: number, tied: boolean, lang: string): string {
  if (lang === "da") return `${tied ? "delt " : ""}nr. ${n}`;
  return `${tied ? "joint " : ""}${ordinal(n)}`;
}

const link = (w: Who): Part => ({ name: w.name, slug: w.slug });
function names(ws: Who[], lang: string): Part[] {
  const out: Part[] = [];
  ws.forEach((w, i) => {
    if (i) out.push(i === ws.length - 1 ? (lang === "da" ? " og " : " and ") : ", ");
    out.push(link(w), ` (${w.school})`);
  });
  return out;
}

function leaderLine(l: WeekLeader, lang: string): Part[] {
  const g = group(l.sport, l.gender, lang);
  const noun = NOUN[lang === "da" ? "da" : "en"][l.stat][l.value === 1 ? 0 : 1];
  if (l.sharedWith.length) {
    const all = [l, ...l.sharedWith];
    return lang === "da"
      ? [...names(all, lang), ` deler førstepladsen for ${NOUN.da[l.stat][1]} i ${g} med ${l.value} hver.`]
      : [...names(all, lang), ` share the lead in the ${g} ${NOUN.en[l.stat][1]} table on ${l.value} each.`];
  }
  const head = [link(l), ` (${l.school})`];
  const gained = l.gained ?? 0;
  if (lang === "da") {
    if (l.isNew) return [...head, ` overtog førstepladsen for ${NOUN.da[l.stat][1]} i ${g} med ${l.value}${gained > 0 ? `, heraf ${gained} i denne uge` : ""}.`];
    return [...head, ` fører stadig for ${NOUN.da[l.stat][1]} i ${g} med ${l.value}${gained > 0 ? `, ${gained} flere end for en uge siden` : ""}.`];
  }
  if (l.isNew) return [...head, ` went top of the ${g} ${NOUN.en[l.stat][1]} table with ${l.value} ${noun}${gained > 0 ? `, ${gained} of them this week` : ""}.`];
  return [...head, ` still leads the ${g} ${NOUN.en[l.stat][1]} table with ${l.value} ${noun}${gained > 0 ? `, ${gained} more than a week ago` : ""}.`];
}

function climberLine(c: WeekClimber, lang: string): Part[] {
  const g = group(c.sport, c.gender, lang);
  const head = [link(c), ` (${c.school})`];
  if (lang === "da") {
    return c.prevRank === null
      ? [...head, ` er ny i top 10 for ${NOUN.da[c.stat][1]} i ${g} som ${place(c.rank, c.tied, lang)} (${c.value}).`]
      : [...head, ` rykkede fra nr. ${c.prevRank} til ${place(c.rank, c.tied, lang)} for ${NOUN.da[c.stat][1]} i ${g} (${c.value}).`];
  }
  return c.prevRank === null
    ? [...head, ` entered the top 10 of the ${g} ${NOUN.en[c.stat][1]} table at ${place(c.rank, c.tied, lang)} (${c.value}).`]
    : [...head, ` climbed from ${ordinal(c.prevRank)} to ${place(c.rank, c.tied, lang)} in the ${g} ${NOUN.en[c.stat][1]} table (${c.value}).`];
}

function bestLine(stat: Stat, rows: WeekBest[], lang: string): Part[] {
  const out: Part[] = [lang === "da" ? `Flest ${NOUN.da[stat][1]} i ugen: ` : `Most ${NOUN.en[stat][1]} this week: `];
  rows.forEach((r, i) => {
    if (i) out.push(", ");
    out.push(link(r), ` (${r.school}, ${group(r.sport, r.gender, lang)}) ${r.gained}`);
  });
  out.push(".");
  return out;
}

function milestoneLine(m: WeekMilestone, lang: string): Part[] {
  const [one, many] = NOUN[lang === "da" ? "da" : "en"][m.stat];
  const head = [link(m), ` (${m.school})`];
  if (lang === "da") return m.n === 1 ? [...head, `: sæsonens første ${one}.`] : [...head, ` nåede ${m.n} ${many} i sæsonen.`];
  return m.n === 1 ? [...head, `: first ${one} of the season.`] : [...head, ` reached ${m.n} ${many} for the season.`];
}

/** The page's sections, in the reader's language. Empty sections are left out. */
export function weekSections(w: LeaderboardWeek, lang: string): WeekSection[] {
  const da = lang === "da";
  const sections: WeekSection[] = [
    { heading: da ? "Øverst i tabellerne" : "At the top", lines: w.leaders.map((l) => leaderLine(l, lang)) },
    { heading: da ? "Ugens bedste" : "The best week", lines: (["goals", "assists", "shutouts"] as const).filter((s) => w.best[s]?.length).map((s) => bestLine(s, w.best[s]!, lang)) },
    { heading: da ? "På vej op" : "Climbing", lines: w.climbers.map((c) => climberLine(c, lang)) },
    { heading: da ? "Milepæle" : "Milestones", lines: w.milestones.map((m) => milestoneLine(m, lang)) },
  ];
  return sections.filter((s) => s.lines.length);
}

/** The headline: a new leader if there is one, else the week's biggest haul. */
export function weekHeadline(w: LeaderboardWeek, lang: string): string {
  const da = lang === "da";
  const fresh = w.leaders.find((l) => l.isNew && !l.sharedWith.length);
  if (fresh) {
    const g = group(fresh.sport, fresh.gender, lang);
    return da ? `${fresh.name} overtager førstepladsen i ${g}` : `${fresh.name} goes top in ${g}`;
  }
  const top = (["goals", "assists", "shutouts"] as const).flatMap((s) => (w.best[s] ?? []).slice(0, 1).map((b) => ({ s, b })))
    .sort((a, b) => b.b.gained - a.b.gained)[0];
  if (!top) return da ? "Sådan flyttede tabellerne sig" : "How the tables moved";
  const noun = NOUN[da ? "da" : "en"][top.s][top.b.gained === 1 ? 0 : 1];
  return da ? `${top.b.name} med ${top.b.gained} ${noun} på en uge` : `${top.b.name} adds ${top.b.gained} ${noun} in a week`;
}

/** The text of a sentence, links flattened — for the description and the word count. */
export function plain(parts: Part[]): string {
  return parts.map((p) => (typeof p === "string" ? p : p.name)).join("");
}
