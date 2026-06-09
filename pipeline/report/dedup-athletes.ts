/**
 * Find og flet dublerede atleter (samme person, forskellig slug pga. navne-variant
 * eller skoleskift). Grupperer på normalizeIdentity()+sport, klynger med samePerson()
 * (hometown-vagt mod fejlmerge), og fletter hver klynge til ÉN keeper.
 *
 * Keeper vælges: aktiv > har hometown > nyeste updated_at. Tabernes referencer
 * (articles/stories/sources) flyttes til keeperen, hvorefter taber-rækken slettes.
 *
 * Kør:
 *   npx tsx pipeline/report/dedup-athletes.ts            # dry-run (kun rapport)
 *   npx tsx pipeline/report/dedup-athletes.ts --apply    # flet
 */
import { createD1Client } from "../lib/d1-client";
import { normalizeIdentity, samePerson } from "../lib/athlete-identity";

interface Row {
  id: number;
  name: string;
  slug: string;
  sport: string;
  hometown: string | null;
  university: string;
  active: number;
  updated_at: string | null;
}

function pickKeeper(cluster: Row[]): Row[] {
  const sorted = [...cluster].sort(
    (a, b) =>
      b.active - a.active ||
      (b.hometown ? 1 : 0) - (a.hometown ? 1 : 0) ||
      (b.updated_at ?? "").localeCompare(a.updated_at ?? ""),
  );
  return sorted; // [0] = keeper, resten = tabere
}

async function main() {
  const apply = process.argv.includes("--apply");
  const db = createD1Client();
  const r = await db.query<Row>(
    "SELECT id, name, slug, sport, hometown, university, active, updated_at FROM athletes",
  );

  // Gruppér på identitet+sport
  const groups = new Map<string, Row[]>();
  for (const a of r.results) {
    const id = normalizeIdentity(a.name);
    if (!id) continue;
    const key = `${id}::${a.sport}`;
    (groups.get(key) ?? groups.set(key, []).get(key)!).push(a);
  }

  // Klyng hver gruppe via samePerson (hometown-vagt) og find merge-kandidater
  const mergeClusters: Row[][] = [];
  for (const group of groups.values()) {
    if (group.length < 2) continue;
    const clusters: Row[][] = [];
    for (const row of group) {
      const target = clusters.find((c) => samePerson(row, c[0]));
      if (target) target.push(row);
      else clusters.push([row]);
    }
    for (const c of clusters) if (c.length > 1) mergeClusters.push(c);
  }

  console.log(`Tjekkede ${r.results.length} atleter${apply ? "" : " (DRY-RUN — ingen ændringer)"}.\n`);

  if (mergeClusters.length === 0) {
    console.log("Ingen dubletter fundet.");
    return;
  }

  console.log(`${mergeClusters.length} dublet-klynge(r):\n`);
  for (const cluster of mergeClusters) {
    const [keeper, ...losers] = pickKeeper(cluster);
    console.log(`  KEEPER #${keeper.id} "${keeper.name}" | ${keeper.university} | ${keeper.hometown ?? "—"} | active=${keeper.active}`);
    for (const l of losers) {
      console.log(`    ↳ flet  #${l.id} "${l.name}" | ${l.university} | ${l.hometown ?? "—"} | active=${l.active}`);
    }
  }

  if (!apply) {
    console.log("\nDRY-RUN: kør med --apply for at flette (flytter referencer → keeper, sletter taber-rækker).");
    return;
  }

  let merged = 0;
  for (const cluster of mergeClusters) {
    const [keeper, ...losers] = pickKeeper(cluster);
    for (const l of losers) {
      await db.execute("UPDATE articles SET athlete_id = ? WHERE athlete_id = ?", [keeper.id, l.id]);
      await db.execute("UPDATE stories SET athlete_id = ? WHERE athlete_id = ?", [keeper.id, l.id]);
      await db.execute("UPDATE sources SET athlete_id = ? WHERE athlete_id = ?", [keeper.id, l.id]);
      await db.execute("DELETE FROM athletes WHERE id = ?", [l.id]);
      merged++;
    }
  }
  console.log(`\nFlettet: ${merged} taber-række(r) ind i ${mergeClusters.length} keeper(e).`);
}

main().catch(console.error);
