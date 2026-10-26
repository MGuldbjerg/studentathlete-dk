/**
 * Repair schools whose nickname/city/common name were overwritten by ANOTHER
 * school's CSV row (found 2026-10-26 through the stale-profile refresh).
 * ===========================================================================
 *
 * import-schools-csv.ts matched an existing school by SLUG, and a row without
 * a common name got one by stripping « University»/« College»: «Cornell
 * College» → «Cornell» → slug «cornell» = Cornell University's. The UPDATE
 * then gave Cornell University the Rams of Mount Vernon. The importer now
 * matches by exact name; this puts the damaged rows back.
 *
 * A row is repaired only when its current (nickname, city) is NOT its own CSV
 * row's but IS another CSV row's whose derived slug equals this school's slug
 * — i.e. exactly the collision, never a value someone set by hand.
 *
 *   npx tsx pipeline/seed/repair-school-collisions.ts [csv] [--apply]
 */
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { resolve } from "node:path";
import { createD1Client } from "../lib/d1-client";
import { generateSlug } from "../../src/lib/slug";

interface Row { name: string; common_name: string; nickname: string; city: string }

function parseCsv(text: string): Row[] {
  const lines = text.split(/\r?\n/).filter(Boolean);
  const head = splitLine(lines[0]);
  return lines.slice(1).map((l) => {
    const cells = splitLine(l);
    return Object.fromEntries(head.map((h, i) => [h, cells[i] ?? ""])) as unknown as Row;
  });
}

function splitLine(line: string): string[] {
  const out: string[] = [];
  let cur = "", q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') { if (q && line[i + 1] === '"') { cur += '"'; i++; } else q = !q; }
    else if (c === "," && !q) { out.push(cur); cur = ""; }
    else cur += c;
  }
  out.push(cur);
  return out;
}

/** The importer's derived common name and slug for a row. */
const derived = (r: Row) => {
  const common = r.common_name || r.name.replace(/ University| College/g, "").trim() || r.name;
  return { common, slug: generateSlug(common) };
};

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const apply = args.includes("--apply");
  const csvPath = args.find((a) => !a.startsWith("--")) ?? resolve(homedir(), "projekter/studentathlete/data/schools.csv");
  const rows = parseCsv(readFileSync(csvPath, "utf8"));
  const byName = new Map(rows.map((r) => [r.name, r]));
  const bySlug = new Map<string, Row[]>();
  for (const r of rows) { const s = derived(r).slug; bySlug.set(s, [...(bySlug.get(s) ?? []), r]); }

  const db = createD1Client();
  const schools = (await db.query<{ id: number; name: string; slug: string; common_name: string | null; nickname: string | null; city: string | null }>(
    `SELECT id, name, slug, common_name, nickname, city FROM schools`)).results;

  const fixes: Array<{ id: number; name: string; from: string; to: string; params: unknown[] }> = [];
  for (const s of schools) {
    const own = byName.get(s.name);
    if (!own) continue;
    const ownNick = own.nickname || null, ownCity = own.city || null;
    if ((s.nickname ?? null) === ownNick && (s.city ?? null) === ownCity) continue;
    // Did another row with the same derived slug write these values?
    const culprit = (bySlug.get(s.slug) ?? []).find((r) => r.name !== s.name && (r.nickname || null) === (s.nickname ?? null) && (r.city || null) === (s.city ?? null));
    if (!culprit) continue;
    // The common name only when it, too, is the other row's (else someone set it).
    const common = s.common_name === derived(culprit).common ? derived(own).common : s.common_name;
    fixes.push({
      id: s.id, name: s.name,
      from: `${s.nickname} / ${s.city} / ${s.common_name}  (from «${culprit.name}»)`,
      to: `${ownNick} / ${ownCity} / ${common}`,
      params: [common, ownNick, ownCity, s.id],
    });
  }
  console.log(`${fixes.length} schools overwritten by another school's row`);
  for (const f of fixes.slice(0, 60)) console.log(`  #${f.id} ${f.name}: ${f.from}  →  ${f.to}`);
  if (!apply) { console.log("dry run — --apply to write"); return; }
  const writes = fixes.map((f) => ({ sql: `UPDATE schools SET common_name = ?, nickname = ?, city = ? WHERE id = ?`, params: f.params }));
  for (let i = 0; i < writes.length; i += 50) await db.batch(writes.slice(i, i + 50));
  console.log(`repaired: ${writes.length}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
