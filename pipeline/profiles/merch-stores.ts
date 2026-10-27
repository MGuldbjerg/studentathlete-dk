/**
 * The athletes' own merchandise stores on Influxer, verified before we link.
 * ===========================================================================
 *
 * Mikkel, 2026-10-27: Influxer links on profiles are «a service to the
 * athletes», and the clicks are counted (click_kind 'merch') so we can show
 * Influxer what we send them. Another session matched 102 of our athletes to
 * products tagged with their name AND school (logs/influxer_results.json).
 *
 * A store lives at https://www.influxermerch.com/athletes/<name-slug>. We link
 * only when that page answers 200, its title names the athlete, and the page
 * names their school — a common name at another school is not our athlete.
 * The result goes to athletes.merch_url (null when not verified) and
 * merch_checked_at (migration 078).
 *
 *   npx tsx pipeline/profiles/merch-stores.ts --from logs/influxer_results.json [--apply]
 *   npx tsx pipeline/profiles/merch-stores.ts --all [--limit 300] [--apply]   # unchecked or >30 days
 */
import { readFileSync } from "node:fs";
import { createD1Client } from "../lib/d1-client";
import { siteCountrySql } from "../../src/lib/countries";

const BASE = "https://www.influxermerch.com/athletes/";

/** ASCII the way a store handle is written. Danish letters both ways (ø → o, and dropped). */
export function slugCandidates(name: string): string[] {
  const fold = (s: string) =>
    s.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const danish = name.replace(/ø/g, "o").replace(/Ø/g, "O").replace(/æ/g, "ae").replace(/Æ/g, "Ae").replace(/å/g, "a").replace(/Å/g, "A");
  return [...new Set([fold(danish), fold(name)])].filter(Boolean);
}

const norm = (s: string) => s.normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/ø/gi, "o").replace(/æ/gi, "ae").toLowerCase().replace(/[^a-z ]/g, " ");
const STOP = new Set(["saint", "st", "university", "college", "of", "the", "state", "at", "and"]);

/**
 * The store's OWN school: the page heading («East Tennessee State University
 * Apparel») or the «Visit … shop» link. Not the page as a whole — it carries
 * every school in its navigation data, so «the school is on the page» matched
 * any school at all (tested 2026-10-27: six wrong schools, six matches).
 */
export function storeSchool(html: string): string | null {
  return (
    /<h1[^>]*>([^<]+?)\s+Apparel<\/h1>/i.exec(html)?.[1] ??
    /aria-label="Visit ([^"]+?) shop"/i.exec(html)?.[1] ??
    null
  );
}

/** Does the store page belong to this athlete: their name in the title, their school as the store's school? */
export function pageMatches(html: string, name: string, university: string): boolean {
  const title = /<title>([^<]*)/i.exec(html)?.[1] ?? "";
  if (!norm(title).replace(/\s+/g, " ").includes(norm(name).replace(/\s+/g, " ").trim())) return false;
  const school = storeSchool(html);
  if (!school) return false;
  const want = new Set(norm(university).split(/\s+/).filter((w) => w && !STOP.has(w)));
  if (!want.size) return false;
  const have = new Set(norm(school).split(/\s+/));
  let hit = 0;
  for (const w of want) if (have.has(w)) hit++;
  return hit / want.size >= 0.6;
}

async function findStore(name: string, university: string): Promise<string | null> {
  for (const slug of slugCandidates(name)) {
    try {
      const res = await fetch(BASE + slug, { redirect: "follow", headers: { "User-Agent": "StudentAthlete.dk (+https://studentathlete.dk)" } });
      if (res.status !== 200) continue;
      if (pageMatches(await res.text(), name, university)) return BASE + slug;
    } catch {
      /* the next candidate, or not found */
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  return null;
}

async function main() {
  const args = process.argv.slice(2);
  const val = (k: string) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : undefined; };
  const apply = args.includes("--apply");
  const db = createD1Client();

  let ids: number[];
  if (val("--from")) {
    const rows = JSON.parse(readFileSync(val("--from")!, "utf8")) as { id: number; status: string }[];
    ids = rows.filter((r) => r.status === "match" || r.status === "name_only").map((r) => r.id);
  } else if (args.includes("--all")) {
    ids = (await db.query<{ id: number }>(
      `SELECT a.id FROM athletes a WHERE a.active = 1 AND ${siteCountrySql("a.home_country")}
         AND (a.merch_checked_at IS NULL OR a.merch_checked_at < datetime('now', '-30 days'))
       ORDER BY a.merch_checked_at IS NOT NULL, a.id LIMIT ?`, [Number(val("--limit") ?? 300)])).results.map((r) => r.id);
  } else {
    console.error("Usage: merch-stores.ts --from <results.json> | --all [--limit N]  [--apply]");
    process.exit(1);
  }

  let found = 0, checked = 0;
  for (let i = 0; i < ids.length; i += 90) {
    const part = ids.slice(i, i + 90);
    const athletes = (await db.query<{ id: number; name: string; university: string; home_country: string }>(
      `SELECT id, name, university, home_country FROM athletes WHERE id IN (${part.map(() => "?").join(",")})`, part)).results;
    for (const a of athletes) {
      const url = await findStore(a.name, a.university);
      checked++;
      if (url) { found++; console.log(`  ✓ ${a.home_country} ${a.name} (${a.university}) → ${url}`); }
      if (apply) {
        await db.execute(`UPDATE athletes SET merch_url = ?, merch_checked_at = datetime('now') WHERE id = ?`, [url, a.id]);
      }
    }
  }
  console.log(`\n${checked} checked · ${found} verified stores${apply ? " (written)" : " (dry run: nothing written)"}`);
}

if (process.argv[1]?.endsWith("merch-stores.ts")) {
  main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
}
