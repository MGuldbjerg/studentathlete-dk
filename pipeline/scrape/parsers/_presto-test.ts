/**
 * Tests for the PrestoSports card-roster parser.
 * Run: npx tsx pipeline/scrape/parsers/_presto-test.ts
 *
 * Fixture: Laramie County CC men's basketball 2025-26, two cards — a page the
 * generic table parser read nothing from (2026-10-08).
 */
import { readFileSync } from "fs";
import { join } from "path";
import { parseRoster } from "./index";
import { isPrestoCards } from "./presto";

let passed = 0;
let failed = 0;
function eq<T>(actual: T, expected: T, msg: string): void {
  if (JSON.stringify(actual) === JSON.stringify(expected)) passed++;
  else { failed++; console.error(`  ✗ ${msg} (got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)})`); }
}

const html = readFileSync(join(__dirname, "fixtures", "presto-headshot.html"), "utf8");
eq(isPrestoCards(html), true, "recognised as Presto cards");
const rows = parseRoster(html);
eq(rows.length, 2, "one entry per card");
eq(rows[0], {
  name: "TJ Coulter",
  position: "Guard",
  hometown: "Sparks, Nevada",
  year: "Sophomore",
  bioUrl: "/sports/mbkb/2025-26/bios/coulter_tj_kpd7",
}, "first card, every field");
eq(rows.every((r) => !/:/.test(r.name) && r.name.split(" ").length >= 2), true, "names are names, not labels");
eq(isPrestoCards("<table class='sidearm-roster'></table>"), false, "a Sidearm table is not Presto cards");

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
