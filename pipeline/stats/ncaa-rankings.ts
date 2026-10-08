/**
 * National team rankings from NCAA.com (PLAN-richer-articles.md, step 5.1).
 * ========================================================================
 *
 * NCAA.com publishes a national table per team statistic, per sport and
 * division, server-rendered, and its robots.txt allows /stats. Once a day the
 * top of a few headline tables is kept in `team_rankings` (migration 065), and
 * the article writer gets a line — computed in code, dated — when the
 * athlete's school is in a national top 10:
 *
 *   «NCAA statistics as of 7 October 2026: SMU rank 1st in Division I men's
 *    soccer for goals-against average (GAA 0.300, 10 games)»
 *
 * Measured before building (7 October 2026): 51 top-10 placings of our schools
 * in 38 tables. Exact name matches were all right; the near ones were «St.»
 * and «U.» abbreviations, so those are expanded and nothing else is guessed —
 * «Washington» is not «George Washington», «Oklahoma» not «Oklahoma State».
 *
 * NCAA only: NAIA and junior colleges are not on NCAA.com. National only:
 * conference rankings are step 5.3.
 *
 *   npx tsx pipeline/stats/ncaa-rankings.ts [--dry-run]
 */

/** Our sport + gender → the NCAA.com slug. */
export function ncaaSport(sport: string, gender: string | null): string | null {
  if (sport === "soccer") return gender === "f" ? "soccer-women" : gender === "m" ? "soccer-men" : null;
  if (sport === "field-hockey") return "fieldhockey";
  if (sport === "basketball") return gender === "f" ? "basketball-women" : gender === "m" ? "basketball-men" : null;
  return null;
}

export function ncaaDivision(division: string | null): "d1" | "d2" | "d3" | null {
  const m = /^NCAA D([123])$/.exec(division ?? "");
  return m ? (`d${m[1]}` as "d1" | "d2" | "d3") : null;
}

/** The few tables per sport that say something about a team's season. */
export const HEADLINE_STATS: Record<string, RegExp> = {
  "soccer-men": /^(Scoring Offense|Team Goals Against Average|Shutout Percentage|Won-Lost-Tied Percentage)$/,
  "soccer-women": /^(Scoring Offense|Goals-Against Average|Shutout Percentage|Won-Lost-Tied Percentage)$/,
  fieldhockey: /^(Goals Per Game|Goals Against Average|Shutouts Per Game|Winning Percentage)$/,
  // Volleyball is left out: its tables count sets («S»), not matches, so the
  // minimum-games rule does not fit, and no British or Danish team was in a
  // top 10 when measured (7 October 2026).
  "basketball-men": /^(Scoring Offense|Scoring Defense|Scoring Margin|Field Goal Percentage)$/,
  "basketball-women": /^(Scoring Offense|Scoring Defense|Scoring Margin|Field Goal Percentage)$/,
};

/**
 * A team name in the form both sides can be compared in: lower case, «St.» →
 * «state», «U.» → «university», «&» → «and», punctuation gone.
 */
export function teamKey(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/&/g, " and ")
    .replace(/\bst\.(?=\s|$|\))/g, "state")
    .replace(/\bu\.(?=\s|$)/g, "university")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Every name NCAA.com might use for one of our schools, as keys: the common
 * name (split on «/»: «UMass / Massachusetts»), the full name, and the full
 * name without «The», «University of» or a trailing «University»/«College».
 */
export function schoolKeys(university: string, commonName: string | null): string[] {
  const names = [university, ...(commonName ?? "").split("/")].map((n) => n.trim()).filter(Boolean);
  const keys = new Set<string>();
  for (const n of names) {
    const k = teamKey(n);
    keys.add(k);
    const stripped = k
      .replace(/^the /, "")
      .replace(/^university of /, "")
      .replace(/ (university|college)$/, "")
      .trim();
    if (stripped && stripped !== k && stripped.length >= 4) keys.add(stripped);
    // «Lincoln University (MO)» is «Lincoln (MO)» on NCAA.com: with a state in
    // brackets the word sits in the middle, so it is dropped there too.
    if (/\(/.test(n)) keys.add(k.replace(/ (university|college) /, " "));
  }
  return [...keys].filter((k) => k.length >= 3);
}

export interface RankingRow {
  rank: number;
  tied: boolean;
  team: string;
  value: string;
  valueLabel: string;
  games: number | null;
}

function cellText(html: string): string {
  return html
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, " ")
    .trim();
}

/**
 * The table on one NCAA.com stats page. A tie is written «-» in the rank
 * column: it shares the rank above, and the row it ties with is tied too.
 */
export function parseRankingTable(html: string): RankingRow[] {
  const table = /<table[\s\S]*?<\/table>/i.exec(html)?.[0] ?? "";
  const headers = [...table.matchAll(/<th[^>]*>([\s\S]*?)<\/th>/gi)].map((m) => cellText(m[1]));
  const out: RankingRow[] = [];
  let lastRank = 0;
  for (const tr of table.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const cells = [...tr[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((m) => cellText(m[1]));
    if (cells.length < 3) continue;
    const explicit = /^\d+$/.test(cells[0]) ? Number(cells[0]) : null;
    const tied = explicit === null;
    const rank = explicit ?? lastRank;
    if (!rank) continue;
    if (tied && out.length && out[out.length - 1].rank === rank) out[out.length - 1].tied = true;
    lastRank = rank;
    // «Team Games» (soccer), «GM» (basketball), «Matches» / «S» (volleyball sets).
    const gamesAt = headers.findIndex((h) => /games|matches|^gp$|^gm?$/i.test(h));
    out.push({
      rank,
      tied,
      team: cells[1],
      value: cells[cells.length - 1],
      valueLabel: headers[headers.length - 1] ?? "",
      games: gamesAt >= 0 && /^\d+$/.test(cells[gamesAt] ?? "") ? Number(cells[gamesAt]) : null,
    });
  }
  return out;
}

const MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september",
  "october", "november", "december"];

/**
 * «Through games | Monday, October 05, 2026» on the table's page, as
 * YYYY-MM-DD. This is what the numbers are true as of — and how an
 * off-season table is told apart: on 7 October 2026 «current» women's
 * basketball was through games of 5 April 2026, last season's final table.
 */
export function throughDate(html: string): string | null {
  const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  const m = /Through games\s*(?:\w+day,\s*)?([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4})/i.exec(text);
  if (!m) return null;
  const month = MONTHS.indexOf(m[1].toLowerCase());
  if (month < 0) return null;
  return `${m[3]}-${String(month + 1).padStart(2, "0")}-${m[2].padStart(2, "0")}`;
}

/** A table older than this is out of season, not news. */
export const MAX_AGE_DAYS = 10;

/** Team stat links on a sport's landing page: name → path. */
export function statLinks(html: string): Map<string, string> {
  const links = new Map<string, string>();
  for (const m of html.matchAll(/<option[^>]*value="(\/stats\/[^"]*\/current\/team\/\d+)"[^>]*>([^<]*)</gi)) {
    links.set(cellText(m[2]), m[1]);
  }
  return links;
}

// ─── The line the writer gets ───────────────────────────────────────────────

/** Only a clear placing, after enough games to mean something. */
export const TOP = 10;
export const MIN_GAMES = 4;

const ROMAN = { d1: "I", d2: "II", d3: "III" } as const;
const LABEL: Record<string, string> = {
  "soccer-men": "men's soccer", "soccer-women": "women's soccer", fieldhockey: "field hockey",
  "basketball-men": "men's basketball", "basketball-women": "women's basketball",
};

export function ordinal(n: number): string {
  const teen = n % 100 >= 11 && n % 100 <= 13;
  const suffix = teen ? "th" : ({ 1: "st", 2: "nd", 3: "rd" } as Record<number, string>)[n % 10] ?? "th";
  return `${n}${suffix}`;
}

export interface StoredRanking {
  sport: string;
  division: "d1" | "d2" | "d3";
  stat: string;
  rank: number;
  tied: number;
  team: string;
  value: string;
  value_label: string | null;
  games: number | null;
  fetched_on: string;
}

/** The records lines for a school's placings: best two, top 10, ≥ 4 games. */
export function rankingLines(rows: StoredRanking[], max = 2): string[] {
  return rows
    .filter((r) => r.rank <= TOP && (r.games ?? 0) >= MIN_GAMES)
    .sort((a, b) => a.rank - b.rank)
    .slice(0, max)
    .map((r) => {
      const date = new Date(`${r.fetched_on}T12:00:00Z`).toLocaleDateString("en-GB", {
        day: "numeric", month: "long", year: "numeric", timeZone: "UTC",
      });
      // The value alone: the stat's name says what it is, and NCAA.com's own
      // column label can mislead («Per Game .700» on shutout percentage).
      const label = r.value;
      return `NCAA statistics through games of ${date}: ${r.team} rank ${r.tied ? "tied for " : ""}${ordinal(r.rank)} in Division ${ROMAN[r.division]} ${LABEL[r.sport] ?? r.sport} for ${r.stat.toLowerCase()} (${label}${r.games ? `, ${r.games} games` : ""})`;
    });
}

// ─── The daily fetch ────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const { createD1Client } = await import("../lib/d1-client");
  const { robotsAllows } = await import("../lib/robots");
  const { pipelineUserAgent } = await import("../../src/lib/site");
  const dryRun = process.argv.includes("--dry-run");
  const db = createD1Client();
  const ua = pipelineUserAgent();
  const base = "https://www.ncaa.com";
  const today = new Date().toISOString().slice(0, 10);
  const pause = () => new Promise((r) => setTimeout(r, 1500));

  async function get(path: string): Promise<string | null> {
    const url = base + path;
    if (!(await robotsAllows(url, ua))) {
      console.log(`  robots.txt says no: ${url}`);
      return null;
    }
    // One retry: a dropped connection (ECONNRESET, seen in the first dry run)
    // costs one table, never the run.
    for (let attempt = 0; attempt < 2; attempt++) {
      await pause();
      try {
        const res = await fetch(url, { headers: { "User-Agent": ua } });
        if (res.ok) return await res.text();
        if (res.status < 500) return null;
      } catch (err) {
        console.log(`  ! ${url}: ${err instanceof Error ? err.message : String(err)}${attempt ? "" : " — retrying"}`);
      }
    }
    return null;
  }

  let tables = 0, rowsKept = 0;
  for (const sport of Object.keys(HEADLINE_STATS)) {
    for (const division of ["d1", "d2", "d3"] as const) {
      const landing = await get(`/stats/${sport}/${division}`);
      if (!landing) continue;
      for (const [stat, path] of statLinks(landing)) {
        if (!HEADLINE_STATS[sport].test(stat)) continue;
        const html = await get(path);
        if (!html) continue;
        const through = throughDate(html);
        if (!through || Date.now() - Date.parse(`${through}T12:00:00Z`) > MAX_AGE_DAYS * 86_400_000) {
          console.log(`  ${sport}/${division} ${stat}: through ${through ?? "?"} — out of season, skipped`);
          continue;
        }
        // Ties at the cut-off stay in: «tied for 10th» is a top-10 placing.
        const all = parseRankingTable(html);
        const top = all.filter((r) => r.rank <= TOP);
        if (!top.length) continue; // out of season: no table yet
        tables++;
        rowsKept += top.length;
        console.log(`  ${sport}/${division} ${stat}: ${top.length} rows (1st ${top[0].team})`);
        if (dryRun) continue;
        await db.batch([
          { sql: "DELETE FROM team_rankings WHERE sport = ? AND division = ? AND stat = ?", params: [sport, division, stat] },
          ...top.map((r) => ({
            sql: `INSERT OR REPLACE INTO team_rankings
                    (sport, division, stat, rank, tied, team, team_key, value, value_label, games, fetched_on)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            // fetched_on holds the «through games» date: what the numbers are true as of.
            params: [sport, division, stat, r.rank, r.tied ? 1 : 0, r.team, teamKey(r.team), r.value, r.valueLabel, r.games, through],
          })),
        ]);
      }
    }
  }
  console.log(`\n${dryRun ? "[dry-run] " : ""}${tables} tables, ${rowsKept} rows kept (${today})`);
}

// Exact file name: the test file's name contains «ncaa-rankings» too.
if (process.argv[1] && /(^|[\\/])ncaa-rankings\.ts$/.test(process.argv[1])) {
  main().catch((err) => {
    console.error("NCAA rankings failed:", err);
    process.exit(1);
  });
}
