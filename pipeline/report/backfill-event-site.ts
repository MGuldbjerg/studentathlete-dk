/**
 * Place pre-2026-10-05 page views on a site (events.site, migration 061).
 *
 *   npx tsx pipeline/report/backfill-event-site.ts            (dry run: counts only)
 *   npx tsx pipeline/report/backfill-event-site.ts --apply    (writes; ask Mikkel first)
 *
 * Old rows only know the path. Three rules, strongest first; anything they
 * cannot place stays NULL and the dashboard says how many were left out:
 *
 *  1. /<sport>/<slug> whose slug is an article → that article's country.
 *  2. /<athletes-section>/<slug> whose slug is an athlete → the athlete's home country.
 *  3. A first segment that exists in exactly ONE site's language pack
 *     (/atleter, /skoler, /fodbold … vs /athletes, /schools, /rowing …). The
 *     middleware 308s the other language's slugs, so a logged Danish slug was
 *     a visit to the Danish site.
 *
 * Not placeable on purpose: "/" and slugs both languages share (/golf,
 * /tennis, /football — which is American football on .dk and soccer on
 * .co.uk). Guessing those would draw a trend line out of a guess.
 *
 * Only rows with site IS NULL are touched, so a re-run is harmless and new
 * rows (written with their site by /api/track) are never changed.
 */

import { createD1Client } from "../lib/d1-client";
import { COUNTRIES } from "../../src/lib/countries";
import { languagePack } from "../../src/lib/i18n";

/** First segment → site, for segments that belong to exactly one site. */
export function uniqueHeads(): Map<string, string> {
  const owners = new Map<string, Set<string>>();
  for (const [code, profile] of Object.entries(COUNTRIES)) {
    const pack = languagePack(profile.language);
    for (const slug of [...Object.values(pack.routes), ...Object.values(pack.sportSlug)]) {
      const head = slug.replace(/^\/+/, "").split("/")[0];
      if (!head) continue;
      if (!owners.has(head)) owners.set(head, new Set());
      owners.get(head)!.add(code);
    }
  }
  const out = new Map<string, string>();
  for (const [head, codes] of owners) if (codes.size === 1) out.set(head, [...codes][0]);
  return out;
}

// SQLite: the path's second segment for '/a/b', and its first segment.
const TAIL = "substr(path, instr(substr(path, 2), '/') + 2)";
const HEAD = "substr(path, 2, instr(substr(path, 2) || '/', '/') - 1)";

async function main(): Promise<void> {
  const apply = process.argv.includes("--apply");
  const db = createD1Client();
  const base = "event_type = 'pageview' AND site IS NULL";

  const heads = uniqueHeads();
  const athleteHeads = Object.values(COUNTRIES).map((p) => languagePack(p.language).routes.athletes.replace(/^\/+/, ""));
  const headCases = [...heads.entries()].map(([h, cc]) => `WHEN '${h.replace(/'/g, "''")}' THEN '${cc}'`).join(" ");

  const steps: { name: string; set: string; where: string }[] = [
    {
      name: "articles",
      set: `site = (SELECT a.country FROM articles a WHERE a.slug = ${TAIL})`,
      where: `${base} AND instr(${TAIL}, '/') = 0 AND EXISTS (SELECT 1 FROM articles a WHERE a.slug = ${TAIL} AND a.country IS NOT NULL)`,
    },
    {
      name: "athletes",
      set: `site = (SELECT at.home_country FROM athletes at WHERE at.slug = ${TAIL})`,
      where: `${base} AND ${HEAD} IN (${athleteHeads.map((h) => `'${h}'`).join(",")})
              AND EXISTS (SELECT 1 FROM athletes at WHERE at.slug = ${TAIL} AND at.home_country IN (${Object.keys(COUNTRIES).map((c) => `'${c}'`).join(",")}))`,
    },
    {
      name: "language-unique first segment",
      set: `site = CASE ${HEAD} ${headCases} END`,
      where: `${base} AND ${HEAD} IN (${[...heads.keys()].map((h) => `'${h.replace(/'/g, "''")}'`).join(",")})`,
    },
  ];

  for (const s of steps) {
    if (apply) {
      const res = await db.execute(`UPDATE events SET ${s.set} WHERE ${s.where}`);
      console.log(`${s.name}: ${res.meta?.changes ?? "?"} rows placed`);
    } else {
      const res = await db.query<{ n: number }>(`SELECT COUNT(*) AS n FROM events WHERE ${s.where}`);
      console.log(`${s.name}: ${res.results?.[0]?.n ?? 0} rows would be placed (counted before earlier steps run)`);
    }
  }
  const left = await db.query<{ n: number }>(`SELECT COUNT(*) AS n FROM events WHERE ${base}`);
  console.log(`${apply ? "Left" : "Currently"} unplaced: ${left.results?.[0]?.n ?? 0}`);
  if (!apply) console.log("\nDry run. Re-run with --apply to write.");
}

if (process.argv[1] && /backfill-event-site\.ts$/.test(process.argv[1])) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
