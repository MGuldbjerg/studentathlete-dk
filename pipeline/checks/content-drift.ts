/**
 * Drift-tjek: er kodens sport/viden-tekster re-seedet til D1?
 *
 * D1-pages overstyrer koden, så en kode-ændring af SPORT_CONTENT/VIDEN_GUIDES
 * er usynlig indtil seed-scripts genkøres (gotcha 2026-07-02). Dette tjek
 * sammenligner kodens aktuelle hash med seed-stemplet i site_content og
 * fejler (exit 1) ved afvigelse — workflowen sender så en Discord-besked.
 * Admin-redigeringer i D1 rører IKKE stemplet → ingen falske alarmer.
 *
 * Kør: npx tsx pipeline/checks/content-drift.ts
 * Fix ved drift:
 *   npx tsx pipeline/seed/seed-sport.ts  && wrangler d1 execute studentathlete-dk --remote --file=db/seed-sport.sql
 *   npx tsx pipeline/seed/seed-guides.ts && wrangler d1 execute studentathlete-dk --remote --file=db/seed-guides.sql
 *   NB: tjek FØRST om der er admin-redigeringer nyere end kode-ændringen
 *   (SELECT slug, updated_at FROM pages WHERE kind IN ('sport','guide')) — seed overskriver dem.
 */
import { createD1Client } from "../lib/d1-client";
import { sportContentHash, guidesContentHash, SEED_HASH_KEYS } from "../lib/content-hash";

async function main(): Promise<void> {
  const db = createD1Client();
  const r = await db.query<{ key: string; value: string }>(
    // country = 'DK': stemplet hører til de danske seed-tekster (migration 037).
    `SELECT key, value FROM site_content WHERE key IN (?, ?) AND country = 'DK'`,
    [SEED_HASH_KEYS.sport, SEED_HASH_KEYS.guides],
  );
  const stamped: Record<string, string> = {};
  for (const row of r.results) stamped[row.key] = row.value;

  const checks = [
    { name: "sport-pillars (SPORT_CONTENT)", key: SEED_HASH_KEYS.sport, code: sportContentHash() },
    { name: "viden-guider (VIDEN_GUIDES)", key: SEED_HASH_KEYS.guides, code: guidesContentHash() },
  ];

  let drift = false;
  for (const c of checks) {
    const seeded = stamped[c.key];
    if (!seeded) {
      drift = true;
      console.error(`✗ ${c.name}: intet seed-stempel i D1 (${c.key}) — kør seed-scriptet`);
    } else if (seeded !== c.code) {
      drift = true;
      console.error(`✗ ${c.name}: kode-hash ${c.code.slice(0, 12)}… ≠ seedet ${seeded.slice(0, 12)}… — koden er ændret uden re-seed`);
    } else {
      console.log(`✓ ${c.name}: i sync (${c.code.slice(0, 12)}…)`);
    }
  }

  if (drift) {
    console.error("\nDRIFT: kode-tekster er ikke live. Se fix-kommandoer i filens header.");
    process.exit(1);
  }
  console.log("\nIngen drift — D1 matcher koden.");
}

main().catch((err) => {
  console.error("Drift-tjek fejlede:", err);
  process.exit(1);
});
