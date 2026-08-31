/**
 * Find atletiksitet for de skoler hvor `schools.website` er universitetet.
 * =======================================================================
 *
 * Sport-inventaret fandt ingen hold på 435 skoler — 20 i D1, 80 i D2 og 258 i D3.
 * Ikke fordi deres platform var ukendt, men fordi vi spurgte den rigtige skole på
 * den forkerte adresse: `website` er universitetets hovedside, og rosters ligger
 * på et selvstændigt værtsnavn (Kalamazoo College står som `www.kzoo.edu`, men
 * holdene ligger på `hornetathletics.com`).
 *
 * Kørslen: hent universitetets forside → saml kandidater (links der peger på
 * `/sports/<hold>/roster`, derefter værtsnavne der ligner atletiksites, derefter
 * tre mønster-gæt) → BEKRÆFT hver kandidat ved at hente den → gem kun en
 * bekræftet adresse → byg inventaret med det samme.
 *
 * En kandidat bekræftes ved at den selv leverer mindst ét hold, eller svarer på
 * roster-API'et. Et gæt gemmes ALDRIG. Det er vigtigere her end noget andet sted
 * i pipelinen: en forkert adresse ville få scraperen til at hente en FREMMED
 * skoles hold og skrive dem som vores skoles.
 *
 * `athletics_checked_at` sættes uanset udfald, så vi ikke leder forgæves efter de
 * samme skoler hver gang — mange små skoler HAR ikke et selvstændigt atletiksite.
 *
 * Kør:
 *   npx tsx pipeline/scrape/find-athletics-site.ts --limit 50 [--division D3] [--dry-run]
 */

import { createD1Client, type D1Client } from "../lib/d1-client";
import { parseRobots, ALLOW_ALL, type RobotsPolicy } from "../lib/robots";
import { pipelineUserAgent } from "../../src/lib/site";
import { athleticsCandidates, candidatesFromIdentity, siteIdentifiesAs } from "./athletics-site";
import { teamsFromHtml } from "./team-discovery";
import { apiProbeUrl, isRosterApiProbe } from "./parsers/roster-api";
import { buildInventoryForSchool, type SchoolRow } from "./sport-inventory";
import { getAcademicYear } from "../lib/class-year";
import { divisionPattern, sportsForDivision } from "../lib/divisions";

const USER_AGENT = pipelineUserAgent();
const MAX_CANDIDATES = 5;

interface Args {
  limit: number;
  division: string | null;
  dryRun: boolean;
  school: number | null;
}

function parseArgs(argv: string[]): Args {
  const a: Args = { limit: 50, division: null, dryRun: false, school: null };
  for (let i = 0; i < argv.length; i++) {
    const v = argv[i + 1];
    if (argv[i] === "--limit" && v) { a.limit = parseInt(v, 10) || a.limit; i++; }
    else if (argv[i] === "--division" && v) { a.division = v; i++; }
    else if (argv[i] === "--school" && v) { a.school = parseInt(v, 10) || null; i++; }
    else if (argv[i] === "--dry-run") a.dryRun = true;
  }
  return a;
}

async function get(url: string, timeoutMs = 15000): Promise<{ status: number; body: string }> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(timeoutMs),
      redirect: "follow",
    });
    return { status: res.status, body: await res.text() };
  } catch {
    return { status: 0, body: "" };
  }
}

async function robotsPolicy(origin: string): Promise<RobotsPolicy> {
  const { status, body } = await get(`${origin}/robots.txt`, 8000);
  if (status < 200 || status >= 300 || /^\s*</.test(body)) return ALLOW_ALL;
  return parseRobots(body, USER_AGENT);
}

/**
 * Er dette virkelig et atletiksite? Kandidaten skal selv bevise det: hold i
 * menuen, eller et roster-API der svarer.
 */
export async function verifyAthleticsOrigin(
  origin: string,
  /**
   * Kun for GÆTTEDE kandidater: sitet skal også sige at det er DENNE skole.
   * Uden identiteten godkendte hold-prøven alene St. Lawrence Universitys site
   * som Lurleen B. Wallace Community Colleges — begge hedder "Saints".
   * Kandidater fundet som link PÅ skolens egen hovedside behøver den ikke:
   * der har skolen selv peget.
   */
  identity?: { name: string; city: string | null },
): Promise<{ ok: boolean; teams: number; api: boolean }> {
  const policy = await robotsPolicy(origin);
  if (!policy.allows("/")) return { ok: false, teams: 0, api: false };

  const home = await get(origin, 20000);
  if (identity && (!home.body || !siteIdentifiesAs(home.body, identity.name, identity.city))) {
    return { ok: false, teams: 0, api: false };
  }
  const teams = home.body ? teamsFromHtml(home.body, origin).length : 0;
  if (teams > 0) return { ok: true, teams, api: false };

  if (policy.allows("/api/v2/rosters")) {
    const probe = await get(apiProbeUrl(origin), 10000);
    if (isRosterApiProbe(probe.status, probe.body)) return { ok: true, teams: 0, api: true };
  }
  return { ok: false, teams: 0, api: false };
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const db = createD1Client();
  const academicYear = getAcademicYear();

  const divisionFilter = divisionPattern(args.division);

  // Skolerne der mangler: har en hovedside, intet bekræftet atletiksite, og INTET
  // inventar (kun 'legacy'-gæt). Skoler med danske/britiske atleter først —
  // de koster mest at være blind på.
  const where = args.school
    ? "s.id = ?"
    : `(s.website IS NOT NULL OR s.nickname IS NOT NULL)
       AND s.athletics_url IS NULL
       AND s.athletics_checked_at IS NULL
       AND s.division LIKE ?
       AND NOT EXISTS (
         SELECT 1 FROM roster_checks rc
         WHERE rc.school_id = s.id AND rc.inventory_source IN ('sitemap','nav','api')
       )`;
  const params: (string | number)[] = args.school ? [args.school] : [divisionFilter];

  const rows = await db.query<SchoolRow>(
    `SELECT s.id, s.name, s.website, s.athletics_url, s.division, s.platform_type, s.nickname, s.city
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

  console.log(
    `Atletiksite-søgning: ${rows.results.length} skole(r)${args.dryRun ? " [dry-run]" : ""}\n`,
  );

  let found = 0, none = 0, teamsTotal = 0;

  for (const school of rows.results) {
    // To veje ind. Har skolen en hovedside, læser vi dens links (den præcise
    // vej). Har den ikke — hele NJCAA-tieren — står vi kun med navn og
    // kælenavn og må gætte efter college-verdenens domænekonventioner.
    //
    // Forskellen er i PRÆCISION, ikke i sikkerhed: begge veje ender i
    // `verifyAthleticsOrigin`, og en adresse gemmes først når den selv har
    // leveret hold eller svaret på roster-API'et.
    const nickname = (school as { nickname?: string | null }).nickname ?? null;
    const city = (school as { city?: string | null }).city ?? null;
    let candidates: string[];

    if (school.website) {
      let origin: string;
      try {
        origin = new URL(school.website).origin;
      } catch {
        continue;
      }
      const policy = await robotsPolicy(origin);
      const home = policy.allows("/") ? await get(school.website, 20000) : { status: 0, body: "" };
      candidates = home.body ? athleticsCandidates(home.body, school.website) : [];
    } else {
      candidates = candidatesFromIdentity(school.name, nickname);
    }
    if (candidates.length === 0) continue;

    let hit: string | null = null;
    for (const candidate of candidates.slice(0, MAX_CANDIDATES)) {
      // Gættede kandidater (ingen hovedside) skal bevise deres identitet.
      const v = await verifyAthleticsOrigin(
        candidate,
        school.website ? undefined : { name: school.name, city },
      );
      if (v.ok) {
        hit = candidate;
        console.log(
          `  ✓ ${school.name} (${school.division ?? "-"}): ${candidate}` +
            ` [${v.api ? "api" : `${v.teams} hold i menuen`}]`,
        );
        break;
      }
      await new Promise((r) => setTimeout(r, 400));
    }

    if (!hit) {
      none++;
      console.log(`  ✗ ${school.name} (${school.division ?? "-"}): intet fundet (${candidates.length} kandidater)`);
    }

    if (!args.dryRun) {
      await db.execute(
        `UPDATE schools SET athletics_url = COALESCE(?, athletics_url),
                            athletics_checked_at = datetime('now') WHERE id = ?`,
        [hit, school.id],
      );
      if (hit) {
        // Byg inventaret med det samme: skolen er blind indtil den har et.
        const r = await buildInventoryForSchool(
          db,
          { ...school, athletics_url: hit },
          { dryRun: false, academicYear, sports: sportsForDivision(school.division) },
        );
        teamsTotal += r.teams;
        console.log(`      → inventar: ${r.teams} hold, ${r.unsponsored} uden hold [${r.source}]`);
      }
    }
    if (hit) found++;
    await new Promise((r) => setTimeout(r, 600));
  }

  console.log(
    `\nFærdig. Fundet: ${found} · intet: ${none}` +
      (args.dryRun ? " [dry-run — intet gemt]" : ` · nye hold: ${teamsTotal}`),
  );
}

// Entrypoint-vagt: import må aldrig starte en kørsel.
if (process.argv[1] && /find-athletics-site\.ts$/.test(process.argv[1])) {
  main().catch((err) => {
    console.error("Atletiksite-søgning fejlede:", err);
    process.exit(1);
  });
}
