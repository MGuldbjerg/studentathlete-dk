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
import { photoAllowed, photoAllowedSql, gatePhoto, BLOCKED_PHOTO_PERMISSIONS } from "./photo-permission";

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

// ── gatePhoto ────────────────────────────────────────────────────────────────
const row = { id: 1, photo_url: "https://x/p.jpg", photo_credit: "Foto: X Athletics", photo_source_url: "https://x/bio", photo_photographer: "Jane" };
ok(gatePhoto(row, "granted") === row, "allowed: the row is returned untouched");
const gated = gatePhoto(row, "declined");
ok(gated.photo_url === null && gated.photo_credit === null && gated.photo_source_url === null && gated.photo_photographer === null,
  "blocked: every photo field is emptied");
ok(gated.id === 1 && row.photo_url === "https://x/p.jpg", "blocked: other fields kept, the original not mutated");

// ── SQL twin agrees with the TS rule ─────────────────────────────────────────
interface Stmt { run(...p: unknown[]): unknown; get(...p: unknown[]): Record<string, unknown>; all(...p: unknown[]): Record<string, unknown>[] }
const { DatabaseSync } = createRequire(import.meta.url)("node:sqlite") as {
  DatabaseSync: new (path: string) => { exec(sql: string): void; prepare(sql: string): Stmt };
};
const db = new DatabaseSync(":memory:");
const values: (string | null)[] = [null, "", "asked", "granted", "conditional", "declined", "do_not_contact", "do-not-contact", " DECLINED", ...BLOCKED_PHOTO_PERMISSIONS];
for (const v of values) {
  const r = db.prepare(`SELECT ${photoAllowedSql("?")} AS allowed`).get(v);
  ok(Boolean(r.allowed) === photoAllowed(v), `SQL and TS agree on ${JSON.stringify(v)}`);
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
