/**
 * The ops MCP server's guards, kept pure so they can be tested
 * (mcp/_ops-guards-test.ts). The server itself is mcp/ops-server.ts.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

// Words that only a write (or a session change) needs. `replace(` is the string
// function, so only the bare keyword counts. Column names such as updated_at
// don't match: `_` is a word character, so there is no \b before "update".
const WRITE_WORDS =
  /\b(insert|update|delete|drop|alter|create|attach|detach|pragma|vacuum|reindex|analyze|begin|commit|rollback|savepoint|release)\b|\breplace\b(?!\s*\()/i;

/** Why the query is not a single read, or null when it is. Strict on purpose: a false refusal costs a rewrite, a false pass costs data. */
export function checkReadOnly(sql: string): string | null {
  const s = sql.trim().replace(/;\s*$/, "");
  if (!s) return "empty query";
  const bare = s.replace(/'(?:[^']|'')*'/g, "''");
  if (bare.includes(";")) return "one statement only";
  if (!/^(select|with)\b/i.test(bare)) return "only SELECT or WITH … SELECT — this server only reads";
  const m = bare.match(WRITE_WORDS);
  if (m) return `"${m[0]}" is not allowed — this server only reads`;
  return null;
}

/** Names a WITH clause defines; a scan of one of those reads no table rows of its own. */
export function cteNames(sql: string): Set<string> {
  const names = new Set<string>();
  for (const m of sql.matchAll(/(?:\bwith(?:\s+recursive)?|,)\s+(\w+)\s*(?:\([^)]*\)\s*)?as\s*\(/gi)) names.add(m[1].toLowerCase());
  return names;
}

/**
 * Full scans in an EXPLAIN QUERY PLAN — the expensive kind, as D1 bills every
 * row a scan reads. SEARCH (an index lookup) is fine. The plan may name a table
 * by its alias, so anything scanned counts unless it is a CTE, a subquery
 * ("(subquery-1)") or a constant row.
 */
export function fullScans(plan: Array<Record<string, unknown>>, ctes: Set<string>): string[] {
  const out = new Set<string>();
  for (const r of plan) {
    const m = String(r.detail ?? "").match(/^SCAN (?:TABLE )?(\w+)/);
    if (m && m[1] !== "CONSTANT" && !ctes.has(m[1].toLowerCase())) out.add(m[1]);
  }
  return [...out];
}

/**
 * Rows this server has read from D1 today (UTC — D1's day). Kept in a file so
 * the cap holds across sessions and restarts. Separate from the site's own
 * reads: it caps what Claude can add, not the total.
 */
export class Budget {
  constructor(
    readonly max: number,
    private file = join(homedir(), ".cache", "studentathlete-ops-mcp", "d1-rows.json"),
    private now = () => new Date(),
  ) {}
  private day() { return this.now().toISOString().slice(0, 10); }
  used(): number {
    try {
      const j = JSON.parse(readFileSync(this.file, "utf8"));
      return j.day === this.day() ? Number(j.rows) || 0 : 0;
    } catch {
      return 0;
    }
  }
  left(): number { return Math.max(0, this.max - this.used()); }
  add(rows: number): void {
    mkdirSync(dirname(this.file), { recursive: true });
    writeFileSync(this.file, JSON.stringify({ day: this.day(), rows: this.used() + rows }));
  }
  line(): string { return `D1 rows read via this server today: ${this.used().toLocaleString("en")} / ${this.max.toLocaleString("en")}`; }
}

/** Rows as a plain table: compact for the context window, one line per row. */
export function table(head: string[], rows: unknown[][]): string {
  const cell = (v: unknown) => (v === null || v === undefined ? "" : String(v).replace(/\s+/g, " ").slice(0, 120));
  return [head.join(" | "), ...rows.map((r) => r.map(cell).join(" | "))].join("\n");
}

/** Cap a tool answer, so one call can't flood the session's context. */
export const clip = (s: string, n = 8000) => (s.length <= n ? s : s.slice(0, n) + `\n… (cut at ${n.toLocaleString("en")} characters)`);
