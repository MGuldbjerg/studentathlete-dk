/**
 * Tests for the body-pass page budget.
 * Kør: npx tsx pipeline/discover/_body-budget-test.ts
 */

import { siteFirst, bodyShare, newestFirst } from "./body-budget";

let passed = 0;
let failed = 0;

function assert(cond: boolean, msg: string): void {
  if (cond) { passed++; }
  else { failed++; console.error(`  ✗ ${msg}`); }
}

// ── siteFirst ───────────────────────────────────────────────────────────
const order = siteFirst([
  { id: 1, site_count: 0 }, { id: 2, site_count: 3 }, { id: 3, site_count: 0 }, { id: 4, site_count: 1 },
]).map((s) => s.id).join(",");
assert(order === "2,4,1,3", `site schools first, run order kept (fik ${order})`);
assert(siteFirst([]).length === 0, "empty list");

// ── bodyShare ───────────────────────────────────────────────────────────
assert(bodyShare(600, 200) === 3, `600 over 200 schools → 3 (fik ${bodyShare(600, 200)})`);
assert(bodyShare(600, 1) === 600, "the last school may use all that is left");
assert(bodyShare(5, 50) === 1, "at least 1 while pages are left");
assert(bodyShare(0, 10) === 0, "nothing left → 0");
assert(bodyShare(10, 0) === 0, "no schools left → 0");
assert(bodyShare(7, 2) === 4, "rounds up");

// Unused pages flow down: schools that need 0 leave their share to later ones.
let left = 600;
const needs = [0, 0, 0, 50];
const used: number[] = [];
needs.forEach((need, i) => { const u = Math.min(need, bodyShare(left, needs.length - i)); used.push(u); left -= u; });
assert(used[3] === 50, `the backlogged last school gets the unused pages (fik ${used[3]})`);

// ── newestFirst ─────────────────────────────────────────────────────────
const items = newestFirst([
  { id: "old", pubDate: new Date("2026-10-20") },
  { id: "none", pubDate: null },
  { id: "new", pubDate: new Date("2026-10-31") },
]).map((i) => i.id).join(",");
assert(items === "new,old,none", `newest first, undated last (fik ${items})`);

console.log(`\n${passed} bestået, ${failed} fejlet`);
if (failed > 0) process.exit(1);
