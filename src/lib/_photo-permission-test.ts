/**
 * The photo-permission gate (src/lib/photo-permission.ts) and migration 080.
 * Run: npx tsx src/lib/_photo-permission-test.ts
 *
 * The TS rule and its SQL twin must agree, so the SQL is run against real
 * SQLite (node:sqlite, Node 22). The migration and its backfill are run too,
 * and the migration is held to scripts/migrate-live.sh's additive guard.
 */
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { photoAllowed, photoAllowedSql, gatePhoto, articlePhotoClearedSql, photographerListValue, BLOCKED_PHOTO_PERMISSIONS } from "./photo-permission";

let passed = 0;
let failed = 0;
function ok(cond: boolean, name: string): void {
  if (cond) passed++;
  else { failed++; console.error(`  ✗ ${name}`); }
}

// ── photoAllowed ─────────────────────────────────────────────────────────────
ok(photoAllowed(null), "NULL (never asked) is allowed");
ok(photoAllowed(undefined), "undefined (no school row) is allowed");
ok(photoAllowed(""), "empty is allowed");
for (const v of ["asked", "granted", "conditional", "forwarded", "bounced"]) ok(photoAllowed(v), `${v} is allowed`);
ok(!photoAllowed("declined"), "declined is blocked");
ok(!photoAllowed("do_not_contact"), "do_not_contact (what the ledger writes) is blocked");
ok(!photoAllowed("do-not-contact"), "do-not-contact (the CLI keyword) is blocked");
ok(!photoAllowed(" Declined "), "case and spaces do not slip through");
ok(!photoAllowed("athlete_list"), "athlete_list: an athlete not named is blocked");
ok(!photoAllowed("athlete_list", { cleared: null }) && !photoAllowed("athlete_list", { cleared: 0 }), "athlete_list: NULL/0 cleared is blocked");
ok(photoAllowed("athlete_list", { cleared: 1 }) && photoAllowed(" Athlete_List ", { cleared: true }), "athlete_list: a cleared athlete is allowed");
ok(photoAllowed("granted", { cleared: 0 }) && !photoAllowed("declined", { cleared: 1 }), "cleared changes nothing for other states");

// ── photographer_list ────────────────────────────────────────────────────────
const rock = photographerListValue([" Callie  Knott ", "callie knott", "Jo Smith"]);
ok(rock === "callie knott;jo smith", "list value: normalised, lower-case, deduplicated");
const pl = (photographer: string | null, unnamedOk: number | null) =>
  photoAllowed("photographer_list", { photographer, photographers: rock, unnamedOk });
ok(pl("Callie Knott", 0) && pl("CALLIE   KNOTT", 0), "photographer_list: an approved photographer passes (case, spaces)");
ok(!pl("Outside Photog", 1), "photographer_list: another photographer is blocked, unnamed_ok or not");
ok(!pl("Callie", 1), "photographer_list: no partial match");
ok(pl(null, 1) && pl("  ", 1), "photographer_list: unnamed passes with unnamed_ok = 1");
ok(!pl(null, 0) && !pl(null, null), "photographer_list: unnamed is blocked without unnamed_ok");
ok(!photoAllowed("photographer_list"), "photographer_list: no context → blocked");

// ── gatePhoto ────────────────────────────────────────────────────────────────
const row = { id: 1, photo_url: "https://x/p.jpg", photo_credit: "Foto: X Athletics", photo_source_url: "https://x/bio", photo_photographer: "Jane" };
ok(gatePhoto(row, "granted") === row, "allowed: the row is returned untouched");
const gated = gatePhoto(row, "declined");
ok(gated.photo_url === null && gated.photo_credit === null && gated.photo_source_url === null && gated.photo_photographer === null,
  "blocked: every photo field is emptied");
ok(gated.id === 1 && row.photo_url === "https://x/p.jpg", "blocked: other fields kept, the original not mutated");
ok(gatePhoto(row, "athlete_list").photo_url === null, "athlete_list: an uncleared row loses its photo");
ok(gatePhoto({ ...row, school_photo_photographers: "jane" }, "photographer_list").photo_url === row.photo_url, "photographer_list: the row's photographer (Jane) is approved");
ok(gatePhoto({ ...row, school_photo_photographers: "callie knott" }, "photographer_list").photo_url === null, "photographer_list: an unapproved photographer loses the photo");
ok(gatePhoto({ ...row, photo_photographer: null, school_photo_unnamed_ok: 1 }, "photographer_list").photo_url === row.photo_url, "photographer_list: an unnamed headshot passes with unnamed_ok");
ok(gatePhoto({ ...row, photo_cleared: 1 }, "athlete_list").photo_url === row.photo_url, "athlete_list: a cleared row keeps it");

// ── SQL twin agrees with the TS rule ─────────────────────────────────────────
interface Stmt { run(...p: unknown[]): unknown; get(...p: unknown[]): Record<string, unknown>; all(...p: unknown[]): Record<string, unknown>[] }
const { DatabaseSync } = createRequire(import.meta.url)("node:sqlite") as {
  DatabaseSync: new (path: string) => { exec(sql: string): void; prepare(sql: string): Stmt };
};
const db = new DatabaseSync(":memory:");
const values: (string | null)[] = [null, "", "asked", "granted", "conditional", "declined", "do_not_contact", "do-not-contact", " DECLINED", ...BLOCKED_PHOTO_PERMISSIONS];
for (const v of [...values, "athlete_list", " ATHLETE_LIST", "photographer_list"]) {
  for (const c of [null, 0, 1]) {
    for (const ph of [null, "", "Callie Knott", "callie knott ", "Jo Smith", "Other One"]) {
      // Values are bound once through a CTE (the SQL names some of them twice).
      const r = db.prepare(`WITH v(p, c, ph, l, u) AS (SELECT ?, ?, ?, ?, ?)
        SELECT ${photoAllowedSql("v.p", { cleared: "v.c", photographer: "v.ph", photographers: "v.l", unnamedOk: "v.u" })} AS allowed FROM v`)
        .get(v, c, ph, rock, c);
      const ts = photoAllowed(v, { cleared: c, photographer: ph, photographers: rock, unnamedOk: c });
      ok(Boolean(r.allowed) === ts, `SQL and TS agree on ${JSON.stringify(v)} / ${c} / ${JSON.stringify(ph)}`);
    }
  }
}
{
  const r = db.prepare(`SELECT ${photoAllowedSql("'photographer_list'", { anyPhotographer: true })} AS allowed`).get();
  ok(Boolean(r.allowed), "suggestions: photographer_list may still look for a photo (checked when shown)");
}

// ── Article photo cleared: athletes AT the photo's school, all cleared, at least one ──
{
  const t = new (DatabaseSync)(":memory:");
  t.exec(`
    CREATE TABLE athletes (id INTEGER PRIMARY KEY, university TEXT, photo_cleared INTEGER);
    CREATE TABLE article_athletes (article_id INTEGER, athlete_id INTEGER);
    CREATE TABLE articles (id INTEGER PRIMARY KEY, photo_url TEXT, photo_school TEXT);
    INSERT INTO athletes VALUES (1, 'McK', 1), (2, 'McK', NULL), (3, 'Other', NULL);
    INSERT INTO articles VALUES (10, 'p', 'McK'), (11, 'p', 'McK'), (12, 'p', 'McK'), (13, NULL, 'McK');
    INSERT INTO article_athletes VALUES (10, 1), (10, 3), (11, 1), (11, 2), (12, 3);
  `);
  const cl = (id: number) => t.prepare(`SELECT ${articlePhotoClearedSql("a")} AS c FROM articles a WHERE a.id = ?`).get(id).c;
  ok(cl(10) === 1, "article: every athlete at the photo's school is cleared → 1 (others ignored)");
  ok(cl(11) === 0, "article: one uncleared athlete at the school → 0");
  ok(cl(12) === 0, "article: no athlete at the photo's school → 0 (its yes covers its own athletes)");
  ok(cl(13) === null, "article: no photo → NULL, nothing looked up");
}
{
  const mig = readFileSync("db/migration-087-photo-cleared.sql", "utf8");
  const g = /(^|[^a-z])(drop|delete|truncate|update)([^a-z]|$)/i;
  ok(!g.test(mig.split("\n").filter((l) => !/^\s*--/.test(l)).join("\n")), "migration-087 passes the additive guard");
}

// ── Migration 080 + backfill against a minimal schema ───────────────────────
db.exec(`
  CREATE TABLE athletes (id INTEGER PRIMARY KEY, university TEXT, photo_url TEXT, photo_credit TEXT, updated_at TEXT);
  CREATE TABLE photo_suggestions (
    id INTEGER PRIMARY KEY AUTOINCREMENT, athlete_id INTEGER NOT NULL, image_url TEXT NOT NULL,
    credit TEXT NOT NULL, source_url TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending',
    created_at TEXT, decided_at TEXT, UNIQUE(athlete_id, image_url));
`);
const migration = readFileSync("db/migration-080-photo-credit-source.sql", "utf8");
const backfill = readFileSync("db/backfill-080-photo-source-url.sql", "utf8");

// The exact guard of scripts/migrate-live.sh: comment lines dropped, then no drop/delete/truncate/update.
const guard = /(^|[^a-z])(drop|delete|truncate|update)([^a-z]|$)/i;
const body = (sql: string) => sql.split("\n").filter((l) => !/^\s*--/.test(l)).join("\n");
ok(!guard.test(body(migration)), "migration-080 passes migrate-live.sh's additive guard");
ok(guard.test(body(backfill)), "the backfill is an UPDATE (so it lives outside the migration)");

db.exec(migration);
db.exec(`
  INSERT INTO athletes (id, university, photo_url) VALUES
    (1, 'Duke', 'https://duke/a.jpg'),   -- approved suggestion is the current photo → backfilled
    (2, 'Duke', 'https://other/b.jpg'),  -- photo replaced by hand → no link
    (3, 'Duke', NULL),                   -- no photo
    (4, 'Duke', 'https://duke/d.jpg');   -- only a pending suggestion → nothing
  INSERT INTO photo_suggestions (athlete_id, image_url, credit, source_url, status) VALUES
    (1, 'https://duke/a.jpg', 'Foto: Duke Athletics', 'https://duke/bio/1', 'approved'),
    (2, 'https://duke/b-old.jpg', 'Foto: Duke Athletics', 'https://duke/bio/2', 'approved'),
    (4, 'https://duke/d.jpg', 'Foto: Duke Athletics', 'https://duke/bio/4', 'pending');
`);
db.exec(backfill);
const src = (id: number) => db.prepare("SELECT photo_source_url AS u FROM athletes WHERE id = ?").get(id).u;
ok(src(1) === "https://duke/bio/1", "backfill: current approved photo gets its source");
ok(src(2) === null, "backfill: a hand-replaced photo gets no link");
ok(src(3) === null, "backfill: no photo, no link");
ok(src(4) === null, "backfill: a pending suggestion is not copied");
db.exec(backfill);
ok(src(1) === "https://duke/bio/1", "backfill is idempotent");
const cols = db.prepare("SELECT name FROM pragma_table_info('photo_suggestions')").all().map((r) => r.name);
ok(cols.includes("photographer"), "photo_suggestions.photographer exists");

console.log(`\nphoto-permission: ${passed} passed, ${failed} failed.`);
if (failed > 0) process.exit(1);
