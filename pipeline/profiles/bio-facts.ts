/**
 * Background facts from the athlete's official bio page (PLAN-content-floor-uk.md,
 * P4): the LABELLED fields in the page's header — high school, previous school,
 * major, height — never the bio prose, which is the school's own text (Mikkel,
 * 2026-09-17: no copy of the school's writing).
 * ===========================================================================
 *
 * Sidearm prints the facts as label/value pairs («Hometown» → «Cobham,
 * England», «High School» → «Epsom H.S.»). A label is an element whose own
 * text is exactly one of LABELS; its value is the next element with text. A
 * value that is a heading («Personal:») or another label is no value. The page
 * must be about this athlete (`pageIsAboutAthlete`, the honours scraper's guard
 * against a school answering with someone else's page).
 *
 * Sample 2026-10-26, 50 UK bios: 47 pages, all about the athlete; high school
 * 25, height 39, major 10, previous school 1.
 *
 * Stored in athletes.bio_facts (migration 072) with the date read, also when
 * the page gave nothing — so a page is read once. Plain fetch, no browser.
 *
 *   npx tsx pipeline/profiles/bio-facts.ts --sample 50          (measure, no writes)
 *   npx tsx pipeline/profiles/bio-facts.ts --write [--limit N]  (profiles with stats, not read yet)
 */
import * as cheerio from "cheerio";
import { createD1Client } from "../lib/d1-client";
import { pipelineUserAgent } from "../../src/lib/site";
import { siteCountryCodes } from "../../src/lib/countries";
import { seasonFromDate } from "../../src/lib/athlete-events";
import type { BioFacts } from "../../src/lib/bio-facts";
import { pageIsAboutAthlete } from "../scrape/scrape-honors";

const LABELS: Record<string, Exclude<keyof BioFacts, "checked">> = {
  "high school": "highSchool",
  "previous school": "previousSchool",
  "last school": "previousSchool",
  "major": "major",
  "academic major": "major",
  "height": "height",
  "ht.": "height",
};

/** «N/A», «-», «TBA», a heading («Personal:»), empty: not a value. */
const empty = (v: string) =>
  !v || /^(n\/?a|-+|—|tba|tbd|none|undeclared|undecided)$/i.test(v.trim()) || /:$/.test(v.trim()) || /^personal\b/i.test(v.trim());

export function parseBioFacts(html: string): BioFacts {
  const $ = cheerio.load(html);
  $("script, style, nav, footer").remove();
  const facts: BioFacts = { highSchool: null, previousSchool: null, major: null, height: null };
  $("*").each((_, el) => {
    const node = $(el);
    if (node.children().length > 0) return;
    const label = node.text().replace(/\s+/g, " ").trim().toLowerCase().replace(/:$/, "");
    const key = LABELS[label];
    if (!key || facts[key]) return;
    // The value: the next sibling with text, else the parent's next sibling.
    let value = "";
    for (let cur = node.next(); cur.length && !value; cur = cur.next()) value = cur.text().replace(/\s+/g, " ").trim();
    if (!value) for (let cur = node.parent().next(); cur.length && !value; cur = cur.next()) value = cur.text().replace(/\s+/g, " ").trim();
    if (value && !empty(value) && value.length <= 80 && !LABELS[value.toLowerCase().replace(/:$/, "")]) facts[key] = value;
  });
  return facts;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const val = (f: string) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] ?? null : null; };
  const write = args.includes("--write");
  const n = Number(val("--sample") ?? val("--limit") ?? (write ? 100000 : 50));
  const db = createD1Client();
  const ua = pipelineUserAgent();
  const sites = siteCountryCodes();
  const rows = (await db.query<{ id: number; name: string; bio_url: string }>(
    `SELECT a.id, a.name, a.bio_url FROM athletes a
       JOIN athlete_season_stats st ON st.athlete_id = a.id AND st.season = ? AND st.games > 0
      WHERE a.home_country IN (${sites.map(() => "?").join(",")}) AND a.bio_url IS NOT NULL AND a.bio_url <> ''
        ${write ? "AND a.bio_facts IS NULL" : ""}
      ORDER BY (a.id * 7919) % 1009 LIMIT ?`, [seasonFromDate(null), ...sites, n])).results;
  console.log(`${rows.length} bio pages to read`);

  const hits = { page: 0, about: 0, highSchool: 0, previousSchool: 0, major: 0, height: 0 };
  const today = new Date().toISOString().slice(0, 10);
  const writes: Array<{ sql: string; params: unknown[] }> = [];
  // One request per host at a time, a few hosts in parallel.
  const byHost = new Map<string, typeof rows>();
  for (const r of rows) { const h = new URL(r.bio_url).host; byHost.set(h, [...(byHost.get(h) ?? []), r]); }
  const hosts = [...byHost.keys()];
  let next = 0;
  await Promise.all(Array.from({ length: 6 }, async () => {
    while (next < hosts.length) {
      for (const r of byHost.get(hosts[next++])!) {
        let facts: BioFacts = { highSchool: null, previousSchool: null, major: null, height: null };
        try {
          const res = await fetch(r.bio_url, { headers: { "User-Agent": ua }, signal: AbortSignal.timeout(20_000) });
          if (res.ok) {
            const html = await res.text();
            hits.page++;
            if (pageIsAboutAthlete(html, r.name)) {
              hits.about++;
              facts = parseBioFacts(html);
              for (const k of ["highSchool", "previousSchool", "major", "height"] as const) if (facts[k]) hits[k]++;
              if (!write) console.log(`${r.name.padEnd(24)} hs=${facts.highSchool ?? "-"} | prev=${facts.previousSchool ?? "-"} | major=${facts.major ?? "-"} | ht=${facts.height ?? "-"}`);
            }
          }
        } catch { /* unreadable: stored as nothing found */ }
        writes.push({ sql: `UPDATE athletes SET bio_facts = ? WHERE id = ?`, params: [JSON.stringify({ ...facts, checked: today }), r.id] });
        await new Promise((res) => setTimeout(res, 600));
      }
    }
  }));
  console.log(`of ${rows.length}:`, hits);
  if (!write) return;
  for (let i = 0; i < writes.length; i += 50) await db.batch(writes.slice(i, i + 50));
  console.log(`written: ${writes.length}`);
}

if (/bio-facts\.ts$/.test(process.argv[1] ?? "")) main().catch((e) => { console.error(e); process.exit(1); });
