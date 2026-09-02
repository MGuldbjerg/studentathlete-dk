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

// Listeopslag der gater notFound() tæller med: en tom liste betyder
// «findes ikke» for /atleter/<bogstav>, så en fejl må ikke give tom liste.
{
  const start = src.indexOf("export async function getAthletesByLetter");
  const body = src.slice(start, src.indexOf("\n}", start));
  ok(!/catch\s*\{\s*return \[\];?\s*\}/.test(body), "getAthletesByLetter: fejl bliver ikke til tom liste");
  ok(/rethrowDbError/.test(body), "getAthletesByLetter: fejl kastes videre");
}

// Sitemappets tre slug-opslag. Her betyder en tom liste ikke «findes ikke» —
// den betyder noget værre: et GYLDIGT sitemap, hvor adresserne mangler. Da
// læsegrænsen blev håndhævet 2. september svarede /sitemap.xml 200 OK med 57
// URL'er i stedet for 550, skiftevis, og begge domæner leverede det samme.
// Google læser et sitemap som listen over hvad sitet har.
for (const fn of ["getAllArticleSlugs", "getAllAthleteSlugs", "getAllSchoolSlugs"]) {
  const start = src.indexOf(`export async function ${fn}`);
  ok(start > -1, `${fn} findes`);
  const body = src.slice(start, src.indexOf("\n}", start));
  ok(!/catch\s*\{\s*return \[\];?\s*\}/.test(body), `${fn}: fejl bliver ikke til et kortere sitemap`);
  ok(/rethrowDbError/.test(body), `${fn}: fejl kastes videre`);
}

ok(/function rethrowDbError[\s\S]*throw new Error/.test(src), "rethrowDbError kaster faktisk");

console.log(`\ndb-errors: ${passed} bestået, ${failed} fejlet.`);
if (failed > 0) process.exit(1);
