/** Tests for the ops MCP server's guards. Run: npx tsx mcp/_ops-guards-test.ts */
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Budget, checkReadOnly, clip, cteNames, fullScans } from "./ops-guards";

let pass = 0, fail = 0;
function expect(name: string, got: unknown, want: unknown) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  ok ? pass++ : fail++;
  if (!ok) console.log(`✗ ${name}\n   got:  ${JSON.stringify(got)}\n   want: ${JSON.stringify(want)}`);
}
const refused = (sql: string) => checkReadOnly(sql) !== null;

// Reads pass.
expect("plain select", checkReadOnly("SELECT id FROM athletes WHERE id = ?"), null);
expect("trailing semicolon", checkReadOnly("select 1;"), null);
expect("WITH … SELECT", checkReadOnly("WITH x AS (SELECT 1 AS a) SELECT a FROM x"), null);
expect("replace() the string function", checkReadOnly("SELECT replace(name, 'a', 'b') FROM schools"), null);
expect("column names like updated_at", checkReadOnly("SELECT updated_at, created_at FROM pages"), null);
expect("a write word inside a string literal", checkReadOnly("SELECT * FROM drafts WHERE note = 'delete me; please'"), null);

// Anything else is refused.
expect("delete", refused("DELETE FROM athletes"), true);
expect("update", refused("UPDATE pages SET x = 1"), true);
expect("two statements", refused("SELECT 1; DROP TABLE athletes"), true);
expect("WITH … DELETE", refused("WITH x AS (SELECT 1) DELETE FROM athletes"), true);
expect("REPLACE INTO", refused("REPLACE INTO pages VALUES (1)"), true);
expect("pragma", refused("PRAGMA table_info(athletes)"), true);
expect("insert hidden after a select", refused("SELECT 1 UNION SELECT 2 INSERT INTO t VALUES (1)"), true);
expect("empty", refused("  ;"), true);

// Scans in the plan.
const plan = (...d: string[]) => d.map((detail) => ({ detail }));
expect("index search is fine", fullScans(plan("SEARCH athletes USING INDEX idx_a (school_id=?)"), new Set()), []);
expect("a table scan is flagged", fullScans(plan("SCAN athletes"), new Set()), ["athletes"]);
expect("old-style SCAN TABLE", fullScans(plan("SCAN TABLE athletes"), new Set()), ["athletes"]);
expect("a covering-index scan still reads every row", fullScans(plan("SCAN a USING COVERING INDEX idx_x"), new Set()), ["a"]);
expect("our LIMIT wrapper's subquery is not a table", fullScans(plan("CO-ROUTINE (subquery-1)", "SCAN (subquery-1)"), new Set()), []);
expect("a constant row is not a table", fullScans(plan("SCAN CONSTANT ROW"), new Set()), []);
expect("a CTE is not a table", fullScans(plan("SCAN recent"), cteNames("WITH recent AS (SELECT 1) SELECT * FROM recent")), []);
expect("CTE names, several and recursive", [...cteNames("WITH RECURSIVE a(n) AS (SELECT 1), b AS (SELECT 2) SELECT 1")], ["a", "b"]);

// The daily budget: counts, persists, resets at the UTC day.
const file = join(mkdtempSync(join(tmpdir(), "ops-mcp-")), "rows.json");
let now = new Date("2026-10-28T23:00:00Z");
const b = new Budget(1000, file, () => now);
b.add(400);
b.add(300);
expect("budget counts reads", b.used(), 700);
expect("budget left", b.left(), 300);
expect("a second instance sees the same file", new Budget(1000, file, () => now).used(), 700);
b.add(600);
expect("never negative when overspent", b.left(), 0);
now = new Date("2026-10-29T00:01:00Z");
expect("a new UTC day starts at zero", b.used(), 0);

expect("clip leaves short answers alone", clip("abc", 10), "abc");
expect("clip cuts long answers", clip("x".repeat(20), 10).startsWith("x".repeat(10) + "\n… (cut at 10"), true);

console.log(`${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
