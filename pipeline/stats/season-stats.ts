/**
 * The athlete's season statistics from the school's own stats page
 * (PLAN-richer-articles.md, step 5.2).
 * ===================================================================
 *
 * Fetched when a draft is written — one page per article, from Actions, never
 * on a reader's page view — and turned into a dated records line:
 *
 *   «Chowan's season statistics (stats page, 8 October 2026): Robbie Deighan
 *    has 11 goals and 3 assists in 11 games — the team lead in goals»
 *
 * Both Sidearm layouts render the season tables on the server (checked 8
 * October 2026 on Chowan, Florida National and Georgia Southern): the classic
 * one captions them («Individual Overall Offensive Statistics»), the new one
 * does not, but the columns are the same. So a table is recognised by its
 * columns, the first one of a kind is the overall table (the conference one
 * follows it), and the athlete's row by an exact full-name match — or nothing.
 *
 * Soccer and field hockey only: their tables share these columns. The page
 * is the school's current totals, so the line is dated by the fetch and says
 * «has», not «after this match».
 */

export const STATS_SPORTS = new Set(["soccer", "field-hockey"]);

/** The stats page next to a roster: …/sports/mens-soccer/roster → …/stats/2026. */
export function statsUrl(rosterUrl: string, season: number): string | null {
  const m = /^(https?:\/\/[^/]+\/sports\/[^/]+)\/roster\/?(\?.*)?$/i.exec(rosterUrl.trim());
  return m ? `${m[1]}/stats/${season}` : null;
}

function text(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#0?39;|&apos;|&rsquo;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** «Deighan, Robbie» and «Robbie Deighan» are the same key. */
export function nameKey(name: string): string {
  const t = name.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[’`]/g, "'");
  const [last, first] = t.includes(",") ? t.split(",", 2) : [null, t];
  const full = last !== null ? `${first} ${last}` : first;
  return full.replace(/[^a-z' -]/g, " ").replace(/\s+/g, " ").trim();
}

export interface StatsRow {
  name: string;
  cells: Record<string, string>;
}

/**
 * The player's name in the Player cell. Sidearm writes it as «Last, First»,
 * often twice in one cell (a link and a short form); read as one string that
 * becomes «Deighan, Robbie Deighan, Robbie». So the first ELEMENT holding a
 * «Last, First» is the name; a cell with no elements is taken whole.
 */
function cellName(cellHtml: string): string | null {
  const parts = [...cellHtml.matchAll(/>([^<>]+)</g)].map((m) => text(m[1])).filter(Boolean);
  const named = parts.find((p) => /^[^,]+,\s*\S/.test(p)) ?? (/^[^,<]+,\s*\S/.test(text(cellHtml)) ? text(cellHtml) : null);
  return named && /[A-Za-z]/.test(named) ? named : null;
}

/** Every table whose header has these columns, as rows keyed by column. */
function tablesWith(html: string, required: string[]): StatsRow[][] {
  const out: StatsRow[][] = [];
  for (const t of html.match(/<table[\s\S]*?<\/table>/gi) ?? []) {
    const headers = [...t.matchAll(/<th[^>]*>([\s\S]*?)<\/th>/gi)].map((m) => text(m[1]).toLowerCase());
    if (!headers.includes("player") || !required.every((r) => headers.includes(r))) continue;
    const playerAt = headers.indexOf("player");
    const rows: StatsRow[] = [];
    for (const tr of t.match(/<tr[\s\S]*?<\/tr>/gi) ?? []) {
      const raw = [...tr.matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((m) => m[1]);
      if (raw.length !== headers.length) continue;
      const cells = raw.map(text);
      const name = cellName(raw[playerAt]);
      if (!name || /^(total|opponents?)/i.test(cells[playerAt] ?? "")) continue;
      rows.push({ name, cells: Object.fromEntries(headers.map((h, i) => [h, cells[i]])) });
    }
    if (rows.length) out.push(rows);
  }
  return out;
}

export interface SeasonTables {
  outfield: StatsRow[];
  keepers: StatsRow[];
}

/** The overall (first) outfield and goalkeeping tables on a stats page. */
export function parseSeasonTables(html: string): SeasonTables {
  return {
    outfield: tablesWith(html, ["gp", "g", "a", "pts"])[0] ?? [],
    keepers: tablesWith(html, ["gp", "ga", "sv"])[0] ?? [],
  };
}

const num = (v: string | undefined) => (v && /^\d+(\.\d+)?$/.test(v.trim()) ? Number(v) : null);
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** «the team lead» / «tied for the team lead» in one column, or null. */
function teamLead(rows: StatsRow[], me: StatsRow, col: string): string | null {
  const mine = num(me.cells[col]);
  if (!mine) return null;
  const best = Math.max(...rows.map((r) => num(r.cells[col]) ?? 0));
  if (mine < best) return null;
  const tied = rows.filter((r) => num(r.cells[col]) === best).length > 1;
  return tied ? "tied for the team lead" : "the team lead";
}

/**
 * The records line for one athlete, or null when the athlete is not on the
 * page (exact full-name match) or has played no game. Goalkeepers get their
 * goalkeeping line; everyone else goals, assists and any team lead.
 */
export function seasonLine(
  athleteName: string,
  school: string,
  tables: SeasonTables,
  fetchedOn: Date,
): string | null {
  const key = nameKey(athleteName);
  const date = fetchedOn.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
  const head = `${school}'s season statistics (stats page, ${date}): ${athleteName}`;

  const keeper = tables.keepers.find((r) => nameKey(r.name) === key);
  const kGames = num(keeper?.cells["gp"]);
  if (keeper && kGames) {
    const parts = [plural(kGames, "game", "games") + " in goal"];
    const saves = num(keeper.cells["sv"]);
    if (saves !== null) parts.push(plural(saves, "save", "saves"));
    const gaa = keeper.cells["gaa"];
    if (gaa && /^\d*\.\d+$/.test(gaa)) parts.push(`a goals-against average of ${gaa}`);
    const sho = num((keeper.cells["sho"] ?? keeper.cells["sho/cbo"] ?? "").split(/[-/]/)[0]);
    if (sho) parts.push(plural(sho, "shutout", "shutouts"));
    return `${head} has ${parts.join(", ")}`;
  }

  const me = tables.outfield.find((r) => nameKey(r.name) === key);
  const games = num(me?.cells["gp"]);
  if (!me || !games) return null;
  const goals = num(me.cells["g"]) ?? 0;
  const assists = num(me.cells["a"]) ?? 0;
  const lead = goals ? teamLead(tables.outfield, me, "g") : null;
  return (
    `${head} has ${plural(goals, "goal", "goals")} and ${plural(assists, "assist", "assists")} in ` +
    `${plural(games, "game", "games")}${lead ? ` — ${lead} in goals` : ""}`
  );
}

// ─── Tennis (2026-10-12) ────────────────────────────────────────────────────
//
// Sidearm's classic tennis stats page has no «Player» column: the first column
// is headed «Singles» or «Doubles», and the cells are win-loss records
// («3-0»). The first table of each kind is the overall one (the conference
// tables follow). The new (Nuxt) layout renders these tables in the browser,
// so it yields nothing here — and nothing is guessed.

export interface TennisTables {
  singles: StatsRow[];
  doubles: StatsRow[];
}

function recordTable(html: string, first: string): StatsRow[] {
  for (const t of html.match(/<table[\s\S]*?<\/table>/gi) ?? []) {
    // The FIRST header row names the columns; «vs Ranked» spans two (Nat'l,
    // Reg'l, in a second header row), so a spanned header counts as many.
    const firstRow = /<tr[\s\S]*?<\/tr>/i.exec(t)?.[0] ?? "";
    const headers = [...firstRow.matchAll(/<th([^>]*)>([\s\S]*?)<\/th>/gi)].flatMap((m) => {
      const span = Number(/colspan="?(\d+)/i.exec(m[1])?.[1] ?? 1);
      const name = text(m[2]).toLowerCase();
      return span > 1 ? Array.from({ length: span }, (_, i) => `${name} ${i + 1}`) : [name];
    });
    if (headers[0] !== first || !headers.includes("overall")) continue;
    const rows: StatsRow[] = [];
    for (const tr of t.match(/<tr[\s\S]*?<\/tr>/gi) ?? []) {
      const raw = [...tr.matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((m) => m[1]);
      if (raw.length !== headers.length) continue;
      const name = cellName(raw[0]);
      if (!name || /^(total|opponents?)/i.test(text(raw[0]))) continue;
      // «&mdash;» is the page's «no value»: kept as empty, never as text.
      const cells = raw.map((c) => text(c).replace(/&mdash;|&ndash;/g, "—").trim().replace(/^[—–-]$/, ""));
      rows.push({ name, cells: Object.fromEntries(headers.map((h, i) => [h, cells[i]])) });
    }
    if (rows.length) return rows;
  }
  return [];
}

export function parseTennisTables(html: string): TennisTables {
  return { singles: recordTable(html, "singles"), doubles: recordTable(html, "doubles") };
}

/** «3-1» → [3, 1]; anything else → [0, 0]. */
export function winLoss(v: string | undefined): [number, number] {
  const m = /^(\d+)-(\d+)$/.exec((v ?? "").trim());
  return m ? [Number(m[1]), Number(m[2])] : [0, 0];
}

/** The athlete's tennis records, or null when not on the page or no match played. */
export function tennisRecord(athleteName: string, t: TennisTables): { cells: Record<string, string>; matches: number } | null {
  const key = nameKey(athleteName);
  const s = t.singles.find((r) => nameKey(r.name) === key);
  const d = t.doubles.find((r) => nameKey(r.name) === key);
  const cells: Record<string, string> = {};
  if (s) { cells.singles = s.cells["overall"] ?? ""; cells.dual = s.cells["dual"] ?? ""; cells.conf = s.cells["conf"] ?? ""; cells.streak = s.cells["streak"] ?? ""; }
  if (d) cells.doubles = d.cells["overall"] ?? "";
  const matches = [...winLoss(cells.singles), ...winLoss(cells.doubles)].reduce((a, b) => a + b, 0);
  return matches > 0 ? { cells, matches } : null;
}

/** The records sentence, in the same form as seasonLine so the profile reads both alike. */
export function tennisLine(athleteName: string, school: string, cells: Record<string, string>, fetchedOn: Date): string {
  const date = fetchedOn.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
  const parts: string[] = [];
  if (winLoss(cells.singles).some((n) => n > 0)) parts.push(`a ${cells.singles} singles record`);
  if (winLoss(cells.doubles).some((n) => n > 0)) parts.push(`${parts.length ? "" : "a "}${cells.doubles} in doubles`);
  return `${school}'s season statistics (stats page, ${date}): ${athleteName} has ${parts.join(" and ")}`;
}

/**
 * The season a Sidearm stats page says it covers («2026-27 Men's Tennis
 * Cumulative Statistics»), or null. Sidearm serves the CURRENT season for an
 * unknown year in the URL, so the page's own heading is the check.
 */
export function pageSeason(html: string): string | null {
  const m = /<h1[^>]*>[^<]*?(\d{4}-\d{2})\b[^<]*?Statistics/i.exec(html) ?? /(\d{4}-\d{2})[^<]{0,60}?Cumulative Statistics/i.exec(html);
  return m ? m[1] : null;
}

// ─── Team context (PLAN-content-floor-uk.md P2, 2026-10-26) ─────────────────
//
// The same page also carries the team: «Total» and «Opponent(s)» rows under
// the overall offensive table, and a game-by-game results table (Date,
// Opponent, W/L, Score, Overall «(6-3-5, 2-1-1)», …, «Goals Scored [Assist]»
// as «Wilfer Bustamante (10) (Connor Stout)»). Read from the same HTML the
// fill already holds; src/lib/team-context.ts writes the sentences.

export interface GameResult {
  date: string;            // YYYY-MM-DD
  opponent: string;
  away: boolean;
  result: "W" | "L" | "T";
  us: number;
  them: number;
  overall: WLTParsed | null;
  conf: WLTParsed | null;
  scorers: string[];       // name keys, one per goal entry
}
type WLTParsed = { w: number; l: number; t: number };

export interface TeamPage {
  total: Record<string, string> | null;
  opponent: Record<string, string> | null;
  results: GameResult[];   // played games only, in page order
}

/** «6-3-5» / «7-7» → {w, l, t}. */
function parseWlt(s: string | undefined): WLTParsed | null {
  const m = /(\d+)-(\d+)(?:-(\d+))?/.exec(s ?? "");
  return m ? { w: Number(m[1]), l: Number(m[2]), t: Number(m[3] ?? 0) } : null;
}

/** «at #12 Duke *» → «Duke», away. */
function cleanOpponent(raw: string): { opponent: string; away: boolean } {
  const away = /^(at|@)\s/i.test(raw);
  const opponent = raw
    .replace(/^(at|vs\.?|@)\s+/i, "")
    .replace(/#\d+\s*/g, "")
    .replace(/\s*\([^)]*\)\s*/g, " ")
    .replace(/[*^]+/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return { opponent, away };
}

/** «Wilfer Bustamante (10) (Connor Stout) Landon Hill (1)» → the scorers' name keys. */
export function scorersOf(cell: string): string[] {
  return [...cell.matchAll(/([^()]+?)\s*\((\d+)\)(?:\s*\([^()]*\))?/g)]
    .map((m) => nameKey(m[1].replace(/^[\s,;]+/, "")))
    .filter(Boolean);
}

export function parseTeamPage(html: string): TeamPage {
  let total: Record<string, string> | null = null;
  let opponent: Record<string, string> | null = null;
  const results: GameResult[] = [];
  for (const t of html.match(/<table[\s\S]*?<\/table>/gi) ?? []) {
    const headers = [...t.matchAll(/<th[^>]*>([\s\S]*?)<\/th>/gi)].map((m) => text(m[1]).toLowerCase());
    const rows = (t.match(/<tr[\s\S]*?<\/tr>/gi) ?? []).map((tr) => [...tr.matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((m) => text(m[1])));
    // The overall offensive table: its Total and Opponent rows (the first such table only).
    if (!total && headers.includes("player") && ["gp", "g", "a", "pts"].every((h) => headers.includes(h))) {
      const at = headers.indexOf("player");
      for (const cells of rows) {
        if (cells.length !== headers.length) continue;
        const asRow = () => Object.fromEntries(headers.map((h, i) => [h, cells[i]]));
        // «Total» sits in the Player cell on some pages, in the «#» cell on others (Bucknell field hockey).
        const label = `${cells[at] ?? ""} ${cells[0] ?? ""}`.trim();
        if (/^total\b/i.test(label)) total = asRow();
        else if (/^opponents?\b/i.test(label)) opponent = asRow();
      }
      continue;
    }
    // The results table, recognised by its columns (the new layout has no captions).
    if (!results.length && ["date", "opponent", "w/l", "score"].every((h) => headers.includes(h))) {
      const ix = (h: string) => headers.indexOf(h);
      const goalsAt = headers.findIndex((h) => h.startsWith("goals scored") || h === "goals");
      for (const cells of rows) {
        if (cells.length !== headers.length) continue;
        const d = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(cells[ix("date")] ?? "");
        const res = (cells[ix("w/l")] ?? "").trim().toUpperCase();
        const sc = /^(\d+)-(\d+)/.exec(cells[ix("score")] ?? "");
        if (!d || !sc || !["W", "L", "T"].includes(res)) continue;
        const overallCell = cells[ix("overall")];
        const confCell = ix("conference") >= 0 ? cells[ix("conference")] : undefined;
        results.push({
          date: `${d[3]}-${d[1].padStart(2, "0")}-${d[2].padStart(2, "0")}`,
          ...cleanOpponent(cells[ix("opponent")] ?? ""),
          result: res as GameResult["result"],
          us: Number(sc[1]), them: Number(sc[2]),
          overall: parseWlt(overallCell),
          conf: parseWlt(confCell) ?? parseWlt((overallCell ?? "").split(",")[1]),
          scorers: goalsAt >= 0 ? scorersOf(cells[goalsAt] ?? "") : [],
        });
      }
    }
  }
  return { total, opponent, results };
}

/** Competition rank of `mine` among the team's values (higher is better). */
function teamRank(values: number[], mine: number): { rank: number; tied: boolean } {
  return { rank: values.filter((v) => v > mine).length + 1, tied: values.filter((v) => v === mine).length > 1 };
}

/** «949» or «34:08» → minutes as a number. */
function minutes(v: string | undefined): number {
  const s = (v ?? "").trim();
  const mm = /^(\d+):\d{2}$/.exec(s);
  if (mm) return Number(mm[1]);
  return /^\d+$/.test(s) ? Number(s) : 0;
}

/**
 * The stored team context for one athlete (src/lib/team-context.ts), or null
 * when the page gives no team facts at all.
 */
export function teamContextFor(athleteName: string, school: string, tables: SeasonTables, page: TeamPage): import("../../src/lib/team-context").TeamContext | null {
  const int = (v: string | undefined) => (v && /^\d+$/.test(v.trim()) ? Number(v) : null);
  const played = page.results;
  const latest = played[played.length - 1] ?? null;
  const key = nameKey(athleteName);
  const me = tables.outfield.find((r) => nameKey(r.name) === key);
  const ranks: import("../../src/lib/team-context").TeamContext["ranks"] = {};
  if (me) {
    const cols: Array<["g" | "a" | "pts" | "gs", string]> = [["g", "g"], ["a", "a"], ["pts", "pts"], ["gs", "gs"]];
    for (const [k, col] of cols) {
      const mine = int(me.cells[col]);
      if (!mine) continue;
      ranks[k] = { value: mine, ...teamRank(tables.outfield.map((r) => int(r.cells[col]) ?? 0), mine) };
    }
    const myMin = minutes(me.cells["min"]);
    if (myMin) ranks.min = { value: myMin, ...teamRank(tables.outfield.map((r) => minutes(r.cells["min"])), myMin) };
  }
  const scored = played.filter((g) => g.scorers.includes(key));
  const anyScorers = played.some((g) => g.scorers.length > 0);
  const ctx = {
    team: school,
    games: int(page.total?.["gp"]) ?? (played.length || null),
    record: latest?.overall ?? null,
    conf: latest?.conf ?? null,
    goals: int(page.total?.["g"]),
    against: int(page.opponent?.["g"]),
    last: latest ? { date: latest.date, opponent: latest.opponent, away: latest.away, result: latest.result, us: latest.us, them: latest.them } : null,
    ranks,
    scoredIn: anyScorers && scored.length
      ? { games: scored.length, last: { date: scored[scored.length - 1].date, opponent: scored[scored.length - 1].opponent } }
      : null,
  };
  return ctx.games || ctx.record || ctx.last ? ctx : null;
}

/**
 * The year an archived stats page covers, from its <title> («2025 Men's Soccer
 * Cumulative Statistics - Furman University»), or null. Sidearm answers an
 * unknown year with another page (the schedule), so the title is the check.
 */
export function archiveYear(html: string): number | null {
  const m = /<title>\s*(\d{4})(?:-\d{2})?\s[^<]*?statistics/i.exec(html);
  return m ? Number(m[1]) : null;
}
