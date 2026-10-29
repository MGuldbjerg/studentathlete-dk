/**
 * «Read next» (src/lib/read-next.ts): the tier merge, the real SQL on SQLite
 * (node:sqlite, Node 22) with the live indexes, its query plan, and the one
 * season number on the athlete card (seasonHeadline, athlete-hub.ts).
 * Kør: npx tsx src/lib/_read-next-test.ts
 */
import { createRequire } from "node:module";
import { pickReadNext, readNextQuery } from "./read-next";
import { seasonHeadline } from "./athlete-hub";

let passed = 0;
let failed = 0;
function ok(cond: boolean, name: string): void {
  if (cond) passed++;
  else { failed++; console.error(`  ✗ ${name}`); }
}

// ── pickReadNext ────────────────────────────────────────────────────────────
type Row = { id: number; published_at: string | null; tier: number };
const r = (id: number, tier: number, day: number): Row => ({ id, tier, published_at: `2026-10-${String(day).padStart(2, "0")}` });

{
  const out = pickReadNext([r(9, 4, 28), r(5, 2, 20), r(2, 1, 1), r(5, 4, 20), r(7, 3, 27), r(6, 2, 25)], 1);
  ok(JSON.stringify(out.map((x) => x.id)) === "[2,6,5,7]", `tier order, newest first in a tier (got ${out.map((x) => x.id)})`);
  ok(!("tier" in out[0]), "the tier column is dropped");
}
ok(pickReadNext([r(1, 1, 5), r(1, 4, 5), r(3, 4, 4)], 1).map((x) => x.id).join() === "3", "the current article never shows");
ok(pickReadNext([r(3, 2, 5), r(3, 4, 5)], 1).length === 1, "an article in two tiers shows once");
ok(pickReadNext(Array.from({ length: 16 }, (_, i) => r(i + 2, 1 + (i % 4), 10)), 1).length === 4, "cut to four");
ok(pickReadNext([], 1).length === 0, "nothing in, nothing out");

// ── The SQL on a real SQLite, with the live indexes ─────────────────────────
interface Stmt { run(...p: unknown[]): unknown; all(...p: unknown[]): Record<string, unknown>[] }
const { DatabaseSync } = createRequire(import.meta.url)("node:sqlite") as {
  DatabaseSync: new (path: string) => { exec(sql: string): void; prepare(sql: string): Stmt };
};
const db = new DatabaseSync(":memory:");
db.exec(`
  CREATE TABLE athletes (id INTEGER PRIMARY KEY, name TEXT, sport TEXT, slug TEXT, university TEXT,
    home_country TEXT, active INTEGER);
  CREATE TABLE articles (
    id INTEGER PRIMARY KEY, title TEXT, slug TEXT, summary TEXT, content TEXT,
    article_type TEXT, index_words INTEGER, author TEXT, author_role TEXT,
    cover_image_url TEXT, published INTEGER, published_at TEXT, created_at TEXT,
    updated_at TEXT, athlete_id INTEGER, source_url TEXT, featured INTEGER,
    correction_note TEXT, corrected_at TEXT, story_id INTEGER, country TEXT
  );
  CREATE TABLE article_athletes (article_id INTEGER, athlete_id INTEGER, role TEXT);
  CREATE INDEX idx_athletes_sport ON athletes(sport);
  CREATE INDEX idx_athletes_university ON athletes(university);
  CREATE INDEX idx_athletes_country_active_sport ON athletes(home_country, active, sport);
  CREATE INDEX idx_articles_athlete ON articles(athlete_id);
  CREATE INDEX idx_articles_published ON articles(published);
  CREATE INDEX idx_articles_country_published_at ON articles(country, published, published_at DESC);
  CREATE INDEX idx_article_athletes_athlete ON article_athletes(athlete_id);
`);
const ath = db.prepare(`INSERT INTO athletes (id, name, sport, slug, university, home_country, active) VALUES (?, ?, ?, ?, ?, 'UK', 1)`);
ath.run(1, "Anna", "soccer", "anna", "Duke");
ath.run(2, "Ben", "soccer", "ben", "Yale");
ath.run(3, "Cara", "tennis", "cara", "Duke");
ath.run(4, "Dan", "golf", "dan", "Rice");
const art = db.prepare(`INSERT INTO articles (id, title, slug, content, published, published_at, athlete_id, country)
  VALUES (?, ?, ?, 'x y', ?, ?, ?, ?)`);
art.run(1, "current", "s1", 1, "2026-10-01", 1, "UK");
art.run(2, "anna older", "s2", 1, "2026-09-01", 1, "UK");     // tier 1
art.run(3, "ben soccer", "s3", 1, "2026-10-05", 2, "UK");     // tier 2
art.run(4, "cara duke", "s4", 1, "2026-10-06", 3, "UK");      // tier 3
art.run(5, "dan newest", "s5", 1, "2026-10-20", 4, "UK");     // tier 4
art.run(6, "dan draft", "s6", 0, "2026-10-21", 4, "UK");      // unpublished
art.run(7, "danish anna", "s7", 1, "2026-10-22", 1, "DK");    // other site
art.run(8, "ben names anna", "s8", 1, "2026-08-01", 2, "UK"); // tier 1 via article_athletes
db.prepare(`INSERT INTO article_athletes VALUES (8, 1, 'featured')`).run();
for (let i = 0; i < 40; i++) art.run(100 + i, `filler ${i}`, `f${i}`, 1, `2025-01-${String(1 + (i % 28)).padStart(2, "0")}`, 4, "UK");

const keys = { articleId: 1, country: "UK", athleteId: 1, sport: "soccer" };
const q = readNextQuery(keys);
const rows = db.prepare(q.sql).all(...q.params) as unknown as Array<Row & { slug: string; word_count: number }>;
const picked = pickReadNext(rows, 1);
ok(JSON.stringify(picked.map((x) => x.id)) === "[2,8,3,4]", `athlete → sport → school (got ${picked.map((x) => x.id)})`);
ok(!rows.some((x) => x.id === 1 || x.id === 6 || x.id === 7), "never the current, an unpublished or another site's article");
ok(!("content" in rows[0]) && rows[0].word_count === 2, "list columns only, with a word count");
ok(rows.every((x) => [1, 2, 3, 4].includes(x.tier)), "every row carries its tier");

// An athlete with no articles of their own still gets four.
{
  const q2 = readNextQuery({ articleId: 5, country: "UK", athleteId: 4, sport: "golf" });
  const p2 = pickReadNext(db.prepare(q2.sql).all(...q2.params) as unknown as Row[], 5);
  ok(p2.length === 4, `never runs dry (got ${p2.length})`);
}
// No athlete, no sport: only the newest tier, no NULL-bound tiers.
{
  const q3 = readNextQuery({ articleId: 1, country: "UK", athleteId: null, sport: null });
  ok((q3.sql.match(/UNION ALL/g) ?? []).length === 0, "missing keys leave their tiers out");
  ok(q3.params.length === 2, "two parameters for the newest tier alone");
  ok(pickReadNext(db.prepare(q3.sql).all(...q3.params) as unknown as Row[], 1).length === 4, "the newest tier alone fills four");
}

// The plan: no full scan of articles or athletes in any tier (CPU is the
// project's cost constraint; migration 079). No ANALYZE: on this toy table
// sqlite_stat1 would make every scan look cheap, unlike the live tables.
{
  const plan = db.prepare(`EXPLAIN QUERY PLAN ${q.sql}`).all(...q.params).map((x) => String(x.detail));
  const scans = plan.filter((d) => /^SCAN (a|at|articles|athletes|article_athletes)\b/.test(d));
  ok(scans.length === 0, `no table scan in the plan (got: ${scans.join(" | ")})`);
  // The school tier enters on the school's athletes, then their articles —
  // not the site's date index once per athlete.
  const school = plan.slice(plan.findIndex((d) => d.includes("idx_athletes_university")));
  ok(school.length > 0 && school.slice(0, 4).some((d) => d.includes("idx_articles_athlete (athlete_id=?)")),
    "school tier: athletes(university) → articles(athlete_id)");
  ok(plan.some((d) => /^SEARCH a USING INTEGER PRIMARY KEY/.test(d)), "athlete tier: the athlete's ids drive, by primary key");
  if (process.env.SHOW_PLAN) console.log(plan.join("\n"));
}

// ── seasonHeadline ──────────────────────────────────────────────────────────
const h = (kind: "outfield" | "keeper" | "tennis", cells: Record<string, string>, lang = "en") =>
  seasonHeadline(kind, JSON.stringify(cells), lang);
ok(JSON.stringify(h("outfield", { gp: "11", g: "6", a: "2" })) === `{"label":"Goals","value":"6"}`, "outfield: goals first");
ok(h("outfield", { gp: "9", g: "0", a: "0" })?.value === "9", "outfield: zero goals falls back to games");
ok(h("outfield", { gp: "9", g: "3" }, "da")?.label === "Mål", "Danish label from the same table as the profile");
ok(h("keeper", { gp: "10", sv: "41" })?.label === "Saves", "keeper: saves");
ok(h("tennis", { singles: "12-4" })?.value === "12-4", "tennis: singles record");
ok(h("outfield", {}) === null, "no columns, no number");
ok(seasonHeadline("outfield", "not json", "en") === null, "unreadable cells, no number");

console.log(`read-next: ${passed} ok, ${failed} fejl`);
if (failed > 0) process.exit(1);
