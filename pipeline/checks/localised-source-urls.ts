/**
 * Kilde-URLer med DANSK sport-slug — amerikanske universiteter skriver engelsk.
 *
 * Mikkel, 2026-08-25. `sources` rummer rækker som
 * `gobonnies.com/sports/fodbold/news`. Ingen amerikansk atletikside har en sti
 * der hedder «fodbold»; de svarer 404. Slugget er sitets LÆSERVENDTE
 * oversættelse, som er sivet ind i en maskin-URL — samme fejlklasse som de
 * danske ord i britiske artikel-adresser.
 *
 * VIGTIGT om virkningen: `sources` læses IKKE af discover. Historier findes via
 * `schools.news_feed_url`. Tabellen tælles kun af coverage-report.ts, så de døde
 * rækker pynter dækningstallene uden at skaffe én eneste historie. At rydde op
 * ændrer altså ikke hvad vi finder — det ændrer hvad vi TROR vi dækker.
 *
 * Ingen kode skriver længere til `sources` (dbSportToUrlSlug kræver nu et
 * eksplicit sprog), så dette er en engangsoprydning, ikke en tilbagevendende.
 *
 * Kør:  npx tsx pipeline/checks/localised-source-urls.ts           (kun liste)
 *       npx tsx pipeline/checks/localised-source-urls.ts --apply   (active = 0)
 *
 * --apply SLETTER intet: rækkerne deaktiveres, så de kan vækkes igen.
 */
import { createD1Client } from "../lib/d1-client";
import { SPORT_KEYS } from "../../src/lib/sports";
import { dbSportToUrlSlug } from "../../src/lib/types";

/**
 * Danske slugs der IKKE er identiske med den engelske → slug: sportsnøgle.
 *
 * FÆLDEN (fanget 2026-08-25): «football» er dansk slug for amerikansk fodbold,
 * mens den engelske er «american-football» — så en naiv da≠en-regel flagede 16
 * ægte amerikanske adresser (`/sports/football/`, som ENHVER amerikansk
 * atletikside bruger). Derfor udelades ethvert segment der også er et ENGELSK
 * slug for en eller anden sport. «football» er engelsk slug for soccer på
 * UK-sitet og overlever dermed korrekt.
 */
export function danishOnlySlugs(): Map<string, string> {
  const english = new Set<string>();
  for (const key of SPORT_KEYS) {
    const en = dbSportToUrlSlug(key, "en");
    if (en) english.add(en.toLowerCase());
  }
  const m = new Map<string, string>();
  for (const key of SPORT_KEYS) {
    const da = dbSportToUrlSlug(key, "da");
    const en = dbSportToUrlSlug(key, "en");
    if (!da || !en || da === en) continue;
    if (english.has(da.toLowerCase())) continue; // gyldig engelsk adresse
    m.set(da, key);
  }
  return m;
}

/** Segmentet efter /sports/ i en URL, eller null. */
export function sportSegment(url: string): string | null {
  const i = url.indexOf("/sports/");
  if (i < 0) return null;
  const rest = url.slice(i + "/sports/".length);
  const seg = rest.split("/")[0].split("?")[0];
  return seg || null;
}

interface SourceRow {
  id: number;
  athlete_id: number | null;
  url: string;
  source_type: string;
}

async function main(): Promise<void> {
  const apply = process.argv.includes("--apply");
  const db = createD1Client();
  const danish = danishOnlySlugs();

  const rows = await db.query<SourceRow>(
    `SELECT id, athlete_id, url, source_type FROM sources WHERE active = 1 AND url LIKE '%/sports/%'`,
  );

  const bad: Array<{ row: SourceRow; seg: string; key: string }> = [];
  for (const row of rows.results ?? []) {
    const seg = sportSegment(row.url);
    if (!seg) continue;
    const key = danish.get(seg.toLowerCase());
    if (key) bad.push({ row, seg, key });
  }

  console.log(`${(rows.results ?? []).length} aktive kilder med /sports/ i adressen`);
  console.log(`  ${bad.length} bruger et dansk slug og kan ikke svare\n`);

  const bySeg = new Map<string, number>();
  for (const b of bad) bySeg.set(b.seg, (bySeg.get(b.seg) ?? 0) + 1);
  for (const [seg, n] of [...bySeg.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${String(n).padStart(4)}  /sports/${seg}/   (sportsnøgle: ${danish.get(seg)})`);
  }

  if (!apply) {
    console.log("\n(tørløb — intet ændret. Kør med --apply for at deaktivere dem.)");
    return;
  }
  if (bad.length === 0) return;

  for (const b of bad) {
    await db.execute(`UPDATE sources SET active = 0 WHERE id = ?`, [b.row.id]);
  }
  console.log(`\n${bad.length} kilder deaktiveret (active = 0). Ingen rækker slettet.`);
}

if (process.argv[1] && process.argv[1].endsWith("localised-source-urls.ts")) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
