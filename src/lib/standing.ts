/**
 * Where a player stands among the site's players (PLAN-content-floor-uk.md,
 * P3): rank in goals, assists or clean sheets among every player of the same
 * nationality, sport and gender with stats on file — nationally and within the
 * division. Not only the top 10 the leaderboard shows.
 * ===========================================================================
 *
 * Computed by the daily stats fill (fill-season-stats.ts, after the
 * leaderboard) from the same rows, stored per athlete as JSON in
 * athlete_season_stats.standing (migration 071), written as a sentence here.
 * «with stats on file» is part of every sentence: players whose school's stats
 * page we cannot read are not counted, and the sentence must not claim more.
 */
import { rankRows, shortDivision, type BoardInput } from "./leaderboard";
import { sportLabel } from "./i18n";

type Stat = "goals" | "assists" | "shutouts";

export interface StandingRank { value: number; rank: number; tied: boolean; of: number }

export interface Standing {
  country: string;          // the site the pool belongs to
  nat: string;              // the site's demonym: «UK», «danske» (CountryProfile.demonym)
  sport: string;
  gender: string | null;
  pool: number;             // players of this nationality, sport and gender with stats on file
  division: string | null;  // «D2», «NAIA» …
  divisionPool: number;
  national: Partial<Record<Stat, StandingRank>>;
  inDivision: Partial<Record<Stat, StandingRank>>;
}

const STATS: Array<{ stat: Stat; kind: BoardInput["kind"]; of: (r: BoardInput) => number }> = [
  { stat: "goals", kind: "outfield", of: (r) => r.goals },
  { stat: "assists", kind: "outfield", of: (r) => r.assists },
  { stat: "shutouts", kind: "keeper", of: (r) => r.shutouts },
];

/** Every player's standing, keyed by athlete id. One site's rows at a time. */
export function computeStandings(country: string, nat: string, rows: BoardInput[]): Map<number, Standing> {
  const out = new Map<number, Standing>();
  const groupOf = (r: BoardInput) => `${r.sport}|${r.gender ?? ""}`;
  for (const g of new Set(rows.map(groupOf))) {
    const pool = rows.filter((r) => groupOf(r) === g);
    for (const me of pool) {
      const div = shortDivision(me.division);
      const divPool = pool.filter((r) => shortDivision(r.division) === div);
      const st: Standing = {
        country, nat, sport: me.sport, gender: me.gender, pool: pool.length,
        division: div, divisionPool: div ? divPool.length : 0, national: {}, inDivision: {},
      };
      for (const s of STATS) {
        if (me.kind !== s.kind || s.of(me) <= 0) continue;
        const rank = (among: BoardInput[]) => {
          const scored = among.filter((r) => r.kind === s.kind && s.of(r) > 0);
          const hit = rankRows(scored, s.of).find((x) => x.item.athlete_id === me.athlete_id)!;
          return { value: s.of(me), rank: hit.rank, tied: hit.tied, of: scored.length };
        };
        st.national[s.stat] = rank(pool);
        if (div) st.inDivision[s.stat] = rank(divPool);
      }
      out.set(me.athlete_id, st);
    }
  }
  return out;
}

// ── Sentences ───────────────────────────────────────────────────────────────

function ordinal(k: number): string {
  const s = k % 100 >= 11 && k % 100 <= 13 ? "th" : ["th", "st", "nd", "rd"][k % 10] ?? "th";
  return `${k}${s}`;
}
const placeEn = (r: StandingRank) => `${r.tied ? "joint " : ""}${ordinal(r.rank)}`;
const placeDa = (r: StandingRank) => `${r.tied ? "delt " : ""}nr. ${r.rank}`;

/** «D2» → «Division II»; NAIA and the rest as they are. */
function divisionName(d: string): string {
  const roman: Record<string, string> = { D1: "I", D2: "II", D3: "III" };
  return roman[d] ? `Division ${roman[d]}` : d;
}

function groupName(sport: string, gender: string | null, lang: string): string {
  const s = sportLabel(sport, lang).toLowerCase();
  if (lang === "da") return gender === "m" ? `herrernes ${s}` : gender === "f" ? `damernes ${s}` : s;
  return gender === "m" ? `men's ${s}` : gender === "f" ? `women's ${s}` : s;
}

/** «with a goal on file»: the pool is the players with at least one. */
const AT_LEAST: Record<string, Record<Stat, string>> = {
  en: { goals: "a goal", assists: "an assist", shutouts: "a clean sheet" },
  da: { goals: "mindst ét mål", assists: "mindst én assist", shutouts: "mindst ét clean sheet" },
};

const NOUN: Record<string, Record<Stat, [string, string]>> = {
  en: { goals: ["goal", "goals"], assists: ["assist", "assists"], shutouts: ["clean sheet", "clean sheets"] },
  da: { goals: ["mål", "mål"], assists: ["assist", "assists"], shutouts: ["clean sheet", "clean sheets"] },
};

/**
 * One sentence per stat the player has (goals and assists, or clean sheets):
 * the national rank, and the division rank when the division has more than
 * one such player. Nothing when the player has none of them.
 */
export function standingSentences(s: Standing, name: string, lang: string): string[] {
  const da = lang === "da";
  const who = name.trim().split(/\s+/).pop() ?? name;
  const g = groupName(s.sport, s.gender, lang);
  const out: string[] = [];
  for (const stat of ["goals", "assists", "shutouts"] as const) {
    const n = s.national[stat];
    if (!n) continue;
    const d = s.inDivision[stat];
    const noun = NOUN[da ? "da" : "en"][stat][n.value === 1 ? 0 : 1];
    const div = d && d.of > 1 && s.division
      ? (da ? ` (${placeDa(d)} af ${d.of} i ${divisionName(s.division)})` : ` (${placeEn(d)} of ${d.of} in ${divisionName(s.division)})`)
      : "";
    if (n.of === 1) {
      out.push(da
        ? `${who} er den eneste ${s.nat} spiller i ${g} med ${AT_LEAST.da[stat]} i vores tal (${n.value} ${noun}).`
        : `${who} is the only ${s.nat} player in ${g} with ${AT_LEAST.en[stat]} on file (${n.value} ${noun}).`);
      continue;
    }
    out.push(da
      ? `${who}s ${n.value} ${noun} er ${placeDa(n)} blandt de ${n.of} ${s.nat} spillere i ${g} med ${AT_LEAST.da[stat]} i vores tal${div}.`
      : `${who}'s ${n.value} ${noun} ${n.value === 1 ? "ranks" : "rank"} ${placeEn(n)} among the ${n.of} ${s.nat} players in ${g} with ${AT_LEAST.en[stat]} on file${div}.`);
  }
  return out;
}

export function readStanding(json: string | null | undefined): Standing | null {
  if (!json) return null;
  try {
    const s = JSON.parse(json) as Standing;
    return s && s.national && typeof s.pool === "number" ? s : null;
  } catch {
    return null;
  }
}
