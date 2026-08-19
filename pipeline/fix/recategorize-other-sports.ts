/**
 * Flytter atleter og roster-tjek ud af "other" med aliastabellen som facit.
 *
 * Baggrund: `sportKeyFromSource` er ét sted at oversætte skolernes holdnavne til
 * kanoniske nøgler — men den kører kun ved scrape. Rækker der ER hentet, mens et
 * alias manglede, bliver stående i "other" for evigt. Dette script kører den
 * NUVÆRENDE aliastabel hen over det der allerede står i D1.
 *
 * Atletens kilde-sport står ikke i en kolonne; den står i bio_url'en
 * (…/sports/womens-rugby/roster/…). Det er den eneste kilde vi har til, hvad
 * skolen selv kaldte holdet.
 *
 * FÆLDE (dokumenteret 2026-08-18): athletes.sport SKAL rettes i samme greb som
 * roster_checks.sport. findExistingAthleteByIdentity slår op med WHERE sport = ?,
 * så en atlet der bliver stående som "other" ikke findes ved næste scrape — og
 * INSERT OR IGNORE på slug'en gør derefter ingenting.
 *
 * Kør:  npx tsx pipeline/fix/recategorize-other-sports.ts          (tørløb)
 *       npx tsx pipeline/fix/recategorize-other-sports.ts --apply  (skriver)
 */
import { createD1Client } from "../lib/d1-client";
import { sportKeyFromSource } from "../../src/lib/sports";

const APPLY = process.argv.includes("--apply");

/** Kilde-sportens slug i en roster-bio-URL: …/sports/<slug>/roster/… */
function sourceSlugFromBioUrl(url: string | null): string | null {
  if (!url) return null;
  const m = /\/sports\/([^/]+)\//.exec(url);
  return m ? m[1] : null;
}

/**
 * Køn af holdnavnet — kun når skolen selv siger det. "mens-rugby" er data;
 * "mcross" er en forkortelse vi ikke gætter på (jf. regel 5).
 */
function genderFromSource(slug: string): "m" | "f" | null {
  if (/^(club-)?(mens|men)-/.test(slug) || /-men$/.test(slug)) return "m";
  if (/^(club-)?(womens|women)-/.test(slug) || /-women$/.test(slug)) return "f";
  return null;
}

async function main(): Promise<void> {
  const db = createD1Client();

  // ── 1. Atleter ────────────────────────────────────────────────────────────
  const athletes = await db.query<{ id: number; bio_url: string | null; gender: string | null }>(
    `SELECT id, bio_url, gender FROM athletes WHERE sport = 'other'`,
  );

  const bySport = new Map<string, number[]>();
  const byGender = new Map<string, number[]>();
  let unmapped = 0;

  for (const a of athletes.results) {
    const slug = sourceSlugFromBioUrl(a.bio_url);
    if (!slug) {
      unmapped++;
      continue;
    }
    const key = sportKeyFromSource(slug);
    if (key === "other") {
      unmapped++;
      continue;
    }
    bySport.set(key, [...(bySport.get(key) ?? []), a.id]);

    const g = genderFromSource(slug);
    if (g && !a.gender) byGender.set(g, [...(byGender.get(g) ?? []), a.id]);
  }

  console.log(`Atleter i "other": ${athletes.results.length}`);
  for (const [key, ids] of [...bySport].sort((a, b) => b[1].length - a[1].length)) {
    console.log(`  → ${key.padEnd(20)} ${ids.length}`);
  }
  console.log(`  (bliver stående: ${unmapped})`);
  for (const [g, ids] of byGender) console.log(`  køn '${g}': ${ids.length} atleter`);

  // ── 2. Roster-tjek ────────────────────────────────────────────────────────
  const checks = await db.query<{ team_slug: string; n: number }>(
    `SELECT team_slug, COUNT(*) n FROM roster_checks WHERE sport = 'other' GROUP BY team_slug`,
  );
  const checkMoves = new Map<string, string[]>(); // kanonisk nøgle → team_slugs
  let checkRows = 0;
  for (const c of checks.results) {
    const key = sportKeyFromSource(c.team_slug);
    if (key === "other") continue;
    checkMoves.set(key, [...(checkMoves.get(key) ?? []), c.team_slug]);
    checkRows += c.n;
  }
  console.log(`\nRoster-tjek i "other": ${checks.results.length} holdnavne`);
  for (const [key, slugs] of [...checkMoves].sort((a, b) => b[1].length - a[1].length)) {
    console.log(`  → ${key.padEnd(20)} ${slugs.length} holdnavne`);
  }
  console.log(`  rækker der flyttes: ${checkRows}`);

  if (!APPLY) {
    console.log("\nTørløb. Kør med --apply for at skrive.");
    return;
  }

  for (const [key, ids] of bySport) {
    const r = await db.query(
      `UPDATE athletes SET sport = ?, updated_at = datetime('now') WHERE id IN (${ids.map(() => "?").join(",")})`,
      [key, ...ids],
    );
    console.log(`athletes → ${key}: ${r.meta.changes} rækker`);
  }
  for (const [g, ids] of byGender) {
    const r = await db.query(
      `UPDATE athletes SET gender = ? WHERE gender IS NULL AND id IN (${ids.map(() => "?").join(",")})`,
      [g, ...ids],
    );
    console.log(`athletes.gender → ${g}: ${r.meta.changes} rækker`);
  }
  for (const [key, slugs] of checkMoves) {
    const r = await db.query(
      `UPDATE roster_checks SET sport = ? WHERE sport = 'other' AND team_slug IN (${slugs.map(() => "?").join(",")})`,
      [key, ...slugs],
    );
    console.log(`roster_checks → ${key}: ${r.meta.changes} rækker`);
  }
}

main().catch((err) => {
  console.error("Omkategorisering fejlede:", err);
  process.exit(1);
});
