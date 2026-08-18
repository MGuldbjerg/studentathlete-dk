/**
 * Byg sport-inventaret: spørg hver skole hvilke hold den har.
 * ===========================================================
 *
 * Kørslen der gør gætteriet unødvendigt. For hver skole:
 *
 *   1. robots.txt hentes ÉN gang — både for at få lov og for at få skolens egne
 *      `Sitemap:`-linjer, som er den bedste kilde til hvor holdlisten ligger.
 *   2. Sitemap(s) hentes og filtreres til `/sports/<hold>/roster`. Det giver den
 *      PRÆCISE holdliste med rigtige kønsprefixer — inklusive de sportsgrene
 *      pipelinen aldrig har spurgt om (lacrosse, water polo, softball, cross
 *      country som selvstændigt hold).
 *   3. Er skolen på den nye Sidearm-platform (JSON-API), enumereres `sportId`
 *      én gang, så hvert hold får sit id gemt. Uden det ville scraperen skulle
 *      enumerere forfra ved hver kørsel.
 *   4. De kanoniske sportsgrene skolen IKKE har, skrives som `sponsored = 0` /
 *      `status = 'not_sponsored'` — det negative register. Herefter spørger
 *      scraperen aldrig igen om gymnastik på et sted uden gymnastik.
 *
 * Én gang om året er nok (hold nedlægges og oprettes mellem sæsoner, ikke midt i
 * dem), og `--max-age-days` styrer det. Den ugentlige scrape rører ikke
 * inventaret; den læser det.
 *
 * NB: en del skoler svarer **HTTP 404 med et gyldigt sitemap i kroppen** (både
 * High Point og Santa Clara gør det). Derfor accepterer vi kroppen når den
 * indeholder `<loc>`, uanset statuskoden — ellers ville vi smide den holdliste
 * væk vi kom efter.
 *
 * Kør:
 *   npx tsx pipeline/scrape/sport-inventory.ts --limit 50 --division D1
 *   npx tsx pipeline/scrape/sport-inventory.ts --school 412 --dry-run
 */

import { createD1Client, type D1Client } from "../lib/d1-client";
import { parseRobots, ALLOW_ALL, type RobotsPolicy } from "../lib/robots";
import { pipelineUserAgent } from "../../src/lib/site";
import {
  isSitemapIndex,
  rosterSitemaps,
  teamsFromXml,
  teamsFromHtml,
  unsponsoredSports,
  genderFromTeamSlug,
  sportFromTeamSlug,
  type DiscoveredTeam,
} from "./team-discovery";
import { apiProbeUrl, apiRosterUrl, isRosterApiProbe, parseApiRoster } from "./parsers/roster-api";
import { getAcademicYear } from "../lib/class-year";

const USER_AGENT = pipelineUserAgent();

/** Hvor mange `sportId` vi prøver på en API-skole, og hvornår vi stopper. */
const API_MAX_ID = 34;
const API_STOP_AFTER_EMPTY = 10;

/** Hvor mange under-sitemaps vi følger fra et sitemapindex. */
const MAX_CHILD_SITEMAPS = 6;

export interface SchoolRow {
  id: number;
  name: string;
  website: string;
  /**
   * Skolens atletiksite, når `website` peger på universitetets hovedside
   * (migration 042). Findes den, er DET adressen vi spørger — ellers ledte vi
   * efter rosters på en side der aldrig har haft nogen.
   */
  athletics_url?: string | null;
  division: string | null;
  platform_type: string | null;
}

interface Args {
  limit: number;
  division: string | null;
  maxAgeDays: number;
  dryRun: boolean;
  school: number | null;
  concurrency: number;
}

function parseArgs(argv: string[]): Args {
  const a: Args = { limit: 100, division: null, maxAgeDays: 365, dryRun: false, school: null, concurrency: 4 };
  for (let i = 0; i < argv.length; i++) {
    const v = argv[i + 1];
    if (argv[i] === "--limit" && v) { a.limit = parseInt(v, 10) || a.limit; i++; }
    else if (argv[i] === "--division" && v) { a.division = v; i++; }
    else if (argv[i] === "--max-age-days" && v) { const n = parseInt(v, 10); if (!Number.isNaN(n)) a.maxAgeDays = n; i++; }
    else if (argv[i] === "--school" && v) { a.school = parseInt(v, 10) || null; i++; }
    else if (argv[i] === "--concurrency" && v) { a.concurrency = Math.max(1, Math.min(8, parseInt(v, 10) || 4)); i++; }
    else if (argv[i] === "--dry-run") a.dryRun = true;
  }
  return a;
}

interface Fetched {
  status: number;
  body: string;
}

async function get(url: string, timeoutMs = 12000): Promise<Fetched> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "application/xml,application/json,text/plain,*/*" },
      signal: AbortSignal.timeout(timeoutMs),
      redirect: "follow",
    });
    return { status: res.status, body: await res.text() };
  } catch {
    return { status: 0, body: "" };
  }
}

function originOf(website: string): string | null {
  try {
    return new URL(website).origin;
  } catch {
    return null;
  }
}

/** robots.txt: politik + skolens egne sitemap-henvisninger, på ét request. */
async function loadRobots(origin: string): Promise<{ policy: RobotsPolicy; sitemaps: string[] }> {
  const { status, body } = await get(`${origin}/robots.txt`, 8000);
  if (status < 200 || status >= 300 || /^\s*</.test(body)) return { policy: ALLOW_ALL, sitemaps: [] };
  const sitemaps: string[] = [];
  for (const line of body.split(/\r?\n/)) {
    const m = /^\s*sitemap\s*:\s*(\S+)/i.exec(line);
    if (m) {
      try {
        sitemaps.push(new URL(m[1], origin).toString());
      } catch { /* ugyldig henvisning — ignorér */ }
    }
  }
  return { policy: parseRobots(body, USER_AGENT), sitemaps };
}

function looksLikeSitemap(body: string): boolean {
  return body.includes("<loc>");
}

/** Trin 2: hold fra skolens sitemap(s). */
async function teamsFromSitemaps(
  origin: string,
  policy: RobotsPolicy,
  hinted: string[],
): Promise<{ teams: DiscoveredTeam[]; requests: number }> {
  const candidates = [
    ...hinted,
    `${origin}/sitemap.xml`,
    `${origin}/sitemap_index.xml`,
    `${origin}/sitemap/sitemap_roster_1.xml`,
  ];
  const seen = new Set<string>();
  const teams = new Map<string, DiscoveredTeam>();
  let requests = 0;

  for (const url of candidates) {
    if (teams.size > 0) break;
    if (seen.has(url)) continue;
    seen.add(url);
    if (!policy.allows(new URL(url).pathname)) continue;

    const { body } = await get(url);
    requests++;
    if (!looksLikeSitemap(body)) continue;

    if (isSitemapIndex(body)) {
      const children = rosterSitemaps(body, url).slice(0, MAX_CHILD_SITEMAPS);
      for (const child of children) {
        if (seen.has(child)) continue;
        seen.add(child);
        if (!policy.allows(new URL(child).pathname)) continue;
        const sub = await get(child);
        requests++;
        for (const t of teamsFromXml(sub.body, child)) teams.set(t.teamSlug, t);
        await sleep(400);
      }
    } else {
      for (const t of teamsFromXml(body, url)) teams.set(t.teamSlug, t);
    }
    await sleep(400);
  }

  return { teams: [...teams.values()], requests };
}

interface ApiTeam extends DiscoveredTeam {
  apiSportId: number;
  seasonYear: number | null;
  players: number;
}

/** Trin 3: den nye platform — enumerér `sportId` og gem id'et pr. hold. */
async function teamsFromApi(
  origin: string,
  policy: RobotsPolicy,
): Promise<{ teams: ApiTeam[]; isApiHost: boolean; requests: number }> {
  const probe = apiProbeUrl(origin);
  if (!policy.allows(new URL(probe).pathname)) return { teams: [], isApiHost: false, requests: 0 };

  const first = await get(probe, 10000);
  let requests = 1;
  if (!isRosterApiProbe(first.status, first.body)) return { teams: [], isApiHost: false, requests };

  const teams: ApiTeam[] = [];
  let emptyStreak = 0;

  for (let id = 1; id <= API_MAX_ID; id++) {
    const url = apiRosterUrl(origin, id);
    const { body } = await get(url, 15000);
    requests++;
    await sleep(350);

    let json: unknown = null;
    try {
      json = JSON.parse(body);
    } catch {
      json = null;
    }
    const roster = parseApiRoster(json, origin);
    if (!roster || !roster.teamSlug) {
      emptyStreak++;
      // Hullerne i id-rækken er små (id 3 og 13 var tomme hos ACU); en lang
      // stribe betyder at vi er forbi skolens sidste hold.
      if (emptyStreak >= API_STOP_AFTER_EMPTY) break;
      continue;
    }
    emptyStreak = 0;

    const slug = roster.teamSlug;
    teams.push({
      teamSlug: slug,
      sport: sportFromTeamSlug(slug),
      gender: roster.gender ?? genderFromTeamSlug(slug),
      rosterUrl: `${origin}/sports/${slug}/roster`,
      latestSeason: roster.seasonYear,
      apiSportId: id,
      seasonYear: roster.seasonYear,
      players: roster.entries.length,
    });
  }

  return { teams, isApiHost: true, requests };
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export interface InventoryResult {
  schoolId: number;
  name: string;
  source: "sitemap" | "api" | "nav" | "none";
  teams: number;
  unsponsored: number;
  stale: number;
  requests: number;
}

/**
 * Byg inventaret for én skole. Skrivning sker her, så en enkelt skoles fejl
 * ikke ruller resten tilbage.
 */
export async function buildInventoryForSchool(
  db: D1Client,
  school: SchoolRow,
  opts: { dryRun: boolean; academicYear: number },
): Promise<InventoryResult> {
  const siteUrl = school.athletics_url ?? school.website;
  const origin = originOf(siteUrl);
  const base: InventoryResult = {
    schoolId: school.id, name: school.name, source: "none",
    teams: 0, unsponsored: 0, stale: 0, requests: 0,
  };
  if (!origin) return base;

  const { policy, sitemaps } = await loadRobots(origin);
  base.requests++;

  // Rækkefølgen er valgt efter pris: API-proben er ÉT request og afgør platformen
  // entydigt. Er skolen en API-vært, skal vi enumerere alligevel — ikke for at
  // finde holdene, men for at få hvert holds `sportId`, som scraperen ellers
  // skulle finde forfra hver uge.
  let teams: DiscoveredTeam[] = [];
  let source: InventoryResult["source"] = "none";

  const api = await teamsFromApi(origin, policy);
  base.requests += api.requests;
  const apiTeams = api.teams;
  const isApiHost = api.isApiHost;
  if (apiTeams.length > 0) source = "api";

  if (apiTeams.length === 0) {
    const sm = await teamsFromSitemaps(origin, policy, sitemaps);
    base.requests += sm.requests;
    teams = sm.teams;
    if (teams.length > 0) source = "sitemap";
  }

  // Sidste kilde, og den bredeste: skolens egen sport-menu. Den findes på hver
  // side og virker også hvor `/sitemap.xml` svarer med en 404-HTML-side (Santa
  // Clara), hvor sitemappet mangler, eller hvor det kun lister nyheder.
  if (teams.length === 0 && apiTeams.length === 0) {
    const home = await get(siteUrl, 20000);
    base.requests++;
    if (policy.allows(new URL(siteUrl).pathname) && home.body) {
      teams = teamsFromHtml(home.body, siteUrl);
      if (teams.length > 0) source = "nav";
    }
  }

  const merged = new Map<string, DiscoveredTeam & { apiSportId?: number; seasonYear?: number | null }>();
  for (const t of teams) merged.set(t.teamSlug, t);
  for (const t of apiTeams) merged.set(t.teamSlug, t);

  // Et hold hvis nyeste offentliggjorte roster er flere år gammel, er et program
  // der ligger stille (ACU's herre-cross country svarer med 2016-rosteren).
  // Det skal IKKE indlæses som aktivt hold, men det er heller ikke "findes ikke".
  const list = [...merged.values()];
  const fresh = list.filter((t) => {
    // API'et melder sæsonen på selve rosteren; sitemappet afslører den gennem
    // sæson-URL'erne. Siger ingen af dem noget, beholder vi holdet.
    const y = (t as { seasonYear?: number | null }).seasonYear ?? t.latestSeason;
    if (y === undefined || y === null) return true;
    return y >= opts.academicYear - 1;
  });
  base.stale = list.length - fresh.length;
  base.teams = fresh.length;
  base.source = source;

  if (fresh.length === 0 || opts.dryRun) return base;

  const now = new Date().toISOString().slice(0, 19).replace("T", " ");

  for (const t of fresh) {
    const apiId = (t as { apiSportId?: number }).apiSportId ?? null;
    await db.execute(
      `INSERT INTO roster_checks
         (school_id, sport, team_slug, gender, roster_url, status, sponsored,
          inventory_source, inventory_at, api_sport_id)
       VALUES (?, ?, ?, ?, ?, 'pending', 1, ?, ?, ?)
       ON CONFLICT(school_id, team_slug) DO UPDATE SET
         sport = excluded.sport,
         gender = COALESCE(excluded.gender, roster_checks.gender),
         roster_url = excluded.roster_url,
         sponsored = 1,
         inventory_source = excluded.inventory_source,
         inventory_at = excluded.inventory_at,
         api_sport_id = COALESCE(excluded.api_sport_id, roster_checks.api_sport_id),
         -- Et hold der var markeret "findes ikke" og nu findes, skal tjekkes igen.
         status = CASE WHEN roster_checks.status = 'not_sponsored' THEN 'pending' ELSE roster_checks.status END,
         checked_at = CASE WHEN roster_checks.status = 'not_sponsored' THEN NULL ELSE roster_checks.checked_at END`,
      [school.id, t.sport, t.teamSlug, t.gender, t.rosterUrl, source, now, apiId],
    );
  }

  // ── Det negative register — kun når holdlisten er troværdig ──────────────
  //
  // Faren ved at skrive "skolen har ikke gymnastik" er præcis den fejl vi er ved
  // at rette: en usynlig atlet. Finder vi kun 3 hold, er det langt mere
  // sandsynligt at kilden var mangelfuld (en beskåret menu) end at skolen kun har
  // tre hold. NCAA D1 kræver mindst 14 sportsgrene, D2 ti, D3 ti — så et gulv på
  // otte hold er konservativt, og under det skriver vi INGEN negative rækker og
  // beholder de gamle gætte-rækker, så resten stadig bliver forsøgt.
  const TRUSTWORTHY_MIN_TEAMS = 8;
  const trustworthy = fresh.length >= TRUSTWORTHY_MIN_TEAMS;
  const missing = trustworthy ? unsponsoredSports(fresh) : [];
  for (const sport of missing) {
    await db.execute(
      `INSERT INTO roster_checks
         (school_id, sport, team_slug, gender, roster_url, status, athletes_found,
          error_message, sponsored, inventory_source, inventory_at)
       VALUES (?, ?, ?, NULL, NULL, 'not_sponsored', 0, NULL, 0, ?, ?)
       ON CONFLICT(school_id, team_slug) DO UPDATE SET
         status = 'not_sponsored',
         sponsored = 0,
         athletes_found = 0,
         error_message = NULL,
         inventory_source = excluded.inventory_source,
         inventory_at = excluded.inventory_at`,
      [school.id, sport, sport, source, now],
    );
  }
  base.unsponsored = missing.length;

  // Gæt fra før inventaret: rækker vi ikke har genkendt som hold. De ville ellers
  // blive tjekket parallelt med det rigtige hold (fx team_slug='tennis' ved siden
  // af 'mens-tennis' og 'womens-tennis') og fylde kørslen med dubletter.
  // Kun når holdlisten er troværdig — ellers er de gamle rækker det bedste vi har.
  if (trustworthy) {
    await db.execute(
      `DELETE FROM roster_checks WHERE school_id = ? AND inventory_source = 'legacy'`,
      [school.id],
    );
  }

  if (isApiHost && school.platform_type !== "sidearm_api") {
    await db.execute(`UPDATE schools SET platform_type = 'sidearm_api' WHERE id = ?`, [school.id]);
  }

  return base;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const db = createD1Client();
  const academicYear = getAcademicYear();

  const divisionFilter = args.division
    ? args.division.startsWith("NCAA") || args.division.startsWith("NAIA") || args.division.startsWith("NJCAA")
      ? args.division
      : `NCAA ${args.division}`
    : "%";

  const where = args.school
    ? "s.id = ?"
    : `s.website IS NOT NULL AND s.division LIKE ?
       AND NOT EXISTS (
         SELECT 1 FROM roster_checks rc
         WHERE rc.school_id = s.id
           AND rc.inventory_at IS NOT NULL
           AND datetime(rc.inventory_at, '+' || ? || ' days') > datetime('now')
       )`;
  const params = args.school ? [args.school] : [divisionFilter, args.maxAgeDays];

  const schools = await db.query<SchoolRow>(
    `SELECT s.id, s.name, s.website, s.athletics_url, s.division, s.platform_type
     FROM schools s
     LEFT JOIN (SELECT university, COUNT(*) c FROM athletes WHERE active = 1 GROUP BY university) a
       ON a.university = s.name
     WHERE ${where}
     ORDER BY CASE WHEN a.c > 0 THEN 0 ELSE 1 END,
              CASE s.division WHEN 'NCAA D1' THEN 0 WHEN 'NCAA D2' THEN 1 WHEN 'NCAA D3' THEN 2 ELSE 3 END,
              s.id
     LIMIT ?`,
    [...params, args.limit],
  );

  const rows = schools.results;
  console.log(
    `Sport-inventar: ${rows.length} skole(r)` +
      `${args.dryRun ? " [dry-run]" : ""} · akademisk år ${academicYear} · samtidighed ${args.concurrency}\n`,
  );
  if (rows.length === 0) {
    console.log("Intet at gøre — alle valgte skoler har et inventar der er nyere end grænsen.");
    return;
  }

  const totals = { sitemap: 0, api: 0, nav: 0, none: 0, teams: 0, unsponsored: 0, stale: 0, requests: 0 };
  let index = 0;

  async function worker(): Promise<void> {
    for (;;) {
      const i = index++;
      if (i >= rows.length) return;
      const school = rows[i];
      try {
        const r = await buildInventoryForSchool(db, school, { dryRun: args.dryRun, academicYear });
        totals[r.source]++;
        totals.teams += r.teams;
        totals.unsponsored += r.unsponsored;
        totals.stale += r.stale;
        totals.requests += r.requests;
        const flag = r.source === "none" ? "✗" : r.teams > 0 && r.unsponsored === 0 ? "?" : r.source === "api" ? "⚡" : "✓";
        console.log(
          `  ${flag} ${school.name} (${school.division ?? "-"}): ${r.teams} hold` +
            `${r.unsponsored ? `, ${r.unsponsored} uden hold` : ""}` +
            `${r.stale ? `, ${r.stale} henlagt program` : ""} [${r.source}, ${r.requests} req]`,
        );
      } catch (err) {
        console.error(`  ! ${school.name}: ${err instanceof Error ? err.message : String(err)}`);
      }
      await sleep(200);
    }
  }

  await Promise.all(Array.from({ length: args.concurrency }, () => worker()));

  console.log(
    `\nFærdig. Hold fundet: ${totals.teams} · negative rækker: ${totals.unsponsored} · ` +
      `henlagte programmer: ${totals.stale}\n` +
      `Kilde: sitemap ${totals.sitemap} · api ${totals.api} · nav ${totals.nav} · ingen ${totals.none} · requests ${totals.requests}`,
  );
  if (totals.none > 0) {
    console.log(
      `  ℹ ${totals.none} skole(r) svarede hverken med sitemap eller API. Typisk fordi ` +
        `\`website\` peger på universitetets hovedsite frem for atletiksitet — de beholder ` +
        `deres gamle 'legacy'-rækker og gætte-adfærden.`,
    );
  }
}

// Entrypoint-vagt: import må ALDRIG starte en kørsel (jf. post-social.ts, hvor et
// import kunne have publiceret rigtige opslag).
if (process.argv[1] && /sport-inventory\.ts$/.test(process.argv[1])) {
  main().catch((err) => {
    console.error("Sport-inventar fejlede:", err);
    process.exit(1);
  });
}
