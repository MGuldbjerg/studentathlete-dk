/**
 * Test af IndexNow-nyttelasten.
 *
 * Den vigtigste sag er den sidste: nøglefilen i public/ SKAL hedde det samme
 * som konstanten. Driver de fra hinanden, afviser IndexNow hver eneste
 * indsendelse — tavst, for protokollen svarer stadig 200 på selve kaldet.
 */
import { existsSync, readFileSync } from "node:fs";
import { INDEXNOW_KEY, INDEXNOW_MAX_URLS, buildPayload } from "./indexnow";

let pass = 0, fail = 0;
function ok(cond: boolean, label: string): void {
  if (cond) pass++;
  else { fail++; console.log(`  ✗ ${label}`); }
}

ok(buildPayload([]) === null, "tom liste giver ingen nyttelast");
ok(buildPayload(["ikke en url"]) === null, "ugyldig URL giver ingen nyttelast");

const p = buildPayload([
  "https://studentathlete.dk/fodbold/en-artikel",
  "https://studentathlete.dk/atleter/daniel-helle",
])!;
ok(p.host === "studentathlete.dk", "værten udledes af første URL");
ok(p.key === INDEXNOW_KEY, "nøglen er med");
ok(
  p.keyLocation === `https://studentathlete.dk/${INDEXNOW_KEY}.txt`,
  "keyLocation peger på nøglefilen på samme vært",
);
ok(p.urlList.length === 2, "begge URLer med");

// Blandede værter: protokollen kræver én vært pr. kald.
const mixed = buildPayload([
  "https://studentathlete.dk/a",
  "https://student-athlete.co.uk/b",
  "https://studentathlete.dk/c",
])!;
ok(mixed.urlList.length === 2, "URLer fra en anden vært frasorteres");
ok(mixed.host === "studentathlete.dk", "værten er den første URLs");

// Loftet skal holdes.
const many = buildPayload(
  Array.from({ length: INDEXNOW_MAX_URLS + 500 }, (_, i) => `https://studentathlete.dk/${i}`),
)!;
ok(many.urlList.length === INDEXNOW_MAX_URLS, "der sendes aldrig mere end loftet");

// Nøglefilen skal findes OG indeholde nøglen.
const keyFile = `public/${INDEXNOW_KEY}.txt`;
ok(existsSync(keyFile), `nøglefilen ${keyFile} findes`);
if (existsSync(keyFile)) {
  ok(readFileSync(keyFile, "utf8").trim() === INDEXNOW_KEY, "nøglefilens indhold er nøglen");
}

console.log(`\nindexnow: ${pass} bestået, ${fail} fejlet`);
if (fail > 0) process.exit(1);
