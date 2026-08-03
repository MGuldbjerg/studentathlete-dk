/**
 * Find og flet dublerede atleter (samme person, to rækker).
 *
 * Klyngedannelsen sker nu PR. SPORT med samePerson(), ikke pr. navne-nøgle.
 * Det er hele pointen: to rækker for samme person kan have FORSKELLIGT navn
 * (skolen ændrede efternavnet — "Filucca Daugaard" → "Filucca Andersen"), og de
 * ville aldrig havne i samme navne-gruppe. samePerson() afgør sagen på skolens
 * eget spiller-id fra bio_url'en når det findes, ellers på navn+hometown.
 * Sport-puljerne er små (~150 atleter i alt), så et fuldt kryds er gratis.
 *
 * Keeper vælges: manuelt rettet navn > aktiv > har hometown > nyeste updated_at.
 * Taberens referencer og manglende felter flyttes til keeperen, taberens slug
 * bliver 301-alias, og taber-rækken slettes (src/lib/athlete-merge.ts).
 *
 * Kør:
 *   npx tsx pipeline/report/dedup-athletes.ts            # dry-run (kun rapport)
 *   npx tsx pipeline/report/dedup-athletes.ts --apply    # flet
 */
import { createD1Client } from "../lib/d1-client";
import { rosterKey, samePerson } from "../lib/athlete-identity";
import { buildMergeStatements, type MergeableAthlete } from "../../src/lib/athlete-merge";

interface Row extends MergeableAthlete {
  id: number;
  name: string;
  slug: string;
  sport: string;
  hometown: string | null;
  university: string;
  active: number;
  name_locked: number | null;
  updated_at: string | null;
}

const SELECT_ROWS = `
  SELECT id, name, roster_name, roster_key, slug, sport, position, hometown, university,
         bio_url, photo_url, photo_credit, class_year, expected_graduation,
         year_enrolled, profile_summary, active, name_locked, updated_at
  FROM athletes`;

function pickKeeper(cluster: Row[]): Row[] {
  const sorted = [...cluster].sort(
    (a, b) =>
      // Et manuelt rettet navn er en redaktionel beslutning — den overlever.
      (b.name_locked ?? 0) - (a.name_locked ?? 0) ||
      b.active - a.active ||
      (b.hometown ? 1 : 0) - (a.hometown ? 1 : 0) ||
      (b.updated_at ?? "").localeCompare(a.updated_at ?? ""),
  );
  return sorted; // [0] = keeper, resten = tabere
}

/** Hvorfor blev de to rækker anset for samme person? (til rapporten) */
function evidence(a: Row, b: Row): string {
  const ka = rosterKey(a.bio_url);
  const kb = rosterKey(b.bio_url);
  if (ka && ka === kb) return `skolens spiller-id ${ka}`;
  return "navne-identitet + sport";
}

async function main() {
  const apply = process.argv.includes("--apply");
  const db = createD1Client();
  const r = await db.query<Row>(SELECT_ROWS);

  // Klyng pr. sport med samePerson (spiller-id → navn → hometown-vagt).
  const bySport = new Map<string, Row[]>();
  for (const a of r.results) {
    const arr = bySport.get(a.sport) ?? [];
    arr.push(a);
    bySport.set(a.sport, arr);
  }

  const mergeClusters: Row[][] = [];
  for (const group of bySport.values()) {
    const clusters: Row[][] = [];
    for (const row of group) {
      const target = clusters.find((c) => c.some((existing) => samePerson(row, existing)));
      if (target) target.push(row);
      else clusters.push([row]);
    }
    for (const c of clusters) if (c.length > 1) mergeClusters.push(c);
  }

  console.log(
    `Tjekkede ${r.results.length} atleter${apply ? "" : " (DRY-RUN — ingen ændringer)"}.\n`,
  );

  if (mergeClusters.length === 0) {
    console.log("Ingen dubletter fundet.");
    return;
  }

  console.log(`${mergeClusters.length} dublet-klynge(r):\n`);
  for (const cluster of mergeClusters) {
    const [keeper, ...losers] = pickKeeper(cluster);
    console.log(
      `  KEEPER #${keeper.id} "${keeper.name}" | ${keeper.university} | ${keeper.hometown ?? "—"} | active=${keeper.active}`,
    );
    for (const l of losers) {
      console.log(
        `    ↳ flet  #${l.id} "${l.name}" | ${l.university} | ${l.hometown ?? "—"} | active=${l.active}`,
      );
      console.log(`       bevis: ${evidence(keeper, l)} · /atleter/${l.slug} → 301`);
    }
  }

  if (!apply) {
    console.log(
      "\nDRY-RUN: kør med --apply for at flette (flytter referencer + felter → keeper, gammel slug bliver alias, taber-række slettes).",
    );
    return;
  }

  let merged = 0;
  for (const cluster of mergeClusters) {
    const [keeper, ...losers] = pickKeeper(cluster);
    for (const l of losers) {
      for (const stmt of buildMergeStatements(keeper, l)) {
        await db.execute(stmt.sql, stmt.params);
      }
      merged++;
    }
  }
  console.log(`\nFlettet: ${merged} taber-række(r) ind i ${mergeClusters.length} keeper(e).`);
}

main().catch(console.error);
