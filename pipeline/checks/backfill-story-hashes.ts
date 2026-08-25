/**
 * Engangs: omregn stories.url_hash til den ATLET-specifikke form.
 *
 * SKAL køres FØR næste discover-kørsel. Hashen er ændret fra sha256(URL) til
 * sha256(atlet_id + ":" + URL), så en artikel kan tilhøre flere af vores
 * atleter. Gamle rækker bærer stadig den gamle hash — og da RSS-feeds beholder
 * poster i dagevis, ville næste kørsel beregne en NY hash for en historie vi
 * allerede har, ikke finde den, og indsætte den igen som «ny». Resultatet ville
 * være dubletter af friske historier og dermed dobbelte kladder.
 *
 * SQLite har ingen sha256, så omregningen kan ikke laves som SQL-migration.
 *
 * Kør:  npx tsx pipeline/checks/backfill-story-hashes.ts           (kun tal)
 *       npx tsx pipeline/checks/backfill-story-hashes.ts --apply
 */
import { createHash } from "crypto";
import { createD1Client } from "../lib/d1-client";

interface Row {
  id: number;
  athlete_id: number | null;
  source_url: string;
  url_hash: string;
}

export function storyHash(athleteId: number | null, url: string): string {
  return createHash("sha256").update(`${athleteId}:${url}`).digest("hex");
}

async function main(): Promise<void> {
  const apply = process.argv.includes("--apply");
  const db = createD1Client();

  const rows = await db.query<Row>(
    `SELECT id, athlete_id, source_url, url_hash FROM stories ORDER BY id`,
  );
  const all = rows.results ?? [];

  const stale = all.filter((r) => storyHash(r.athlete_id, r.source_url) !== r.url_hash);
  console.log(`${all.length} historier i alt`);
  console.log(`  ${stale.length} har stadig den gamle hash`);
  console.log(`  ${all.length - stale.length} er allerede omregnet\n`);

  if (!apply) {
    console.log("(tørløb — intet ændret. Kør med --apply.)");
    return;
  }
  if (stale.length === 0) {
    console.log("Intet at gøre.");
    return;
  }

  let done = 0;
  for (const r of stale) {
    await db.execute(`UPDATE stories SET url_hash = ? WHERE id = ?`, [
      storyHash(r.athlete_id, r.source_url),
      r.id,
    ]);
    done++;
    if (done % 250 === 0) console.log(`  ${done}/${stale.length}…`);
  }
  console.log(`\n${done} hashes omregnet.`);
}

if (process.argv[1] && process.argv[1].endsWith("backfill-story-hashes.ts")) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
