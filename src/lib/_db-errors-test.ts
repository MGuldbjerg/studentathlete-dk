/**
 * En databasefejl må ikke se ud som «findes ikke».
 * Kør: npx tsx src/lib/_db-errors-test.ts
 *
 * 2. september ramte D1's daglige læsegrænse, og hver eneste atletside svarede
 * 404 — også til Google, midt i arbejdet med at få .co.uk indekseret. Årsagen
 * var én linje: `catch { return null; }`, og `null` betyder «findes ikke» for
 * kalderen. Testen holder de tre slug-opslag fast på at fejl KASTES.
 */
import { readFileSync } from "node:fs";

let passed = 0;
let failed = 0;
function ok(cond: boolean, name: string): void {
  if (cond) passed++;
  else { failed++; console.error(`  ✗ ${name}`); }
}

const src = readFileSync(new URL("./db.ts", import.meta.url), "utf8");

// De tre opslag der gater notFound(). Deres catch skal kaste, ikke returnere.
for (const fn of ["getArticleBySlug", "getAthleteBySlug", "getSchoolBySlug"]) {
  const start = src.indexOf(`export async function ${fn}`);
  ok(start > -1, `${fn} findes`);
  const body = src.slice(start, src.indexOf("\n}", start));
  ok(!/catch\s*\{\s*return null;?\s*\}/.test(body), `${fn}: fejl sluges ikke som "findes ikke"`);
  ok(/rethrowDbError/.test(body), `${fn}: fejl kastes videre`);
}

ok(/function rethrowDbError[\s\S]*throw new Error/.test(src), "rethrowDbError kaster faktisk");

console.log(`\ndb-errors: ${passed} bestået, ${failed} fejlet.`);
if (failed > 0) process.exit(1);
